import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {wavMetadata} from './wav-metadata.js';
import {chapter4Timeline,chapter4AudioTimeline} from '../chapter4.js';
import {chapter4Scenes,CHAPTER4_VOTING_MS} from '../chapter4-timing.js';
import {TVCinematicRuntime} from '../tv-cinematic.js';
import {chapter4Score,chapter4ScoreVolume} from '../chapter4-audio.js';
function setup(elapsed=0,blocked=false,perElementUnlock=false){
  let perf=0,gesture=false;const nodes=new Map(),warnings=[];
  class Audio{constructor(src){this.src=src;this.readyState=1;this.currentTime=0;this.paused=true;this.plays=0;this.listeners={};}addEventListener(n,cb){this.listeners[n]=cb;}load(){}play(){this.plays++;if(gesture&&!this.muted)this.unlocked=true;if(blocked||(perElementUnlock&&this.src===chapter4Score.src&&!gesture&&!this.unlocked)){this.paused=true;return Promise.reject(Error('autoplay blocked'));}this.paused=false;return Promise.resolve();}pause(){this.paused=true;}}
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,{style:{},hidden:false,addEventListener(){}});return nodes.get(id);}};
  const context=vm.createContext({document,Audio,Date:{now:()=>perf},console:{warn:(...args)=>warnings.push(args)},requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
  for(const f of ['cinematic-engine.js','chapter1.js','cinematic-audio.js'])vm.runInContext(fs.readFileSync(f,'utf8'),context);
  const runtime=new TVCinematicRuntime({document,timeline:context.BrookwoodChapter1.chapter1Timeline,Renderer:context.BrookwoodTimeline.Renderer,Player:context.BrookwoodAudio.Player,soundtrack:context.BrookwoodAudio.tvSoundtrack,now:()=>perf,requestFrame:()=>1,cancelFrame(){}});
  const state={phase:'chapter4-opening',startedAt:100000,chapter3:{startedAt:200000,completedAt:220000,readCount:12},chapter4:{startedAt:300000,complete:false,voteCount:0,selectedPlayer:null}};
  const accept=(at,run=300000)=>runtime.acceptState({...state,chapter4:{...state.chapter4,startedAt:run},serverNow:run+at},{hard:true});accept(elapsed);
  return {runtime,context,nodes,warnings,accept,gesture(fn){gesture=true;try{return fn()}finally{gesture=false}},audio:id=>runtime.chapter4Audio.media.get(id),frame(ms){perf+=ms;runtime.scheduler.frame();},opacity:id=>Number(nodes.get('chapter4-'+id).style.opacity)};
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
  for(const t of [111450,112000,114473])for(const v of Object.values(resolve(t)))assert.equal(v.opacity,0,`doorbell stays black at ${t}`);
  assert.equal(resolve(114474).vote.opacity,1);
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
  const e=setup(111450,true);for(let i=0;i<10;i++)await Promise.resolve();assert.equal(e.opacity('vote'),0);assert(e.warnings.length>0);e.accept(114474);assert.equal(e.opacity('vote'),1);
});
test('late reconstruction across the doorbell consumes history instead of burst-playing it',()=>{
  const e=setup(108450);e.accept(115000);assert.equal(e.audio('chapter4-doorbell').plays,0);assert.equal(e.opacity('vote'),1);for(const s of chapter4Scenes)assert.equal(e.audio('chapter4-narration-'+s.id).plays,0);
});

test('door/package reveal uses the approved image and exact HTML copy only at the voting boundary',()=>{
  const html=fs.readFileSync('tv.html','utf8'),image=fs.readFileSync('assets/chapter4/doorbell-package.png');
  assert.equal(image.subarray(1,4).toString(),'PNG');
  const vote=html.match(/<div id="chapter4-vote"[\s\S]*?<\/div>/)[0];
  assert(vote.includes('src="/assets/chapter4/doorbell-package.png"'));
  assert(vote.includes('<h2>SOMEONE LEFT SOMETHING AT THE DOOR.</h2>'));
  assert(vote.includes('Who is brave enough to go check?'));
  const cue=chapter4Timeline.cues.find(c=>c.id==='vote');assert.equal(cue.at,114474);
  assert.deepEqual(cue.visual.content.map(c=>c.text),['SOMEONE LEFT SOMETHING AT THE DOOR.','Who is brave enough to go check?']);
  for(const at of [108450,111449,111450,112500,114473])assert.equal(setup(at).opacity('vote'),0);
  assert.equal(setup(114474).opacity('vote'),1);
  assert.equal(chapter4AudioTimeline.cues.at(-1).at,111450);assert.equal(chapter4AudioTimeline.cues.at(-1).durationMs,3024);
});

test('voting refresh reconstructs the door/package reveal and current aggregate progress without replaying audio',()=>{
  const e=setup(120000),state={phase:'door-vote',startedAt:100000,serverNow:420000,
    chapter3:{startedAt:200000,completedAt:220000,readCount:12},
    chapter4:{startedAt:300000,active:true,complete:false,voteCount:7,selectedPlayer:null}};
  e.runtime.acceptState(state,{hard:true});assert.equal(e.opacity('vote'),1);
  assert.equal(e.nodes.get('chapter4-count').textContent,'7 / 12 VOTES RECORDED');
  assert.equal(e.nodes.get('chapter4-cinematic').hidden,false);assert.equal(e.nodes.get('chapter4-result').hidden,true);
  assert.equal(e.audio('chapter4-doorbell').plays,0);
  e.runtime.acceptState({...state,chapter4:{...state.chapter4,voteCount:8}});assert.equal(e.opacity('vote'),1);
  assert.equal(e.nodes.get('chapter4-count').textContent,'8 / 12 VOTES RECORDED');
});

test('Chapter 4 reuses the original score and reconstructs its loop from the canonical clock',()=>{
  const metadata=wavMetadata(fs.readFileSync('.'+chapter4Score.src));
  assert.equal(metadata.durationMs,chapter4Score.durationMs);
  for(const elapsed of [0,12000,80000,100000,108450,112000,114474]){
    const e=setup(elapsed),track=e.runtime.chapter4Audio.tracks[0],audio=track.audio;
    assert.equal(audio.src,'/assets/chapter1/audio/brookwood-background.wav');assert.equal(audio.loop,true);
    assert(Math.abs(audio.currentTime-(elapsed%metadata.durationMs)/1000)<1e-9);
    assert.equal(audio.volume,chapter4ScoreVolume(elapsed));
    e.accept(elapsed);assert.equal(track.audio,audio);assert.equal(audio.plays,1);
  }
  const e=setup(12000),track=e.runtime.chapter4Audio.tracks[0];e.frame(1000);
  assert.equal(track.audio.plays,1);e.accept(50000);assert.equal(track.audio.currentTime,50);
  e.accept(0,400000);assert.equal(track.audio.currentTime,0);assert.equal(track.audio.plays,1);assert.equal(track.audio.paused,false);
});

test('Chapter 4 score ducks from locked narration intervals and uses smooth section ramps',()=>{
  assert.equal(chapter4ScoreVolume(0),0);assert(chapter4ScoreVolume(1500)>0);
  assert(chapter4ScoreVolume(40000)>chapter4ScoreVolume(10000));
  assert(chapter4ScoreVolume(60000)>chapter4ScoreVolume(40000));
  assert(chapter4ScoreVolume(80000)<chapter4ScoreVolume(60000)/3);
  assert(chapter4ScoreVolume(103000)>chapter4ScoreVolume(98000));
  for(const scene of chapter4Scenes){
    const e=setup(scene.at+500);assert.equal(e.audio('chapter4-narration-'+scene.id).volume,1);
    assert(e.runtime.chapter4Audio.tracks[0].audio.volume<=.084);
    for(const boundary of [scene.at-150,scene.at,scene.end+100,scene.end+400])
      assert(Math.abs(chapter4ScoreVolume(boundary-.001)-chapter4ScoreVolume(boundary+.001))<1e-6);
  }
  for(let t=0;t<=120000;t+=25){assert(Number.isFinite(chapter4ScoreVolume(t)));assert(chapter4ScoreVolume(t)>=0&&chapter4ScoreVolume(t)<=.14);}
});

test('Chapter 4 final fade is silent at 108450 and throughout black, doorbell and voting',()=>{
  assert(chapter4ScoreVolume(104000)>chapter4ScoreVolume(107000));assert(chapter4ScoreVolume(108449)>0);
  for(const at of [108450,109000,111449,111450,112000,114473,114474,120000]){
    const e=setup(at);assert.equal(chapter4ScoreVolume(at),0);assert.equal(e.runtime.chapter4Audio.tracks[0].audio.volume,0);
    e.runtime.unlockBackground();assert.equal(e.runtime.chapter4Audio.tracks[0].audio.volume,0);
  }
});

test('Chapter 4 score autoplay failure retries on interaction without disrupting narration or visuals',async()=>{
  const e=setup(4000,true),track=e.runtime.chapter4Audio.tracks[0];
  for(let i=0;i<10;i++)await Promise.resolve();assert.equal(track.audio.paused,true);assert.equal(e.opacity('scene-01'),1);
  track.audio.play=()=>{track.audio.plays++;track.audio.paused=false;return Promise.resolve();};
  e.runtime.unlockBackground();for(let i=0;i<10;i++)await Promise.resolve();
  assert.equal(track.audio.paused,false);assert.equal(track.audio.currentTime,4);assert.equal(e.audio('chapter4-narration-01').volume,1);
});

for(const path of ['chapter-select','chapter3-completion'])test(`Chapter 4 actually plays with the existing element unlock after ${path}`,async()=>{
  const e=setup(0,false,true);for(let i=0;i<10;i++)await Promise.resolve();
  e.runtime.acceptState({phase:'lobby',startedAt:null,serverNow:300000});
  for(let i=0;i<10;i++)await Promise.resolve();
  const background=e.runtime.audio.soundtrack.audio;
  e.gesture(()=>{e.runtime.unlockBackground();if(path==='chapter-select')e.runtime.unlockForTestJump();else e.runtime.unlockChapter4();});
  for(let i=0;i<10;i++)await Promise.resolve();assert.equal(background.paused,false);assert.equal(background.unlocked,true);
  if(path==='chapter3-completion')e.runtime.acceptState({phase:'private-messages-complete',startedAt:100000,serverNow:222000,chapter3:{startedAt:200000,completedAt:220000,readCount:12}});
  e.accept(0);e.frame(4000);for(let i=0;i<10;i++)await Promise.resolve();
  const track=e.runtime.chapter4Audio.tracks[0];assert.equal(track.audio,background);
  assert.equal(track.audio.paused,false);assert.notEqual(track.audio.muted,true);assert.equal(track.audio.volume,chapter4ScoreVolume(4000));
  e.accept(6000);assert.equal(track.audio.paused,false);assert.equal(track.audio.currentTime,6);
  // A return to lobby gives ownership back without pausing/reloading the shared media.
  e.runtime.acceptState({phase:'lobby',startedAt:null,serverNow:306000});assert.equal(background.paused,false);
});

test('Chapter 4 waits for metadata and retains existing element playback permission when it becomes ready',async()=>{
  const e=setup(0,false,true);for(let i=0;i<10;i++)await Promise.resolve();
  e.runtime.acceptState({phase:'lobby',startedAt:null,serverNow:300000});
  for(let i=0;i<10;i++)await Promise.resolve();
  const track=e.runtime.chapter4Audio.tracks[0];e.gesture(()=>e.runtime.unlockBackground());
  for(let i=0;i<10;i++)await Promise.resolve();track.audio.pause();track.audio.readyState=0;
  e.accept(12000);assert.equal(track.audio.paused,true);
  track.audio.readyState=1;track.audio.listeners.canplay();for(let i=0;i<10;i++)await Promise.resolve();
  assert.equal(track.audio.paused,false);assert.equal(track.audio.currentTime,12);assert.equal(track.audio.volume,chapter4ScoreVolume(12000));
});
