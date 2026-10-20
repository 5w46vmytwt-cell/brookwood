import {storyRecordings,storyRecording,narrationDuration,prophecyAt,cameraCue} from './chapter7-story-timing.js';
import {ConnectionPlayback} from './chapter7-connection.js';
import {InvestigationAmbient} from './chapter7-ambient.js';

// One channel backed by the existing cinematic Player. Native media completion,
// rather than a guessed deadline, authorizes each scene's next transition.
export class InvestigationAudio{
 constructor(clock,{Player=globalThis.BrookwoodAudio.Player,request,onState,Connection=ConnectionPlayback}={}){
  this.Connection=Connection;this.clock=clock;this.request=request;this.onState=onState;this.player=new Player({id:'chapter7-story',cues:[...storyRecordings,cameraCue].map(r=>({...r,at:0}))},{externallyDriven:true,elapsedNow:()=>clock.elapsedNow(),canSync:()=>!clock.recovering});
  this.photoClaims=new Set();this.epoch=0;this.entry=null;this.state=null;this.message='';this.blocked=false;
  this.ambient=new InvestigationAmbient(clock,{Player});
 }
 get blocked(){return this.narrationBlocked||this.ambient?.needsUnlock()||false;}
 set blocked(value){this.narrationBlocked=value;}
 now(){return this.state.chapter7.startedAt+this.clock.elapsedNow();}
 position(){const e=this.entry;return e?.secondary?prophecyAt(this.state.chapter7.investigation)+e.secondary.currentTime*1000:e?.audio.currentTime*1000??0;}
 update(state){
  this.state=state;const i=state.chapter7.investigation,cue=storyRecording(i.step),key=i.id+':'+i.sequence;
  if(this.entry?.key!==key)this.release();
  if(i.step==='connection'&&i.polishVersion<3)return;
  if(i.step==='connection'&&!this.connection){this.connection=new this.Connection();this.player.media.set(cue.id,this.connection);}
  this.ambient.update(state,this.entry?this.position():i.offsetMs+(i.audioStartedAt===null?0:Math.max(0,this.now()-i.audioStartedAt)));
  if(!cue)return;
  if(this.entry){this.syncTransmission();if(this.entry.ended)this.ack('investigation-audio-ended');return;}
  const audio=this.player.media.get(cue.id);if(!audio||audio.readyState<2){this.message=audio?.failed?'CONNECTION AUDIO UNAVAILABLE - RETRY':'PREPARING AUDIO';if(audio?.failed)this.blocked=true;return;}
  const epoch=this.epoch,entry={key,cue,audio,epoch,pending:false,ended:false,failed:new Set(),acks:new Set()};this.entry=entry;
  const elapsed=i.audioStartedAt===null?0:Math.max(0,this.now()-i.audioStartedAt);
  try{audio.currentTime=Math.min(Math.max(0,(i.offsetMs+elapsed)/1000),Math.max(0,audio.duration-.15));}catch{this.release();return;}
  audio.volume=cue.volume;audio.muted=false;
  entry.playing=()=>{if(this.entry!==entry||this.epoch!==epoch)return;this.blocked=false;this.message='';if(this.state.chapter7.investigation.audioStartedAt===null)this.ack('investigation-audio-playing');};
  entry.end=()=>{if(this.entry!==entry||this.epoch!==epoch)return;if(i.step==='officer'&&i.polishVersion>=1){entry.officerEnded=true;this.syncTransmission();return;}entry.ended=true;this.ack('investigation-audio-ended');};
  entry.pause=()=>{if(this.entry===entry&&!entry.ended&&!entry.officerEnded&&!audio.ended){this.blocked=true;this.message='ENABLE AUDIO / RESUME';}};
  audio.addEventListener('playing',entry.playing);audio.addEventListener('ended',entry.end);audio.addEventListener('pause',entry.pause);audio.addEventListener('error',entry.pause);
  // An expired reconstructed effect is consumed silently, never replayed.
  if(cue.type==='sfx'&&i.audioStartedAt!==null&&elapsed>=cue.durationMs){entry.ended=true;this.ack('investigation-audio-ended');return;}
  if(i.step==='officer'&&i.polishVersion>=1&&elapsed>=cue.durationMs){entry.officerEnded=true;this.syncTransmission(elapsed);return;}
  this.play();
 }
 syncTransmission(reconstructedPosition){
  const e=this.entry,i=this.state?.chapter7.investigation;
  if(!e||i.step!=='officer'||!(i.polishVersion>=1)||e.ended)return;
  const position=reconstructedPosition??(e.officerEnded&&i.audioStartedAt!==null?Math.max(e.audio.currentTime*1000,this.now()-i.audioStartedAt):e.audio.currentTime*1000);
  // A refresh can queue the second channel while native play/seek is pending.
  if(e.secondary){if(e.secondary.paused&&!e.secondary.ended&&!e.pending&&!this.blocked)this.play();return;}
  if(position<prophecyAt(i)&&!e.officerEnded)return;
  const cue=storyRecording('prophecy'),audio=this.player.media.get(cue.id);
  if(!audio||audio.readyState<2){this.blocked=true;this.message='PREPARING TRANSMISSION';return;}
  e.secondary=audio;audio.currentTime=Math.min(Math.max(0,(position-prophecyAt(i))/1000),Math.max(0,audio.duration-.15));audio.volume=1;audio.muted=false;
  e.secondaryEnd=()=>{if(this.entry!==e)return;e.ended=true;this.ack('investigation-audio-ended');};
  e.secondaryPause=()=>{if(this.entry===e&&!e.ended&&!audio.ended){this.blocked=true;this.message='ENABLE AUDIO / RESUME';}};
  audio.addEventListener('ended',e.secondaryEnd);audio.addEventListener('playing',e.playing);audio.addEventListener('pause',e.secondaryPause);audio.addEventListener('error',e.secondaryPause);
  this.play();
 }
 play(){
  const e=this.entry;if(!e||e.pending||e.ended)return;e.pending=true;
  Promise.all([...(e.officerEnded||!e.audio.paused?[]:[e.audio.play()]),...(e.secondary&&!e.secondary.ended&&e.secondary.paused?[e.secondary.play()]:[])]).catch(()=>{if(this.entry===e){this.blocked=true;this.message='ENABLE AUDIO / RESUME';}}).finally(()=>{e.pending=false;});
 }
 ack(action){
  const e=this.entry,i=this.state?.chapter7.investigation;if(!e||e.epoch!==this.epoch||e.acks.has(action)||e.failed.has(action))return;
  if(action==='investigation-audio-ended'&&(i.audioStartedAt===null||this.now()<i.audioStartedAt+narrationDuration(i)-i.offsetMs-250))return;
  e.acks.add(action);const state=this.state,sentAt=performance.now();
  Promise.resolve(this.request('/api/host',{action,generation:state.generation,broadcastId:state.chapter7.id,investigationId:i.id,sequence:i.sequence,recording:e.cue.id})).then(result=>{
   if(this.entry!==e||e.epoch!==this.epoch)return;this.blocked=false;this.message='';this.onState(result.state,{sentAt,receivedAt:performance.now()});
  }).catch(()=>{if(this.entry===e){e.failed.add(action);this.blocked=true;this.message='ENABLE AUDIO TO RETRY';}}).finally(()=>e.acks.delete(action));
 }
 photoAppearance(){
  const s=this.state,i=s?.chapter7.investigation;if(!i||i.step!=='photograph'||i.offsetMs||i.photoSoundPlayedAt!=null)return;
  const key=i.id+':'+i.sequence;if(this.photoClaims.has(key))return;this.photoClaims.add(key);
  Promise.resolve(this.request('/api/host',{action:'investigation-photo-sound',generation:s.generation,broadcastId:s.chapter7.id,investigationId:i.id,sequence:i.sequence})).then(result=>{
   if(this.state?.chapter7.investigation.id+':'+this.state?.chapter7.investigation.sequence!==key||this.state?.chapter7.investigation.step!=='photograph'||!result.playSound)return;
   const audio=this.player.media.get(cameraCue.id);if(!audio)return;audio.currentTime=0;audio.volume=cameraCue.volume;audio.muted=false;Promise.resolve(audio.play()).catch(()=>{});
  }).catch(()=>{});
 }
 unlock(){this.connection?.unlock();this.ambient.unlock();if(!this.entry)return;this.entry.failed.clear();if(!this.entry.audio.paused)this.entry.playing();if(this.entry.ended)this.ack('investigation-audio-ended');else this.play();}
 release(){this.epoch++;if(this.entry){const e=this.entry;this.entry=null;e.audio.removeEventListener('playing',e.playing);e.audio.removeEventListener('ended',e.end);e.audio.removeEventListener('pause',e.pause);e.audio.removeEventListener('error',e.pause);e.audio.pause();if(e.secondary){e.secondary.removeEventListener('ended',e.secondaryEnd);e.secondary.removeEventListener('playing',e.playing);e.secondary.removeEventListener('pause',e.secondaryPause);e.secondary.removeEventListener('error',e.secondaryPause);e.secondary.pause();}}this.blocked=false;this.message='';}
 stop(){this.release();this.ambient.stop();this.player.stop();this.state=null;}
}
