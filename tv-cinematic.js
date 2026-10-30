import {Chapter8View} from './chapter8.js';
import { AbsoluteCueScheduler } from './cinematic-scheduler.js';
import { CHAPTER1_END_MS, PHOTO_CHECKPOINT_MS } from './cinematic-timeline.js';
import { chapter2Audio } from './chapter2-audio.js';
import { chapter2Timeline } from './chapter2.js';
import {Chapter3View} from './chapter3.js';
import {chapter3AudioTimeline,chapter3PartyGain} from './chapter3-audio.js';
import {chapter3Phases} from './chapter3-timing.js';
import {chapter4Phases,CHAPTER4_VOTING_MS} from './chapter4-timing.js';
import {Chapter4View,chapter4AudioTimeline} from './chapter4.js';
import {chapter4Audio,chapter4Score} from './chapter4-audio.js';
import {chapter5Phases} from './chapter5-timing.js';
import {Chapter5View} from './chapter5.js';
import {COMPLETE_CAST_END_MS} from './chapter5-reveal-timing.js';
import {Chapter5Audio} from './chapter5-audio.js';
import {Chapter7View} from './chapter7.js';
import {storyCheckpoints} from './chapter7-story-timing.js';
import {Chapter6View} from './chapter6.js';
import './chapter6-interface.js';

// One scheduler clock, fed by the TV's existing /api/state poller.
export class TVCinematicRuntime {
  constructor({document,timeline,Renderer=globalThis.BrookwoodTimeline.Renderer,
    Player=globalThis.BrookwoodAudio.Player,soundtrack=globalThis.BrookwoodAudio.tvSoundtrack,
    onElapsed=()=>{},now=()=>globalThis.performance.now(),requestFrame=cb=>globalThis.requestAnimationFrame(cb),
    cancelFrame=id=>globalThis.cancelAnimationFrame(id)}={}) {
    if(timeline.end!==CHAPTER1_END_MS)throw Error('Unexpected Chapter 1 end');
    this.state=null;this.now=now;this.onElapsed=onElapsed;this.document=document;
    this.chapter4VoteAt=CHAPTER4_VOTING_MS;
    this.scheduler=new AbsoluteCueScheduler({autoSync:false,now,requestFrame,cancelFrame,
      onElapsed:(elapsed,meta)=>{
        if(this.state?.chapter8){this.chapter8Visuals.update(this.state);this.onElapsed(elapsed,this.state);return;}
        this.chapter8Visuals?.update(this.state??{});
        this.chapter6Visuals?.advanceAmbient();
        if(this.state?.chapter7){this.chapter7Visuals.update(this.state);this.onElapsed(elapsed,this.state);return;}
        if(this.state?.chapter6){this.chapter6Visuals.update(this.state,meta);this.onElapsed(elapsed,this.state);return;}
        if(chapter5Phases.includes(this.state?.phase)){
          this.chapter5Visuals.update(this.state);this.chapter5Audio.update(this.state,meta);
          if(['chapter5-finale','chapter5-complete'].includes(this.state.phase))this.chapter6Visuals.ambient.updateCast(this.state,elapsed,this.state.chapter5.revealVersion===1?COMPLETE_CAST_END_MS+600:11000,this.chapter5Audio.player.active);
          this.document.getElementById('chapter5EnableAudio').hidden=!(this.chapter5Audio.needsUnlock()||this.chapter6Visuals.ambient.needsUnlock());
          this.onElapsed(elapsed,this.state);return;
        }
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
    this.chapter4Audio=new Player(chapter4AudioTimeline,{...clock,audioExtension:chapter4Audio,
      trackMedia:new Map([[chapter4Score.id,this.audio.soundtrack?.audio]]),canSync:()=>!this.scheduler.recovering});
    this.chapter5Visuals=new Chapter5View(document,Renderer,clock);
    this.chapter5Audio=new Chapter5Audio(Player,{...clock,canSync:()=>!this.scheduler.recovering});
    this.chapter6Visuals=new Chapter6View(document,Player,{...clock,canSync:()=>!this.scheduler.recovering});
    this.chapter7Visuals=new Chapter7View(document,{elapsedNow:()=>this.scheduler.elapsedNow(),canSync:()=>!this.scheduler.recovering});
    this.chapter8Visuals=new Chapter8View(document,{elapsedNow:()=>this.scheduler.elapsedNow(),canSync:()=>!this.scheduler.recovering},{Player});
    this.scheduler.start();
  }
  acceptState(state,timing={}) {
    const previous=this.state;this.state=state;
    if(state.chapter8){this.audio.stop();this.audio.soundtrack?.cancel();this.chapter3Audio.stop();this.chapter4Audio.stop();this.chapter5Audio.stop();this.chapter6Visuals.stopNarration();this.chapter6Visuals.ambient.stop();this.chapter7Visuals.stop();this.visuals.stop();this.chapter2Visuals.stop();this.chapter3Visuals.stop();this.chapter4Visuals.stop();this.chapter5Visuals.stop();if(!this.scheduler.acceptState({...state,startedAt:state.chapter8.startedAt},timing)){this.state=previous;throw Error('Invalid server clock response.');}return;}
    if(previous?.chapter8)this.chapter8Visuals.stop();
    const chapter3=chapter3Phases.includes(state.phase);
    const chapter4=chapter4Phases.includes(state.phase);
    const chapter5=chapter5Phases.includes(state.phase);
    const chapter6=!!state.chapter6;
    if(state.chapter7){this.audio.stop();this.audio.soundtrack?.cancel();this.chapter3Audio.stop();this.chapter4Audio.stop();this.chapter5Audio.stop();this.chapter6Visuals.stopNarration();this.chapter6Visuals.ambient.stop();}
    else this.chapter7Visuals.stop();
    if(chapter6){this.audio.stop();this.chapter3Audio.stop();this.chapter3Visuals.stop();this.chapter4Audio.stop();this.chapter4Visuals.stop();this.chapter5Audio.stop();this.chapter5Visuals.stop();const score=this.audio.soundtrack;if(score?.audio){score.audio.pause();score.target=0;score.ramp=null;score.audio.volume=0;}}
    else if(['chapter5-finale','chapter5-complete'].includes(state.phase)){this.chapter6Visuals.stopNarration();if(previous?.chapter6||!['chapter5-finale','chapter5-complete'].includes(previous?.phase))this.chapter6Visuals.ambient.stop(true);}
    else if(!state.chapter7)this.chapter6Visuals.stop(true);
    if(chapter4||chapter5){this.audio.stop();const score=this.audio.soundtrack;if(score?.audio){score.target=0;score.ramp=null;score.audio.volume=0;}this.chapter3Audio.stop();this.chapter3Visuals.stop();}
    if(chapter5&&!chapter5Phases.includes(previous?.phase)){
      const score=this.audio.soundtrack;
      if(score?.audio){score.audio.pause();score.attempted=false;}
    }
    if(!this.scheduler.acceptState(state.chapter7?{...state,startedAt:state.chapter7.startedAt}:chapter6?{...state,startedAt:state.chapter6.startedAt}:chapter5?{...state,startedAt:state.chapter5.startedAt}:chapter4?{...state,startedAt:state.chapter4.startedAt}:chapter3?{...state,startedAt:state.chapter3.startedAt}:state,timing)){this.state=previous;throw Error('Invalid server clock response.');}
    if(!chapter5){this.chapter5Visuals.stop();this.chapter5Audio.stop();}
    if(!chapter4){this.chapter4Audio.stop();this.chapter4Visuals.stop();}
    if(!chapter3){this.chapter3Audio.stop();this.chapter3Visuals.stop();this.audio.setTrackGain(1);}
    if(state.phase!=='opening'){
      this.visuals.stop();this.chapter2Visuals.stop();if(!state.chapter7&&!chapter3&&!chapter4&&!chapter5&&!chapter6)this.audio.update(state);
    }
  }
  suspend(){this.scheduler.recovering=true;}
  elapsedNow(){return this.scheduler.elapsedNow();}
  originalElapsedNow(){return this.elapsedNow()+(this.state?.chapter6?this.state.chapter6.startedAt-this.state.startedAt:chapter5Phases.includes(this.state?.phase)?this.state.chapter5.startedAt-this.state.startedAt:chapter4Phases.includes(this.state?.phase)?this.state.chapter4.startedAt-this.state.startedAt:chapter3Phases.includes(this.state?.phase)?this.state.chapter3.startedAt-this.state.startedAt:0);}
  unlockChapter3(){if(!this.state?.chapter8&&!this.state?.chapter7&&this.chapter3Audio.startedAt===null)this.chapter3Audio.unlock();}
  unlockChapter4(){if(!this.state?.chapter8&&!this.state?.chapter7&&this.chapter4Audio.startedAt===null)this.chapter4Audio.unlock();}
  unlockChapter5(){if(this.state?.chapter8||this.state?.chapter7)return;this.chapter5Audio.unlock();this.chapter6Visuals.ambient.unlock();}
  unlockChapter6(){if(!this.state?.chapter8&&!this.state?.chapter7)this.chapter6Visuals.unlock();}
  unlockBackground(){if(this.state?.chapter8)return;if(this.state?.chapter7||this.state?.chapter6)return;if(chapter5Phases.includes(this.state?.phase))return;if(chapter4Phases.includes(this.state?.phase))this.chapter4Audio.unlockBackground();else this.audio.unlockBackground();}
  unlockForTestJump(){if(this.state?.chapter8||this.state?.chapter7)return;this.audio.unlock({background:!this.state?.chapter6&&!chapter4Phases.includes(this.state?.phase)&&!chapter5Phases.includes(this.state?.phase)});this.unlockChapter3();this.unlockChapter4();this.unlockChapter5();this.unlockChapter6();}
}
// Classic Chapter 1 assets load first; the TV's following module uses this bridge.
globalThis.BrookwoodTV={Runtime:TVCinematicRuntime,chapter7Checkpoints:storyCheckpoints,photoCheckpointMs:PHOTO_CHECKPOINT_MS};
