import { AbsoluteCueScheduler } from './cinematic-scheduler.js';
import { CHAPTER1_END_MS } from './cinematic-timeline.js';
import { chapter2Audio } from './chapter2-audio.js';
import { chapter2Timeline } from './chapter2.js';
import {Chapter3View} from './chapter3.js';
import {chapter3AudioTimeline,chapter3PartyGain} from './chapter3-audio.js';
import {chapter3Phases} from './chapter3-timing.js';
import {chapter4Phases,CHAPTER4_VOTING_MS} from './chapter4-timing.js';
import {Chapter4View,chapter4AudioTimeline} from './chapter4.js';

// One scheduler clock, fed by the TV's existing /api/state poller.
export class TVCinematicRuntime {
  constructor({document,timeline,Renderer=globalThis.BrookwoodTimeline.Renderer,
    Player=globalThis.BrookwoodAudio.Player,soundtrack=globalThis.BrookwoodAudio.tvSoundtrack,
    onElapsed=()=>{},now=()=>globalThis.performance.now(),requestFrame=cb=>globalThis.requestAnimationFrame(cb),
    cancelFrame=id=>globalThis.cancelAnimationFrame(id)}={}) {
    if(timeline.end!==CHAPTER1_END_MS)throw Error('Unexpected Chapter 1 end');
    this.state=null;this.now=now;this.onElapsed=onElapsed;
    this.chapter4VoteAt=CHAPTER4_VOTING_MS;
    this.scheduler=new AbsoluteCueScheduler({autoSync:false,now,requestFrame,cancelFrame,
      onElapsed:(elapsed,meta)=>{
        if(chapter4Phases.includes(this.state?.phase)){
          this.chapter4Visuals.update(this.state);
          this.chapter4Audio.update({phase:'opening',startedAt:this.state.chapter4.startedAt},meta);
          this.onElapsed(elapsed,this.state);return;
        }
        if(chapter3Phases.includes(this.state?.phase)){
          this.chapter3Visuals.update(this.state);
          this.audio.setTrackGain(chapter3PartyGain(elapsed));
          this.audio.update({...this.state,phase:'photo-complete'},meta);
          this.chapter3Audio.update({phase:'opening',startedAt:this.state.chapter3.startedAt},meta);
          this.onElapsed(elapsed,this.state);return;
        }
        if(['photo','photo-complete'].includes(this.state?.phase)){this.audio.update(this.state,meta);return;}
        if(this.state?.phase!=='opening')return;
        this.visuals.update(this.state);
        this.chapter2Visuals.update(this.state);
        this.audio.update(this.state,meta);
        this.onElapsed(elapsed,this.state);
      }});
    const clock={elapsedNow:()=>this.scheduler.elapsedNow(),externallyDriven:true};
    this.visuals=new Renderer(document,timeline,clock);
    this.chapter2Visuals=new Renderer(document,chapter2Timeline,clock);
    this.chapter3Visuals=new Chapter3View(document,Renderer,clock);
    this.audio=new Player(timeline,{...clock,elapsedNow:()=>this.originalElapsedNow(),soundtrack,audioExtension:chapter2Audio,canSync:()=>!this.scheduler.recovering});
    this.chapter3Audio=new Player(chapter3AudioTimeline,{...clock,canSync:()=>!this.scheduler.recovering});
    this.chapter4Visuals=new Chapter4View(document,Renderer,clock);
    this.chapter4Audio=new Player(chapter4AudioTimeline,{...clock,canSync:()=>!this.scheduler.recovering});
    this.scheduler.start();
  }
  acceptState(state,timing={}) {
    const previous=this.state;this.state=state;
    const chapter3=chapter3Phases.includes(state.phase);
    const chapter4=chapter4Phases.includes(state.phase);
    if(chapter4){this.audio.stop();const score=this.audio.soundtrack;if(score?.audio){score.target=0;score.ramp=null;score.audio.volume=0;}this.chapter3Audio.stop();this.chapter3Visuals.stop();}
    if(!this.scheduler.acceptState(chapter4?{...state,startedAt:state.chapter4.startedAt}:chapter3?{...state,startedAt:state.chapter3.startedAt}:state,timing)){this.state=previous;throw Error('Invalid server clock response.');}
    if(!chapter4){this.chapter4Audio.stop();this.chapter4Visuals.stop();}
    if(!chapter3){this.chapter3Audio.stop();this.chapter3Visuals.stop();this.audio.setTrackGain(1);}
    if(state.phase!=='opening'){
      this.visuals.stop();this.chapter2Visuals.stop();if(!chapter3&&!chapter4)this.audio.update(state);
    }
  }
  suspend(){this.scheduler.recovering=true;}
  elapsedNow(){return this.scheduler.elapsedNow();}
  originalElapsedNow(){return this.elapsedNow()+(chapter4Phases.includes(this.state?.phase)?this.state.chapter4.startedAt-this.state.startedAt:chapter3Phases.includes(this.state?.phase)?this.state.chapter3.startedAt-this.state.startedAt:0);}
  unlockChapter3(){if(this.chapter3Audio.startedAt===null)this.chapter3Audio.unlock();}
  unlockChapter4(){if(this.chapter4Audio.startedAt===null)this.chapter4Audio.unlock();}
  unlockBackground(){if(!chapter4Phases.includes(this.state?.phase))this.audio.unlockBackground();}
  unlockForTestJump(){this.audio.unlock({background:!chapter4Phases.includes(this.state?.phase)});this.unlockChapter3();this.unlockChapter4();}
}
// Classic Chapter 1 assets load first; the TV's following module uses this bridge.
globalThis.BrookwoodTV={Runtime:TVCinematicRuntime};
