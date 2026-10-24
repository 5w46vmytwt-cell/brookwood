import {narrationCues,narrationFor,ambientCue,AMBIENT_VOLUME,AMBIENT_FADE_MS,PUZZLE_FADE_MS,smooth} from './chapter8-puzzle.js';

// Reuses the existing Player/loop implementation and the single TV scheduler.
export class Chapter8Audio{
 constructor(clock,{Player=globalThis.BrookwoodAudio.Player,request,onState}={}){
  this.clock=clock;this.request=request;this.onState=onState;this.state=null;this.entry=null;this.run=null;this.running=false;this.fadeInAt=null;this.blocked=false;this.message='';
  this.player=new Player({id:'chapter8',cues:narrationCues},{externallyDriven:true,elapsedNow:()=>this.now()-(this.state?.chapter8.puzzleStartedAt??this.now()),canSync:()=>this.running&&clock.canSync?.()!==false,audioExtension:{tracks:[{...ambientCue,at:0,volumeAt:()=>this.volume()}]}});
  this.track=this.player.tracks?.[0];this.track?.audio?.addEventListener('playing',()=>{if(this.fadeInAt===null)this.fadeInAt=this.clock.elapsedNow();});
 }
 now(){return (this.state?.chapter8.startedAt??0)+this.clock.elapsedNow();}
 volume(){const c=this.state?.chapter8;if(!c||!this.running)return 0;return AMBIENT_VOLUME*(this.fadeInAt===null?0:smooth((this.clock.elapsedNow()-this.fadeInAt)/AMBIENT_FADE_MS))*(c.step==='leaving'?smooth((c.deadline-this.now())/PUZZLE_FADE_MS):1);}
 update(state){
  const c=state.chapter8,run=state.generation+':'+c.id;if(this.run!==run){this.stop();this.run=run;}this.state=state;
  this.running=['puzzle','leaving'].includes(c.step);
  if(this.track){if(this.running){this.track.reset(c.puzzleStartedAt);this.track.sync();}else {this.track.audio.volume=0;this.track.reset(null);this.fadeInAt=null;}}
  const key=c.id+':'+c.sequence,cue=narrationFor(c.step);if(this.entry?.key!==key)this.release();if(!cue)return;
  if(this.entry){if(this.entry.ended)this.ack('chapter8-audio-ended');return;}
  const audio=this.player.media.get(cue.id);if(!audio||audio.readyState<2){this.message='PREPARING AUDIO';return;}
  const entry={key,cue,audio,ended:false,pending:false,acks:new Set(),failed:new Set()};this.entry=entry;
  audio.currentTime=Math.min(c.audioStartedAt===null?0:Math.max(0,(this.now()-c.audioStartedAt)/1000),Math.max(0,audio.duration-.15));audio.volume=1;audio.muted=false;
  entry.playing=()=>{if(this.entry!==entry)return;this.blocked=false;this.message='';if(this.state.chapter8.audioStartedAt===null)this.ack('chapter8-audio-playing');};
  entry.end=()=>{if(this.entry!==entry)return;entry.ended=true;this.ack('chapter8-audio-ended');};
  entry.pause=()=>{if(this.entry===entry&&!entry.ended&&!audio.ended){this.blocked=true;this.message='ENABLE AUDIO / RESUME';}};
  audio.addEventListener('playing',entry.playing);audio.addEventListener('ended',entry.end);audio.addEventListener('pause',entry.pause);audio.addEventListener('error',entry.pause);this.play();
 }
 play(){const e=this.entry;if(!e||e.pending||e.ended||!e.audio.paused)return;e.pending=true;Promise.resolve(e.audio.play()).catch(()=>{if(this.entry===e){this.blocked=true;this.message='ENABLE AUDIO / RESUME';}}).finally(()=>e.pending=false);}
 ack(action){
  const e=this.entry,c=this.state?.chapter8;if(!e||e.acks.has(action)||e.failed.has(action))return;
  if(action==='chapter8-audio-ended'&&(c.audioStartedAt===null||this.now()<c.audioStartedAt+e.cue.durationMs-250))return;
  e.acks.add(action);const sentAt=performance.now();Promise.resolve(this.request('/api/host',{action,generation:this.state.generation,chapter8Id:c.id,sequence:c.sequence,recording:e.cue.id})).then(result=>{if(this.entry===e)this.onState(result.state,{sentAt,receivedAt:performance.now()});}).catch(()=>{if(this.entry===e){e.failed.add(action);this.blocked=true;this.message='ENABLE AUDIO TO RETRY';}}).finally(()=>e.acks.delete(action));
 }
 needsUnlock(){return this.blocked||!!(this.running&&this.track?.attempted&&!this.track.pending&&!this.track.unavailable&&this.track.audio.paused);}
 unlock(){if(this.running)this.track?.sync({gesture:true});const e=this.entry;if(!e)return;e.failed.clear();if(!e.audio.paused)e.playing();if(e.ended)this.ack('chapter8-audio-ended');else this.play();}
 release(){const e=this.entry;if(!e)return;this.entry=null;for(const [name,fn] of [['playing',e.playing],['ended',e.end],['pause',e.pause],['error',e.pause]])e.audio.removeEventListener(name,fn);e.audio.pause();this.blocked=false;this.message='';}
 stop(){this.release();this.running=false;this.fadeInAt=null;this.player.stop();if(this.track?.audio)this.track.audio.volume=0;this.state=null;this.run=null;}
}
