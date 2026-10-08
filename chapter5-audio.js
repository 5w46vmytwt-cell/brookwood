import {chapter5Recordings,chapter5Opening,castBackground,roleNarrationOffset} from './chapter5-audio-timing.js';
const clamp=t=>Math.max(0,Math.min(1,t));
const lerp=(a,b,t)=>a+(b-a)*clamp(t);
export function chapter5Narration(state){
  const c=state?.chapter5;
  return chapter5Recordings.map((cue,index)=>{
    let at=Infinity;
    if(c?.audioVersion===1){
      if(index<4)at=chapter5Opening[index].at;
      else if(index===4&&c.rulesStartedAt!==null)at=c.rulesStartedAt-c.startedAt;
      else if(c.round.id===cue.id.slice('chapter5-'.length)&&c.round.startedAt!==null)at=c.round.startedAt-c.startedAt+roleNarrationOffset(c.round.id);
    }
    return {...cue,at};
  });
}
export function chapter5ScoreVolume(elapsed,state){
  const c=state?.chapter5;
  if(c?.audioVersion!==1||state.phase==='chapter5-complete'||elapsed<castBackground.at)return 0;
  let bed=.14,gain=1;
  for(const cue of chapter5Narration(state)){
    if(!Number.isFinite(cue.at))continue;
    const end=cue.at+cue.durationMs;
    if(elapsed>=cue.at-150&&elapsed<cue.at)gain=Math.min(gain,lerp(1,.4,(elapsed-cue.at+150)/150));
    else if(elapsed>=cue.at&&elapsed<end+100)gain=Math.min(gain,.4);
    else if(elapsed>=end+100&&elapsed<end+350)gain=Math.min(gain,lerp(.4,1,(elapsed-end-100)/250));
  }
  const entrance=clamp((elapsed-castBackground.at)/1000);
  // The cast summary fades its score before the silent final mystery turn.
  const finale=c.castStartedAt===null?1:1-clamp((elapsed-(c.castStartedAt-c.startedAt)-5500)/3000);
  return bed*gain*entrance*finale;
}
// Adapter around the existing reusable Player: one clock, one preloaded element
// per recording, one persistent looping score. Scene timestamps remain server data.
export class Chapter5Audio{
  constructor(Player,clock){
    this.clock=clock;this.state=null;
    const score={...castBackground,volumeAt:elapsed=>chapter5ScoreVolume(elapsed,this.state)};
    this.player=new Player({id:'chapter5-audio',cues:chapter5Recordings.map(c=>({...c,at:Infinity}))},{...clock,audioExtension:{tracks:[score]}});
  }
  update(state,meta={}){
    this.state=state;
    if(state.chapter5?.audioVersion!==1||state.phase==='chapter5-complete'){this.player.stop();return;}
    this.player.cues=chapter5Narration(state);
    this.player.update({phase:'opening',startedAt:state.chapter5.startedAt},meta);
  }
  unlock(){
    // Paused-only priming preserves an already audible line/score. Recover a
    // blocked current line from the canonical offset, never replay past lines.
    this.player.unlock({background:false,onlyPaused:true});
    if(this.state?.chapter5?.audioVersion!==1||this.state.phase==='chapter5-complete')return;
    const elapsed=this.clock.elapsedNow();
    for(const cue of this.player.cues){
      const audio=this.player.media.get(cue.id);
      if(audio?.paused&&elapsed>=cue.at&&elapsed<cue.at+cue.durationMs&&!this.player.unavailable.has(cue.id))this.player.handled.delete(cue.id);
    }
    this.player.unlockBackground();this.player.sync();
  }
  needsUnlock(){
    if(this.state?.chapter5?.audioVersion!==1||this.state.phase==='chapter5-complete')return false;
    const elapsed=this.clock.elapsedNow(),p=this.player;
    return p.tracks.some(t=>t.attempted&&!t.pending&&!t.unavailable&&t.audio?.paused)||
      p.cues.some(c=>elapsed>=c.at&&elapsed<c.at+c.durationMs&&p.handled.has(c.id)&&p.active===null&&!p.unavailable.has(c.id)&&p.media.get(c.id)?.paused);
  }
  stop(){this.state=null;this.player.stop();}
}
