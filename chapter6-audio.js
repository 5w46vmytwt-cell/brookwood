import {phaseCues} from './chapter6-timing.js';
const mandatory=c=>['intro','result','zero','finale','selected','return'].includes(c.step);
// Chapter 6 owns one speech channel. The shared Chapter 1–5 player is unchanged.
export class MazeNarration{
 constructor(player,clock,{request=globalThis.lobbyRequest,onState=()=>{}}={}){
  this.player=player;this.clock=clock;this.request=request;this.onState=onState;
  this.active=null;this.run=null;this.state=null;this.finished=new Set();this.blocked=false;this.message='';this.epoch=0;
 }
 update(state,{reconstruct=false}={}){
  const c=state.chapter6,key=state.generation+':'+c.startedAt;
  if(this.run!==key){this.stop();this.run=key;}
  this.state=state;if(this.clock.canSync?.()===false)return;
  const elapsed=this.clock.elapsedNow(),now=c.startedAt+elapsed;
  if(this.active){if(this.active.ended)this.ack(this.active,now);else return;}
  if(this.active)return;
  if([...(this.player.activeSfx?.values()??[])].some(entry=>!entry.audio.paused))return;
  const cues=phaseCues(c),cue=cues.find(x=>x.type==='narration'&&elapsed>=x.at&&(mandatory(c)||elapsed<x.at+x.durationMs));
  if(!cue)return;
  const id=c.sequence+':'+cue.id;if(this.finished.has(id))return;
  const audio=this.player.media.get(cue.id);if(!audio)return;
  if(audio.readyState<2){this.message='PREPARING NARRATION';return;}
  const entry={id,cue,audio,sequence:c.sequence,epoch:this.epoch,ended:false,pending:false};
  this.active=entry;this.blocked=false;this.message='';audio.volume=1;audio.muted=false;
  // A refresh seeks within an active clip; ordinary late loading retains every word.
  try{audio.currentTime=reconstruct&&elapsed<cue.at+cue.durationMs?Math.max(0,(elapsed-cue.at)/1000):0;}catch{}
  entry.end=()=>{if(this.active!==entry||entry.epoch!==this.epoch)return;entry.ended=true;this.blocked=false;this.message='';this.finished.add(id);this.ack(entry,c.startedAt+this.clock.elapsedNow());};
  entry.error=()=>{if(this.active!==entry)return;this.blocked=true;this.message='NARRATION INTERRUPTED — ENABLE AUDIO TO RESUME';};
  audio.addEventListener('ended',entry.end);audio.addEventListener('error',entry.error);audio.addEventListener('pause',entry.error);
  this.play(entry);
 }
 play(entry){
  if(entry.pending||entry.ended)return;entry.pending=true;
  try{Promise.resolve(entry.audio.play()).then(()=>{if(entry.epoch!==this.epoch||this.active!==entry)return;this.blocked=false;this.message='';}).catch(()=>{
   if(entry.epoch===this.epoch&&this.active===entry){this.blocked=true;this.message='SOUND BLOCKED — ENABLE AUDIO TO RESUME';}
  }).finally(()=>{entry.pending=false;});}catch{entry.pending=false;this.blocked=true;this.message='ENABLE AUDIO TO RESUME';}
 }
 release(entry){entry.audio.removeEventListener('ended',entry.end);entry.audio.removeEventListener('error',entry.error);entry.audio.removeEventListener('pause',entry.error);this.active=null;}
 ack(entry,now){
  const state=this.state,c=state?.chapter6;
  if(!c||entry.epoch!==this.epoch)return;
  if(entry.sequence!==c.sequence||!mandatory(c)){this.release(entry);return;}
  if(now<c.deadline||entry.acking||entry.failed)return;
  entry.acking=true;const sentAt=performance.now();
  Promise.resolve(this.request('/api/host',{action:'maze-audio-ended',recording:entry.cue.number,generation:state.generation,chapter6StartedAt:c.startedAt,sequence:c.sequence})).then(result=>{
   if(entry.epoch!==this.epoch||this.active!==entry)return;
   this.release(entry);this.onState(result.state,{sentAt,receivedAt:performance.now()});
  }).catch(error=>{if(entry.epoch!==this.epoch)return;entry.failed=true;this.blocked=true;this.message=error.status===403?'AUTHENTICATE HOST CONTROLS, THEN ENABLE AUDIO':'NARRATION COMPLETE — ENABLE AUDIO TO RETRY';}).finally(()=>{entry.acking=false;});
 }
 unlock(){if(this.active){this.active.failed=false;if(this.active.ended)this.ack(this.active,this.state.chapter6.startedAt+this.clock.elapsedNow());else this.play(this.active);}else if(this.state)this.update(this.state);}
 stop(){this.epoch++;if(this.active){const entry=this.active;this.release(entry);entry.audio.pause();}this.player.stop();this.finished.clear();this.state=null;this.run=null;this.blocked=false;this.message='';}
}
