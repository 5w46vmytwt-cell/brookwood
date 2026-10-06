import {AbsoluteCueScheduler} from './cinematic-scheduler.js';
import {PRIVATE_MESSAGES_MS} from './chapter3-timing.js';
export class PhoneChapter3Runtime{
  constructor({onState,now=()=>globalThis.performance.now(),requestFrame=cb=>globalThis.requestAnimationFrame(cb),cancelFrame=id=>globalThis.cancelAnimationFrame(id)}={}){
    this.state=null;this.now=now;this.onState=onState;
    this.scheduler=new AbsoluteCueScheduler({autoSync:false,now,requestFrame,cancelFrame,
      onElapsed:elapsed=>{if(this.state?.chapter3)this.onState(this.state,this.messagesActive(elapsed),elapsed);}});
  }
  messagesActive(elapsed=this.scheduler.elapsedNow()){
    // A server-confirmed activation must not wait for bounded clock correction
    // or RAF delivery on a throttled phone. The server still gates OPEN/READ.
    return ['private-messages','private-messages-complete'].includes(this.state?.phase)||elapsed>=PRIVATE_MESSAGES_MS;
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
