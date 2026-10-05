import { AbsoluteCueScheduler } from './cinematic-scheduler.js';
import { CHAPTER1_END_MS } from './cinematic-timeline.js';
import { chapter2Audio } from './chapter2-audio.js';

// One scheduler clock, fed by the TV's existing /api/state poller.
export class TVCinematicRuntime {
  constructor({document,timeline,Renderer=globalThis.BrookwoodTimeline.Renderer,
    Player=globalThis.BrookwoodAudio.Player,soundtrack=globalThis.BrookwoodAudio.tvSoundtrack,
    now=()=>globalThis.performance.now(),requestFrame=cb=>globalThis.requestAnimationFrame(cb),
    cancelFrame=id=>globalThis.cancelAnimationFrame(id)}={}) {
    if(timeline.end!==CHAPTER1_END_MS)throw Error('Unexpected Chapter 1 end');
    this.state=null;this.now=now;
    this.scheduler=new AbsoluteCueScheduler({autoSync:false,now,requestFrame,cancelFrame,
      onElapsed:(_,meta)=>{
        if(['photo','photo-complete'].includes(this.state?.phase)){this.audio.update(this.state,meta);return;}
        if(this.state?.phase!=='opening')return;
        this.visuals.update(this.state);
        this.audio.update(this.state,meta);
      }});
    const clock={elapsedNow:()=>this.scheduler.elapsedNow(),externallyDriven:true};
    this.visuals=new Renderer(document,timeline,clock);
    this.audio=new Player(timeline,{...clock,soundtrack,audioExtension:chapter2Audio,canSync:()=>!this.scheduler.recovering});
    this.scheduler.start();
  }
  acceptState(state,timing={}) {
    const previous=this.state;this.state=state;
    if(!this.scheduler.acceptState(state,timing)){this.state=previous;throw Error('Invalid server clock response.');}
    if(state.phase!=='opening'){this.visuals.stop();this.audio.update(state);}
  }
  suspend(){this.scheduler.recovering=true;}
  elapsedNow(){return this.scheduler.elapsedNow();}
}
// Classic Chapter 1 assets load first; the TV's following module uses this bridge.
globalThis.BrookwoodTV={Runtime:TVCinematicRuntime};
