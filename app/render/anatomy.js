// Un même assemblage sert au portrait, aux choix de mutation et aux petites unités.
import {paintedRecord,whenPaintedReady} from './painted.js';
export const hasPaintedAnatomy=visual=>visual.stage===1;
export const whenAnatomyReady=visual=>hasPaintedAnatomy(visual)?whenPaintedReady('anatomy',1):Promise.resolve(false);
export function anatomyParts(v){
  return {cilia:v.limbs==='cilia'?Math.min(10,v.limb_count||8):0,flagellum:v.tail==='flagellum',armor:v.skin==='thick',nuclei:Math.max(1,Math.min(3,v.eyes||1)),vacuoles:v.spots==='gold'?Math.min(6,v.spot_count||4):0,glow:!!v.aura,spines:v.back==='spikes'?Math.min(8,v.spike_count||6):0};
}
export function drawAnatomy(c,v,o={}){
  if(!hasPaintedAnatomy(v))return false;
  const r=paintedRecord('anatomy',1);if(!r?.ready)return false;
  const parts=anatomyParts(v),size=o.size||150,t=(o.t||0)+(v.seed||0)%17;
  const draw=(index,x,y,height,widthLimit=height*2)=>{const b=r.asset.rects[index],ratio=b[2]/b[3],h=Math.min(height,widthLimit/ratio),w=h*ratio;c.drawImage(r.image,...b,x-w/2,y-h/2,w,h);};
  const limb=(index,angle,length,phase=0)=>{c.save();c.translate(Math.cos(angle)*size*.27,Math.sin(angle)*size*.25);c.rotate(angle+Math.PI/2+Math.sin(t*3+phase)*.055);const b=r.asset.rects[index],w=Math.min(size*.16,length*b[2]/b[3]);c.drawImage(r.image,...b,-w/2,-length,w,length);c.restore();};
  c.save();c.translate(o.x||0,(o.y||0)-size*.58+Math.sin(t*2)*size*.012);c.scale(o.facing||1,1);
  const breathe=1+Math.sin(t*2)*.018;c.scale(breathe,1/breathe);
  if(o.dying)c.globalAlpha*=1-o.dying*.8;
  if(v.tint_shift||v.faction||o.flash)c.filter=`hue-rotate(${(v.tint_shift||0)+(v.faction?125:0)}deg) brightness(${1+(o.flash||0)*.7})`;
  if(parts.glow){c.save();c.globalAlpha*=.65+Math.sin(t*2)*.15;draw(7,0,0,size*.96);c.restore();}
  if(parts.flagellum)limb(5,Math.PI*.88,size*.58,2);
  for(let i=0;i<parts.cilia;i++)limb(4,i/parts.cilia*Math.PI*2,size*(.22+.025*Math.sin(t*4+i)),i);
  for(let i=0;i<parts.spines;i++)limb(6,Math.PI+(.2+i/Math.max(1,parts.spines-1)*2.75),size*.26,i);
  if(parts.armor)draw(1,0,0,size*.77);
  draw(0,0,0,size*.64);
  for(let i=0;i<parts.vacuoles;i++){const a=.15+i/parts.vacuoles*Math.PI*2;draw(3,Math.cos(a)*size*.23,Math.sin(a)*size*.20,size*.085);}
  const closed=t%6>5.8;
  for(let i=0;i<parts.nuclei;i++){const x=(i-(parts.nuclei-1)/2)*size*.17;draw(closed?8:2,x,-size*.015,size*(parts.nuclei===1?.22:.17)*Math.min(1.25,v.eye_size||1));}
  c.restore();return true;
}
