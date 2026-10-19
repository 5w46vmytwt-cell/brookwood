import {storyRecordings,storyRecording} from './chapter7-story-timing.js';

// One channel backed by the existing cinematic Player. Native media completion,
// rather than a guessed deadline, authorizes each scene's next transition.
export class InvestigationAudio{
 constructor(clock,{Player=globalThis.BrookwoodAudio.Player,request,onState}={}){
  this.clock=clock;this.request=request;this.onState=onState;this.player=new Player({id:'chapter7-story',cues:storyRecordings.map(r=>({...r,at:0}))},{externallyDriven:true,elapsedNow:()=>clock.elapsedNow(),canSync:()=>!clock.recovering});
  this.epoch=0;this.entry=null;this.state=null;this.message='';this.blocked=false;
 }
 now(){return this.state.chapter7.startedAt+this.clock.elapsedNow();}
 position(){return this.entry?.audio.currentTime*1000??0;}
 update(state){
  this.state=state;const i=state.chapter7.investigation,cue=storyRecording(i.step),key=i.id+':'+i.sequence;
  if(this.entry?.key!==key)this.release();
  if(!cue)return;
  if(this.entry){if(this.entry.ended)this.ack('investigation-audio-ended');return;}
  const audio=this.player.media.get(cue.id);if(!audio||audio.readyState<2){this.message='PREPARING AUDIO';return;}
  const epoch=this.epoch,entry={key,cue,audio,epoch,pending:false,ended:false,failed:new Set(),acks:new Set()};this.entry=entry;
  const elapsed=i.audioStartedAt===null?0:Math.max(0,this.now()-i.audioStartedAt);
  try{audio.currentTime=Math.min(Math.max(0,(i.offsetMs+elapsed)/1000),Math.max(0,audio.duration-.15));}catch{this.release();return;}
  audio.volume=cue.volume;audio.muted=false;
  entry.playing=()=>{if(this.entry!==entry||this.epoch!==epoch)return;this.blocked=false;this.message='';if(this.state.chapter7.investigation.audioStartedAt===null)this.ack('investigation-audio-playing');};
  entry.end=()=>{if(this.entry!==entry||this.epoch!==epoch)return;entry.ended=true;this.ack('investigation-audio-ended');};
  entry.pause=()=>{if(this.entry===entry&&!audio.ended&&!entry.ended){this.blocked=true;this.message='ENABLE AUDIO / RESUME';}};
  audio.addEventListener('playing',entry.playing);audio.addEventListener('ended',entry.end);audio.addEventListener('pause',entry.pause);audio.addEventListener('error',entry.pause);
  // An expired reconstructed effect is consumed silently, never replayed.
  if(cue.type==='sfx'&&i.audioStartedAt!==null&&elapsed>=cue.durationMs){entry.ended=true;this.ack('investigation-audio-ended');return;}
  this.play();
 }
 play(){
  const e=this.entry;if(!e||e.pending||e.ended)return;e.pending=true;
  Promise.resolve(e.audio.play()).catch(()=>{if(this.entry===e){this.blocked=true;this.message='ENABLE AUDIO / RESUME';}}).finally(()=>{e.pending=false;});
 }
 ack(action){
  const e=this.entry,i=this.state?.chapter7.investigation;if(!e||e.epoch!==this.epoch||e.acks.has(action)||e.failed.has(action))return;
  if(action==='investigation-audio-ended'&&(i.audioStartedAt===null||this.now()<i.audioStartedAt+e.cue.durationMs-i.offsetMs-250))return;
  e.acks.add(action);const state=this.state,sentAt=performance.now();
  Promise.resolve(this.request('/api/host',{action,generation:state.generation,broadcastId:state.chapter7.id,investigationId:i.id,sequence:i.sequence,recording:e.cue.id})).then(result=>{
   if(this.entry!==e||e.epoch!==this.epoch)return;this.blocked=false;this.message='';this.onState(result.state,{sentAt,receivedAt:performance.now()});
  }).catch(()=>{if(this.entry===e){e.failed.add(action);this.blocked=true;this.message='ENABLE AUDIO TO RETRY';}}).finally(()=>e.acks.delete(action));
 }
 unlock(){if(!this.entry)return;this.entry.failed.clear();if(this.entry.ended)this.ack('investigation-audio-ended');else if(!this.entry.audio.paused)this.ack('investigation-audio-playing');else this.play();}
 release(){this.epoch++;if(this.entry){const e=this.entry;this.entry=null;e.audio.removeEventListener('playing',e.playing);e.audio.removeEventListener('ended',e.end);e.audio.removeEventListener('pause',e.pause);e.audio.removeEventListener('error',e.pause);e.audio.pause();}this.blocked=false;this.message='';}
 stop(){this.release();this.player.stop();this.state=null;}
}
