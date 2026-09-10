// PowerShell : Get-Content tools/tactics-check.cjs -Raw | node
const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const T=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('app/core/tactics.js','utf8')).toString('base64'));
 const c=JSON.parse(fs.readFileSync('data/battle.json','utf8')).tactics;
 let id=0,checks=0;
 const unit=(side,x,role='melee',y=0)=>({side,x,y,role,hp:100,maxHp:100,range:role==='ranged'?230:28,sizeMult:1,speed:45,foeN:++id,dead:false});
 const ok=(condition,label)=>{assert.ok(condition,label);checks++;};
 const simulate=(units,seconds=5,retreat=false)=>{for(let tick=0;tick<seconds*60;tick++){
  T.placeUnits(units,c);T.resolveFormation(units,c,1200);
  for(const u of units)T.tacticalMove(u,units,1/60,u.speed,c,{home:u.side==='p'?60:1140,laneLen:1200,retreat});
  T.applyPressure(units,c,1/60,1200);T.resolveFormation(units,c,1200);
 }};
 let units=[unit('p',500),unit('e',600)];simulate(units);
 ok(T.distance(...units)>=2*c.radius+c.separation-.2,'Opponents stay separated');ok(units[0].x<units[1].x,'Fronts do not cross');
 units=Array.from({length:13},(_,i)=>{const u=unit(i<7?'p':'e',i<7?510:600);delete u.y;return u;});simulate(units,8);
 let min=Infinity;for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++)min=Math.min(min,T.distance(units[i],units[j]));
 console.log('Crowded front minimum separation',min.toFixed(2));ok(min>2*c.radius+c.separation-.5,'Crowded fronts reserve space');
 for(const side of ['p','e']){
  const d=side==='p'?1:-1,opp=side==='p'?'e':'p';
  units=[unit(side,600),unit(side,600-d*80,'ranged'),unit(opp,600+d*100)];simulate(units,3);
  ok(d*(units[0].x-units[1].x)>100,side+' ranged stays behind engaged front');
  units=[unit(side,600,'ranged')];const before=units[0].x;simulate(units,1);ok(d*(units[0].x-before)>1,side+' lone ranged advances');
  units=[unit(side,600),unit(side,600-d*80,'ranged')];T.beginRetreat(units,side,side==='p'?60:1140,c);simulate(units,10,true);
  ok(units.every(u=>Math.abs(u.x-(side==='p'?60:1140))<260),side+' retreat reaches home');
 }
 units=[unit('p',500),unit('p',420),unit('p',420,'tank',80),unit('e',600)];const x=units[3].x;for(let i=0;i<60;i++)T.applyPressure(units,c,1/60,1200);
 ok(units[3].x>x+10,'Numerical melee superiority pushes');
 units=[unit('p',500),unit('e',600)];const same=units[0].x;T.applyPressure(units,c,1,1200);ok(units[0].x===same,'Equal forces no pressure');
 const S=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('app/core/settlement.js','utf8')).toString('base64'));
 const world=JSON.parse(fs.readFileSync('data/environments.json','utf8')).world,stages=JSON.parse(fs.readFileSync('data/stages.json','utf8')).stages;
 const state={species:{stage:1,cycle:1,stagePoints:0},colony:{coreLevel:1,buildings:{}}};
 ok(S.updateSettlement(state,world,stages).homes===3,'Initial refuge');state.colony.buildings.a={level:18};
 ok(S.updateSettlement(state,world,stages).homes===144,'Completed settlement');state.colony.buildings.a.level=1;
 ok(S.updateSettlement(state,world,stages).homes===144,'Visual growth cannot shrink');state.species.stage=2;
 ok(S.updateSettlement(state,world,stages).homes===3,'New age resets settlement');ok(state.colony.buildings.a.level===1,'Economic structure retained');
 units=[unit('e',600),unit('e',700),...Array.from({length:4},(_,i)=>unit('p',500-i*60))];units[0].hp=units[1].hp=40;
 ok(T.shouldRetreat(units,'e',1140,c),'AI regroups when wounded and outnumbered');
 units[0].hp=units[1].hp=100;ok(!T.shouldRetreat(units,'e',1140,c),'Healthy AI does not retreat needlessly');
 units=[unit('p',1050,'tank')];units[0].speed=15;T.beginRetreat(units,'p',60,c);simulate(units,10,true);ok(units[0].x<300,'Slow tank reaches rally within retreat duration');
 units=[unit('p',500,'tank'),unit('e',600,'tank')];units[0].sizeMult=1.6;T.resolveFormation(units,c,1200);ok(T.distance(...units)>=c.radius*2.6+c.separation-.1,'Large bodies reserve larger space');
 for(const side of ['p','e']){
  const d=side==='p'?1:-1,front=unit(side,600),healer=unit(side,600-d*105,'support'),foe=unit(side==='p'?'e':'p',600+d*120);
  healer.range=120;front.hp=40;
  ok(!T.tacticalMove(healer,[front,healer,foe],1/60,45,c,{home:side==='p'?60:1140,laneLen:1200}),side+' healer can act behind engaged front');
  ok(T.distance(front,healer)<=healer.range,side+' healer stays within healing range');
 }
 console.log(checks+' checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
