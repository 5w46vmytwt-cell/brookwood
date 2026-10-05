/* Reusable visual cues. All times are absolute milliseconds from startedAt. */
(() => {
 const clamp=x=>Math.max(0,Math.min(1,x));
 const ramp=(t,r)=>clamp((t-r[0])/(r[1]-r[0]));
 function resolve(timeline,elapsedMs){
  const visuals={};
  for(const cue of timeline.cues){
   if(!cue.visual)continue; // Future optional metadata does not execute anything.
   const v=cue.visual;
   let opacity=elapsedMs>=cue.at&&elapsedMs<cue.end?(v.opacity??1):0;
   if(v.fadeIn)opacity*=ramp(elapsedMs,v.fadeIn);
   if(v.fadeOut)opacity*=1-ramp(elapsedMs,v.fadeOut);
   if(v.darken)opacity*=1-v.darken.amount*ramp(elapsedMs,v.darken.range);
   if(v.flicker&&elapsedMs>=v.flicker.at&&elapsedMs<v.flicker.end){const f=v.flicker;opacity*=f.base+f.amplitude*Math.sin((elapsedMs-f.origin)/1000*f.frequency)}
   const scale=v.scale?v.scale.from+(v.scale.to-v.scale.from)*ramp(elapsedMs,v.scale.range):1;
   visuals[cue.id]={opacity,scale};
  }
  return {elapsedMs,done:elapsedMs>=timeline.end,visuals};
 }
 class Renderer{
  constructor(document,timeline,options={}){
   this.elapsedNow=options.elapsedNow||(()=>Date.now()-this.startedAt);
   this.externallyDriven=!!options.externallyDriven;
   this.timeline=timeline;this.startedAt=null;this.raf=null;this.layers=[];
   for(const cue of timeline.cues){
    if(!cue.visual)continue;
    const node=document.getElementById(cue.visual.target);
    if(!node)throw new Error('Missing cinematic layer: '+cue.visual.target);
    this.layers.push({cue,node});
    if(cue.visual.src){
     if(node.getAttribute?.('src')!==cue.visual.src)node.setAttribute?.('src',cue.visual.src);
     node.addEventListener('error',()=>{node.style.visibility='hidden'});
     if(node.complete&&node.naturalWidth===0)node.style.visibility='hidden';
    }
    if(cue.visual.text)node.textContent=cue.visual.text;
    for(const part of cue.visual.content||[]){
     if(part.firstText){if(node.firstChild?.nodeType===3)node.firstChild.nodeValue=part.text}
     else{const child=node.querySelector?.(part.selector);if(child)child.textContent=part.text}
    }
   }
  }
  update(state){
   const startedAt=Number(state.startedAt);
   if(state.phase!=='opening'||!Number.isFinite(startedAt)||startedAt<=0){this.stop();return}
   if(this.startedAt!==startedAt){this.stop();this.startedAt=startedAt}
   const frame=this.paint();
   if(!this.externallyDriven&&this.raf===null&&!frame.done)this.raf=requestAnimationFrame(()=>this.tick());
  }
  paint(){
   const frame=resolve(this.timeline,this.elapsedNow());
   for(const {cue,node} of this.layers){const v=frame.visuals[cue.id];node.style.opacity=v.opacity;if(cue.visual.scale)node.style.transform='scale('+v.scale+')'}
   return frame;
  }
  tick(){this.raf=null;if(this.startedAt===null)return;if(!this.paint().done)this.raf=requestAnimationFrame(()=>this.tick())}
  stop(){if(this.raf!==null)cancelAnimationFrame(this.raf);this.raf=null;this.startedAt=null}
 }
 globalThis.BrookwoodTimeline={resolve,Renderer};
})();
