import {assignTargets} from '../app/core/squads.js';
import { config, loadConfig, stageOf } from '../app/core/config.js';
import { defaultState, migrate } from '../app/core/state.js';
import { resetSettlement } from '../app/core/settlement.js';
import { createColonyWorld } from '../app/render/colony-world.js';
import { settlementLots,settlementSites,homeSprite } from '../app/render/housing.js';
import { drawEnvironment,drawBattleTrack,battleTrack } from '../app/render/environments.js';
import { drawCreature } from '../app/render/creature.js';
import { drawBuilding } from '../app/render/buildings.js';
import { h, modal, btn } from '../app/core/ui.js';
import * as T from '../app/core/tactics.js';
await loadConfig();
const $=id=>document.getElementById(id),s=defaultState();s.species.seed=721934;s.settings.sound=false;
const visual=()=>({stage:s.species.stage,bodyplan:stageOf(s.species.stage).bodyplan,seed:s.species.seed,eyes:1});
for(const st of config.stages.stages)$('stage').add(new Option(st.n+' · '+st.name,st.n));
function fixture(){s.species.stage=+$('stage').value;resetSettlement(s);s.colony.settlement.growth=+$('growth').value;for(const b of config.colony.buildings)s.colony.buildings[b.id]={level:+$('growth').value>.1?2:0};s.colony.coreLevel=1;resetSettlement(s);s.colony.settlement.growth=+$('growth').value;}
fixture();
const world=createColonyWorld($('world'),{getState:()=>s,getVisual:visual,onBuilding:id=>{const b=config.colony.buildings.find(b=>b.id===id),name=b?b.names[s.species.stage-1]:config.colony.core.names[s.species.stage-1];const m=modal(h('div',{},h('h2',{},name),h('p',{},'Bâtiment sélectionné sur la carte. Dans le jeu, cette fenêtre permet de construire ou améliorer.'),btn('Fermer',{onClick:()=>m.close()})));}});
$('stage').onchange=$('growth').onchange=()=>{fixture();world.refresh();};
for(const st of config.environments.stages)for(const kind of ['battle','colony']){const fig=document.createElement('figure'),img=new Image();img.src=st[kind];img.alt=st.name+' · '+kind;fig.append(img,h('figcaption',{},st.stage+' · '+(kind==='battle'?'Bataille':'Colonie')));$('sheet').append(fig);}
async function checks(){let passed=0;const errors=[];const assert=(v,t)=>{if(v)passed++;else errors.push(t);};
 for(const img of $('sheet').querySelectorAll('img')){try{await img.decode();assert(img.naturalWidth>=1000,img.alt);}catch{errors.push(img.alt);}}
 const sites=settlementSites(config.colony.buildings);
 for(const st of config.stages.stages){const lots=settlementLots('test'+st.n,sites);assert(lots.length===144,'144 emplacements âge '+st.n);assert(JSON.stringify(lots)===JSON.stringify(settlementLots('test'+st.n,sites)),'Stabilité âge '+st.n);for(let v=0;v<4;v++)assert(homeSprite(st,v).width>0,'Habitation '+st.n+':'+v);}
 const old=defaultState();old.version=1;delete old.colony.settlement;old.colony.buildings.a={level:4};old.wallet.elan=127;const migrated=migrate(old);assert(migrated.version===2,'Migration');assert(migrated.wallet.elan===127&&migrated.colony.buildings.a.level===4,'Économie préservée');
 for(const [w,h] of [[390,844],[844,390],[1200,900]]){const track=battleTrack(w,h,config.battle.view);assert(track.x0===w*.17&&track.y0===h*.3&&track.x1===w*.83&&track.y1===h*.72,'Diagonale '+w);}
 $('results').textContent=passed+' vérifications réussies'+(errors.length?'\nÉCHECS :\n'+errors.join('\n'):' · aucun échec');$('results').dataset.failures=errors.length;
}
$('checks').onclick=checks;checks();
let units=[],id=0,time=0,previous=0,paused=false,cd=0,rally=0;
const c=config.battle.tactics,v=config.battle.view,cv=$('combat'),g=cv.getContext('2d'),W=390,H=620;
function add(side,x,role='melee'){const a={melee:'brute',ranged:'tireur',tank:'tank',support:'soigneur'}[role];units.push({side,x,role,arch:a,foeN:++id,hp:100,maxHp:100,sizeMult:1,speed:75,range:role==='ranged'?230:role==='support'?200:28,dead:false});T.placeUnits(units,c);}
function reset(){units=[];time=0;cd=0;rally=0;for(let i=0;i<4;i++){add('p',330-i*65,i===3?'ranged':'melee');add('e',850+i*65,i===3?'ranged':'melee');}}
reset();$('mass').onclick=()=>{units=[];for(const side of ['p','e'])for(let i=0;i<60;i++){add(side,side==='p'?150+Math.floor(i/9)*49:1050-Math.floor(i/9)*49,i%9===0?'ranged':'melee');units.at(-1).y=[0,1,-1,2,-2,3,-3,4,-4][i%9]*48;}};$('forces').onclick=()=>{for(let i=0;i<3;i++)add('p',160-i*35,i===2?'tank':'melee');};$('reset').onclick=reset;
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Reprendre':'Pause';};$('retreat').onclick=()=>{if(cd>0)return;cd=30;rally=10;T.beginRetreat(units,'p',60,c);};
function project(u){const t=u.x/1200,scale=.78+.38*t,row=(u.y||0)/c.rowStep,dx=W*.66,dy=H*.42,len=Math.hypot(dx,dy);return {x:W*.17+dx*t+dy/len*row*v.row_spacing*W*v.unit_pct*scale,y:H*.3+dy*t-dx/len*row*v.row_spacing*W*v.unit_pct*scale,scale};}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.04,(now-previous)/1000||0);previous=now;
 if(!paused){time+=dt;cd=Math.max(0,cd-dt);rally=Math.max(0,rally-dt);assignTargets(units,dt,config.battle.squads);for(const u of units){u.retreating=u.side==='p'&&rally>0;T.tacticalMove(u,units,dt,u.speed,c,{home:u.side==='p'?60:1140,laneLen:1200,retreat:u.retreating,squads:config.battle.squads});}T.applyPressure(units,c,dt,1200);T.resolveFormation(units,c,1200);}
 const st=stageOf(s.species.stage);g.setTransform(2,0,0,2,0,0);drawEnvironment(g,'battle',st,W,H,time);drawBattleTrack(g,W,H,v,st.n);
 for(const x of [60,1140]){const p=project({x});drawBuilding(g,{stage:st.n,x:p.x,y:p.y,s:W*v.unit_pct*p.scale,shape:'core',palette:{...st.palette,tint:x===60?st.palette.tint:'#B87361'},aquatic:st.n<=2,badge:false});}
 units.map(u=>({u,p:project(u)})).sort((a,b)=>a.p.y-b.p.y).forEach(({u,p})=>{drawCreature(g,{...visual(),faction:u.side==='e'?'enemy':null},{painted:true,x:p.x,y:p.y,size:W*v.unit_pct*p.scale,t:time,tint:u.side==='p'?st.palette.tint:'#B87361',facing:(u.side==='p'?1:-1)*(u.retreating?-1:1),pose:u.pose,archetype:u.arch,role:u.role});g.fillStyle=u.side==='p'?'#74D6CD':'#E59173';g.beginPath();g.ellipse(p.x,p.y,4,1.5,0,0,Math.PI*2);g.fill();});
 $('retreat').disabled=cd>0;$('retreat').textContent=cd>0?'Retraite · '+Math.ceil(cd)+' s':'Retraite';$('combat-status').textContent='Simulation de placement sans dégâts · '+units.filter(u=>u.side==='p').length+' alliés / '+units.filter(u=>u.side==='e').length+' adversaires';
}
requestAnimationFrame(frame);
