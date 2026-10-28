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
export const SIREN_WINDOW_MS=14000,SIREN_CROSSFADE_MS=2000,SIREN_STRIDE_MS=12000;
export const soundLayers=[effects.alarm,effects.sirens,{...effects.sirens,id:'approaching-sirens-b'},effects.impact];
export function sirenWindows(elapsed){
 const cycle=Math.floor(elapsed/SIREN_STRIDE_MS);return [cycle-1,cycle].filter(n=>n>=0&&elapsed-n*SIREN_STRIDE_MS<SIREN_WINDOW_MS).map(n=>{
  const age=elapsed-n*SIREN_STRIDE_MS;
  const inGain=n===0?smooth(age/600):Math.sin(Math.min(1,age/SIREN_CROSSFADE_MS)*Math.PI/2);
  const outGain=age>SIREN_STRIDE_MS?Math.cos((age-SIREN_STRIDE_MS)/SIREN_CROSSFADE_MS*Math.PI/2):1;
  return {id:n%2?'approaching-sirens-b':'approaching-sirens',at:n*SIREN_STRIDE_MS,age,gain:inGain*outGain};
 });
}
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
   if(!(f.polishVersion>=1)&&['wife-13','escape-running','escape-slam','escape-settle','wife-14','quiet-after-escape'].includes(cue?.id)&&f.soundAnchors?.sirens!=null)desired.set('approaching-sirens',f.soundAnchors.sirens);
   if(cue?.id==='intruder-reveal')desired.set('scare-impact',f.phaseAt);
  }
  const sirenMix=new Map();
  if(f?.polishVersion>=1&&f.soundAnchors?.sirens!=null&&!['breaking-news','news-out','wife-16','ending'].includes(cue?.id)){
   const elapsed=this.now()-f.soundAnchors.sirens,fade=cue?.id==='news-black'?1-smooth((this.now()-f.phaseAt)/cue.durationMs):1;
   if(elapsed>=0)for(const w of sirenWindows(elapsed)){desired.set(w.id,f.soundAnchors.sirens+w.at);sirenMix.set(w.id,{gain:w.gain*(.08+.26*smooth(elapsed/12000))*fade});}
  }
  for(const [id,e] of this.active)if(!desired.has(id)||e.anchor!==desired.get(id)){e.media.pause();e.media.loop=false;this.active.delete(id);}
  for(const [id,anchor] of desired){
   const spec=soundLayers.find(s=>s.id===id),elapsed=this.now()-anchor,media=this.player.media.get(id);
   if(!media)continue;
   const mix=sirenMix.get(id),duration=mix?SIREN_WINDOW_MS:spec.playDurationMs??spec.durationMs;
   if(elapsed<0||elapsed>=duration){media.pause();media.loop=false;continue;}
   let e=this.active.get(id);if(!e){e={anchor,media,attempted:false,pending:false};this.active.set(id,e);}
   media.volume=mix?mix.gain:layerVolume(id,elapsed);media.muted=false;media.loop=!!spec.repeat;
   if(media.paused&&!e.attempted&&media.readyState>=2){
    media.currentTime=((mix?2000:spec.offsetMs)+(spec.repeat?elapsed%spec.sourceDurationMs:elapsed))/1000;e.attempted=true;e.pending=true;
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
