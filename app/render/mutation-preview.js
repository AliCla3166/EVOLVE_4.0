import {h,btn,modal} from '../core/ui.js';
import {renderToCanvas} from './creature.js';
export function showMutationPreview({def,before,after,st,onChoose}){
  const a=h('canvas',{'aria-label':'Avant la mutation',role:'img'}),b=h('canvas',{'aria-label':'Après la mutation',role:'img'});
  let chosen=false;
  const m=modal(h('div',{},h('h2',{class:'modal-title'},def.name),h('p',{class:'modal-text'},def.desc),h('div',{class:'mutation-comparison'},h('figure',{},a,h('figcaption',{},'Ta lignée actuelle')),h('figure',{},b,h('figcaption',{},'Avec cette mutation'))),btn('Choisir cette mutation',{kind:'purple',size:'block',onClick:()=>{if(chosen)return;chosen=true;m.close();onChoose();}}),btn('Comparer les autres',{size:'block',onClick:()=>m.close()})));
  const start=performance.now(),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame(now){if(!a.isConnected)return;for(const [cv,v] of [[a,before],[b,after]])renderToCanvas(cv,v,{anatomy:true,painted:false,t:reduce?0:(now-start)/1000,tint:st.palette.tint});if(!reduce)requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
}
