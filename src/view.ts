import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {PARTS,deformGeometry} from './damage';
import {ROUTES,routeSolids} from './routes';
import {Simulation,wheelPositions} from './simulation';
import {HAZARDS,hammerAngle} from './hazards';
export class GameView {
 readonly scene=new T.Scene();
 readonly camera=new T.PerspectiveCamera(55,1,.1,650);
 readonly renderer:T.WebGLRenderer;
 readonly meshes=new Map<string,T.Group>();
 private dentCounts=new Map<string,number>();
 private truck=new T.Group();
 private labFloor=new T.Group();
 private snapCamera=true;
 private hazards=new T.Group();
 constructor(host:HTMLElement,readonly simulation:Simulation){
  this.renderer=new T.WebGLRenderer({antialias:true});host.append(this.renderer.domElement);this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
  this.scene.background=new T.Color(0xc5d0cf);this.scene.fog=new T.Fog(0xc5d0cf,140,430);
  this.scene.add(new T.HemisphereLight(0xe5f0ff,0x514733,2));
  const sun=new T.DirectionalLight(0xffe3af,3.5);sun.position.set(-45,80,-25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-110,right:110,top:110,bottom:-110,far:250});sun.shadow.bias=-.0005;this.scene.add(sun);
  const ground=this.box(340,1,400,new T.MeshStandardMaterial({color:0x657749,roughness:1}));ground.position.set(0,-9.2,25);ground.receiveShadow=true;
  const road=new T.MeshStandardMaterial({color:0x3c4448,roughness:.95});
  for(const s of routeSolids()){const m=this.box(s.w,s.h,s.d,road);m.position.set(s.x,s.y,s.z);m.rotation.x=s.angle??0;m.receiveShadow=true;}
  for(const r of ROUTES){
   for(const side of [-1,1]){
    const edge=this.box(.17,.07,105,new T.MeshStandardMaterial({color:r.color}));edge.position.set(r.x+side*6.6,.045,-55);
    for(let z=-105;z<-2;z+=6){const dash=this.box(.12,.08,2.6,new T.MeshStandardMaterial({color:0xdbd9ca}));dash.position.set(r.x+side*2.8,.05,z);}
   }
   for(let row=0;row<3;row++)for(let col=0;col<14;col++){const m=this.box(1,.025,1,new T.MeshStandardMaterial({color:(row+col)%2?0x22272a:0xf5f1d8}));m.position.set(r.x-6.5+col,.025,r.finish+row);}
   const gate=new T.Group();this.scene.add(gate);gate.position.set(r.x,0,r.finish+3);
   const mat=new T.MeshStandardMaterial({color:r.color,metalness:.4,roughness:.5});for(const x of [-7,7]){const p=this.box(.3,8,.3,mat,gate);p.position.set(x,4,0);}const cross=this.box(14.4,.8,.3,mat,gate);cross.position.y=8;
   const sign=this.label(r.name.toUpperCase(),'#182025',`#${r.color.toString(16)}`,1024,160);sign.scale.set(10,1.55,1);sign.position.set(r.x,7.9,r.finish+2.8);this.scene.add(sign);
   const pit=this.box(13,.15,r.gapEnd-12,new T.MeshStandardMaterial({color:0x9a280a,emissive:0xff3900,emissiveIntensity:.8}));pit.position.set(r.x,-6,(r.gapEnd+12)/2);
  }
  // Arena seating and light towers give the jumps an arena scale.
  const concrete=new T.MeshStandardMaterial({color:0x767c76,roughness:.9}),seat=new T.MeshStandardMaterial({color:0x50626b,roughness:.8});
  for(const side of [-1,1])for(let row=0;row<7;row++){const stand=this.box(5,1.2,240,row%2?seat:concrete);stand.position.set(side*(65+row*3),row*1.6-1,10);}
  for(const x of [-57,57])for(const z of [-90,0,95]){const pole=this.box(.3,25,.3,concrete);pole.position.set(x,11,z);const lamps=this.box(5,1,.7,new T.MeshStandardMaterial({color:0xfaf8e8,emissive:0xfff5cd,emissiveIntensity:2}));lamps.position.set(x,24,z);}
  this.scene.add(this.labFloor);const floor=this.box(70,.5,100,new T.MeshStandardMaterial({color:0x52616b,metalness:.2,roughness:.75}),this.labFloor);floor.position.set(0,-.25,0);const grid=new T.GridHelper(70,35,0xffbc6b,0x83909a);grid.position.y=.01;this.labFloor.add(grid);
  this.resetTruck();window.addEventListener('resize',()=>this.resize());this.resize();
  this.scene.add(this.hazards);
  for(const h of HAZARDS){const g=new T.Group();g.position.set(h.x,h.y,h.z);g.userData.hazard=h;this.hazards.add(g);
   if(h.kind==='hammer'){const rotor=new T.Group();g.add(rotor);const metal=new T.MeshStandardMaterial({color:0x71828a,metalness:.8,roughness:.35});this.box(7.2,.6,.9,metal,rotor);for(const side of [-1,1]){const head=this.box(1.6,1.6,1.5,new T.MeshStandardMaterial({color:0xc47a26,metalness:.7,roughness:.4}),rotor);head.position.x=side*3.6;}const support=this.box(.6,8,.6,metal,g);support.position.set(0,-2,1.4);}
   if(h.kind==='spikes'){for(let x=-5;x<=5;x+=1)for(let z=-1;z<=1;z++){const spike=new T.Mesh(new T.ConeGeometry(.45,2.4,16),new T.MeshStandardMaterial({color:0x7e9097,metalness:.85,roughness:.3}));spike.position.set(x,0,z);g.add(spike);}}
   if(h.kind==='fire'){for(let i=0;i<18;i++){const flame=new T.Mesh(new T.ConeGeometry(.25,2.2,7),new T.MeshBasicMaterial({color:i%2?0xff9b18:0xff4819,transparent:true,opacity:.68,depthWrite:false,blending:T.AdditiveBlending}));flame.position.set((i-8.5)*.65,0,Math.sin(i)*.4);g.add(flame);}const nozzle=this.box(12,.25,.6,new T.MeshStandardMaterial({color:0x42494c,metalness:.8}),g);nozzle.position.y=-1.2;}
  }
 }
 box(w:number,h:number,d:number,mat:T.Material,parent:T.Object3D=this.scene){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 label(text:string,fg:string,bg:string,w=512,h=128){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d')!;ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle=fg;ctx.font=`900 ${h*.56}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,w/2,h/2,w*.93);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));}
 resetTruck(){
  this.truck.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});this.scene.remove(this.truck);this.truck=new T.Group();this.scene.add(this.truck);this.meshes.clear();this.dentCounts.clear();this.snapCamera=true;
  for(const def of PARTS){const g=new T.Group();g.name=def.id;this.truck.add(g);this.meshes.set(def.id,g);
   const wheel=def.id.startsWith('wheel');const geometry=wheel?new T.TorusGeometry(.77,.28,16,48):new RoundedBoxGeometry(...def.size,4,.08);
   if(wheel)geometry.rotateY(Math.PI/2);
   const mat=new T.MeshStandardMaterial({color:wheel?0x171b1f:def.id.startsWith('chassis')?0x252d33:0xe65a26,metalness:wheel?0:.5,roughness:wheel?.95:.4});
   const m=new T.Mesh(geometry,mat);m.castShadow=true;m.receiveShadow=true;g.add(m);
   if(wheel){const rim=new T.Mesh(new T.CylinderGeometry(.49,.49,.72,32),new T.MeshStandardMaterial({color:0xb2bcc3,metalness:.9,roughness:.24}));rim.rotation.z=Math.PI/2;g.add(rim);}
  }
  // Cab glass is mounted with the roof so it falls away with that panel.
  const cab=this.box(2.2,.85,1.7,new T.MeshPhysicalMaterial({color:0x203d4d,metalness:.3,roughness:.14}),this.meshes.get('roof'));cab.position.y=-.55;
 }
 resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 render(snap=false){
  const s=this.simulation,root=new T.Vector3().copy(s.body.translation()),q=new T.Quaternion().copy(s.body.rotation());
  this.labFloor.visible=s.stage==='lab';
  this.hazards.visible=s.stage!=='lab';for(const g of this.hazards.children){const h=g.userData.hazard;if(h.kind==='hammer')g.children[0].rotation.z=hammerAngle(s.time);if(h.kind==='fire')g.children.forEach((f,i)=>{if(i<18){f.scale.y=.8+.35*Math.sin(s.time*13+i*4);f.position.y=.1+f.scale.y*.4;}});}
  for(const def of PARTS){const state=s.parts.get(def.id)!,g=this.meshes.get(def.id)!;g.userData.detached=!!state.body;
   if(state.body){g.position.copy(state.body.translation());g.quaternion.copy(state.body.rotation());}
   else{const local=new T.Vector3(...def.pos);const wi=PARTS.slice(2,6).findIndex(p=>p.id===def.id);if(wi>=0){local.copy(wheelPositions[wi]);local.y-=s.vehicle.wheelSuspensionLength(wi)??.6;}g.position.copy(local.applyQuaternion(q).add(root));g.quaternion.copy(q);
    if(wi>=0){g.rotateY(s.vehicle.wheelSteering(wi)??0);g.rotateX(s.vehicle.wheelRotation(wi)??0);}
   }
   const old=this.dentCounts.get(def.id)??0;for(let i=old;i<state.dents.length;i++){const mesh=g.children[0] as T.Mesh;deformGeometry(mesh.geometry,state.dents[i].point,state.dents[i].strength);}this.dentCounts.set(def.id,state.dents.length);
  }
  const desired=root.clone().add(new T.Vector3(s.stage==='lab'?10:9,s.stage==='lab'?6:5.5,-12));
  if(this.snapCamera||snap){this.camera.position.copy(desired);this.snapCamera=false;}else this.camera.position.lerp(desired,.12);
  this.camera.lookAt(root.clone().add(new T.Vector3(0,.5,s.stage==='lab'?0:5)));this.renderer.render(this.scene,this.camera);
 }
}
