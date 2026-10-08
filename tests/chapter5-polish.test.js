import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {mp3Metadata} from './mp3-metadata.js';
import {chapter5Reveals,completeCastRecording,revealTiming,COMPLETE_CAST_HOLD_MS,COMPLETE_CAST_END_MS,POLISHED_FINALE_MS} from '../chapter5-reveal-timing.js';
import {castingRoles,castingCompletionMs,castingRevealOffset,castingFinaleMs} from '../chapter5-timing.js';
import {castingResultTimeline,polishedFinaleTimeline,Chapter5View} from '../chapter5.js';
import {Chapter5Audio,chapter5Narration,chapter5ScoreVolume} from '../chapter5-audio.js';
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function fixture(){
  let elapsed=0,blocked=false;
  const nodes=new Map(),document={getElementById(id){if(!nodes.has(id))nodes.set(id,{style:{},classList:{toggle(){}},addEventListener(){}});return nodes.get(id);}};
  class Audio{constructor(src){this.src=src;this.paused=true;this.currentTime=0;this.readyState=1;this.plays=0;}load(){}addEventListener(){}pause(){this.paused=true;}play(){this.plays++;if(blocked){this.paused=true;return Promise.reject(Object.assign(Error('blocked'),{name:'NotAllowedError'}));}this.paused=false;return Promise.resolve();}}
  const context=vm.createContext({document,Audio,console:{warn(){}},requestAnimationFrame(){throw Error('No second loop');},cancelAnimationFrame(){}});
  for(const p of ['cinematic-engine.js','cinematic-audio.js'])vm.runInContext(fs.readFileSync(p,'utf8'),context);
  const clock={elapsedNow:()=>elapsed,externallyDriven:true,canSync:()=>true};
  return {nodes,clock,at(t){elapsed=t;},block(b){blocked=b;},view:new Chapter5View(document,context.BrookwoodTimeline.Renderer,clock),audio:new Chapter5Audio(context.BrookwoodAudio.Player,clock),resolve:(timeline,t)=>context.BrookwoodTimeline.resolve(timeline,t).visuals};
}
function state(index=0){return {phase:'chapter5-casting',chapter5:{audioVersion:1,revealVersion:1,startedAt:100000,readyAt:163154,rulesStartedAt:180000,roundIndex:index,castStartedAt:null,completedAt:null,winners:[],round:{id:castingRoles[index].id,startedAt:250000,completedAt:300000,voteCount:12,winner:{id:'p',name:'Alex'}}}};}

test('all seven reveal originals are valid mono MP3s and measured durations match source frames',()=>{
  for(const cue of [...chapter5Reveals,completeCastRecording]){const m=mp3Metadata(fs.readFileSync('.'+cue.src));assert.equal(m.durationMs,cue.durationMs);assert.equal(m.sampleRate,44100);assert.equal(m.channels,1);assert.deepEqual(m.bitrates,[128]);}
  assert.equal(new Set(chapter5Reveals.map(c=>c.durationMs)).size,6);
});
for(const role of castingRoles)test(role.id+' reveal waits for the entire measured narration, suspense, 5s reaction and black buffer',()=>{
  const e=fixture(),t=revealTiming(role.id),timeline=castingResultTimeline(role,1),at=x=>e.resolve(timeline,x);
  assert.equal(at(999).hold.opacity,1);assert.equal(at(1000).hold.opacity,0);assert.equal(at(1000).intro.opacity,1);
  assert.equal(at(t.roleAt).intro.opacity,0);assert.equal(at(t.roleAt).role.opacity,1);
  assert.equal(t.narrationEnd-t.narrationAt,Math.ceil(chapter5Reveals.find(c=>c.id==='chapter5-reveal-'+role.id).durationMs));
  assert.equal(t.winnerAt-t.narrationEnd,role.id==='killer'?2500:1500);
  assert.equal(at(t.winnerAt-1).winner.opacity,0);assert.equal(at(t.winnerAt).winner.opacity,1);
  assert.equal(at(t.fadeAt-1).winner.opacity,1);assert.equal(at(t.fadeAt+350).winner.opacity,.5);
  for(const x of [t.fadeEnd,t.end-1,t.end,t.end+5000])assert(Object.values(at(x)).every(v=>v.opacity===0));
  assert.equal(t.end-t.fadeEnd,500);assert.equal(castingCompletionMs(role.id,1),t.end);assert.equal(castingRevealOffset(role.id,1),t.winnerAt);
});
test('stale round polling cannot restore a previous card after winner/black or after next round',()=>{
  const e=fixture(),s=state(),t=revealTiming('screamer');e.at(200000+t.winnerAt);e.view.update(s);
  assert.equal(Number(e.nodes.get('chapter5-winner').style.opacity),1);
  const stale=structuredClone(s);stale.chapter5.round.completedAt=null;stale.chapter5.round.winner=null;e.view.update(stale);
  assert.equal(Number(e.nodes.get('chapter5-card').style.opacity),0);
  e.at(200000+t.fadeEnd);e.view.update(s);assert.equal(Number(e.nodes.get('chapter5-winner').style.opacity),0);
  const next=state(1);next.chapter5.round.startedAt=300000+t.end;next.chapter5.round.completedAt=null;
  e.at(200000+t.end+499);e.view.update(next);assert.equal(Number(e.nodes.get('chapter5-card').style.opacity),0);
  e.view.update(s);assert.equal(e.view.state.chapter5.roundIndex,1);assert.equal(Number(e.nodes.get('chapter5-card').style.opacity),0);
  e.at(200000+t.end+850);e.view.update(next);assert.equal(Number(e.nodes.get('chapter5-card').style.opacity),.5);assert.equal(e.nodes.get('chapter5-cardImage').src,castingRoles[1].src);
});
test('late next-round rendering never paints the previous bitmap while the new approved card decodes',async()=>{
  const e=fixture(),image=e.view.document.getElementById('chapter5-cardImage'),pending=[];
  image.decode=()=>new Promise(resolve=>pending.push(resolve));
  const first=state();first.chapter5.round.completedAt=null;e.at(151200);e.view.update(first);assert(image.hidden);
  const next=state(1);next.chapter5.round.startedAt=300000;next.chapter5.round.completedAt=null;e.at(201200);e.view.update(next);
  assert.equal(Number(e.nodes.get('chapter5-card').style.opacity),1);assert(image.hidden);
  pending[0]();await flush();assert(image.hidden,'old decode must not unhide the new card');
  pending[1]();await flush();assert.equal(image.hidden,false);assert.equal(image.src,castingRoles[1].src);
  next.chapter5.round.completedAt=310000;e.at(210500);e.view.update(next);assert.equal(pending.length,2,'same-round completion must not decode or flicker');
});
for(const [index,role] of castingRoles.entries())test(role.id+' suspense-to-winner polling and refresh never show a role-only frame',()=>{
  const t=revealTiming(role.id),s=state(index);s.chapter5.round.winner=null;
  for(const refresh of [false,true]){
    const e=fixture();
    if(!refresh){e.at(200000+t.winnerAt-1);e.view.update(s);}
    e.at(200000+t.winnerAt);e.view.update(s);
    assert.equal(Number(e.nodes.get('chapter5-winner').style.opacity),0);
    assert.equal(Number(e.nodes.get('chapter5-revealRole').style.opacity),1);
    assert.equal(e.nodes.get('chapter5-revealRole').textContent,role.title+' IS...');
    assert.equal(Number(e.nodes.get('chapter5-card').style.opacity),0);
    const revealed=structuredClone(s);revealed.chapter5.round.winner={id:'allan',name:'ALLAN'};e.view.update(revealed);
    assert.equal(Number(e.nodes.get('chapter5-revealRole').style.opacity),0);
    assert.equal(Number(e.nodes.get('chapter5-winner').style.opacity),1);
    assert.equal(e.nodes.get('chapter5-winnerRole').textContent,role.title);
    assert.equal(e.nodes.get('chapter5-winnerName').textContent,'ALLAN');
    e.view.update(s);assert.equal(e.nodes.get('chapter5-winnerName').textContent,'ALLAN');
    assert.equal(Number(e.nodes.get('chapter5-card').style.opacity),0);
    e.at(200000+t.fadeEnd);e.view.update(revealed);
    assert.equal(Number(e.nodes.get('chapter5-winner').style.opacity),0);
    assert.equal(Number(e.nodes.get('chapter5-revealRole').style.opacity),0);
  }
  const timeline=castingResultTimeline(role,1);
  assert.equal(timeline.cues.find(c=>c.id==='role').visual.text,role.title+' IS...');
  assert.equal(timeline.cues.find(c=>c.id==='winner').at,t.winnerAt);
  const css=fs.readFileSync('chapter5.css','utf8');assert(css.includes('#chapter5-winnerName{font-size:clamp(54px,9vw,160px)'));assert(css.includes('#chapter5-winnerRole{font:clamp(18px,2.2vw,34px)'));
});
test('full cast shows all six approved images for the entire narration plus 3s then preserves mystery relative timing',()=>{
  const e=fixture(),timeline=polishedFinaleTimeline(),shift=COMPLETE_CAST_END_MS-8500;
  assert.equal(COMPLETE_CAST_HOLD_MS,Math.ceil(completeCastRecording.durationMs)+3000);
  assert.equal(e.resolve(timeline,COMPLETE_CAST_HOLD_MS).cast.opacity,1);assert.equal(e.resolve(timeline,COMPLETE_CAST_HOLD_MS+750).cast.opacity,.5);
  assert.equal(e.resolve(timeline,COMPLETE_CAST_END_MS).cast.opacity,0);
  assert.equal(e.resolve(timeline,COMPLETE_CAST_END_MS+2499).ofCourse.opacity,0);assert.equal(e.resolve(timeline,COMPLETE_CAST_END_MS+2500).ofCourse.opacity,1);
  assert.equal(e.resolve(timeline,12000+shift).onlyGame.opacity,1);assert.equal(timeline.end,POLISHED_FINALE_MS);assert.equal(castingFinaleMs(1),timeline.end);
  const html=fs.readFileSync('tv.html','utf8');for(const role of castingRoles)assert(html.includes('src="'+role.src+'"'));assert(!html.includes('id="chapter5-roleTitle"'));
});
test('reveal refresh seeks active narration, skips expired voice and repeated polls cannot replay it',async()=>{
  for(const [index,role] of castingRoles.entries()){
    const e=fixture(),s=state(index),cue=chapter5Narration(s).find(c=>c.id==='chapter5-reveal-'+role.id),audio=e.audio.player.media.get(cue.id);
    assert.equal(cue.at,201000);e.at(cue.at+500);e.audio.update(s,{reconstruct:true});await flush();assert.equal(audio.currentTime,.5);assert.equal(audio.volume,1);assert(!audio.paused);
    e.audio.update(s);assert.equal(audio.plays,1);e.at(cue.at+cue.durationMs);e.audio.update(s);assert(audio.paused);
    const reconnect=fixture();reconnect.at(cue.at+cue.durationMs+100);reconnect.audio.update(s,{reconstruct:true});assert.equal(reconnect.audio.player.media.get(cue.id).plays,0);
  }
});
test('complete cast narration seeks on refresh, ducks a continuous score then score fades before the mystery',async()=>{
  const e=fixture(),s=state(5);s.phase='chapter5-finale';s.chapter5.castStartedAt=400000;
  e.at(300500);e.audio.update(s,{reconstruct:true});await flush();const voice=e.audio.player.media.get(completeCastRecording.id),score=e.audio.player.tracks[0].audio;
  assert.equal(voice.currentTime,.5);assert(!voice.paused);assert(!score.paused);assert(Math.abs(score.volume-.044)<1e-9);
  assert.equal(chapter5ScoreVolume(300000+COMPLETE_CAST_HOLD_MS,s),.14);
  assert.equal(chapter5ScoreVolume(300000+COMPLETE_CAST_END_MS,s),0);
  e.at(300000+COMPLETE_CAST_END_MS);e.audio.update(s);assert(voice.paused);assert.equal(score.volume,0);
});
test('blocked reveal audio recovers at current offset without replaying earlier narration',async()=>{
  const e=fixture(),s=state();e.block(true);e.at(202000);e.audio.update(s,{reconstruct:true});await flush();assert(e.audio.needsUnlock());
  e.block(false);e.audio.unlock();await flush();const voice=e.audio.player.media.get('chapter5-reveal-screamer');assert(!voice.paused);assert.equal(voice.currentTime,1);
  // Gesture priming may call play at zero volume, but never resumes past lines.
  assert(e.audio.player.media.get('chapter5-item-acquired').paused);
  assert.equal(e.audio.player.media.get('chapter5-item-acquired').currentTime,0);
});
test('legacy in-flight runs retain previous reveals; new visual styles stay Chapter 5 scoped and honor reduced motion',()=>{
  assert.equal(castingCompletionMs('screamer',0),6900);assert.equal(castingFinaleMs(0),30100);
  const s=state();delete s.chapter5.revealVersion;assert(chapter5Narration(s).every(c=>!c.id.includes('reveal-')&&c.id!==completeCastRecording.id));
  const css=fs.readFileSync('chapter5.css','utf8');assert(css.includes('prefers-reduced-motion'));assert(css.includes('#castingBox :focus-visible'));assert(css.includes('grid-template-columns:repeat(3'));assert(css.includes('#chapter5-cardImage'));
});
