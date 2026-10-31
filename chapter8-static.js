import {ConnectionPlayback} from './chapter7-connection.js';
import {GLITCH_DURATIONS} from './chapter8-ending.js';

// Reuse the existing connection sample-clock player. Native stop bounds the
// effect even if the TV's animation frames are suspended in the background.
export class EndingStaticPlayback extends ConnectionPlayback{
 prepare(){super.prepare();this.loading?.then(()=>{this.duration=GLITCH_DURATIONS.reduce((a,b)=>a+b,0)/1000;});}
 async play(){
  await super.play();if(!this.source||this.paused)return;
  const at=this.context.currentTime,remaining=this.duration-this.currentTime,gain=this.gain.gain;
  gain.setValueAtTime(this.volume,at);
  if(remaining>.2){gain.linearRampToValueAtTime(.28,at+Math.min(.03,remaining-.2));gain.setValueAtTime(.28,at+remaining-.2);}
  gain.linearRampToValueAtTime(0,at+remaining);
 }
 removeAttribute(name){if(name==='src'){this.pause();this.closed=true;this.context?.close().catch(()=>{});}}
 load(){if(!this.closed)this.unlock();}
}
