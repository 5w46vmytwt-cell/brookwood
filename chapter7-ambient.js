import {smooth,storyRecording} from './chapter7-story-timing.js';

export const INVESTIGATION_AMBIENT_VOLUME=.10;
export const AMBIENT_FADE_MS=1200;
export const AMBIENT_SRC='/assets/chapter7/audio/ch7_investigation_ambience.mp3';
export const AMBIENT_DURATION_MS=144960;
const scenes=new Set(['narrator','podcast-intro','vote-intro','theory-vote','vote-fade','spoken','theory-reveal','theory-fade','message-hold','envelope-vote','retriever-fallback','retriever-reveal','envelope-waiting','photograph','photo-hold','ending-fade']);

// One existing SynchronizedTrack, driven only by the TV scheduler. Its canonical
// position follows the investigation clock even while the background is paused.
export class InvestigationAmbient{
 constructor(clock,{Player=globalThis.BrookwoodAudio.Player}={}){
  this.clock=clock;this.state=null;this.run=null;this.target=0;this.from=0;this.fadeAt=0;this.running=false;this.failed=false;this.previousScene=null;
  try{
   this.player=new Player({id:'chapter7-ambient',cues:[]},{externallyDriven:true,elapsedNow:()=>this.elapsed(),canSync:()=>this.running&&clock.canSync?.()!==false&&!clock.recovering,audioExtension:{tracks:[{id:'chapter7-ambient',src:AMBIENT_SRC,at:0,durationMs:AMBIENT_DURATION_MS,volumeAt:()=>this.level()}]}});
   this.track=this.player.tracks?.[0];
   this.track?.audio?.addEventListener('playing',()=>{if(this.running){this.from=0;this.fadeAt=clock.elapsedNow();this.track.audio.volume=0;}});
  }catch{this.failed=true;}
 }
 elapsed(){const c=this.state?.chapter7;return c?.investigation?c.startedAt+this.clock.elapsedNow()-c.investigation.startedAt:0;}
 level(){
  let cap=1;const i=this.state?.chapter7.investigation;
  if(!i)return 0;
  // Finish fading before the first podcast and before the fully silent black.
  if(i.step==='podcast-intro')cap=smooth((storyRecording(i.step).durationMs-this.positionMs)/AMBIENT_FADE_MS);
  if(['theory-fade','ending-fade'].includes(i.step))cap=smooth((i.deadline-this.state.chapter7.startedAt-this.clock.elapsedNow())/AMBIENT_FADE_MS);
  if(['silent-black','incoming','connection','complete'].includes(i.step))cap=0;
  return (this.from+(this.target-this.from)*smooth((this.clock.elapsedNow()-this.fadeAt)/AMBIENT_FADE_MS))*cap;
 }
 update(state,positionMs=0){
  if(!this.track||this.failed)return;
  try{
   const i=state.chapter7?.investigation;
   if(state.phase!=='chapter7'||state.chapter7.step!=='waiting'||!i){this.stop();return;}
   const run=state.generation+':'+state.chapter7.id+':'+i.id;
   if(this.run!==run){this.stop();this.run=run;}
   const current=this.level();this.state=state;this.positionMs=positionMs;
   const eligible=scenes.has(i.step)||i.step==='interlude'&&scenes.has(this.previousScene)&&this.previousScene!=='podcast-intro';
   const target=eligible?INVESTIGATION_AMBIENT_VOLUME:0;
   if(target!==this.target){this.from=current;this.target=target;this.fadeAt=this.clock.elapsedNow();}
   if(i.step!=='interlude')this.previousScene=i.step;
   if(target>0||this.level()>0){
    this.running=true;this.track.reset(i.startedAt);this.track.sync();
   }else{
    this.running=false;if(this.track.audio)this.track.audio.volume=0;this.track.reset(null);
   }
  }catch{this.failed=true;this.stop();}
 }
 needsUnlock(){return !!(this.running&&this.target>0&&this.track?.attempted&&!this.track.pending&&!this.track.unavailable&&this.track.audio?.paused);}
 unlock(){if(this.running&&!this.failed){if(this.track?.audio?.paused){this.from=0;this.fadeAt=this.clock.elapsedNow();}this.track?.sync({gesture:true});}}
 stop(){this.running=false;this.target=0;this.from=0;this.previousScene=null;this.state=null;this.run=null;if(this.track?.audio)this.track.audio.volume=0;this.player?.stop();}
}
