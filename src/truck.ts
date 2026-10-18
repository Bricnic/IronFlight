import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {PARTS} from './damage';
export type TruckMaterials={paint?:T.MeshStandardMaterial;metal?:T.MeshStandardMaterial};
/** Repeatable hero asset. Every attachment owns a named group and local pivot. */
export function createTruck(materials:TruckMaterials={}){
 const truck=new T.Group();truck.name='iron-flight-monster';
 const paint=materials.paint??new T.MeshStandardMaterial({color:0xd85324,metalness:.62,roughness:.3});
 const steel=materials.metal??new T.MeshStandardMaterial({color:0x8d9b9f,metalness:.85,roughness:.32});
 const dark=new T.MeshStandardMaterial({color:0x202a30,metalness:.65,roughness:.45});
 const rubber=new T.MeshStandardMaterial({color:0x14191d,roughness:.92});
 const glass=new T.MeshPhysicalMaterial({color:0x214556,metalness:.5,roughness:.12,clearcoat:1});
 const cream=new T.MeshStandardMaterial({color:0xffead0,metalness:.3,roughness:.4});
 const light=new T.MeshStandardMaterial({color:0xfff2ca,emissive:0xffdb8e,emissiveIntensity:1.3});
 function mesh(parent:T.Object3D,geometry:T.BufferGeometry,material:T.Material,pos=[0,0,0]){const m=new T.Mesh(geometry,material);m.position.fromArray(pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function rounded(parent:T.Object3D,size:number[],pos:number[],mat:T.Material=paint,segments=3,radius=.06){return mesh(parent,new RoundedBoxGeometry(size[0],size[1],size[2],segments,radius),mat,pos);}
 function bar(parent:T.Object3D,a:T.Vector3,b:T.Vector3,radius=.045,mat:T.Material=steel){const m=mesh(parent,new T.CylinderGeometry(radius,radius,a.distanceTo(b),12),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return m;}
 const groups=new Map<string,T.Group>();
 for(const def of PARTS){const g=new T.Group();g.name=def.id;g.position.fromArray(def.pos);truck.add(g);groups.set(def.id,g);
  if(def.id.startsWith('wheel')){
   const tire=new T.TorusGeometry(.75,.32,32,112);tire.rotateY(Math.PI/2);mesh(g,tire,rubber);
   const tread=new T.BoxGeometry(.45,.13,.21);
   const treads=new T.InstancedMesh(tread,rubber,80);treads.name='tread-block';treads.castShadow=true;treads.receiveShadow=true;g.add(treads);let ti=0;const dummy=new T.Object3D();
   for(let i=0;i<40;i++)for(const side of [-1,1]){const angle=i/40*Math.PI*2+side*.025;dummy.position.set(side*.22,Math.cos(angle)*1.04,Math.sin(angle)*1.04);dummy.rotation.set(angle,side*.5,0);dummy.updateMatrix();treads.setMatrixAt(ti++,dummy.matrix);}
   const drum=mesh(g,new T.CylinderGeometry(.51,.51,.69,48,2),dark);drum.rotation.z=Math.PI/2;
   for(const side of [-1,1]){
    const lip=new T.TorusGeometry(.49,.035,12,64);lip.rotateY(Math.PI/2);mesh(g,lip,steel,[side*.36,0,0]);
    const hub=mesh(g,new T.CylinderGeometry(.18,.22,.14,24),steel,[side*.39,0,0]);hub.rotation.z=Math.PI/2;
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const spoke=rounded(g,[.06,.3,.075],[side*.37,Math.cos(a)*.28,Math.sin(a)*.28],steel,1,.015);spoke.rotation.x=a;const bolt=mesh(g,new T.CylinderGeometry(.025,.025,.04,6),cream,[side*.41,Math.cos(a)*.145,Math.sin(a)*.145]);bolt.rotation.z=Math.PI/2;}
   }
  }else{const structural=def.id.startsWith('chassis');rounded(g,[...def.size],[0,0,0],structural?dark:def.id.startsWith('bumper')?steel:paint,structural?2:8,structural?.06:.12);}
 }
 const hood=groups.get('hood')!,roof=groups.get('roof')!,bed=groups.get('bed')!,front=groups.get('chassis-front')!,rear=groups.get('chassis-rear')!;
 // Sculpted raised hood, inset grille and separate round headlights.
 rounded(hood,[1.15,.13,1.05],[0,.26,.04],paint,4,.06);
 const grille=rounded(hood,[1.35,.38,.08],[0,-.07,.81],dark,2,.03);
 for(let i=0;i<9;i++)rounded(grille,[.055,.3,.04],[(i-4)*.13,0,.05],steel,1,.015);
 for(const x of [-.96,.96]){const lamp=mesh(hood,new T.CylinderGeometry(.18,.18,.1,32),light,[x,.05,.82]);lamp.rotation.x=Math.PI/2;const ring=new T.TorusGeometry(.19,.035,12,40);mesh(hood,ring,steel,[x,.05,.89]);}
 for(const x of [-.8,.8])for(let i=0;i<5;i++)rounded(hood,[.22,.012,.045],[x,.235,-.4+i*.13],dark,1,.005);
 // Sloped glass, pillars and a steel internal cage beneath the roof.
 const windshield=rounded(roof,[2.1,.85,.045],[0,-.58,.77],glass,2,.02);windshield.rotation.x=.23;
 const backglass=rounded(roof,[1.95,.65,.04],[0,-.58,-.76],glass,2,.02);backglass.rotation.x=-.14;
 const cage=new T.Group();cage.name='roll-cage';roof.add(cage);
 for(const x of [-1.03,1.03])for(const z of [-.74,.74])bar(cage,new T.Vector3(x,-1.2,z*1.16),new T.Vector3(x*.93,-.12,z),.055,dark);
 bar(cage,new T.Vector3(-1,-.15,-.73),new T.Vector3(1,-1.1,-.83),.04,steel);bar(cage,new T.Vector3(1,-.15,-.73),new T.Vector3(-1,-1.1,-.83),.04,steel);
 for(const side of [-1,1]){
  const door=groups.get(side<0?'door-left':'door-right')!;
  const window=rounded(door,[.045,.51,1.23],[0,.66,0],glass,2,.02);window.rotation.z=side*.08;
  rounded(door,[.08,.07,.26],[side*.11,.22,-.43],steel,2,.025);
  const stripe=rounded(door,[.02,.18,1.55],[side*.105,-.14,0],cream,1,.005);stripe.name='livery-stripe';
  rounded(door,[.26,.2,.4],[side*.24,.68,.82],dark,3,.05);
  // Front and rear wheel arches are attached to the adjacent body panels.
  for(const [parent,z] of [[hood,0],[bed,.2]] as const){const arch=new T.TorusGeometry(1.25,.11,12,64,Math.PI);arch.rotateY(Math.PI/2);mesh(parent,arch,paint,[side*1.3,-1.15,z]);}
  rounded(bed,[.12,.45,1.6],[side*1.19,.35,0],paint,4,.04);
  bar(front,new T.Vector3(side*.75,-.1,.3),new T.Vector3(side*1.45,-.75,.85),.06,steel);
  bar(rear,new T.Vector3(side*.75,-.1,.2),new T.Vector3(side*1.45,-.75,0),.06,steel);
  const spring=new T.CurvePath<T.Vector3>();const points:T.Vector3[]=[];for(let i=0;i<=100;i++){const t=i/100;points.push(new T.Vector3(side*1.12+Math.cos(t*Math.PI*14)*.09,-.15-t*.65,Math.sin(t*Math.PI*14)*.09+.4));}
  const coil=new T.CatmullRomCurve3(points);mesh(front,new T.TubeGeometry(coil,100,.024,6,false),cream);
  const exhaust=mesh(front,new T.CylinderGeometry(.075,.075,1.25,16),steel,[side*1.35,.2,-.7]);exhaust.rotation.x=.08;
 }
 // Deep bed, reinforcing ribs, exposed axles and suspension links.
 rounded(bed,[2.1,.08,1.3],[0,.25,0],dark,2,.03);for(let i=-4;i<=4;i++)rounded(bed,[.04,.06,1.2],[i*.2,.32,0],steel,1,.01);
 for(const [parent,z] of [[front,.85],[rear,-.05]] as const){bar(parent,new T.Vector3(-1.65,-.75,z),new T.Vector3(1.65,-.75,z),.13,dark);mesh(parent,new T.SphereGeometry(.26,24,16),steel,[0,-.75,z]);}
 const frontBumper=groups.get('bumper-front')!;for(const x of [-.85,.85]){const hook=new T.TorusGeometry(.13,.035,8,20);mesh(frontBumper,hook,cream,[x,-.15,.2]);}
 const tail=groups.get('bumper-rear')!;for(const x of [-1.08,1.08])rounded(tail,[.2,.14,.045],[x,.2,-.18],new T.MeshStandardMaterial({color:0xef241c,emissive:0xa80b00}),2,.03);
 return truck;
}
export function truckStats(truck:T.Object3D){let triangles=0,treadBlocks=0,meshes=0;truck.traverse(o=>{if(o instanceof T.Mesh){const count=o instanceof T.InstancedMesh?o.count:1;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*count;meshes++;if(o.name==='tread-block')treadBlocks+=count;}});return {triangles,treadBlocks,meshes};}
