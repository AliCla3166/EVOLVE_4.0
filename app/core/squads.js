// Une carte déploie un groupe ; les individus gardent leurs propres décisions et PV.
export function squadSize(archetype,level,settings){
  return (settings.members[archetype]||settings.members.brute)+settings.reinforcementLevels.filter(n=>level>=n).length;
}
export function collectionLevel(entry){return 1+Math.max(0,(entry?.count||0)-2);}
export function deploySquad(makeUnit,count,id,settings,laneLen){
  const result=[];
  for(let i=0;i<count;i++){
    const u=makeUnit(i),direction=u.side==='p'?1:-1;
    const row=[0,1,-1,2,-2,3,-3,4,-4][i%9];
    u.squadId=id;u.squadOffsetY=row*settings.spacing;u.y=u.squadOffsetY;
    u.x=Math.max(0,Math.min(laneLen,u.x-direction*Math.floor(i/9)*settings.spacing));
    u.cd=u.interval*(.15+(i*.173)% .7);u.targetId=null;u.targetTimer=(i%4)*.07;
    result.push(u);
  }
  return result;
}
export function assignTargets(units,dt,settings){
  const live=units.filter(u=>!u.dead),byId=new Map(live.map(u=>[u.foeN,u])),load=new Map();
  for(const u of live)if(byId.has(u.targetId))load.set(u.targetId,(load.get(u.targetId)||0)+1);
  for(const u of live){
    u.targetTimer=(u.targetTimer||0)-dt;
    const old=byId.get(u.targetId);
    if(old&&u.targetTimer>0)continue;
    if(old)load.set(old.foeN,Math.max(0,(load.get(old.foeN)||0)-1));
    let best=null,score=Infinity;
    for(const v of live){
      if(u.side===v.side)continue;
      const distance=Math.hypot(v.x-u.x,v.y-u.y);
      if(distance>settings.aggroDistance)continue;
      const n=distance+(load.get(v.foeN)||0)*settings.focusPenalty-(v===old?settings.targetStickiness:0);
      if(n<score){score=n;best=v;}
    }
    u.targetId=best?.foeN??null;u.targetTimer=settings.targetInterval+(u.foeN%5)*.017;
    if(best)load.set(best.foeN,(load.get(best.foeN)||0)+1);
  }
}
export function cohesion(u,units,settings){
  const peers=units.filter(v=>!v.dead&&v!==u&&v.side===u.side&&v.squadId===u.squadId);
  if(!u.squadId||!peers.length)return {y:u.y,speed:1};
  const x=peers.reduce((n,v)=>n+v.x,0)/peers.length,y=peers.reduce((n,v)=>n+v.y,0)/peers.length;
  const behind=(x-u.x)*(u.side==='p'?1:-1);
  return {y:y+(u.squadOffsetY||0)*.35,speed:behind>settings.cohesionDistance?settings.catchupSpeed:1};
}
export function ballisticPoint(p,progress){
  const t=Math.max(0,Math.min(1,progress));
  return {x:p.startX+(p.endX-p.startX)*t,row:p.startRow+(p.endRow-p.startRow)*t,lift:4*t*(1-t)*p.arcHeight};
}
