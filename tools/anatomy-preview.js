import {showMutationPreview} from '../app/render/mutation-preview.js';
import {loadConfig,config,stageOf} from '../app/core/config.js';
import {drawAnatomy,whenAnatomyReady,anatomyParts} from '../app/render/anatomy.js';
import {drawEnvironment,drawAtmosphere} from '../app/render/environments.js';
await loadConfig();const base={stage:1,seed:724,eyes:1,eye_size:1},defs=config.mutations.mutations.filter(m=>m.min_stage===1),selected=new Set();
await whenAnatomyReady(base);const controls=document.querySelector('#choices');
for(const m of defs){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=m.id;input.onchange=()=>input.checked?selected.add(m.id):selected.delete(m.id);label.append(input,' '+m.name);controls.append(label);}
const choose=all=>{selected.clear();for(const input of controls.querySelectorAll('input')){input.checked=all;if(all)selected.add(input.value);}};
document.querySelector('#all').onclick=()=>choose(true);document.querySelector('#none').onclick=()=>choose(false);
const visual=mask=>Object.assign({...base},...defs.filter((m,i)=>mask===undefined?selected.has(m.id):mask&(1<<i)).map(m=>m.visual));
const cv=document.querySelector('#creature'),g=cv.getContext('2d');
function frame(now){const w=cv.clientWidth,h=cv.clientHeight;if(cv.width!==w*2||cv.height!==h*2){cv.width=w*2;cv.height=h*2;}g.setTransform(2,0,0,2,0,0);drawEnvironment(g,'colony',stageOf(1),w,h,now/1000);g.fillStyle='rgba(7,23,30,.3)';g.fillRect(0,0,w,h);drawAtmosphere(g,stageOf(1),w,h,now/1000);drawAnatomy(g,visual(),{x:w/2,y:h*.88,size:Math.min(w,h)*.67,t:now/1000});requestAnimationFrame(frame);}requestAnimationFrame(frame);
for(let i=0;i<defs.length;i++){const f=document.createElement('figure'),c=document.createElement('canvas'),name=document.createElement('figcaption');c.width=c.height=240;drawAnatomy(c.getContext('2d'),visual(1<<i),{x:120,y:210,size:150,t:1});name.textContent=defs[i].name;f.append(c,name);document.querySelector('#samples').append(f);}
const signatures=new Set(),compositions=new Set();let failures=0;
for(let mask=0;mask<1<<defs.length;mask++){const c=document.createElement('canvas');c.width=c.height=240;const ctx=c.getContext('2d');if(!drawAnatomy(ctx,visual(mask),{x:120,y:210,size:150,t:1}))failures++;const pixels=ctx.getImageData(0,0,240,240).data;let hash=2166136261;for(let i=0;i<pixels.length;i++)hash=Math.imul(hash^pixels[i],16777619);signatures.add(hash);compositions.add(JSON.stringify(anatomyParts(visual(mask))));}
if(signatures.size!==128||compositions.size!==128)failures++;
document.querySelector('#results').textContent=`${signatures.size} apparences distinctes sur 128 combinaisons · ${failures} échec.`;document.querySelector('#results').dataset.failures=failures;

const compare=document.createElement('button');compare.className='chip';compare.textContent='Comparer le noyau double';compare.onclick=()=>{const def=defs.find(d=>d.id==='noyau_double');showMutationPreview({def,before:visual(),after:{...visual(),...def.visual},st:stageOf(1),onChoose:()=>{selected.add(def.id);controls.querySelector('input[value=noyau_double]').checked=true;}});};controls.append(compare);
