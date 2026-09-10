// Positions, collisions et consignes identiques pour les deux camps.
import { cohesion } from './squads.js';
const dir=u=>u.side==='p'?1:-1;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const isFront=u=>u.role==='melee'||u.role==='tank';
export const radius=(u,c)=>c.radius*(u.sizeMult||1);
export const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y||0)-(b.y||0));
export const inReach=(u,v,c)=>distance(u,v)<=u.range+radius(u,c)+radius(v,c);
export function placeUnits(units,c){
  for(const u of units){
    if(u.dead||Number.isFinite(u.y))continue;
    const peers=units.filter(v=>v!==u&&!v.dead&&v.side===u.side&&Number.isFinite(v.y));
    const cost=r=>peers.reduce((n,v)=>n+Math.max(0,c.spawnWindow-Math.abs(u.x-v.x))*Math.max(0,1-Math.abs(r*c.rowStep-v.y)/c.rowStep),0);
    const row=[0,1,-1,2,-2,3,-3,4,-4].slice(0,c.rows||5).reduce((a,b)=>cost(b)<cost(a)?b:a);
    u.y=row*c.rowStep;
  }
}
export function beginRetreat(units,side,home,c){
  const list=units.filter(u=>!u.dead&&u.side===side).sort((a,b)=>(isFront(b)-isFront(a))||a.foeN-b.foeN);
  const rows=c.rows||5,ranks=Math.ceil(list.length/rows),step=c.radius*2+c.separation;
  list.forEach((u,i)=>{u.rally={x:home+dir(u)*(c.rallyOffset+(ranks-1-Math.floor(i/rows))*step),y:[0,1,-1,2,-2,3,-3,4,-4][i%rows]*c.rowStep};});
}
export function shouldRetreat(units,side,home,c){
  const a=units.filter(u=>!u.dead&&u.side===side),e=units.filter(u=>!u.dead&&u.side!==side);
  if(a.length<c.aiMinUnits||e.length<a.length*c.aiOutnumbered)return false;
  return a.reduce((n,u)=>n+u.hp/u.maxHp,0)/a.length<c.aiHealth&&a.some(u=>Math.abs(u.x-home)>c.aiHomeDistance&&e.some(v=>inReach(u,v,c)));
}
export function tacticalMove(u,units,dt,speed,c,{home,laneLen,retreat=false,hold=null,baseInReach=false,squads=null}={}){
  const step=speed*dt,d=dir(u),allies=units.filter(v=>v!==u&&!v.dead&&v.side===u.side),foes=units.filter(v=>!v.dead&&v.side!==u.side);
  const move=(x,y,mult=1)=>{
    const dx=x-u.x,dy=y-u.y,len=Math.hypot(dx,dy),amount=Math.min(len,step*mult);
    if(len>.5){u.x=clamp(u.x+dx/len*amount,0,laneLen);u.y=clamp(u.y+dy/len*amount,-c.halfWidth,c.halfWidth);u.pose='walk';return true;}
    u.pose='idle';return false;
  };
  if(retreat){if(!u.rally)beginRetreat(units,u.side,home,c);move(u.rally.x,u.rally.y,Math.max(c.retreatSpeed,c.retreatMinSpeed/Math.max(1,speed)));return true;}
  const foe=foes.find(v=>v.foeN===u.targetId)||foes.reduce((a,b)=>!a||distance(u,b)<distance(u,a)?b:a,null);
  if(!isFront(u)){
    const leaders=allies.filter(v=>isFront(v)&&d*(v.x-u.x)>-c.backlineGap);
    const leader=leaders.sort((a,b)=>d*(b.x-a.x))[0]||allies.filter(v=>d*(v.x-u.x)>c.radius).sort((a,b)=>d*(b.x-a.x))[0];
    if(leader){
      const gap=u.role==='support'?Math.min(c.backlineGap,Math.max(2*radius(u,c)+c.separation+4,u.range*.8)):c.backlineGap;
      const ceiling=leader.x-d*gap;
      if(d*(u.x-ceiling)>c.positionTolerance)return move(ceiling,u.y);
      const engaged=foes.some(v=>inReach(leader,v,c));
      if(engaged&&(!foe||!inReach(u,foe,c)))return move(ceiling,u.y);
    }
    if(foe&&distance(u,foe)<u.range*c.kiteDistance+radius(u,c)+radius(foe,c)){
      const x=u.x-d*step;if(d*(x-home)>c.radius)return move(x,u.y);
    }
  }
  if(foes.some(v=>inReach(u,v,c)))return false;
  if(baseInReach)return false;
  if(u.role==='support'&&allies.some(v=>v.hp<v.maxHp&&distance(u,v)<=u.range))return false;
  const group=squads?cohesion(u,units,squads):{y:u.y,speed:1};
  let x=u.x+d*step*group.speed;if(hold!==null&&d*(x-hold)>0)x=hold;
  const near=isFront(u)&&foe&&Math.abs(foe.x-u.x)<c.approachDistance;
  const targetY=near?foe.y:group.y;
  const y=u.y+clamp(targetY-u.y,-step*.6,step*.6);
  return move(x,y,group.speed);
}
export function resolveFormation(units,c,laneLen){
  const live=units.filter(u=>!u.dead);
  for(let pass=0;pass<c.iterations;pass++)for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){
    const a=live[i],b=live[j],gap=radius(a,c)+radius(b,c)+c.separation;
    let dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    if(len>=gap)continue;
    // Une colonne parfaitement alignée doit pouvoir ouvrir un rang derrière elle.
    // Sans cette petite composante longitudinale, le bord du couloir bloque le solveur.
    if(a.side===b.side&&Math.abs(dx)<.001){const shift=(a.foeN<b.foeN?-dir(a):dir(a))*.5;a.x-=shift;b.x+=shift;dx=b.x-a.x;len=Math.hypot(dx,dy);}
    if(len<.001){dx=a.side===b.side?0:dir(a);dy=a.side===b.side?1:0;len=1;}
    const overlap=gap-len;
    a.x-=dx/len*overlap*.5;b.x+=dx/len*overlap*.5;a.y-=dy/len*overlap*.5;b.y+=dy/len*overlap*.5;
    for(const u of [a,b]){u.x=clamp(u.x,0,laneLen);u.y=clamp(u.y,-c.halfWidth,c.halfWidth);}
  }
  for(const u of live)u._row=u.y/c.rowStep;
}
export function applyPressure(units,c,dt,laneLen){
  const live=units.filter(u=>!u.dead&&!u.retreating),p=live.filter(u=>u.side==='p'&&isFront(u)),e=live.filter(u=>u.side==='e'&&isFront(u));
  if(!p.length||!e.length)return;
  const contacts=p.filter(u=>e.some(v=>inReach(u,v,c)));
  if(!contacts.length)return;
  const near=live.filter(u=>isFront(u)&&contacts.some(v=>distance(u,v)<=c.pressureWindow));
  const np=near.filter(u=>u.side==='p').length,ne=near.length-np;
  const push=clamp((np-ne)/Math.max(1,Math.min(np,ne)),-1,1)*c.pushSpeed*dt;
  for(const u of near)u.x=clamp(u.x+push,0,laneLen);
}
