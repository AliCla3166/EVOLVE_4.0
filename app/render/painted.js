// Planches peintes RGBA ; les découpes restent des coordonnées, jamais des fonds opaques.
import { config } from '../core/config.js';
const records=new Map();
const roles=['eclaireur','brute','tireur','tank','soigneur','boss'];
const shapes=['core','vacuole','bassin','carriere','ossuaire','helice','champ','silo','caserne','forge','sanctuaire','vigie','porte','home0','home1','home2'];
export function paintedRecord(kind,stage){
  const asset=config.miniatures?.atlases?.find(a=>a.kind===kind&&a.stage===stage);if(!asset)return null;
  let r=records.get(asset.key);if(r){records.delete(asset.key);records.set(asset.key,r);return r;}
  const image=new Image();r={image,ready:false,asset,promise:null};records.set(asset.key,r);
  r.promise=new Promise(resolve=>{image.onload=()=>{r.ready=true;resolve(true);};image.onerror=()=>resolve(false);});
  image.src=new URL('../../'+asset.file,import.meta.url).href;
  // Six planches actives au maximum ; les fichiers restent dans le cache du navigateur.
  while(records.size>6)records.delete(records.keys().next().value);
  return r;
}
export function whenPaintedReady(kind,stage){return paintedRecord(kind,stage)?.promise||Promise.resolve(false);}
export function drawPaintedTurret(c,o){
  const r=paintedRecord('turrets',0);if(!r?.ready)return false;
  const index={baliste:0,machoire:1,autel:2}[o.shape]??0,b=r.asset.rects[index],s=o.s||25;
  const aspect=b[2]/b[3],height=Math.min(s*2.3,s*2.9/aspect),width=height*aspect,fire=o.fire||0;
  c.save();c.translate(o.x||0,o.y||0);c.scale(index===0?(o.facing||1):1,1);
  c.translate(index===0?-fire*s*.12:0,0);c.filter=`brightness(${1+fire*.35})`;
  blit(c,r,index,-width/2,-height,width,height);c.filter='none';
  if(fire>.1){c.strokeStyle=index===2?'#74D6CD':'#FFC24B';c.globalAlpha*=fire;c.lineWidth=2;c.beginPath();c.ellipse(0,-height*.55,s*(.3+(1-fire)*.8),s*.2,0,0,Math.PI*2);c.stroke();}
  c.restore();return true;
}
function blit(c,r,index,x,y,w,h){
  const b=r.asset.rects[index];if(!b)return;
  c.drawImage(r.image,b[0],b[1],b[2],b[3],x,y,w,h);
}
export function drawPaintedUnit(c,visual,o){
  const r=paintedRecord('units',visual.stage||1);if(!r?.ready)return false;
  const index=Math.max(0,roles.indexOf(o.archetype||'eclaireur')),b=r.asset.rects[index];if(!b)return false;
  const size=o.size||40,t=(o.t||0)+(visual.seed||0)%17,facing=o.facing||1;
  const bob=o.pose==='walk'?Math.abs(Math.sin(t*13))*size*.055:Math.sin(t*2)*size*.012;
  const attack=o.pose==='attack'?Math.sin((o.atk||0)*Math.PI)*.1:0;
  const aspect=b[2]/b[3],height=Math.min(size*(index===5?1.18:1),size*1.45/aspect),width=height*aspect;
  c.save();c.translate(o.x||0,(o.y||0)-bob);c.scale(facing,1);c.rotate(attack+(o.dying||0)*.6);
  c.globalAlpha*=1-(o.dying||0)*.8;
  const hue=(visual.tint_shift||0)+(visual.faction?125:0);
  if(hue||o.flash)c.filter=`hue-rotate(${hue}deg) brightness(${1+(o.flash||0)*.7})`;
  blit(c,r,index,-width/2,-height,width,height);
  // Les mutations restent exprimées sur le champ de bataille, sans redessiner le corps peint.
  if(visual.aura||visual.wings){c.globalAlpha*=.35;c.strokeStyle=visual.aura_color||o.tint||'#91DDE5';c.lineWidth=Math.max(1,size*.025);c.beginPath();c.ellipse(0,-height*.48,width*.65,height*.5,0,0,Math.PI*2);c.stroke();}
  c.restore();return true;
}
export function drawPaintedBuilding(c,o){
  const r=paintedRecord('buildings',o.stage||1);if(!r?.ready)return false;
  const index=shapes.indexOf(o.shape||'core');if(index<0)return false;
  const b=r.asset.rects[index],size=o.s||25,aspect=b[2]/b[3],height=Math.min(size*(index>=13?1.7:2.2),size*2.8/aspect),width=height*aspect;
  c.save();c.translate(o.x||0,o.y||0);
  blit(c,r,index,-width/2,-height,width,height);
  if(o.badge!==false&&o.level){const bw=Math.max(13,size*.42);c.fillStyle='#171B23';c.fillRect(width*.3,-bw*.5,bw,bw);c.fillStyle='#FFC24B';c.font=`900 ${Math.max(10,bw*.72)}px Nunito,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(o.level,width*.3+bw/2,0);}
  if(o.busy){c.strokeStyle='#FFC24B';c.lineWidth=2;c.beginPath();c.arc(0,-height-8,5,0,Math.PI*1.5);c.stroke();}
  c.restore();return true;
}
