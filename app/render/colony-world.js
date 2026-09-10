import { drawPaintedBuilding } from './painted.js';
import { config, stageOf } from '../core/config.js';
import { updateSettlement } from '../core/settlement.js';
import { h } from '../core/ui.js';
import { drawEnvironment, drawAtmosphere, environmentTheme } from './environments.js';
import { drawBuilding } from './buildings.js';
import { drawCreature } from './creature.js';
import { settlementSites, settlementLots, homeSprite } from './housing.js';

export function createColonyWorld(host,{getState,getVisual,onBuilding}) {
  const W=config.environments.world,ui=config.environments.ui;
  host.classList.add('colony-world');
  const canvas=h('canvas',{'aria-label':'Carte interactive de la colonie',tabIndex:0});
  const title=h('strong'),count=h('span'),status=h('div',{class:'world-status'},title,count);
  const info=h('div',{class:'world-info','aria-live':'polite'});
  const action=(label,text,fn)=>h('button',{class:'chip','aria-label':label,title:label,onClick:fn},text);
  const explore=action(ui.explore,ui.explore,()=>fullscreen(true));
  const controls=h('div',{class:'world-controls'},action(ui.zoomOut,'−',()=>zoomAt(zoom/1.3)),action(ui.zoomIn,'+',()=>zoomAt(zoom*1.3)),action(ui.recenter,'⌖',()=>resetCamera()),action(ui.close,'Fermer',()=>fullscreen(false)));
  controls.hidden=true;
  const help=h('div',{class:'world-help'},ui.previewHelp);
  host.append(canvas,status,explore,controls,info,help);explore.classList.add('world-explore');
  const g=canvas.getContext('2d'),marker=document.createComment('colony-world');
  let width=1,height=1,dpr=1,fit=1,zoom=1,cx=W.width/2,cy=W.height/2,full=false,raf=0,destroyed=false;
  let sites=[],lots=[],settlement=null,stamp='',lastUpdate=-1,st=null,visual=null,selected=null,oldFocus=null,oldOverflow='';
  const pointers=new Map();let gesture=null,moved=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function refresh(){
    const s=getState();st=stageOf(s.species.stage);visual=getVisual();
    settlement=updateSettlement(s,W,config.stages.stages);
    const key=s.species.seed+':'+s.species.cycle+':'+s.species.stage;
    if(key!==stamp){stamp=key;sites=settlementSites(config.colony.buildings);lots=settlementLots(key,sites,W.maxHomes);selected=null;info.hidden=true;}
    title.textContent=environmentTheme(st.n)?.name||st.name;
    count.textContent=`${ui.stages[settlement.phase]} · ${settlement.homes} ${ui.homes}`;
    host.dataset.homes=settlement.homes;host.dataset.stage=st.n;
  }
  function constrain(){
    const halfX=width/(fit*zoom*2),halfY=height/(fit*zoom*2);
    cx=halfX>=W.width/2?W.width/2:Math.max(halfX,Math.min(W.width-halfX,cx));
    cy=halfY>=W.height/2?W.height/2:Math.max(halfY,Math.min(W.height-halfY,cy));
    host.dataset.zoom=zoom.toFixed(2);
  }
  function resize(){
    width=host.clientWidth;height=full?host.clientHeight:W.previewHeight;
    canvas.style.height=height+'px';dpr=Math.min(2,devicePixelRatio||1);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    fit=Math.min(width/W.width,height/W.height);constrain();
  }
  function resetCamera(){zoom=1;cx=W.width/2;cy=W.height/2;constrain();}
  function worldPoint(x,y){return {x:cx+(x-width/2)/(fit*zoom),y:cy+(y-height/2)/(fit*zoom)};}
  function zoomAt(next,x=width/2,y=height/2){
    const before=worldPoint(x,y);zoom=Math.max(1,Math.min(W.maxZoom,next));
    const after=worldPoint(x,y);cx+=before.x-after.x;cy+=before.y-after.y;constrain();
  }
  function fullscreen(value){
    if(value===full)return;full=value;pointers.clear();gesture=null;
    if(full){oldFocus=document.activeElement;oldOverflow=document.body.style.overflow;host.before(marker);document.body.append(host);host.classList.add('world-fullscreen');host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','Explorer la colonie');document.body.style.overflow='hidden';}
    else{marker.replaceWith(host);host.classList.remove('world-fullscreen');host.removeAttribute('role');host.removeAttribute('aria-modal');host.removeAttribute('aria-label');document.body.style.overflow=oldOverflow;}
    explore.hidden=full;controls.hidden=!full;help.textContent=full?ui.help:ui.previewHelp;
    resize();resetCamera();if(full){zoomAt(Math.max(1.6,height/(W.height*fit)));canvas.focus();}else oldFocus?.focus();
  }
  function local(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  function beginGesture(){
    const a=[...pointers.values()];if(!a.length){gesture=null;return;}
    gesture={points:a.map(p=>({...p})),cx,cy,zoom,span:a.length>1?Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y):0};
  }
  function down(e){if(e.button!==0&&e.pointerType==='mouse')return;pointers.set(e.pointerId,local(e));moved=false;beginGesture();if(full)canvas.setPointerCapture(e.pointerId);}
  function move(e){
    if(!full||!pointers.has(e.pointerId)||!gesture)return;
    pointers.set(e.pointerId,local(e));const a=[...pointers.values()],b=gesture.points;
    if(a.length!==b.length){beginGesture();return;}
    const mid=p=>p.length>1?{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}:p[0];
    const m=mid(a),n=mid(b);if(Math.hypot(m.x-n.x,m.y-n.y)>4||a.length>1)moved=true;
    if(a.length>1){zoom=gesture.zoom;cx=gesture.cx;cy=gesture.cy;zoomAt(gesture.zoom*Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y)/Math.max(1,gesture.span),n.x,n.y);cx-=(m.x-n.x)/(fit*zoom);cy-=(m.y-n.y)/(fit*zoom);}
    else{cx=gesture.cx-(m.x-n.x)/(fit*zoom);cy=gesture.cy-(m.y-n.y)/(fit*zoom);}
    constrain();
  }
  function pick(p){
    const hit=sites.filter(s=>{const size=s.core?60:38;return Math.abs(s.x-p.x)<size*1.15&&p.y>s.y-size*2.2&&p.y<s.y+size*.3;}).sort((a,b)=>b.y-a.y)[0];
    if(hit){onBuilding(hit.id);return;}
    const home=lots.slice(0,settlement.homes).find(s=>Math.hypot(s.x-p.x,s.y-15-p.y)<24);
    selected=home||null;info.hidden=!home;
    if(home)info.textContent=`${ui.district} · ${settlement.homes} ${ui.homes}. ${ui.districtInfo}`;
  }
  function up(e){if(!pointers.has(e.pointerId))return;const p=local(e),wasMulti=pointers.size>1;pointers.delete(e.pointerId);if(!moved&&!wasMulti){if(!full)fullscreen(true);else pick(worldPoint(p.x,p.y));}if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);beginGesture();}
  function cancel(e){pointers.delete(e.pointerId);moved=true;beginGesture();}
  function wheel(e){if(!full)return;e.preventDefault();const p=local(e);zoomAt(zoom*Math.exp(-e.deltaY*.0015),p.x,p.y);}
  function key(e){
    if(!full)return;
    if(e.key==='Escape'){if(document.querySelector('.modal-backdrop,.modal-overlay'))return;fullscreen(false);e.preventDefault();return;}
    if(e.key==='Tab'&&!document.querySelector('.modal-backdrop,.modal-overlay')){const focus=[canvas,...controls.querySelectorAll('button')];const i=focus.indexOf(document.activeElement);focus[(i+(e.shiftKey?-1:1)+focus.length)%focus.length].focus();e.preventDefault();return;}
    if(document.activeElement!==canvas)return;
    const delta=80/(fit*zoom);
    if(e.key==='+'||e.key==='=')zoomAt(zoom*1.2);else if(e.key==='-')zoomAt(zoom/1.2);else if(e.key==='Home')resetCamera();else if(e.key==='ArrowLeft')cx-=delta;else if(e.key==='ArrowRight')cx+=delta;else if(e.key==='ArrowUp')cy-=delta;else if(e.key==='ArrowDown')cy+=delta;else return;
    constrain();e.preventDefault();
  }
  function draw(now){
    if(destroyed)return;raf=requestAnimationFrame(draw);if(document.hidden)return;
    if(now-lastUpdate>1000){refresh();lastUpdate=now;}
    const t=reduced.matches?0:now/1000,s=getState(),scale=fit*zoom;
    g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle=st.palette.bg;g.fillRect(0,0,width,height);
    g.translate(width/2,height/2);g.scale(scale,scale);g.translate(-cx,-cy);
    drawEnvironment(g,'colony',st,W.width,W.height,t);
    // Les sentiers appartiennent à la colonie et relient les bâtiments réellement présents.
    g.save();g.strokeStyle=environmentTheme(st.n).road;g.globalAlpha=.24;g.lineWidth=7;g.lineCap='round';
    for(const site of sites.slice(1)){if(!s.colony.buildings[site.id]?.level)continue;g.beginPath();g.moveTo(720,548);g.quadraticCurveTo((site.x+720)/2,site.y,site.x,site.y);g.stroke();}g.restore();
    const items=lots.slice(0,settlement.homes).map(p=>({y:p.y,draw:()=>{if (!drawPaintedBuilding(g,{stage:st.n,shape:'home'+p.variant%3,x:p.x,y:p.y,s:p.size,badge:false})) { const sprite=homeSprite(st,p.variant),size=p.size*2.2;g.drawImage(sprite,p.x-size/2,p.y-size*.8,size,size); }}}));
    for(const site of sites){const level=site.core?s.colony.coreLevel:s.colony.buildings[site.id]?.level||0,busy=s.colony.queue.some(q=>q.id===site.id);
      items.push({y:site.y,draw:()=>{
        if(level||busy)drawBuilding(g,{stage:st.n,x:site.x,y:site.y,s:site.core?60:38,shape:site.shape,level:Math.max(1,level),busy,t,palette:st.palette,aquatic:st.n<=2,badge:full});
        else{g.save();g.strokeStyle=st.palette.tint;g.globalAlpha=.4;g.lineWidth=2;g.setLineDash([4,7]);g.beginPath();g.ellipse(site.x,site.y,24,11,0,0,Math.PI*2);g.stroke();g.restore();}
      }});
    }
    const citizens=Math.min(W.maxCitizens,3+Math.floor(settlement.homes*.32)),occupied=[sites[0],...lots.slice(0,settlement.homes)];
    for(let i=0;i<citizens;i++){
      const a=occupied[(i*7)%occupied.length],b=occupied[(i*13+1)%occupied.length],phase=(t*.032+i*.371)%2,k=phase<=1?phase:2-phase;
      const x=a.x+(b.x-a.x)*k,y=a.y+(b.y-a.y)*k+14;
      items.push({y,draw:()=>drawCreature(g,visual,{painted:true,x,y,size:19+(i%3)*2,t:t+i,tint:st.palette.tint,pose:'walk',facing:(b.x-a.x)*(phase<=1?1:-1)>=0?1:-1,archetype:'eclaireur',role:'melee'})});
    }
    items.sort((a,b)=>a.y-b.y).forEach(item=>item.draw());
    if(selected){g.strokeStyle=st.palette.tint;g.lineWidth=2/scale;g.beginPath();g.ellipse(selected.x,selected.y,27,13,0,0,Math.PI*2);g.stroke();}
    drawAtmosphere(g,st,W.width,W.height,t,.7);
  }
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('wheel',wheel,{passive:false});document.addEventListener('keydown',key);
  const ro=new ResizeObserver(resize);ro.observe(host);refresh();resize();info.hidden=true;raf=requestAnimationFrame(draw);
  return {refresh,destroy(){destroyed=true;cancelAnimationFrame(raf);ro.disconnect();document.removeEventListener('keydown',key);if(full)fullscreen(false);host.replaceChildren();},fullscreen};
}
