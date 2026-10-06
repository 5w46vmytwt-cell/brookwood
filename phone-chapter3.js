import {AbsoluteCueScheduler} from './cinematic-scheduler.js';
import {PRIVATE_MESSAGES_MS} from './chapter3-timing.js';
export class PhoneChapter3Runtime{
  constructor({onState,now=()=>globalThis.performance.now(),requestFrame=cb=>globalThis.requestAnimationFrame(cb),cancelFrame=id=>globalThis.cancelAnimationFrame(id)}={}){
    this.state=null;this.now=now;this.onState=onState;
    this.scheduler=new AbsoluteCueScheduler({autoSync:false,now,requestFrame,cancelFrame,
      onElapsed:elapsed=>{if(this.state?.chapter3)this.onState(this.state,elapsed>=PRIVATE_MESSAGES_MS,elapsed);}});
  }
  acceptState(state,timing={}){
    this.state=state;
    if(!state.chapter3){this.scheduler.stop();return;}
    this.scheduler.start();
    if(!this.scheduler.acceptState({phase:state.phase,startedAt:state.chapter3.startedAt,serverNow:state.serverNow},timing))throw Error('Invalid private message clock.');
  }
  suspend(){this.scheduler.recovering=true;}
}
globalThis.BrookwoodPrivatePhone={Runtime:PhoneChapter3Runtime};
