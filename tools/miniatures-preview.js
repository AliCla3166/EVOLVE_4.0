import {config,loadConfig} from '../app/core/config.js';
import {whenPaintedReady,drawPaintedUnit,drawPaintedBuilding} from '../app/render/painted.js';
await loadConfig();
const select=document.querySelector('#stage'),sheet=document.querySelector('#sheet');
for(const s of config.stages.stages)select.add(new Option(s.n+' · '+s.name,s.n));
const roles=['eclaireur','brute','tireur','tank','soigneur','boss'];
const shapes=['core','vacuole','bassin','carriere','ossuaire','helice','champ','silo','caserne','forge','sanctuaire','vigie','porte','home0','home1','home2'];
async function render(){const stage=+select.value;await Promise.all(['units','buildings'].map(k=>whenPaintedReady(k,stage)));if(stage!==+select.value)return;sheet.replaceChildren();for(const [kind,list] of [['units',roles],['buildings',shapes]])for(const name of list){const f=document.createElement('figure'),c=document.createElement('canvas'),label=document.createElement('figcaption');c.width=c.height=280;const g=c.getContext('2d');g.scale(2,2);if(kind==='units')drawPaintedUnit(g,{stage},{x:70,y:132,size:112,archetype:name});else drawPaintedBuilding(g,{stage,x:70,y:132,s:49,shape:name,badge:false});label.textContent=name;f.append(c,label);sheet.append(f);}}
select.onchange=render;await render();
let count=0;const errors=[];
for(const a of config.miniatures.atlases){try{const im=new Image();im.src=a.file;await im.decode();if(im.naturalWidth!==a.width||im.naturalHeight!==a.height)throw Error('dimensions');for(const [x,y,w,h] of a.rects){if(w<=0||h<=0||x<0||y<0||x+w>a.width||y+h>a.height)throw Error('découpe');count++;}}catch(e){errors.push(a.key+': '+e.message);}}
document.querySelector('#results').textContent=`${count} sprites vérifiés dans ${config.miniatures.atlases.length} planches. ${errors.length?errors.join(', '):'Aucune erreur de chargement ou de découpe.'}`;
document.querySelector('#results').dataset.failures=errors.length;
