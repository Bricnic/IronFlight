import {mkdir,writeFile} from "node:fs/promises";
import {TRACKS} from "../src/tracks.ts";
import {courseSolids} from "../src/course.ts";
await mkdir(new URL("../public/tracks/",import.meta.url),{recursive:true});
for(const track of TRACKS){
 const hex=`#${track.color.toString(16).padStart(6,"0")}`;
 let diagram="";
 if(track.legacy){
  for(let i=0;i<3;i++){const x=90+i*106;diagram+=`<path d="M${x-26} 177 L${x-22} 119 L${x} 103" stroke="#62727c" stroke-width="23" fill="none"/><ellipse cx="${x+5}" cy="78" rx="25" ry="40" fill="none" stroke="#aab5b9" stroke-width="11"/><ellipse cx="${x+5}" cy="78" rx="25" ry="40" fill="none" stroke="${["#a5d46b","#efbd5b","#ed7858"][i]}" stroke-width="3"/><path d="M${x-42} 132 L${x-25} 124 L${x-8} 132 L${x-25} 140Z" fill="#e16e2f"/>`;}
 }else{
  const all=[...track.path, ...(track.demolish ?? [])],xs=all.map(p=>p.x),zs=all.map(p=>p.z);
  const minX=Math.min(...xs)-25,maxX=Math.max(...xs)+25,minZ=Math.min(...zs)-20,maxZ=Math.max(...zs)+20;
  const scale=Math.min(310/(maxX-minX),142/(maxZ-minZ));
  const pt=p=>({x:200+(p.x-(minX+maxX)/2)*scale,y:104-(p.z-(minZ+maxZ)/2)*scale});
  if(track.mode==="race"){
   const d=track.path.map((p,i)=>{const v=pt(p);return `${i?"L":"M"}${v.x.toFixed(1)} ${v.y.toFixed(1)}`;}).join(" ");
   diagram+=`<path d="${d}" fill="none" stroke="#65747d" stroke-width="18" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${hex}" stroke-width="11" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#e9ece8" stroke-width="1" stroke-dasharray="3 5"/>`;
   for(const g of track.checkpoints){const p=pt(g);diagram+=`<circle cx="${p.x}" cy="${p.y}" r="3" fill="#f5f2db"/>`;}
   if(track.ring){const v=pt(track.ring);diagram+=`<circle cx="${v.x}" cy="${v.y}" r="6" fill="none" stroke="#ffd34d" stroke-width="2"/>`;}
  }else if(track.mode==="demolition"){
   for(const p of track.demolish ?? []){const v=pt(p);diagram+=`<circle cx="${v.x}" cy="${v.y}" r="5" fill="${hex}"/><circle cx="${v.x}" cy="${v.y}" r="2" fill="#17282c"/>`;}
  }else{
   for(const s of courseSolids(track).filter(s=>!["ground","road","support"].includes(s.kind))){const p=pt(s);diagram+=`<rect x="${p.x-s.w*scale/2}" y="${p.y-s.d*scale/2}" width="${s.w*scale}" height="${s.d*scale}" rx="1" fill="${s.kind==="lava"?"#df6630":"#55636a"}"/>`;}
   for(const p of track.collectibles){const v=pt(p);diagram+=`<circle cx="${v.x}" cy="${v.y}" r="5" fill="${hex}"/><circle cx="${v.x}" cy="${v.y}" r="2" fill="#17282c"/>`;}
  }
  const start=pt(track.spawn);diagram+=`<path d="M${start.x} ${start.y-5} l4 8 h-8Z" fill="white"/>`;
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#ffffff" stroke-opacity=".035"/></pattern><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#203740"/><stop offset="1" stop-color="#142329"/></linearGradient></defs><rect width="400" height="200" fill="url(#bg)"/><rect width="400" height="200" fill="url(#grid)"/><circle cx="350" cy="25" r="120" fill="${hex}" opacity=".08"/>${diagram}<text x="18" y="24" fill="${hex}" font-family="Arial,sans-serif" font-size="9" letter-spacing="2">${track.mode==="arena"?"COLLECTION ARENA":"ROUTE PREVIEW"}</text></svg>`;
 await writeFile(new URL(`../public/tracks/${track.id}.svg`,import.meta.url),svg);
}
