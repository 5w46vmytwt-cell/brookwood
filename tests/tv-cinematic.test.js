import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { TVCinematicRuntime } from '../tv-cinematic.js';
import * as timing from '../cinematic-timeline.js';
import { frameAt as approvedFrame } from './chapter1-approved-fixture.js';

const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function setup(score=false){
  let perf=0,wall=999000000,serial=0;
  const frames=new Map(),nodes=new Map();
  class Audio {
    constructor(src){this.src=src;this.readyState=1;this.currentTime=0;this.paused=true;this.plays=0;this.listeners={};}
    addEventListener(name,cb){this.listeners[name]=cb;}
    load(){}
    play(){this.paused=false;this.plays++;return Promise.resolve();}
    pause(){this.paused=true;}
  }
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,{style:{},addEventListener(){}});return nodes.get(id);}};
  const requestFrame=cb=>{frames.set(++serial,cb);return serial;},cancelFrame=id=>frames.delete(id);
  const context=vm.createContext({document,Audio,Date:{now:()=>wall+perf},requestAnimationFrame:requestFrame,cancelAnimationFrame:cancelFrame,console:{warn(){}},
    setTimeout(){throw Error('No timers in cinematic integration');},fetch(){throw Error('No scheduler network requests');}});
  for(const file of ['cinematic-engine.js','chapter1.js','cinematic-audio.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
  const timeline=context.BrookwoodChapter1.chapter1Timeline;
  const runtime=new TVCinematicRuntime({document,timeline,Renderer:context.BrookwoodTimeline.Renderer,Player:context.BrookwoodAudio.Player,
    soundtrack:score?context.BrookwoodAudio.tvSoundtrack:null,now:()=>perf,requestFrame,cancelFrame});
  return {runtime,timeline,nodes,frames,context,
    accept(elapsed,options={}){const {phase='opening',startedAt=1000000,...sync}=options;runtime.acceptState({phase,startedAt,serverNow:(startedAt??0)+elapsed,players:[]},sync);},
    frame(ms){perf+=ms;const pending=[...frames.values()];frames.clear();for(const cb of pending)cb();},
    advanceWithoutFrame(ms){perf+=ms;},wall(value){wall=value;},audio(id){return runtime.audio.media.get(id);},
    opacity(id){return Number(nodes.get(id).style.opacity);}};
}

test('locked timing constants are adjacent and keep a 1500ms photo prompt gap',()=>{
  assert.equal(timing.CHAPTER1_START_MS,0);assert.equal(timing.CHAPTER1_END_MS,44000);
  assert.equal(timing.CHAPTER1_END_MS,timing.CHAPTER2_START_MS);
  assert.equal(timing.CHAPTER2_END_MS,timing.PHOTO_CHECKPOINT_MS);
  assert(timing.PHOTO_PROMPT_MS<timing.PHOTO_CHECKPOINT_MS);
  assert.equal(timing.PHOTO_CHECKPOINT_MS-timing.PHOTO_PROMPT_MS,1500);
  assert.equal(timing.PHOTO_PROMPT_MS,86500);assert.equal(timing.PHOTO_CHECKPOINT_MS,88000);
});
test('TV starts Chapter 1 at server elapsed zero, interpolates one clock and ignores client wall-clock jumps',()=>{
  const e=setup();e.accept(0);assert.equal(e.opacity('openingTitle'),1);assert.equal(e.frames.size,1);
  e.wall(-500000000);e.frame(1000);assert.equal(e.runtime.elapsedNow(),1000);assert.equal(e.opacity('openingTitle'),1);
  e.wall(8000000000000);e.frame(1000);assert.equal(e.runtime.elapsedNow(),2000);
  assert.equal(e.runtime.visuals.raf,null);assert.equal(e.runtime.audio.raf,null);
});
test('scheduler-driven renderer matches approved visuals at all exact Chapter 1 boundaries',()=>{
  const e=setup(),targets={title:'openingTitle',date:'chapterDate',farm:'chapterFarm',farmLabel:'chapterFarmLabel',poster:'chapterPoster',time:'chapterTime',friends:'chapterFriends',flash:'chapterFlash',group:'chapterGroup',final:'chapterFinal'};
  const boundaries=[0,3400,4000,6000,7000,9000,12000,13000,14000,16000,17000,23000,24000,24200,28000,29000,31000,32000,33000,36000,36120,39000,42000,42700,43000,43200,43500,44000];
  for(const boundary of boundaries)for(const offset of [-.01,0,.01]){
    const elapsed=Math.max(0,boundary+offset);e.accept(elapsed,{hard:true});const expected=approvedFrame(e.runtime.elapsedNow()/1000);
    for(const [id,target] of Object.entries(targets))assert(Math.abs(e.opacity(target)-expected[id])<1e-12,`${id} at ${elapsed}`);
  }
});
test('approved timeline and narration metadata remain locked',()=>{
  const {timeline}=setup();assert.equal(timeline.end,44000);
  const cue=id=>timeline.cues.find(c=>c.id===id);
  assert.equal(cue('flash').at,36000);assert.equal(cue('flash').end,36120);
  assert.equal(cue('group').at,36120);assert.equal(cue('final').at,42700);
  assert.deepEqual(Array.from(timeline.cues.filter(c=>c.type==='narration'),c=>c.at),[5000,9000,12000,16000,19000,23500,27900,31950,33725,39000]);
  assert.equal(cue('camera-shutter').at,36000);assert.equal(cue('camera-shutter').volume,.55);
  for(const c of timeline.cues.filter(c=>c.type==='narration'))assert.equal(setup().audio(c.id).volume,1);
});
test('refresh at 20000ms reconstructs farm and seeks current narration without replaying past clips',async()=>{
  const e=setup();e.accept(20000);await flush();assert.equal(e.opacity('chapterFarm'),1);
  assert.equal(e.audio('narration-05').plays,1);assert.equal(e.audio('narration-05').currentTime,1);
  for(let i=1;i<=4;i++)assert.equal(e.audio(`narration-0${i}`).plays,0);
  assert.equal(e.audio('camera-shutter').plays,0);assert(!e.runtime.audio.handled.has('camera-shutter'));
});
test('polling does not restart narration, while hard reconciliation seeks an already active clip',async()=>{
  const e=setup();e.accept(20000);await flush();e.accept(20000);e.accept(20000);
  assert.equal(e.audio('narration-05').plays,1);
  e.accept(21000,{hard:true});assert.equal(e.audio('narration-05').currentTime,2);assert.equal(e.audio('narration-05').plays,1);
});
test('refresh after shutter skips historical SFX and retains future narration',()=>{
  const e=setup();e.accept(37000);assert.equal(e.opacity('chapterGroup'),1);assert.equal(e.audio('camera-shutter').plays,0);
  assert(e.runtime.audio.handled.has('camera-shutter'));e.frame(2000);assert.equal(e.audio('narration-10').plays,1);
});
test('tab suspension from 30000 to 37000 reconstructs without burst narration or historical shutter',async()=>{
  const e=setup();e.accept(30000);await flush();assert.equal(e.audio('narration-07').plays,1);
  e.frame(7000);assert(e.runtime.scheduler.recovering);assert.equal(e.audio('camera-shutter').plays,0);
  // Metadata arriving while awaiting an authoritative poll cannot fire cues.
  e.audio('camera-shutter').listeners.canplay();assert.equal(e.audio('camera-shutter').plays,0);
  e.accept(37000);assert(!e.runtime.scheduler.recovering);assert.equal(e.opacity('chapterGroup'),1);
  for(const id of ['narration-08','narration-09','camera-shutter'])assert.equal(e.audio(id).plays,0);
  e.frame(2000);assert.equal(e.audio('narration-10').plays,1);
});
test('a resumed poll arriving before the first RAF still hard-reconciles an active clip',async()=>{
  const e=setup();e.accept(5000);await flush();
  // Performance advanced while both the poller and renderer were suspended.
  e.advanceWithoutFrame(7000);e.accept(12000);assert.equal(e.opacity('chapterFarm'),0);
  assert.equal(e.audio('narration-03').plays,1);assert.equal(e.audio('narration-02').plays,0);
});
test('lobby and photo phases bypass cinematic painting, preserving server phase authority',()=>{
  const e=setup();let paints=0;const paint=e.runtime.visuals.paint.bind(e.runtime.visuals);e.runtime.visuals.paint=()=>{paints++;return paint();};
  e.accept(0,{phase:'lobby',startedAt:null});e.frame(10);assert.equal(paints,0);
  e.accept(0);assert.equal(paints,1);e.accept(50000,{phase:'photo'});e.frame(10);assert.equal(paints,1);
  e.accept(50000,{phase:'photo-complete'});e.frame(10);assert.equal(paints,1);
});
test('Chapter 1 remains black after 44000; Chapter 2 prompt never changes server phase automatically',()=>{
  const e=setup();for(const elapsed of [44000,86500,88000,200000]){
    e.accept(elapsed,{hard:true});for(const {node} of e.runtime.visuals.layers)assert.equal(Number(node.style.opacity),0);
    assert.equal(e.runtime.state.phase,'opening');assert.equal(e.runtime.audio.active,null);
  }
  assert.equal(e.opacity('chapter2-getTogether'),1);
  assert(!fs.readFileSync('tv-cinematic.js','utf8').includes('begin-photo'));
  assert(!fs.readFileSync('tv.html','utf8').includes('begin-photo'));
});
test('persistent score retains its element/position through return and replay with original volumes',async()=>{
  const e=setup(true);e.accept(0,{phase:'lobby',startedAt:null});await flush();e.frame(400);
  const score=e.runtime.audio.soundtrack.audio;score.currentTime=42;const plays=score.plays;
  assert.equal(score.volume,.18);e.accept(0);e.frame(350);assert.equal(score.volume,.15);
  e.accept(5000,{hard:true});e.frame(200);assert.equal(score.volume,.08);assert.equal(e.audio('narration-01').volume,1);
  e.accept(37000,{hard:true});e.frame(200);assert.equal(score.volume,.07);
  e.accept(0,{phase:'lobby',startedAt:null});e.frame(350);assert.equal(score.volume,.18);
  e.accept(0,{startedAt:2000000});assert.equal(e.runtime.audio.soundtrack.audio,score);assert.equal(score.currentTime,42);assert.equal(score.plays,plays);
});
