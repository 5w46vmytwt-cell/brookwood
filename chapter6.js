import {games,recordings,phaseCues,memoryVisible,jumpVisible,transitionVisual} from './chapter6-timing.js';
import {MazeNarration} from './chapter6-audio.js';
const bridgeRules='Alex — 1 minute · Emma — 2 minutes · Clara — 5 minutes · David — 10 minutes\nOne flashlight. At most two cross together. Crossings take the slower person’s time. Return the flashlight when needed.';
const bridgeSolution='Alex + Emma cross: 2\nAlex returns: 1\nClara + David cross: 10\nEmma returns: 2\nAlex + Emma cross: 2\nTOTAL: 17 MINUTES';
export class Chapter6View{
 constructor(document,Player,clock){
  this.document=document;this.clock=clock;this.key=null;this.state=null;
  // Load challenge imagery before its timed window; never expose the memory
  // bitmap until the canonical server exposure begins.
  this.images=[];
  this.player=new Player({id:'chapter6',cues:recordings.map(c=>({...c,at:0}))},{...clock});
  this.narration=new MazeNarration(this.player,clock,{onState:(state,timing)=>{if(state)this.document.dispatchEvent(new CustomEvent('brookwood-maze-audio-state',{detail:{state,timing}}));}});
 }
 unlock(){if(this.state?.chapter6.audioVersion===2){this.narration.unlock();return;}this.player.unlock({background:false,onlyPaused:true});
  // A gesture retries only the currently active window, never consumed history.
  if(this.state){for(const cue of phaseCues(this.state.chapter6)){const t=this.clock.elapsedNow();if(t>=cue.at&&t<cue.at+cue.durationMs)this.player.handled.delete(cue.id);}this.player.sync();}
 }
 update(state,meta={}){
  if(!this.images.length)this.images=['red_door','blue_door','green_door','black_door','red_reveal','blue_reveal','green_reveal','black_reveal','morgue_memory','bridge_background','silence_jumpscare'].map(name=>{
   const image=this.document.createElement('img');image.src='/assets/chapter6/'+name+'.png';return image;
  });
  this.state=state;const canonical=state.chapter6,now=canonical.startedAt+this.clock.elapsedNow(),key=canonical.startedAt+':'+canonical.sequence;
  if(canonical.audioVersion===2)this.narration.update(state,meta);
  else{if(this.key!==key){this.player.stop();this.key=key;const cues=phaseCues(canonical);this.player.cues=cues.filter(x=>x.type==='narration');this.player.sfxCues=cues.filter(x=>x.type==='sfx');}
   this.player.update({phase:'opening',startedAt:canonical.startedAt},meta);}
  const visual=transitionVisual(canonical,now),c=visual.scene??canonical;
  const curtain=this.document.getElementById('chapter6Curtain');curtain.style.opacity=String(visual.black);curtain.hidden=canonical.step!=='transition';
  // Full overlapping clips remain audible, with the newer voice taking priority.
  for(const cue of this.player.sfxCues??[]){const audio=this.player.media.get(cue.id);if(audio)audio.volume=1;}
  const node=id=>this.document.getElementById(id),game=games[c.game],result=c.results[c.game],complete=c.step==='complete'||!visual.scene;
  node('chapter6Content').hidden=complete;node('chapter6HUD').hidden=complete;
  node('chapter6Audio').hidden=complete||canonical.step==='transition';node('chapter6HostToggle').hidden=complete||canonical.step==='transition';
  const opening=c.audioVersion===2&&c.game===0&&c.step==='intro'&&c.audioIndex<2;
  node('chapter6Stage').textContent='GAME '+(c.game+1)+' / 5 · '+game.title;
  node('chapter6Status').textContent=this.narration.message||(c.step==='answer'?'CHOOSE':c.step==='locked'?'ANSWER LOCKED':c.step==='result'?'RESULT':c.step==='silence'?'REMAIN SILENT':'WAITING');
  node('chapter6Audio').textContent=this.narration.blocked?'ENABLE AUDIO / RESUME':'ENABLE AUDIO';
  node('chapter6Bridge').hidden=!(c.game===3&&['intro','answer'].includes(c.step));
  node('chapter6Token').hidden=!['finale','vote','selected','waiting','return'].includes(c.step);
  node('chapter6TV').classList.toggle('maze-memory',memoryVisible(c,now));
  node('chapter6TV').classList.toggle('maze-token',!node('chapter6Token').hidden);
  node('chapter6TV').classList.toggle('maze-gameover',c.step==='gameover');
  const tokenSteps=['finale','vote','selected','waiting','return'],objective=node('chapter6Objective');objective.hidden=!tokenSteps.includes(c.step);objective.textContent=tokenSteps.includes(c.step)?['OBJECTIVE','PRIVATE VOTE','RETRIEVER SELECTED','AWAITING RETURN','TOKEN RETURNED'][tokenSteps.indexOf(c.step)]:'';
  node('chapter6Title').textContent=opening?(c.audioIndex===0?'SIGNAL INTERRUPTED':'THE KILLER’S MAZE'):c.step==='gameover'?'GAME OVER':tokenSteps.includes(c.step)?'RETRIEVE THE TOKEN':c.step==='zero'?'THE KILLER’S MAZE':game.title;
  const shownLives=c.step==='locked'?Math.max(0,3-c.results.slice(0,c.game).filter(r=>!r.correct).length):c.lives;
  node('chapter6Lives').textContent='♥'.repeat(shownLives)+'♡'.repeat(3-shownLives);node('chapter6Lives').setAttribute?.('aria-label',shownLives+' of 3 shared lives remaining');
  node('chapter6Timer').textContent=c.step==='exposure'?'MEMORIZE · '+Math.max(0,Math.ceil((c.deadline-now)/1000)):['answer','silence'].includes(c.step)?String(Math.max(0,Math.ceil((c.deadline-now)/1000))):'';
  node('chapter6Question').textContent=c.step==='gameover'?(c.lives>0?'YOU SURVIVED THE MAZE':'NO LIVES REMAIN'):c.step==='locked'?'ANSWER LOCKED':c.step==='exposure'?'MEMORIZE THE SCENE':c.step==='answer'?game.question:c.step==='silence'?'DON’T MAKE A SOUND':c.step==='verdict'?'SILENCE COMPLETE — AWAITING VERDICT':c.step==='vote'?'CHOOSE WHO RETRIEVES THE TOKEN':c.step==='waiting'?'WAITING FOR THE TOKEN':c.step==='selected'?c.selectedPlayer.name:c.step==='result'?(result.answer===null?'TIME EXPIRED — NO ANSWER':result.correct?'CORRECT':'INCORRECT'):'';
  node('chapter6Detail').textContent=c.step==='locked'?(game.options.find(([id])=>id===result.answer)?.[1]??(result.answer===null?'TIME EXPIRED':result.answer.toUpperCase())):c.step==='gameover'?'THE TOKEN STILL AWAITS':c.game===3&&['intro','answer'].includes(c.step)?'':c.step==='result'&&c.game===3?bridgeSolution:c.step==='result'&&c.game===1?'The Sixth Sense (1999) earned the most worldwide.':c.step==='result'&&c.game===2?'The clock showed 3:45.':c.step==='result'&&c.game===0&&result.answer===null?'The group failed to choose a door.':c.step==='vote'?c.voteCount+' / '+c.voterCount+' PRIVATE VOTES RECORDED':c.step==='waiting'?c.selectedPlayer.name:'';
  const image=node('chapter6Image');let src=null;
  if(memoryVisible(c,now))src='morgue_memory.png';
  else if(c.game===3&&['intro','answer','result'].includes(c.step))src='bridge_background.png';
  else if(c.game===0&&c.step==='result'&&result.answer!==null)src=result.answer+'_reveal.png';
  else if(jumpVisible(c,now)&&!this.narration.active)src='silence_jumpscare.png';
  if(src&&image.getAttribute('src')!=='/assets/chapter6/'+src){image.style.visibility='hidden';image.onload=()=>{if(image.getAttribute('src')==='/assets/chapter6/'+src)image.style.visibility='visible';};image.onerror=()=>{image.style.visibility='hidden';};image.src='/assets/chapter6/'+src;if(image.complete&&image.naturalWidth>0)image.style.visibility='visible';}
  image.hidden=!src;image.classList.toggle('memory',src==='morgue_memory.png');image.classList.toggle('jump',src==='silence_jumpscare.png');image.classList.toggle('bridge',src==='bridge_background.png');
  const doors=node('chapter6Doors');doors.hidden=opening||!(c.game===0&&['intro','answer'].includes(c.step));
  const orderKey=c.startedAt+':'+c.doorOrder?.join(',');if(c.doorOrder&&this.orderKey!==orderKey&&doors.children.length===4){const figures=[...doors.children];for(const id of c.doorOrder){const figure=figures.find(f=>f.querySelector('img').src.includes('/'+id+'_door.png'));if(figure)doors.appendChild(figure);}this.orderKey=orderKey;}
  // Hide all answers until the introduction/exposure/question narration ends.
  const choices=node('chapter6Choices'),choiceKey=c.step==='answer'?c.game:null;
  if(this.choiceKey!==choiceKey){choices.replaceChildren();if(choiceKey!==null)for(const [id,label] of game.options){const li=this.document.createElement('li');li.textContent=(c.game===0?'':id+'. ')+label;choices.appendChild(li);}this.choiceKey=choiceKey;}
  node('chapter6Waveform').hidden=src==='silence_jumpscare.png'||c.game!==4||!['intro','silence','verdict','result'].includes(c.step);
  const speaking=phaseCues(canonical).some(cue=>now>=canonical.startedAt+cue.at&&now<canonical.startedAt+cue.at+cue.durationMs);
  node('chapter6Waveform').classList.toggle('speaking',speaking);
  node('chapter6Chicken').hidden=!(c.step==='silence'&&now>=c.phaseAt+26000&&now<c.phaseAt+27500);
  node('chapter6TV').classList.toggle('intrusion',c.game===0&&c.step==='intro'&&now-c.phaseAt<700);
 }
 stop(){this.narration.stop();this.key=null;this.state=null;}
}
globalThis.BrookwoodMaze={games};
