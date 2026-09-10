const fs=require('fs'),assert=require('assert/strict');
(async()=>{const V=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('app/core/veterancy.js','utf8')).toString('base64')),c=JSON.parse(fs.readFileSync('data/battle.json')).veterancy;let count=0;
const ok=(x,m)=>{assert.ok(x,m);count++;},make=()=>({sizeMult:1,interval:1,cd:.5,hp:40,maxHp:100,kills:0});
for(const side of ['p','e']){const u={...make(),side,fieldAge:10000};ok(!V.updateVeterancy(u,c),'time alone gives no rank');
for(let n=1;n<=9;n++){const victim={side:side==='p'?'e':'p'};ok(V.creditKill(victim,u),'kill credited');ok(!V.creditKill(victim,u),'no duplicate kill');V.updateVeterancy(u,c);ok((u.veteranRank||0)===Math.floor(n/3),'rank every three kills');}
ok(u.hp===40&&u.maxHp===100,'no healing');ok(u.sizeMult===1.24&&u.interval<1,'size and attack speed');u.kills=30;V.updateVeterancy(u,c);ok(u.sizeMult===1.24&&u.veteranRank===3,'cap, no compound bonuses');ok(Math.abs(u.cd/u.interval-.5)<.00001,'cooldown fraction');ok(V.receivedDamage(u,10,c)<16.5,'resistance');ok(!V.creditKill({side},u),'no friendly kill');const dead={...make(),dead:true,kills:9};ok(!V.updateVeterancy(dead,c)&&!dead.veteranRank,'no posthumous rank');}
ok(!V.creditKill({side:'e'},null),'no individual credit for towers');ok(V.receivedDamage(make(),10,c)===16.5,'damage multiplier');console.log(count+' checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
