import {games,recordings,soundEffects,answerRevealed,phaseCues,memoryVisible,jumpVisible,transitionVisual,orderedOptions} from './chapter6-timing.js';
import {MazeExposure} from './chapter6-exposure.js';
import {MazeAmbient} from './chapter6-ambient.js';
import {MazeNarration} from './chapter6-audio.js';
const bridgeRules='Alex — 1 minute · Emma — 2 minutes · Clara — 5 minutes · David — 10 minutes\nOne flashlight. At most two cross together. Crossings take the slower person’s time. Return the flashlight when needed.';
const bridgeSolution='Alex + Emma cross: 2\nAlex returns: 1\nClara + David cross: 10\nEmma returns: 2\nAlex + Emma cross: 2\nTOTAL: 17 MINUTES';
export class Chapter6View{
 constructor(document,Player,clock){
  this.document=document;this.clock=clock;this.key=null;this.state=null;
  // Load challenge imagery before its timed window; never expose the memory
  // bitmap until the canonical server exposure begins.
  this.images=[];
  this.player=new Player({id:'chapter6',cues:[...recordings,...soundEffects].map(c=>({...c,at:0}))},{...clock,soundtrack:{src:'/assets/chapter6/audio/ch6_ambient_maze.mp3',lobbyVolume:.12,fadeMs:2000,duckMs:350}});
  this.exposure=new MazeExposure({onState:(state,timing)=>{if(state)this.document.dispatchEvent(new CustomEvent('brookwood-maze-audio-state',{detail:{state,timing}}));}});
  this.ambient=new MazeAmbient(this.player.soundtrack);
  this.narration=new MazeNarration(this.player,clock,{onState:(state,timing)=>{if(state)this.document.dispatchEvent(new CustomEvent('brookwood-maze-audio-state',{detail:{state,timing}}));}});
 }
 unlock(){this.exposure.retry();this.ambient.unlock();if(this.state?.chapter6.audioVersion===2){this.narration.unlock();return;}this.player.unlock({background:false,onlyPaused:true});
  // A gesture retries only the currently active window, never consumed history.
  if(this.state){for(const cue of phaseCues(this.state.chapter6)){const t=this.clock.elapsedNow();if(t>=cue.at&&t<cue.at+cue.durationMs)this.player.handled.delete(cue.id);}this.player.sync();}
 }
 update(state,meta={}){
  if(!this.images.length)this.images=['red_door','blue_door','green_door','black_door','red_reveal','blue_reveal','green_reveal','black_reveal','morgue_memory','bridge_background','silence_jumpscare'].map(name=>{
   const image=this.document.createElement('img');image.src='/assets/chapter6/'+name+'.png';return image;
  });
  this.state=state;const canonical=state.chapter6,now=canonical.startedAt+this.clock.elapsedNow(),key=canonical.startedAt+':'+canonical.sequence;
  if(canonical.audioVersion===2){
   this.narration.update(state,meta);
   this.player.sfxCues=this.narration.active&&!this.narration.active.ended?[]:phaseCues(canonical).filter(cue=>cue.type==='sfx'&&this.clock.elapsedNow()<cue.at+(cue.mediaDurationMs??cue.durationMs));
   for(const cue of this.player.sfxCues){const audio=this.player.media.get(cue.id);if(audio)audio.volume=cue.volume;}
   this.player.syncSfx?.(this.clock.elapsedNow());
  }
  else{if(this.key!==key){this.player.stop();this.key=key;const cues=phaseCues(canonical);this.player.cues=cues.filter(x=>x.type==='narration');this.player.sfxCues=cues.filter(x=>x.type==='sfx');}
   this.player.update({phase:'opening',startedAt:canonical.startedAt},meta);}
  this.ambient.update(canonical,this.narration.active);
  const visual=transitionVisual(canonical,now),c=visual.scene??canonical;
  const curtain=this.document.getElementById('chapter6Curtain');curtain.style.opacity=String(visual.black);curtain.hidden=!['return-fade','result-reveal','takeover','transition','intro-gap'].includes(canonical.step);
  // A single Chapter 6 narration channel owns all speech.
  for(const cue of this.player.sfxCues??[]){const audio=this.player.media.get(cue.id);if(audio)audio.volume=cue.volume??1;}
  const node=id=>this.document.getElementById(id),game=games[c.game],result=c.results[c.game],complete=c.step==='complete'||!visual.scene;
  node('chapter6Content').hidden=complete;node('chapter6HUD').hidden=complete;
  node('chapter6Audio').hidden=complete||canonical.step==='transition';node('chapter6HostToggle').hidden=complete||canonical.step==='transition';
  const opening=c.audioVersion===2&&c.game===0&&c.step==='intro'&&c.audioIndex<2;
  node('chapter6GameTitle').textContent=c.step==='ready'?'THE KILLER’S MAZE':game.title;node('chapter6Stage').textContent='GAME '+(c.game+1)+' / 5';
  node('chapter6Status').textContent=this.exposure.message||this.narration.message||(c.step==='expired'?"TIME'S UP":c.step==='answer'?'CHOOSE':c.step==='locked'?'ANSWER LOCKED':c.step==='result'?'RESULT':c.step==='silence'?'REMAIN SILENT':'WAITING');
  node('chapter6Audio').textContent=this.narration.blocked?'ENABLE AUDIO / RESUME':'ENABLE AUDIO';
  node('chapter6Bridge').hidden=!(c.game===3&&['intro','answer','expired'].includes(c.step));
  node('chapter6Token').hidden=!['vote','selected','waiting'].includes(c.step);
  node('chapter6TV').classList.toggle('maze-memory',memoryVisible(c,now));
  node('chapter6TV').classList.toggle('maze-token',!node('chapter6Token').hidden);
  node('chapter6TV').classList.toggle('maze-gameover',['gameover','finale'].includes(c.step));
  node('chapter6TV').classList.toggle('maze-question',[1,2].includes(c.game)&&['answer','expired','locked'].includes(c.step));
  node('chapter6TV').classList.toggle('maze-success',c.step==='result'&&result.correct);
  node('chapter6TV').classList.toggle('maze-failure',c.step==='result'&&!result.correct);
  const silenceFailure=c.game===4&&c.step==='result'&&!result.correct;
  const failureScare=silenceFailure&&(c.pacingVersion!==1||now-c.phaseAt<3000);
  const failureVoice=silenceFailure&&c.pacingVersion===1&&!failureScare;
  const cinematicResult=c.pacingVersion===1&&c.step==='result'&&c.game<4;
  node('chapter6TV').classList.toggle('maze-result',cinematicResult);
  for(const [i,name] of ['doors','boxoffice','memory','bridge'].entries())node('chapter6TV').classList.toggle('maze-result-'+name,cinematicResult&&c.game===i);
  node('chapter6TV').classList.toggle('maze-failure-voice',failureVoice);
  node('chapter6TV').classList.toggle('maze-failure-scare',failureScare);
  node('chapter6TV').classList.toggle('maze-impact',failureScare&&now-c.phaseAt<500);
  node('chapter6TV').classList.toggle('maze-zero',c.step==='zero'||c.step==='return');
  node('chapter6TV').classList.toggle('maze-opening',opening||c.step==='takeover'||c.step==='ready');
  node('chapter6HUD').hidden=complete||opening||['ready','silence-ready','memory-ready'].includes(c.step);
  node('chapter6Content').style.opacity=canonical.step==='intro-gap'?'1':(opening||['ready','silence-ready'].includes(c.step))?String(Math.min(1,Math.max(0,(now-c.phaseAt)/600))):c.step==='zero'?String(Math.min(1,Math.max(0,(now-c.phaseAt)/1000))):'1';
  const tokenSteps=['vote','selected','waiting'],objective=node('chapter6Objective');objective.hidden=!tokenSteps.includes(c.step);objective.textContent=tokenSteps.includes(c.step)?['PRIVATE VOTE','RETRIEVER SELECTED','AWAITING RETURN'][tokenSteps.indexOf(c.step)]:'';
  node('chapter6Title').textContent=opening?(c.audioIndex===0?'SIGNAL INTERRUPTED':'THE KILLER’S MAZE'):['gameover','finale'].includes(c.step)?'GAME OVER':tokenSteps.includes(c.step)?'SOMETHING IS WAITING FOR YOU.':c.step==='zero'?'ALL LIVES LOST':c.step==='ready'?'THE KILLER’S MAZE':game.title;
  node('chapter6Title').hidden=c.step==='return'||failureVoice||(['answer','expired','locked','exposure'].includes(c.step)||cinematicResult)&&c.game<4;
  const shownLives=c.step==='locked'?Math.max(0,3-c.results.slice(0,c.game).filter(r=>!r.correct).length):c.lives;
  node('chapter6Lives').textContent='♥'.repeat(shownLives)+'♡'.repeat(3-shownLives);node('chapter6Lives').setAttribute?.('aria-label',shownLives+' of 3 shared lives remaining');
  node('chapter6Timer').textContent=c.step==='expired'?'00:00':c.step==='exposure'?(now<c.phaseAt?'':'MEMORIZE · '+Math.max(0,Math.ceil((c.deadline-now)/1000))):['answer','silence'].includes(c.step)?String(Math.max(0,Math.ceil((c.deadline-now)/1000))):'';
  node('chapter6Question').textContent=['gameover','finale'].includes(c.step)?(c.lives>0?'YOU SURVIVED THE MAZE':'NO LIVES REMAIN'):['memory-ready','silence-ready'].includes(c.step)?'ARE YOU READY?':c.step==='prepare-image'||c.step==='exposure'&&now<c.phaseAt?'PREPARING THE IMAGE':c.step==='ready'?'EVERYONE READY?':c.step==='expired'?"TIME'S UP":c.step==='locked'?'ANSWER LOCKED':c.step==='exposure'?'MEMORIZE THE SCENE':c.step==='answer'?game.question:c.step==='silence'?'DON’T MAKE A SOUND':c.step==='verdict'?'SILENCE COMPLETE — AWAITING VERDICT':c.step==='vote'?'CHOOSE WHO RETRIEVES THE TOKEN':c.step==='waiting'?'WAITING FOR '+c.selectedPlayer.name+' TO RETURN.':c.step==='selected'?c.selectedPlayer.name:c.step==='zero'?'YOU HAVE NOTHING LEFT TO LOSE.':c.step==='result'?(failureScare?'':failureVoice?'YOU FAILED.':cinematicResult&&c.game===0&&['red','blue','green','black'].includes(result.answer)?(result.correct?'YOU CHOSE THE RIGHT DOOR.':'YOU CHOSE THE WRONG DOOR.'):result.correct?(c.game===4?'SURVIVED':'CORRECT'):(c.polishVersion===1&&[1,2].includes(c.game)?'WRONG ANSWER':'WRONG')):'';
  node('chapter6Detail').textContent=c.step==='memory-ready'?'MEMORIZE EVERYTHING.\n\nWAITING FOR THE HOST':c.step==='result'&&[1,2].includes(c.game)&&!answerRevealed(c,now)?'':failureVoice?(Math.max(0,3-c.results.slice(0,4).filter(r=>!r.correct).length)>0?'ONE LIFE LOST.':'NO LIVES REMAIN.'):c.step==='silence-ready'?'SIXTY SECONDS OF SILENCE.\n\nWAITING FOR THE HOST.':c.step==='ready'?'FIVE GAMES.\nTHREE LIVES.\nONE WAY OUT.\n\nWAITING FOR THE HOST':c.step==='result'&&result.answer==='no-consensus'?'NO CONSENSUS.\nTIME RAN OUT.\nONE LIFE LOST.':c.step==='zero'?"BUT THE GAME ISN'T OVER.":c.step==='locked'?(game.options.find(([id])=>id===result.answer)?.[1]??(result.answer===null?'TIME EXPIRED':result.answer.toUpperCase())):['gameover','finale'].includes(c.step)?'':c.game===3&&['intro','answer'].includes(c.step)?'':c.step==='result'&&c.game===3?bridgeSolution:c.step==='result'&&c.game===1?'The Sixth Sense (1999) earned the most worldwide.':c.step==='result'&&c.game===2?'The clock showed 3:45.':c.step==='result'&&c.game===0&&result.answer===null?'The group failed to choose a door.':c.step==='vote'?'VOTES RECEIVED: '+c.voteCount+' / '+c.voterCount:c.step==='waiting'?c.selectedPlayer.name:tokenSteps.includes(c.step)?'IN THE LAUNDRY ROOM.':'';
  const image=node('chapter6Image');let src=null;
  if(failureScare)src='silence_jumpscare.png';
  else if(memoryVisible(c,now)||c.step==='prepare-image'||c.game===2&&c.step==='exposure'||cinematicResult&&c.game===2&&answerRevealed(c,now))src='morgue_memory.png';
  else if(c.game===3&&['intro','answer','result'].includes(c.step))src='bridge_background.png';
  else if(c.game===0&&c.step==='result'&&['red','blue','green','black'].includes(result.answer))src=result.answer+'_reveal.png';
  else if(jumpVisible(c,now)&&!this.narration.active)src='silence_jumpscare.png';
  if(src&&image.getAttribute('src')!=='/assets/chapter6/'+src){image.style.visibility='hidden';image.onload=()=>{if(image.getAttribute('src')==='/assets/chapter6/'+src)image.style.visibility='visible';};image.onerror=()=>{image.style.visibility='hidden';};image.src='/assets/chapter6/'+src;if(image.complete&&image.naturalWidth>0)image.style.visibility='visible';}
  image.style.transform=cinematicResult?'scale('+String(1+.02*Math.min(1,Math.max(0,(now-c.phaseAt)/12000)))+')':'none';
  image.hidden=!src||c.step==='prepare-image'||c.step==='exposure'&&!memoryVisible(c,now);image.style.opacity=failureScare&&c.pacingVersion===1?String(Math.max(0,Math.min(1,(3000-(now-c.phaseAt))/500))):'1';image.classList.toggle('memory',memoryVisible(c,now));image.classList.toggle('jump',src==='silence_jumpscare.png');image.classList.toggle('bridge',src==='bridge_background.png');
  this.exposure.update(state,image);
  const doors=node('chapter6Doors');doors.hidden=opening||!(c.game===0&&['intro','answer','expired','locked'].includes(c.step));
  const orderKey=c.startedAt+':'+c.doorOrder?.join(',');
  if(c.game===0&&this.orderKey!==orderKey){doors.replaceChildren();for(const [id,label] of orderedOptions({...c,game:0})){
   const figure=this.document.createElement('figure'),img=this.document.createElement('img'),caption=this.document.createElement('figcaption');
   figure.doorId=id;img.src='/assets/chapter6/'+id+'_door.png';img.alt=label;caption.textContent=label;figure.appendChild(img);figure.appendChild(caption);doors.appendChild(figure);
  }this.orderKey=orderKey;}
  for(const figure of doors.children)figure.className=c.step==='locked'&&figure.doorId===result.answer?'selected':'';
  const choices=node('chapter6Choices'),choiceKey=['answer','expired','locked'].includes(c.step)?c.game+':'+c.step+':'+orderKey:null;
  if(this.choiceKey!==choiceKey){choices.replaceChildren();if(choiceKey!==null)for(const [id,label] of orderedOptions(c)){
   const li=this.document.createElement('li'),title=this.document.createElement('strong'),year=this.document.createElement('small');
   const movie=label.match(/^(.*) \((\d{4})\)$/);title.textContent=movie?movie[1]:label;li.appendChild(title);
   if(movie){year.textContent=movie[2];li.appendChild(year);}li.answerId=id;li.className=c.step==='locked'&&id===result.answer?'selected':'';choices.appendChild(li);
  }this.choiceKey=choiceKey;}
  node('chapter6Waveform').hidden=src==='silence_jumpscare.png'||(c.step!=='return'&&c.step!=='zero'&&!failureVoice&&(c.game!==4||!['intro','silence','verdict','result'].includes(c.step)));
  const speaking=this.narration.active?(!this.narration.active.ended&&!this.narration.active.audio.paused):phaseCues(canonical).some(cue=>cue.type==='narration'&&now>=canonical.startedAt+cue.at&&now<canonical.startedAt+cue.at+cue.durationMs);
  node('chapter6Waveform').classList.toggle('speaking',speaking);
  node('chapter6Chicken').hidden=!(c.step==='silence'&&now>=c.phaseAt+26000&&now<c.phaseAt+27500);
  node('chapter6TV').classList.toggle('intrusion',c.game===0&&c.step==='intro'&&now-c.phaseAt<700);
 }
 advanceAmbient(){this.ambient.advance();}
 stopNarration(){this.exposure.stop();this.narration.stop();this.key=null;this.state=null;}
 stop(immediate=false){this.ambient.stop(immediate);this.stopNarration();}
}
globalThis.BrookwoodMaze={games};
