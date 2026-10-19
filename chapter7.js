import {BROADCAST_SRC,BLACKOUT_MS,BROADCAST_FADE_MS} from './chapter7-timing.js';
import {Chapter7Investigation} from './chapter7-story.js';
import {storyProgressDue} from './chapter7-story-timing.js';

// Driven by the existing TV scheduler and poller. Only this TV owns media;
// authenticated media events acknowledge state through the existing host API.
export class Chapter7View{
 constructor(document,clock,{request=(...args)=>globalThis.lobbyRequest(...args),onState=(state,timing)=>document.dispatchEvent(new CustomEvent('brookwood-broadcast-state',{detail:{state,timing}})),createInvestigation=(doc,timer,options)=>new Chapter7Investigation(doc,timer,options)}={}){
  this.document=document;this.clock=clock;this.request=request;this.onState=onState;
  this.createInvestigation=createInvestigation;
  this.video=document.getElementById('chapter7Video');this.button=document.getElementById('chapter7Play');this.error=document.getElementById('chapter7Error');
  this.epoch=0;this.id=null;this.state=null;this.authenticated=false;this.blocked=false;this.attempted=false;this.pending=new Set();this.failed=new Set();this.restored=false;
  this.video.addEventListener('playing',()=>{if(!this.state)return;this.blocked=false;this.error.hidden=true;this.button.hidden=true;if(this.state.chapter7.step==='blackout')this.ack('broadcast-playing');});
  this.video.addEventListener('ended',()=>{if(this.state?.chapter7.step==='playing')this.ack('broadcast-ended');});
  this.video.addEventListener('error',()=>{if(this.state)this.problem('BROADCAST COULD NOT LOAD — RETRY PLAYBACK');});
  this.button.onclick=()=>{this.failed.clear();this.error.hidden=true;if(this.video.ended){this.ack('broadcast-ended');return;}if(!this.video.paused){this.ack('broadcast-playing');return;}this.attempted=false;this.play();};
 }
 now(){return this.state.chapter7.startedAt+this.clock.elapsedNow();}
 update(state){
  const c=state.chapter7;
  if(c.investigation){
   if(this.id!==c.id){this.stop();this.id=c.id;}
   this.state=state;this.video.hidden=true;this.video.style.opacity='0';this.video.pause();this.button.hidden=true;this.error.hidden=true;
   this.story??=this.createInvestigation(this.document,this.clock,{request:this.request,onState:this.onState});this.story.update(state);return;
  }
  this.video.hidden=false;
  if(this.id!==c.id){
   this.stop();this.state=state;this.id=c.id;const epoch=this.epoch;
   if(!['fading','waiting'].includes(c.step)){
    this.video.src=BROADCAST_SRC;this.video.load();
    Promise.resolve(this.request('/api/host',{action:'maze-session'})).then(()=>{if(this.epoch===epoch){this.authenticated=true;this.update(this.state);}}).catch(()=>{if(this.epoch===epoch)this.problem('AUTHENTICATE HOST WITH CTRL+SHIFT+C TO RESUME');});
   }
  }
  this.state=state;if(this.clock.canSync?.()===false)return;
  if(c.step==='waiting'){this.video.style.opacity='0';this.video.pause();this.button.hidden=true;this.error.hidden=true;return;}
  if(c.step==='fading'){this.video.style.opacity=String(Math.max(0,1-(this.now()-c.endedAt)/BROADCAST_FADE_MS));this.video.volume=0;this.video.pause();this.button.hidden=true;return;}
  if(this.now()<c.startedAt+BLACKOUT_MS)return;
  if(!this.authenticated||this.blocked)return;
  if(this.video.readyState<2)return; // No clock starts while media is loading.
  if(!this.restored){
   this.restored=true;
   if(c.playbackStartedAt!==null){try{this.video.currentTime=Math.min(Math.max(0,(this.now()-c.playbackStartedAt)/1000),Math.max(0,this.video.duration-.25));}catch{this.restored=false;return;}}
  }
  if(!this.attempted)this.play();
  if(!this.video.paused){this.video.style.opacity='1';this.video.volume=Math.min(1,Math.max(0,(this.video.duration-this.video.currentTime)/.35));}
 }
 play(){
  if(!this.state||!this.authenticated||this.now()<this.state.chapter7.startedAt+BLACKOUT_MS)return;
  this.attempted=true;const epoch=this.epoch;this.video.muted=false;this.video.volume=1;
  try{Promise.resolve(this.video.play()).catch(()=>{if(epoch===this.epoch)this.problem('');});}catch{this.problem('');}
 }
 problem(message){this.blocked=true;this.button.hidden=!this.authenticated;this.error.textContent=message;this.error.hidden=!message;}
 ack(action){
  if(this.pending.has(action)||this.failed.has(action)||!this.state)return;
  const state=this.state,epoch=this.epoch,sentAt=performance.now();this.pending.add(action);
  Promise.resolve(this.request('/api/host',{action,generation:state.generation,broadcastId:state.chapter7.id})).then(result=>{
   if(this.epoch!==epoch)return;this.onState(result.state,{sentAt,receivedAt:performance.now()});
  }).catch(()=>{if(this.epoch===epoch){this.failed.add(action);this.video.pause();this.attempted=false;this.problem('PLAY BROADCAST TO RETRY');}}).finally(()=>{if(this.epoch===epoch)this.pending.delete(action);});
 }
 stop(){
  if(this.id===null&&this.state===null)return;
  this.epoch++;this.state=null;this.id=null;this.video.pause();this.video.removeAttribute('src');this.video.load();this.video.style.opacity='0';this.video.volume=1;
  this.button.hidden=true;this.error.hidden=true;this.authenticated=false;this.blocked=false;this.attempted=false;this.restored=false;this.pending.clear();this.failed.clear();
  if(this.story?.state)this.story.stop();
 }
 progressDue(now){const c=this.state?.chapter7;if(!c)return false;return c.step==='fading'?now>=c.endedAt+BROADCAST_FADE_MS:storyProgressDue(c,now);}
}
