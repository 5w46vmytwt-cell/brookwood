import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {TVCinematicRuntime} from '../tv-cinematic.js';
import {chapter3PartyGain,chapter3AudioTimeline} from '../chapter3-audio.js';
import {PhoneChapter3Runtime} from '../phone-chapter3.js';

function setup(elapsed=0,completedAt=null){
  let perf=0;const nodes=new Map();
  class Audio{constructor(src){this.src=src;this.readyState=1;this.currentTime=0;this.paused=true;this.plays=0;}addEventListener(){}load(){}play(){this.plays++;this.paused=false;return Promise.resolve();}pause(){this.paused=true;}}
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,{style:{},hidden:false,addEventListener(){}});return nodes.get(id);}};
  const context=vm.createContext({Audio,document,console:{warn(){}}});
  for(const file of ['cinematic-engine.js','chapter1.js','cinematic-audio.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
  const runtime=new TVCinematicRuntime({document,timeline:context.BrookwoodChapter1.chapter1Timeline,Renderer:context.BrookwoodTimeline.Renderer,Player:context.BrookwoodAudio.Player,soundtrack:null,now:()=>perf,requestFrame:()=>1,cancelFrame(){}});
  const accept=(at,complete=completedAt)=>runtime.acceptState({phase:complete===null?'chapter3-opening':'private-messages-complete',startedAt:100000,serverNow:200000+at,chapter3:{startedAt:200000,completedAt:complete,readCount:complete===null?0:12}},{hard:true});
  accept(elapsed);
  return {runtime,nodes,accept,opacity:id=>Number(nodes.get('chapter3-'+id).style.opacity),audio:id=>runtime.chapter3Audio.media.get(id),frame(ms){perf+=ms;runtime.scheduler.frame();}};
}

for(const [at,photo,check,privateCount] of [[1999,1,0,0],[2000,1,0,0],[2499,.002,0,0],[2500,0,0,0],[3249,0,0,0],[3250,0,0,0],[9399,0,0,0],[9400,0,0,0],[10149,0,0,0],[10150,0,0,0],[12599,0,0,0],[12600,0,1,0],[14599,0,1,0],[14600,0,0,1]]){
  test(`Chapter 3 exact visual boundary ${at}`,()=>{const e=setup(at);assert(Math.abs(e.opacity('photoComplete')-photo)<1e-9);assert.equal(e.opacity('checkPhones'),check);assert.equal(e.opacity('privateMessages'),privateCount);});
}
test('Chapter 3 narration and vibration have exact windows with zero-gap hard cut',()=>{
  assert.deepEqual(chapter3AudioTimeline.cues.map(c=>[c.at,c.durationMs]),[[3250,6150],[10150,2450]]);
  for(const [at,id,active,offset] of [[3249,'chapter3-opening',false,0],[3250,'chapter3-opening',true,0],[5000,'chapter3-opening',true,1.75],[9400,'chapter3-opening',false,0],[10150,'private-message-vibration',true,0],[12000,'private-message-vibration',true,1.85],[12600,'private-message-vibration',false,0]]){
    const e=setup(at),audio=e.audio(id);assert.equal(audio.plays,active?1:0);if(active)assert.equal(audio.currentTime,offset);
  }
});
test('Chapter 3 refresh consumes historical audio and polling cannot restart vibration',()=>{
  const e=setup(12000);e.accept(12000);assert.equal(e.audio('private-message-vibration').plays,1);
  e.accept(12600);assert(e.audio('private-message-vibration').paused);assert.equal(e.opacity('checkPhones'),1);
  const refreshed=setup(15000);for(const cue of chapter3AudioTimeline.cues)assert.equal(refreshed.audio(cue.id).plays,0);
});
test('Chapter 3 user gestures cannot pause active narration',()=>{
  const e=setup(4000),audio=e.audio('chapter3-opening');e.runtime.unlockChapter3();assert.equal(audio.plays,1);assert.equal(audio.paused,false);
});
test('party fades smoothly to silence by 3250 without changing original elapsed source',()=>{
  assert.equal(chapter3PartyGain(1999),1);assert.equal(chapter3PartyGain(2000),1);assert.equal(chapter3PartyGain(2625),.5);assert.equal(chapter3PartyGain(3250),0);assert.equal(chapter3PartyGain(12600),0);
  const e=setup(4000);assert.equal(e.runtime.elapsedNow(),4000);assert.equal(e.runtime.originalElapsedNow(),104000);
});
test('completion holds 1500ms, fades 500ms and remains black',()=>{
  for(const [elapsed,opacity] of [[0,1],[1499,1],[1500,1],[1750,.5],[2000,0],[9000,0]]){const e=setup(20000+elapsed,220000);assert.equal(e.opacity('completed'),opacity);assert(e.nodes.get('chapter3-main').hidden);assert(e.nodes.get('chapter3Host').hidden);}
});
test('phone activation uses server time at exactly 12600, with no wall clock',()=>{
  let perf=0;const calls=[];const runtime=new PhoneChapter3Runtime({now:()=>perf,requestFrame:()=>1,cancelFrame(){},onState:(s,active)=>calls.push(active)});
  runtime.acceptState({phase:'chapter3-opening',serverNow:212599,chapter3:{startedAt:200000}});assert.equal(calls.at(-1),false);
  perf=1;runtime.scheduler.frame();assert.equal(calls.at(-1),true);
  runtime.acceptState({phase:'lobby'});assert.equal(runtime.state.chapter3,undefined);
});
test('checkpoint changes reconstruct existing TV/audio without reload and consume historical Chapter 1 effects',()=>{
  const e=setup(12000),vibration=e.audio('private-message-vibration');assert.equal(vibration.paused,false);
  e.runtime.acceptState({phase:'opening',startedAt:400000,serverNow:444000,players:[]});
  assert.equal(e.runtime.elapsedNow(),44000);assert.equal(vibration.paused,true);
  assert.equal(e.runtime.audio.media.get('camera-shutter').plays,0);assert.equal(e.runtime.audio.media.get('narration-01').plays,0);
  e.runtime.acceptState({phase:'photo',startedAt:500000,serverNow:588000,players:[]});
  assert.equal(e.runtime.elapsedNow(),88000);for(const a of e.runtime.audio.media.values())assert.equal(a.paused,true);
  const run={phase:'chapter3-opening',startedAt:612000,chapter3:{startedAt:700000,completedAt:null,readCount:0},serverNow:700000};
  e.runtime.acceptState(run);assert.equal(e.runtime.elapsedNow(),0);assert.equal(e.opacity('photoComplete'),1);assert.equal(vibration.paused,true);
  e.runtime.acceptState({...run,serverNow:710150},{hard:true});assert.equal(vibration.plays,2);assert.equal(vibration.currentTime,0);
  // Reselect Chapter 3 while vibration is playing: new generation starts at zero.
  e.runtime.acceptState({...run,startedAt:712000,chapter3:{...run.chapter3,startedAt:800000},serverNow:800000});
  assert.equal(e.runtime.elapsedNow(),0);assert.equal(vibration.paused,true);assert.equal(e.opacity('photoComplete'),1);
  e.runtime.acceptState({...run,startedAt:712000,chapter3:{...run.chapter3,startedAt:800000},serverNow:810150},{hard:true});assert.equal(vibration.plays,3);
});
