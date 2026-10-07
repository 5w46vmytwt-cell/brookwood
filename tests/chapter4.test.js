import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {wavMetadata} from './wav-metadata.js';
import {chapter4Timeline,chapter4AudioTimeline} from '../chapter4.js';
import {chapter4Scenes,CHAPTER4_VOTING_MS} from '../chapter4-timing.js';
import {TVCinematicRuntime} from '../tv-cinematic.js';
function setup(elapsed=0,blocked=false){
  let perf=0;const nodes=new Map(),warnings=[];
  class Audio{constructor(src){this.src=src;this.readyState=1;this.currentTime=0;this.paused=true;this.plays=0;this.listeners={};}addEventListener(n,cb){this.listeners[n]=cb;}load(){}play(){this.plays++;this.paused=false;return blocked?Promise.reject(Error('autoplay blocked')):Promise.resolve();}pause(){this.paused=true;}}
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,{style:{},hidden:false,addEventListener(){}});return nodes.get(id);}};
  const context=vm.createContext({document,Audio,Date:{now:()=>perf},console:{warn:(...args)=>warnings.push(args)},requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
  for(const f of ['cinematic-engine.js','chapter1.js','cinematic-audio.js'])vm.runInContext(fs.readFileSync(f,'utf8'),context);
  const runtime=new TVCinematicRuntime({document,timeline:context.BrookwoodChapter1.chapter1Timeline,Renderer:context.BrookwoodTimeline.Renderer,Player:context.BrookwoodAudio.Player,soundtrack:context.BrookwoodAudio.tvSoundtrack,now:()=>perf,requestFrame:()=>1,cancelFrame(){}});
  const state={phase:'chapter4-opening',startedAt:100000,chapter3:{startedAt:200000,completedAt:220000,readCount:12},chapter4:{startedAt:300000,complete:false,voteCount:0,selectedPlayer:null}};
  const accept=(at,run=300000)=>runtime.acceptState({...state,chapter4:{...state.chapter4,startedAt:run},serverNow:run+at},{hard:true});accept(elapsed);
  return {runtime,context,nodes,warnings,accept,audio:id=>runtime.chapter4Audio.media.get(id),frame(ms){perf+=ms;runtime.scheduler.frame();},opacity:id=>Number(nodes.get('chapter4-'+id).style.opacity)};
}
test('all six approved images and exact WAV formats/durations match locked scene/audio cues',()=>{
  const durations=[16050,17425,12350,25250,15725,11650];let total=0;
  assert.equal(chapter4Scenes.length,6);assert.equal(chapter4AudioTimeline.cues.length,7);
  chapter4Scenes.forEach((s,i)=>{assert(fs.existsSync('.'+s.src));const png=fs.readFileSync('.'+s.src);assert.equal(png.subarray(1,4).toString(),'PNG');assert(png.readUInt32BE(16)>0&&png.readUInt32BE(20)>0);
    const cue=chapter4AudioTimeline.cues[i],m=wavMetadata(fs.readFileSync('.'+cue.src));assert.equal(m.durationMs,durations[i]);assert.equal(m.sampleRate,24000);assert.equal(m.channels,1);assert.equal(m.encoding,3);assert.equal(m.bits,32);assert.equal(cue.at,s.at);assert.equal(cue.durationMs,s.end-s.at);total+=m.durationMs;});assert.equal(total,98450);
  const mp3=fs.readFileSync('assets/chapter4/audio/doorbell.mp3');let frames=0,samples=0;
  for(let p=0;p<mp3.length;p+=768){const h=mp3.readUInt32BE(p);assert.equal(h>>>21,2047);assert.equal((h>>>19)&3,3);assert.equal((h>>>17)&3,1);assert.equal((h>>>10)&3,1);assert.equal((h>>>12)&15,13);assert.notEqual((h>>>6)&3,3);frames++;samples+=1152;}
  assert.equal(frames,126);assert.equal(samples/48000*1000,3024);assert.equal(CHAPTER4_VOTING_MS,111450+3024);
});
test('every Chapter 4 scene boundary, black transition and hard-cut entry resolves deterministically',()=>{
  const e=setup(),resolve=t=>e.context.BrookwoodTimeline.resolve(chapter4Timeline,t).visuals;
  for(const s of chapter4Scenes){
    assert.equal(resolve(s.at-1)['scene-'+s.id].opacity,0);assert.equal(resolve(s.at)['scene-'+s.id].opacity,s.cut?1:0);assert.equal(resolve(s.at+250)['scene-'+s.id].opacity,1);assert.equal(resolve(s.end)['scene-'+s.id].opacity,0);
    assert.equal(resolve(s.end+1)['scene-'+s.id].opacity,0);
  }
  for(const t of [0,2999,19050,19500,20049,37475,38474,50825,52324,77575,79574,95300,96799,108450,109500,111449])for(const v of Object.values(resolve(t)))assert.equal(v.opacity,0,`black at ${t}`);
  assert.equal(resolve(111450).door.opacity,1);assert.equal(resolve(114473).door.opacity,1);assert.equal(resolve(114474).door.opacity,0);assert.equal(resolve(114474).vote.opacity,1);
});
test('Chapter 4 refresh at every scene seeks active narration, skips history and uses its own authoritative clock',()=>{
  for(const s of chapter4Scenes){const e=setup(s.at+500);assert.equal(e.runtime.elapsedNow(),s.at+500);assert.equal(e.audio('chapter4-narration-'+s.id).currentTime,.5);assert.equal(e.opacity('scene-'+s.id),1);for(const earlier of chapter4Scenes.filter(c=>c.end<s.at))assert.equal(e.audio('chapter4-narration-'+earlier.id).plays,0);}
});
test('doorbell is exactly once, resumes in-window, and never replays after 114474',()=>{
  const e=setup(111450),bell=e.audio('chapter4-doorbell');assert.equal(bell.plays,1);e.accept(111450);e.accept(112450);assert.equal(bell.plays,1);assert.equal(bell.currentTime,1);
  e.accept(114474);assert.equal(bell.paused,true);assert.equal(e.opacity('vote'),1);
  const refreshed=setup(114474);assert.equal(refreshed.audio('chapter4-doorbell').plays,0);
  const middle=setup(112450);assert.equal(middle.audio('chapter4-doorbell').currentTime,1);
  e.accept(111450,400000);assert.equal(bell.plays,2);assert.equal(bell.currentTime,0);
});
test('silence window contains no active narration, SFX, horror score or party score',()=>{
  for(const t of [108450,109000,111449]){const e=setup(t);for(const a of e.runtime.chapter4Audio.media.values())assert.equal(a.paused,true);assert.equal(e.runtime.audio.soundtrack.audio.volume,0);for(const t of e.runtime.audio.tracks)assert.equal(t.audio.paused,true);assert.equal(e.runtime.chapter3Audio.active,null);}
});
test('host gestures and priming during Chapter 4 cannot restart background score',()=>{const e=setup(109000);e.runtime.unlockBackground();e.runtime.unlockForTestJump();assert.equal(e.runtime.audio.soundtrack.target,0);assert.equal(e.runtime.audio.soundtrack.audio.volume,0);assert.equal(e.runtime.audio.raf,null);});
test('failed audio is isolated from Chapter 4 visuals and voting checkpoint',async()=>{
  const e=setup(111450,true);for(let i=0;i<10;i++)await Promise.resolve();assert.equal(e.opacity('door'),1);assert(e.warnings.length>0);e.accept(114474);assert.equal(e.opacity('vote'),1);
});
test('late reconstruction across the doorbell consumes history instead of burst-playing it',()=>{
  const e=setup(108450);e.accept(115000);assert.equal(e.audio('chapter4-doorbell').plays,0);assert.equal(e.opacity('vote'),1);for(const s of chapter4Scenes)assert.equal(e.audio('chapter4-narration-'+s.id).plays,0);
});
