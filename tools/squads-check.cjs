const fs=require('fs'),assert=require('assert/strict');
(async()=>{
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const su=url(fs.readFileSync('app/core/squads.js','utf8')),S=await import(su),T=await import(url(fs.readFileSync('app/core/tactics.js','utf8').replace("'./squads.js'",JSON.stringify(su))));
const b=JSON.parse(fs.readFileSync('data/battle.json')),c=b.tactics,q=b.squads;let checks=0,id=0;
const ok=(x,m)=>{assert.ok(x,m);checks++;};
for(const [role,n] of Object.entries(q.members))for(const [level,extra] of [[1,0],[2,0],[3,1],[6,2],[9,3],[20,3]])ok(S.squadSize(role,level,q)===n+extra,role+' reinforcement '+level);
const make=(side,x,y=0)=>({foeN:++id,side,x,y,role:'melee',speed:75,range:28,interval:1,hp:100,maxHp:100,sizeMult:1});
const contact=make('p',500),near=make('e',555),far=make('e',750);contact.targetId=far.foeN;
ok(!T.tacticalMove(contact,[contact,near,far],1/60,75,c,{home:60,laneLen:1200,squads:q}),'fight reachable opponent instead of walking into blockage');
const group=S.deploySquad(()=>make('p',130),8,'s1',q,1200);ok(group.length===8&&new Set(group.map(u=>u.y)).size===8,'distinct deployment slots');ok(new Set(group.map(u=>u.cd)).size===8,'staggered attacks');
const enemies=Array.from({length:8},(_,i)=>make('e',350,group[i].y));S.assignTargets([...group,...enemies],.5,q);ok(new Set(group.map(u=>u.targetId)).size>3,'individual target distribution');enemies.forEach(u=>u.dead=true);S.assignTargets([...group,...enemies],.5,q);ok(group.every(u=>u.targetId===null),'dead targets cleared');
const p={startX:0,endX:100,startRow:-2,endRow:2,arcHeight:60};ok(S.ballisticPoint(p,0).lift===0&&S.ballisticPoint(p,1).lift===0,'ground endpoints');ok(S.ballisticPoint(p,.5).lift===60,'arc apex');
const units=[];for(const side of ['p','e'])for(let i=0;i<60;i++)units.push(make(side,side==='p'?150+Math.floor(i/9)*49:1050-Math.floor(i/9)*49,([0,1,-1,2,-2,3,-3,4,-4][i%9])*48));
const started=performance.now();for(let tick=0;tick<240;tick++){S.assignTargets(units,1/60,q);for(const u of units)T.tacticalMove(u,units,1/60,u.speed,c,{home:u.side==='p'?60:1140,laneLen:1200,squads:q});T.applyPressure(units,c,1/60,1200);T.resolveFormation(units,c,1200);}
let min=Infinity;for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++)min=Math.min(min,T.distance(units[i],units[j]));ok(min>=c.radius*2-1,'120 fighters cannot hide inside each other');ok(units.every(u=>Number.isFinite(u.x)&&Math.abs(u.y)<=c.halfWidth),'bounded battlefield');
for(const side of ['p','e']){const home=side==='p'?60:1140;T.beginRetreat(units,side,home,c);for(let i=0;i<600;i++){for(const u of units.filter(u=>u.side===side))T.tacticalMove(u,units,1/60,u.speed,c,{home,laneLen:1200,retreat:true});T.resolveFormation(units,c,1200);}ok(units.filter(u=>u.side===side).every(u=>Math.abs(u.x-home)<380),'60 units rally '+side);}
console.log(checks+' checks passed; minimum spacing '+min.toFixed(2)+'; simulation '+Math.round(performance.now()-started)+' ms');
})().catch(e=>{console.error(e);process.exitCode=1;});
