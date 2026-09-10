import { plate, oval, line, nucleus, material } from './relic.js';
import { makeRng } from '../core/rng.js';
const sprites=new Map();
export function settlementSites(buildings) {
  return [{id:'coeur',shape:'core',x:720,y:540,core:true},...buildings.map(b=>{
    const a=-Math.PI/2+b.slot/12*Math.PI*2;
    return {...b,x:720+Math.cos(a)*370,y:540+Math.sin(a)*190};
  })];
}
export function settlementLots(seed,sites,max=144) {
  const rng=makeRng(String(seed)),lots=[];
  for(let y=325;y<825;y+=39)for(let x=115;x<1350;x+=49) {
    const px=x+(rng()-.5)*16,py=y+(rng()-.5)*12;
    if(((px-720)/610)**2+((py-570)/270)**2>1)continue;
    if(sites.some(s=>Math.hypot((px-s.x)*.8,py-s.y)<(s.core?95:57)))continue;
    lots.push({x:px,y:py,variant:Math.floor(rng()*4),size:20+rng()*7,rank:Math.hypot((px-720)*.5,py-540)+rng()*170});
  }
  return lots.sort((a,b)=>a.rank-b.rank).slice(0,max);
}
// Quatre habitations par âge : silhouettes minuscules en aperçu, détails lisibles au zoom.
export function homeSprite(st,variant=0) {
  const key=st.n+':'+variant;if(sprites.has(key))return sprites.get(key);
  if(sprites.size>=40)sprites.clear();
  const cv=document.createElement('canvas');cv.width=144;cv.height=144;
  const c=cv.getContext('2d');c.translate(72,115);c.scale(1.2,1.2);
  const p=material(st.palette.tint),bone=variant%2?p.bone:'#BCB6A8',roof=variant%2?p.dark:p.base;
  oval(c,2,2,31,9,'#10171B55');
  if(st.n<=2){
    oval(c,0,-18,27,22,p.dark,2);oval(c,-5,-24,21,22,bone,2);
    plate(c,'M-27-17 Q-26-47 0-54 Q26-43 23-16 Q11-37-4-35Z',roof,2);
    nucleus(c,0,-17,7,p.light);line(c,'M-19-24 Q-12-43-3-43 M12-28 15-37',p.bone,2);
    if(st.n===2){oval(c,25,-5,10,13,p.base,2);nucleus(c,25,-7,4,p.light);}
  }else if(st.n===3){
    plate(c,'M-31 0 Q-31-35-1-40 Q27-39 32 0Z',p.dark,2);
    plate(c,'M-31-7 Q-21-50 0-45 Q28-40 31-7 L17-15 Q0-32-19-12Z',roof,2);
    oval(c,0,-8,10,15,'#182128');line(c,'M-25-10 Q-17-35-2-36 M16-29 22-19',bone,2);
    oval(c,-30,-4,7,4,p.base);oval(c,27,2,10,4,p.base);
  }else if(st.n===4){
    plate(c,'M-23 0-23-28 0-48 25-28 25 0Z',bone,2);
    plate(c,'M-32-24 0-62 33-24 24-20 0-43-23-19Z',roof,2);
    plate(c,'M-6 0-6-20 7-20 7 0Z','#24272A',1);
    line(c,'M-17-29 0-49 20-27 M0-48 0-58',p.bone,2);
  }else if(st.n===5){
    plate(c,'M-25 0-25-34 20-40 29-33 29-3 0 6Z',bone,2);
    plate(c,'M-28-34-28-42 20-49 32-42 32-33 1-28Z',roof,2);
    plate(c,'M-8 2-8-17 Q0-28 8-19 L8 3Z',p.dark,1);
    plate(c,'M-23-39-23-48-17-48-17-40Z',bone,1);
    oval(c,33,0,5,7,p.base,1);
  }else if(st.n<=7){
    plate(c,'M-26 0-26-38-16-48 18-48 28-36 28 0 0 6Z',bone,2);
    plate(c,'M4 5 4-46 18-48 28-36 28 0Z',p.dark,1);
    plate(c,'M-30-35-16-55 18-55 33-35Z',roof,2);
    line(c,'M-18-22-6-22 M-18-15-6-15 M12-31 23-31 M12-24 23-24',p.light,3);
    plate(c,'M-8 3-8-8 0-8 0 5Z','#202731',1);
    if(st.n===7){line(c,'M-14-53-14-68',bone,2);oval(c,-14,-69,4,2,p.light);}
  }else{
    plate(c,'M-27 0-19-16-12-48 0-72 12-48 20-16 28 0 0 8Z',bone,2);
    plate(c,'M0 8 0-72 12-48 20-16 28 0Z',roof,1);
    nucleus(c,0,-25,7,p.light);
    line(c,'M-15-10-9-44 M14-10 9-44',p.light,1.5);
    if(st.n>=9){c.strokeStyle=p.base;c.lineWidth=3;c.beginPath();c.ellipse(0,-43,26,10,-.3,0,Math.PI*2);c.stroke();}
  }
  // Petits jardins / réserves donnent une échelle domestique aux monuments.
  if(variant===2){oval(c,-32,5,8,4,p.dark,1);line(c,'M-36 3-36-8 M-30 3-28-10',p.base,2);}
  if(variant===3){plate(c,'M23 4 23-6 35-6 35 5Z',p.dark,1);line(c,'M26-2 32-2',bone,2);}
  sprites.set(key,cv);return cv;
}
