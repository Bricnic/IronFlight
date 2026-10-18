import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { DT } from './clock';
import { ROUTES,routeSolids } from './routes';
export type Stage = 'easy' | 'medium' | 'hard' | 'lab';
export type Input = {throttle?:number;brake?:number;steer?:number};
export const wheelPositions = [new Vector3(-1.65,-.35,1.65),new Vector3(1.65,-.35,1.65),new Vector3(-1.65,-.35,-1.65),new Vector3(1.65,-.35,-1.65)];
let ready: Promise<void> | undefined;
export function initPhysics(){return ready ??= RAPIER.init();}
export class Simulation {
  world!: RAPIER.World;
  body!: RAPIER.RigidBody;
  vehicle!: RAPIER.DynamicRayCastVehicleController;
  stage: Stage;
  time=0;
  ticks=0;
  airborneTicks=0;
  landed=false;
  status:'driving'|'finished'|'wrecked'='driving';
  constructor(stage:Stage='lab'){this.stage=stage;this.reset(stage);}
  reset(stage:Stage=this.stage){
    this.world?.free();this.stage=stage;this.time=0;this.ticks=0;this.airborneTicks=0;this.landed=false;this.status='driving';
    this.world=new RAPIER.World({x:0,y:-9.81,z:0});this.world.timestep=DT;
    if(stage==='lab')this.world.createCollider(RAPIER.ColliderDesc.cuboid(200,.5,300).setTranslation(0,-.5,0).setFriction(1));
    else for(const s of routeSolids()) this.world.createCollider(RAPIER.ColliderDesc.cuboid(s.w/2,s.h/2,s.d/2).setTranslation(s.x,s.y,s.z).setRotation(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),s.angle??0)).setFriction(1));
    const route=ROUTES.find(r=>r.id===stage);
    this.body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(route?.x??0,2.1,stage==='lab'?0:-65).setLinearDamping(.08).setAngularDamping(1.2).setCcdEnabled(true));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.1,.45,2.5).setMass(3200).setFriction(.3),this.body);
    this.vehicle=this.world.createVehicleController(this.body);this.vehicle.indexUpAxis=1;this.vehicle.setIndexForwardAxis=2;
    wheelPositions.forEach((p,i)=>{
      this.vehicle.addWheel(p,{x:0,y:-1,z:0},{x:-1,y:0,z:0},.6,1.05);
      this.vehicle.setWheelSuspensionStiffness(i,35);this.vehicle.setWheelSuspensionCompression(i,12);this.vehicle.setWheelSuspensionRelaxation(i,14);
      this.vehicle.setWheelMaxSuspensionForce(i,80000);this.vehicle.setWheelMaxSuspensionTravel(i,.45);
      this.vehicle.setWheelFrictionSlip(i,2.5);this.vehicle.setWheelSideFrictionStiffness(i,1.1);
    });
  }
  step(input:Input={}){
    if(this.status==='finished')input={brake:1};
    const throttle=Math.max(-1,Math.min(1,input.throttle??0)),brake=Math.max(0,Math.min(1,input.brake??0)),steer=Math.max(-1,Math.min(1,input.steer??0));
    const speed=this.body.linvel();const forward=new Vector3(0,0,1).applyQuaternion(new Quaternion().copy(this.body.rotation()));
    const longitudinal=forward.dot(speed);
    for(let i=0;i<4;i++){
      this.vehicle.setWheelEngineForce(i,throttle*11000*Math.max(0,1-Math.abs(longitudinal)/25));
      this.vehicle.setWheelBrake(i,brake*220);
      this.vehicle.setWheelSteering(i,i<2?steer*.35:0);
    }
    this.vehicle.updateVehicle(DT,RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
    this.world.step();this.ticks++;this.time=this.ticks*DT;
    const route=ROUTES.find(r=>r.id===this.stage),p=this.body.translation();
    if(route){
      const contacts=wheelPositions.filter((_,i)=>this.vehicle.wheelIsInContact(i)).length;
      if(p.z>13&&p.z<route.gapEnd&&contacts===0)this.airborneTicks++;
      if(p.z>route.gapEnd+3&&contacts>=2&&this.airborneTicks>20)this.landed=true;
      if(this.status==='driving'&&this.landed&&p.z>=route.finish&&Math.abs(p.x-route.x)<6&&contacts>=2)this.status='finished';
      if(this.status==='driving'&&(p.y< -7||Math.abs(p.x-route.x)>12))this.status='wrecked';
    }
  }
  run(seconds:number,input:Input={}){for(let i=0;i<Math.round(seconds/DT);i++)this.step(input);}
  snapshot(){const p=this.body.translation(),v=this.body.linvel();return {position:{x:p.x,y:p.y,z:p.z},velocity:{x:v.x,y:v.y,z:v.z},speed:Math.hypot(v.x,v.z),time:this.time,ticks:this.ticks,stage:this.stage,airborneTicks:this.airborneTicks,landed:this.landed,status:this.status};}
  dispose(){this.world.free();}
}


