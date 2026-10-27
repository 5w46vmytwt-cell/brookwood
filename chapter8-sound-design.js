import {smooth} from './chapter8-puzzle.js';

// Read-only source windows. Only the alarm has a finite managed repeat.
const base='/assets/chapter8/audio/';
export const effects=Object.freeze({
 notification:{src:base+'security-notification.wav',sourceDurationMs:1895.9863945578231,offsetMs:0,durationMs:1895.9863945578231,volume:.65},
 alarm:{id:'garage-alarm',src:base+'garage-breach.wav',sourceDurationMs:4910.362811791383,offsetMs:0,durationMs:4910.362811791383,playDurationMs:6597.551020408163,repeat:true},
 announcement:{src:base+'garage-security-voice.mp3',sourceDurationMs:4597.551020408163,offsetMs:0,durationMs:4597.551020408163,volume:.72},
 door:{src:base+'interior-door-open.wav',sourceDurationMs:2679.0022675736964,offsetMs:0,durationMs:2679.0022675736964,volume:.6},
 whistle:{src:base+'intruder-whistling.wav',sourceDurationMs:15943.469387755102,offsetMs:2800,durationMs:11400,volume:.8},
 sirens:{id:'approaching-sirens',src:base+'police-sirens.mp3',sourceDurationMs:31584,offsetMs:0,durationMs:20000},
 running:{src:base+'running-footsteps.mp3',sourceDurationMs:6060.408163265306,offsetMs:350,durationMs:5000,volume:.23},
 slam:{src:base+'door-slam.mp3',sourceDurationMs:2520,offsetMs:1150,durationMs:1370,volume:.4},
 impact:{id:'scare-impact',src:'/assets/chapter6/audio/ch6_sfx_scream.mp3',sourceDurationMs:3312,offsetMs:200,durationMs:650}
});
export const soundLayers=[effects.alarm,effects.sirens,effects.impact];
export const whistleGain=elapsed=>.14+.66*smooth(elapsed/10000);
export const whistleCutoff=elapsed=>1000+5500*smooth(elapsed/9000);
export function primaryEffectGain(cue,elapsed){
 if(cue.id==='whistle-approach')return whistleGain(elapsed);
 if(cue.kind!=='effect'||cue.sourceDurationMs===undefined||cue.durationMs===cue.sourceDurationMs)return cue.volume;
 return cue.volume*smooth(elapsed/12)*(1-smooth((elapsed-cue.durationMs+60)/60));
}
export function layerVolume(id,elapsed){
 if(id==='garage-alarm')return (.3-.225*smooth((elapsed-850)/150))*(1-smooth((elapsed-5597.551020408163)/1000));
 if(id==='approaching-sirens')return (.08+.34*smooth(elapsed/12000))*(1-smooth((elapsed-16000)/4000));
 return .24*(1-smooth((elapsed-550)/100));
}

// Borrows preloaded Player media and the existing TV clock. No own timers/RAFs.
export class Chapter8SoundDesign{
 constructor(player,now,{Context=globalThis.AudioContext}={}){this.player=player;this.now=now;this.Context=Context;this.active=new Map();this.blocked=false;}
 update(c,cue){
  const f=c?.step==='finale'?c.finale:null,desired=new Map();
  if(this.run!==f?.id){for(const e of this.active.values()){e.media.pause();e.media.loop=false;}this.active.clear();this.run=f?.id;this.blocked=false;}
  if(f){
   if(['garage-alarm-lead','garage-announcement','garage-alarm-release'].includes(cue?.id))desired.set('garage-alarm',f.soundAnchors?.garage??f.phaseAt);
   if(['wife-13','escape-running','escape-slam','escape-settle','wife-14','quiet-after-escape'].includes(cue?.id)&&f.soundAnchors?.sirens!=null)desired.set('approaching-sirens',f.soundAnchors.sirens);
   if(cue?.id==='intruder-reveal')desired.set('scare-impact',f.phaseAt);
  }
  for(const [id,e] of this.active)if(!desired.has(id)||e.anchor!==desired.get(id)){e.media.pause();e.media.loop=false;this.active.delete(id);}
  for(const [id,anchor] of desired){
   const spec=soundLayers.find(s=>s.id===id),elapsed=this.now()-anchor,media=this.player.media.get(id);
   if(!media)continue;
   if(elapsed<0||elapsed>=(spec.playDurationMs??spec.durationMs)){media.pause();media.loop=false;continue;}
   let e=this.active.get(id);if(!e){e={anchor,media,attempted:false,pending:false};this.active.set(id,e);}
   media.volume=layerVolume(id,elapsed);media.muted=false;media.loop=!!spec.repeat;
   if(media.paused&&!e.attempted&&media.readyState>=2){
    media.currentTime=(spec.offsetMs+(spec.repeat?elapsed%spec.sourceDurationMs:elapsed))/1000;e.attempted=true;e.pending=true;
    Promise.resolve(media.play()).catch(()=>{if(this.active.get(id)===e)this.blocked=true;}).finally(()=>e.pending=false);
   }
  }
 }
 prepareWhistle(media){
  if(!this.Context)return true;
  try{
   if(!this.context)this.context=new this.Context();
   if(this.context.state!=='running'){if(!this.resuming){this.resuming=true;Promise.resolve(this.context.resume()).catch(()=>{}).finally(()=>this.resuming=false);}this.blocked=true;return false;}
   if(!this.filter){this.source=this.context.createMediaElementSource(media);this.filter=this.context.createBiquadFilter();this.filter.type='lowpass';this.filter.Q.value=.5;this.source.connect(this.filter);this.filter.connect(this.context.destination);}
   this.blocked=false;return true;
  }catch{this.blocked=true;return false;}
 }
 approach(elapsed){if(this.filter)this.filter.frequency.setTargetAtTime(whistleCutoff(elapsed),this.context.currentTime,.04);}
 unlock(){this.blocked=false;for(const e of this.active.values())if(!e.pending)e.attempted=false;this.context?.resume().catch(()=>this.blocked=true);}
 stop(){for(const e of this.active.values()){e.media.pause();e.media.loop=false;}this.active.clear();this.run=null;this.blocked=false;this.source?.disconnect();this.filter?.disconnect();this.context?.close().catch(()=>{});this.source=null;this.filter=null;this.context=null;}
}
