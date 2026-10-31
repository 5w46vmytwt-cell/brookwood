import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { chapter2Audio, chapter2Narration, partyTrack, partyVolume, duckWindows } from '../chapter2-audio.js';
import { CHAPTER2_NARRATION, PHOTO_PROMPT_MS, PHOTO_CHECKPOINT_MS } from '../cinematic-timeline.js';
import { wavMetadata } from './wav-metadata.js';
import { mp3Metadata } from './mp3-metadata.js';
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
function setup(){
  let elapsed=0;
  class Audio{
    constructor(src){this.src=src;this.paused=true;this.currentTime=0;this.readyState=1;this.plays=0;this.events={};}
    load(){} addEventListener(e,f){this.events[e]=f;} pause(){this.paused=true;}
    play(){this.plays++;this.paused=false;return this.fail?Promise.reject(Error('blocked')):Promise.resolve();}
  }
  const context=vm.createContext({Audio,Date:{now:()=>elapsed},console:{warn(){}},requestAnimationFrame(){return 1;},cancelAnimationFrame(){},
    setTimeout(){throw Error('No timers');}});
  for(const file of ['cinematic-engine.js','chapter1.js','cinematic-audio.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
  const p=new context.BrookwoodAudio.Player(context.BrookwoodChapter1.chapter1Timeline,{elapsedNow:()=>elapsed,externallyDriven:true,
    soundtrack:context.BrookwoodAudio.tvSoundtrack,audioExtension:chapter2Audio});
  return {p,track:p.tracks[0].audio,at(t,phase='opening',startedAt=100000,meta={}){elapsed=t;p.update({phase,startedAt},meta);}};
}
test('replacement party duration and Chapter 1 music gain preserve looping, native duration, voice and fade timing',()=>{
  assert.equal(mp3Metadata(fs.readFileSync(partyTrack.src.slice(1))).durationMs,partyTrack.durationMs);
  assert.equal(partyTrack.durationMs,102896.32653061225);
  const e=setup(),mix=e.p.timeline.scoreMix;
  assert.deepEqual(JSON.parse(JSON.stringify(mix)),{openingVolume:.18,narrationVolume:.096,gapVolume:.144,windows:[{at:39000,end:42000,volume:.084}]});
  assert.equal(e.track.loop,true);
  assert.equal(chapter2Audio.backgroundVolumeAt(partyTrack.at),.144);
  assert.equal(chapter2Audio.backgroundVolumeAt(partyTrack.at+3000),0);
  e.at(8000);assert.equal(e.p.media.get('narration-01').volume,1);
  e.track.duration=200;e.at(partyTrack.at+201000);assert.equal(e.track.currentTime,1);
});
test('party starts exactly at 50000, preloads and loops a single persistent element',()=>{
  const e=setup();assert.equal(e.track.preload,'auto');assert.equal(e.track.loop,true);
  e.at(49999);assert.equal(e.track.plays,0);e.at(50000);assert.equal(e.track.plays,1);assert.equal(e.track.currentTime,0);
  for(const t of [50500,54400,69950,70700,88000,90000])e.at(t);
  assert.equal(e.track.plays,1);assert.equal(e.p.tracks[0].audio,e.track);
});
test('Chapter 1 background fade is canonical 44000–47000, and party is absent until 50000',()=>{
  const e=setup();for(const [t,v] of [[44000,.12],[45500,.06],[47000,0],[49999,0]]){
    e.at(t);assert.equal(e.p.soundtrack.audio.volume,v);assert.equal(e.track.plays,0);
  }
});
test('refresh reconstructs soundtrack position and active narration from authoritative elapsed',async()=>{
  const e=setup();e.at(60000);await flush();assert.equal(e.track.currentTime,10);
  assert.equal(e.p.media.get('chapter2-narration-03').currentTime,.575);
  assert.equal(e.p.media.get('chapter2-narration-01').plays,0);
});
test('hard reconnect seeks without restarting party track',async()=>{
  const e=setup();e.at(60000);await flush();e.at(80000,'opening',100000,{reconstruct:true});
  assert.equal(e.track.currentTime,30);assert.equal(e.track.plays,1);
});
test('large elapsed reconstructs looping position directly, without accumulated drift',()=>{
  const e=setup();const elapsed=50000+partyTrack.durationMs*10+1234;e.at(elapsed);
  assert(Math.abs(e.track.currentTime-1.234)<1e-9);assert.equal(e.track.volume,.13);
});
test('decoded duration is used for modulo seeking when browser metadata is available',()=>{
  const e=setup();e.track.duration=144.169781;e.at(50000+e.track.duration*1000*30+1234);
  assert(Math.abs(e.track.currentTime-1.234)<1e-9);
});
test('new startedAt resets party execution and seek, retaining the element',async()=>{
  const e=setup();e.at(60000);await flush();e.at(50000,'opening',200000);await flush();
  assert.equal(e.track.plays,2);assert.equal(e.track.currentTime,0);
});
test('locked narration drives duck windows and zero-gap 06–08 stays continuously ducked',()=>{
  assert.deepEqual(duckWindows(),[{start:50500,end:85750}]);
  for(const c of CHAPTER2_NARRATION){const actual=chapter2Narration.find(n=>n.id.endsWith(c.id));assert.equal(actual.at,c.start);assert.equal(actual.durationMs,c.duration);}
  for(let t=68875;t<=71450;t+=5)assert.equal(partyVolume(t),.10);
});
test('all Chapter 2 WAV durations still match the locked contract and playback remains volume one',()=>{
  const e=setup();for(const cue of chapter2Narration){
    assert.equal(wavMetadata(fs.readFileSync(cue.src.slice(1))).durationMs,cue.durationMs);
    assert.equal(e.p.media.get(cue.id).volume,1);
  }
});
test('duck pre-roll, post-hold and smooth release use 150/100/250ms boundaries',()=>{
  assert.equal(partyVolume(50350),.14);assert(Math.abs(partyVolume(50425)-.12)<1e-12);assert.equal(partyVolume(50500),.10);
  assert.equal(partyVolume(85750),.08);assert.equal(partyVolume(85850),.08);
  assert(Math.abs(partyVolume(85975)-.10)<1e-12);assert.equal(partyVolume(86100),.12);
});
test('narration dominates montage, with restrained present-time and photo beds',()=>{
  assert.equal(partyVolume(74000),.10);assert.equal(partyVolume(77000),.09);assert.equal(partyVolume(83000),.08);
});
test('photo silence remains exactly 750ms, prompt builds smoothly and checkpoint holds .13',()=>{
  const last=CHAPTER2_NARRATION.at(-1);assert.equal(last.end,85750);assert.equal(PHOTO_PROMPT_MS-last.end,750);
  assert.equal(PHOTO_PROMPT_MS,86500);assert.equal(PHOTO_CHECKPOINT_MS,88000);
  assert.equal(partyVolume(86500),.12);assert.equal(partyVolume(87250),.125);assert.equal(partyVolume(88000),.13);assert.equal(partyVolume(1e8),.13);
});
test('music volume stays bounded and has no abrupt jumps across the entire sequence',()=>{
  let previous=partyVolume(49999);
  for(let t=50000;t<=90000;t++){const v=partyVolume(t);assert(v>=0&&v<=.20);assert(Math.abs(v-previous)<.001);previous=v;}
});
test('authoritative photo phases keep party playing; lobby stops it and replay starts a new run',async()=>{
  const e=setup();e.at(87000);await flush();e.at(88000,'photo');e.at(90000,'photo-complete');
  assert.equal(e.track.paused,false);assert.equal(e.track.plays,1);assert.equal(e.track.volume,.13);
  e.at(0,'lobby',null);assert.equal(e.track.paused,true);e.at(50000,'opening',200000);assert.equal(e.track.plays,2);
});
test('blocked party playback is isolated and retried on a user gesture without changing narration',async()=>{
  const e=setup();e.track.fail=true;e.at(50500);await flush();
  assert.equal(e.p.media.get('chapter2-narration-01').plays,1);assert.equal(e.p.media.get('chapter2-narration-01').volume,1);
  e.track.fail=false;e.p.unlockBackground();await flush();assert.equal(e.track.plays,2);
});
test('Chapter 2 introduces no shutter or SFX and keeps Chapter 1 cues intact',()=>{
  const e=setup();assert.equal(e.p.sfxCues.length,1);assert.equal(e.p.sfxCues[0].at,36000);
  assert.deepEqual(Array.from(e.p.cues.slice(0,10),c=>c.at),[5000,9000,12000,16000,19000,23500,27900,31950,33725,39000]);
  assert.equal(e.p.timeline.end,44000);assert.equal(e.p.cues.length,23);
});
