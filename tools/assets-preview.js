import { drawCreature } from '../app/render/creature.js';
import { drawBuilding, drawTurret, SHAPE_IDS } from '../app/render/buildings.js';
import { FACTIONS, wildVisual } from '../app/render/genes.js';
import { ICONS, svgIcon, iconify, watch } from '../app/core/icons.js';
const $ = id => document.getElementById(id);
const [stagesData, mutationsData] = await Promise.all(['stages','mutations'].map(x=>fetch(`../data/${x}.json`).then(r=>r.json())));
const stages=stagesData.stages, mutations=mutationsData.mutations;
const roles={eclaireur:'Éclaireur',brute:'Brute',tireur:'Tireur',tank:'Gardien',soigneur:'Soigneur'};
for(const st of stages) $('stage').add(new Option(`${st.n} · ${st.name}`,st.n));
for(const m of mutations) $('mutation').add(new Option(m.name,m.id));
let running=true, elapsed=1.4, previous=0;
const jobs=[];
function card(parent,label,sub,draw){
 const box=document.createElement('div'); box.className='card';
 const cv=document.createElement('canvas');cv.setAttribute('aria-label',label);cv.setAttribute('role','img');
 const text=document.createElement('div');text.className='label';text.textContent=label;
 const small=document.createElement('small');small.textContent=sub; text.append(small);
 box.append(cv,text); $(parent).append(box);jobs.push({cv,draw});return cv;
}
function selected(){return stages[Number($('stage').value)-1];}
function visual(st=selected()) {return {seed:Number($('seed').value),stage:st.n,bodyplan:st.bodyplan,eyes:1,...(mutations.find(m=>m.id===$('mutation').value)?.visual||{})};}
function creature(c,w,h,st,role='eclaireur',size=95,v=visual(st),x=w/2){
 drawCreature(c,v,{x,y:h*.85,size,t:elapsed,tint:st.palette.tint,archetype:role,pose:$('pose').value,atk:elapsed%1});
}
card('hero','Le noyau fendu','Un organe, dix métamorphoses.',(c,w,h)=>creature(c,w,h,selected(),'eclaireur',Math.min(w*.6,h*.76)));
card('sizes','32 / 48 / 72 / 104 px','La silhouette reste prioritaire à petite taille.',(c,w,h)=>[32,48,72,104].forEach((s,i)=>creature(c,w,h,selected(),'eclaireur',s,visual(),w*(.12+i*.25))));
for(const [role,name] of Object.entries(roles))card('roles',name,{eclaireur:'Élan vertical · aiguillon',brute:'Masse haute · percuteur',tireur:'Profil oblique · lanceur',tank:'Masse large · carapace',soigneur:'Arc ouvert · diapason'}[role],(c,w,h)=>creature(c,w,h,selected(),role,Math.min(w*.57,h*.68)));
for(const st of stages)card('stages',`${String(st.n).padStart(2,'0')} / ${st.name}`,st.tagline,(c,w,h)=>creature(c,w,h,st,'eclaireur',Math.min(w*.55,h*.69)));
for(const shape of [...SHAPE_IDS,'core'])card('buildings',shape==='core'?'Cœur':shape,'',(c,w,h)=>drawBuilding(c,{x:w/2,y:h*.85,s:Math.min(w*.34,h*.33),shape,level:3,palette:selected().palette,aquatic:selected().n<=2,t:elapsed}));
for(const shape of ['baliste','machoire','autel'])card('buildings',shape,'Tourelle',(c,w,h)=>drawTurret(c,{x:w/2,y:h*.85,s:Math.min(w*.29,h*.28),shape,tint:selected().palette.tint,t:elapsed,fire:$('pose').value==='attack'?1-elapsed%1:0}));
for(const faction of Object.keys(FACTIONS))card('factions',faction.replace('les_','Les ').replaceAll('_',' '),'',(c,w,h)=>creature(c,w,h,selected(),'brute',Math.min(w*.5,h*.65),wildVisual(visual(),3166,faction)));
for(const name of Object.keys(ICONS)){const e=document.createElement('div');e.className='icon';e.append(svgIcon(name,26),document.createTextNode(name));$('icons').append(e);}
function frame(now){if(running)elapsed+=Math.min(.05,(now-previous)/1000||0);previous=now;
 for(const {cv,draw}of jobs){const w=cv.clientWidth,h=cv.clientHeight,dpr=Math.min(2,devicePixelRatio||1);if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);c.fillStyle=selected().palette.bg;c.fillRect(0,0,w,h);draw(c,w,h);}
 requestAnimationFrame(frame);
}
$('pause').onclick=()=>{running=!running;$('pause').textContent=running?'Mettre en pause':'Reprendre';};
$('export').onclick=()=>{
 const cv=document.createElement('canvas');cv.width=1600;cv.height=1150;const c=cv.getContext('2d');
 c.fillStyle='#20262F';c.fillRect(0,0,1600,1150);c.fillStyle='#FFC24B';c.font='700 18px Nunito';c.fillText('EVOLVE / RELIQUES VIVANTES',55,50);
 c.fillStyle='#F4F1E8';c.font='32px "Lilita One"';c.fillText('La même vie. Dix façons d’habiter le monde.',55,100);
 for(const st of stages){const col=(st.n-1)%5,row=Math.floor((st.n-1)/5),x=170+col*310,y=335+row*265;drawCreature(c,visual(st),{x,y,size:160,t:1.4,tint:st.palette.tint});c.fillStyle='#F4F1E8';c.font='700 18px Nunito';c.textAlign='center';c.fillText(st.name,x,y+35);}
 [...SHAPE_IDS,'core'].forEach((shape,i)=>{const col=i%7,row=Math.floor(i/7),x=120+col*225,y=865+row*190;drawBuilding(c,{x,y,s:65,shape,level:3,t:1,palette:selected().palette,aquatic:selected().n<=2});c.fillStyle='#F4F1E8';c.font='700 15px Nunito';c.textAlign='center';c.fillText(shape,x,y+32);});
 const url=cv.toDataURL('image/png');$('download').href=url;$('export-image').src=url;$('export-result').hidden=false;$('export-result').scrollIntoView({behavior:'smooth'});
};
// Test réel Canvas : 10 stades × 5 rôles × 3 tailles × 3 poses + toutes les mutations.
// Vérifie aussi l'isolation du contexte entre unités et les icônes de nœuds voisins.
async function verify(){
 const cv=document.createElement('canvas');cv.width=320;cv.height=320;const c=cv.getContext('2d');let count=0;const errors=[];
 function check(label,draw){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,320,320);c.fillStyle='#123456';c.globalAlpha=.87;c.lineWidth=7;c.textBaseline='alphabetic';const before=[c.fillStyle,c.globalAlpha,c.lineWidth,c.textBaseline,c.getTransform().toString()].join();
 try{draw();const after=[c.fillStyle,c.globalAlpha,c.lineWidth,c.textBaseline,c.getTransform().toString()].join();if(before!==after)throw Error('contexte graphique non restauré');if(!c.getImageData(0,0,320,320).data.some((v,i)=>i%4===3&&v))throw Error('rendu vide');count++;}catch(e){errors.push(`${label}: ${e.message}`);}}
 for(const st of stages)for(const archetype of Object.keys(roles))for(const size of [24,48,120])for(const pose of ['idle','walk','attack'])check(`${st.name}/${archetype}/${size}/${pose}`,()=>drawCreature(c,{stage:st.n,bodyplan:st.bodyplan,seed:3166},{x:160,y:240,size,t:1.2,archetype,pose,atk:.1,tint:st.palette.tint,facing:-1}));
 for(const m of mutations)check(m.id,()=>drawCreature(c,{stage:m.min_stage||1,seed:741,...m.visual},{x:160,y:240,size:110,t:1.2,pose:'attack',atk:.1}));
 for(const faction of Object.keys(FACTIONS))for(const st of stages)check(faction+st.n,()=>drawCreature(c,wildVisual({stage:st.n,bodyplan:st.bodyplan},3166,faction),{x:160,y:240,size:100,t:1}));
 for(const shape of [...SHAPE_IDS,'core'])for(const aquatic of [true,false])for(const [level,busy]of [[0,true],[1,false],[3,true],[9,false]])check(shape,()=>drawBuilding(c,{x:160,y:240,s:60,shape,level,busy,aquatic,palette:selected().palette,t:1}));
 for(const shape of ['machoire','baliste','autel'])for(const fire of [0,.8])check(shape,()=>drawTurret(c,{x:160,y:240,s:50,shape,fire,tint:'#4EA8E8',level:2}));
 for (const m of mutations) {
  const stage=m.min_stage||1, base={stage,seed:741,eyes:1};
  const render=v=>{c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,320,320);drawCreature(c,v,{x:160,y:240,size:110,t:1.2});return cv.toDataURL();};
  if(render(base)===render({...base,...m.visual}))errors.push(`${m.id}: mutation sans effet visuel`);
 }
 const root=document.createElement('div');for(let i=0;i<12;i++){const b=document.createElement('button');b.textContent='🙂';root.append(b);}iconify(root);if(root.querySelectorAll('svg').length!==12||root.querySelectorAll('[aria-label]').length!==12)errors.push('Remplacement des emojis voisins');
 watch(root);const b=document.createElement('button');b.textContent='😄';root.append(b);await new Promise(r=>requestAnimationFrame(r));if(!b.querySelector('svg'))errors.push('Remplacement des emojis ajoutés');
 $('checks').textContent=errors.length?errors.join('\n'):`${count} rendus vérifiés · dix stades · cinq rôles · ${mutations.length} mutations · cinq factions · chantiers et tourelles · contexte restauré · emojis voisins et dynamiques remplacés.`;
 $('checks').dataset.result=errors.length?'fail':'pass';
}
requestAnimationFrame(frame);await verify();
