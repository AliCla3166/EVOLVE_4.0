// Décors peints. L'image et le chemin partagent des coordonnées normalisées :
// aucun recadrage « cover » ne peut déplacer le chemin sous les unités.
import { config } from '../core/config.js';
const images = new Map();
const MAX_IMAGES = 4;
export function environmentTheme(stage) { return config.environments?.stages?.[stage - 1]; }
function imageFor(src) {
  if (!src) return null;
  let record=images.get(src);
  if (!record) {
    const image=new Image(); image.decoding='async';
    record={image,ready:false,failed:false}; images.set(src,record);
    image.onload=()=>{record.ready=true;}; image.onerror=()=>{record.failed=true;};
    image.src=new URL('../../'+src,import.meta.url).href;
    while(images.size>MAX_IMAGES)images.delete(images.keys().next().value);
  } else { images.delete(src); images.set(src,record); }
  return record;
}
export function preloadEnvironment(kind,stage) { const r=imageFor(environmentTheme(stage)?.[kind]); return r?.ready || false; }
export function drawEnvironment(c,kind,st,w,h,t=0) {
  const theme=environmentTheme(st.n), record=imageFor(theme?.[kind]);
  c.save();
  c.fillStyle=st.palette.bg;c.fillRect(0,0,w,h);
  if(record?.ready) c.drawImage(record.image,0,0,w,h);
  else {
    const grad=c.createLinearGradient(0,0,0,h);grad.addColorStop(0,st.palette.bg);grad.addColorStop(1,st.palette.ground);
    c.fillStyle=grad;c.fillRect(0,0,w,h);
    c.fillStyle=st.palette.bg2;
    c.beginPath();c.moveTo(0,h*.24);c.lineTo(w*.13,h*.11);c.lineTo(w*.3,h*.24);c.lineTo(w*.7,h*.16);c.lineTo(w,h*.25);c.lineTo(w,0);c.lineTo(0,0);c.closePath();c.fill();
  }
  c.restore(); return !!record?.ready;
}
// Une trace translucide, raccordée à la géométrie réelle du combat.
export function battleTrack(w,h,v) {
  const x0=w*v.pad_x_pct,y0=h*v.top_y_pct,x1=w*(1-v.pad_x_pct),y1=h*v.bottom_y_pct;
  const len=Math.hypot(x1-x0,y1-y0),nx=(y1-y0)/len,ny=-(x1-x0)/len;
  const left=[],right=[];
  for(let i=0;i<=14;i++) {
    const t=-.14+1.28*i/14,s=v.far_scale+(v.near_scale-v.far_scale)*Math.max(0,Math.min(1,t));
    const half=Math.min(w,h)*v.unit_pct*v.lane_half_width*s,px=x0+(x1-x0)*t,py=y0+(y1-y0)*t;
    left.push([px-nx*half,py-ny*half]);right.push([px+nx*half,py+ny*half]);
  }
  return {left,right,x0,y0,x1,y1};
}
export function drawBattleTrack(c,w,h,v,stage) {
  const {left,right}=battleTrack(w,h,v),theme=environmentTheme(stage);
  c.save();c.beginPath();c.moveTo(...left[0]);for(const p of left.slice(1))c.lineTo(...p);for(const p of [...right].reverse())c.lineTo(...p);c.closePath();
  c.fillStyle=theme?.road || '#91A1AE';c.globalAlpha=.13;c.fill();
  c.globalAlpha=.27;c.strokeStyle=theme?.road || '#91A1AE';c.lineWidth=Math.max(1,w*.0025);
  for(const side of [left,right]){c.beginPath();c.moveTo(...side[0]);for(const p of side.slice(1))c.lineTo(...p);c.stroke();}
  c.restore();
}
export function drawAtmosphere(c,st,w,h,t,strength=1) {
  const theme=environmentTheme(st.n),type=theme?.particle;
  c.save();
  for(let i=0;i<18;i++) {
    const x=(((i*137.51)%100)/100*w + Math.sin(t*.12+i)*w*.007),y=h-((t*(type==='bubble'?5:1.7)+i*71)%h);
    c.globalAlpha=(.12+.09*Math.sin(t*.6+i))*strength;c.fillStyle=i%4===0?'#E8D9AF':'#C7DEE3';
    c.beginPath();c.arc(x,y,(type==='bubble'?1.5:.85)*(1+(i%3)*.2),0,Math.PI*2);c.fill();
  }
  c.restore();
}
