import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { wavMetadata } from './wav-metadata.js';

function setup(withSoundtrack = false) {
  let now = 100000, serial = 0;
  const frames = new Map(), warnings = [];
  class Audio {
    constructor(src) { this.src = src; this.readyState = 1; this.currentTime = 0; this.events = {}; this.plays = 0; this.paused = true; }
    addEventListener(name, cb) { this.events[name] = cb; }
    load() { this.loaded = true; }
    pause() { this.paused = true; }
    play() { this.plays++; this.paused = false; return this.failure ? Promise.reject(Error('blocked')) : Promise.resolve(); }
  }
  const context = vm.createContext({ Audio, console: { warn: (...args) => warnings.push(args) }, Date: { now: () => now },
    requestAnimationFrame(cb) { frames.set(++serial, cb); return serial; }, cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout() { throw Error('Relative timers forbidden'); } });
  for (const file of ['cinematic-engine.js','chapter1.js','cinematic-audio.js']) vm.runInContext(fs.readFileSync(file,'utf8'), context);
  const timeline = context.BrookwoodChapter1.chapter1Timeline;
  const player = new context.BrookwoodAudio.Player(timeline, withSoundtrack ? {soundtrack:context.BrookwoodAudio.tvSoundtrack} : {});
  return { context, timeline, player, frames, warnings, setElapsed(ms) { now = 100000 + ms; }, at(ms, startedAt = 100000) { now = startedAt + ms; player.update({ phase:'opening', startedAt }); }, audio(id = 'narration-01') { return player.media.get(id); } };
}

test('all ten original WAVs have exact validated durations and canonical cue starts', () => {
  const { player } = setup();
  const starts = [5000,9000,12000,16000,19000,23500,27900,31950,33725,39000];
  const durations = [3775,2450,3850,2775,4450,1725,4050,1775,2275,3925];
  assert.equal(player.cues.length,10);
  for (let i = 0; i < 10; i++) {
    const cue = player.cues[i], id = `narration-${String(i+1).padStart(2,'0')}`;
    assert.equal(cue.id,id); assert.equal(cue.at,starts[i]);
    assert.equal(cue.src,`/assets/chapter1/audio/${id}.wav`);
    const metadata = wavMetadata(fs.readFileSync(cue.src.slice(1)));
    assert.equal(metadata.durationMs,durations[i]); assert.equal(cue.durationMs,metadata.durationMs);
    if (i < 9) assert(cue.at + metadata.durationMs <= (i === 8 ? 36000 : starts[i+1]));
  }
  assert.equal(starts[8]+durations[8],36000);
});

test('preloads all synchronized cues, centralized narration volume is one, and no playback speed is changed', () => {
  const { player } = setup();
  for (const cue of [...player.cues,...player.sfxCues]) { const audio=player.media.get(cue.id); assert(audio.loaded); assert.equal(audio.preload,'auto'); assert.equal(audio.volume,cue.type==='narration'?1:cue.volume); assert.equal(audio.playbackRate,undefined); }
});

test('no playback before cue; polling and frames cannot play a cue twice', async () => {
  const env = setup(); env.at(4999); assert.equal(env.audio().plays,0);
  env.at(5000); for(let i=0;i<20;i++) env.at(5500);
  await Promise.resolve(); assert.equal(env.audio().plays,1); assert.equal(env.frames.size,1);
});

test('new server startedAt resets execution, lobby stops playback', () => {
  const env = setup(); env.at(5000); env.at(5000,200000); assert.equal(env.audio().plays,2);
  env.player.update({phase:'lobby',startedAt:null}); assert(env.audio().paused); assert.equal(env.frames.size,0);
});

test('refresh skips expired cues and seeks into the currently active clip', () => {
  const env = setup(); env.at(29100);
  assert.equal(env.audio().plays,0); assert.equal(env.audio('narration-07').plays,1);
  assert.equal(env.audio('narration-07').currentTime,1.2);
  assert(env.player.handled.has('narration-06'));
});

test('after narration finishes, nothing replays and no frame loop remains', () => {
  const env = setup(); env.at(42925); env.at(90000);
  for(const audio of env.player.media.values()) assert.equal(audio.plays,0);
  assert.equal(env.player.handled.size,11); assert.equal(env.frames.size,0);
});

test('zero-gap narration boundaries stop previous clip before next, then shutter accompanies flash', () => {
  const env = setup(); env.at(31949); env.at(31950);
  assert(env.audio('narration-07').paused); assert.equal(env.audio('narration-08').plays,1);
  env.at(33725); assert(env.audio('narration-08').paused); assert.equal(env.audio('narration-09').plays,1);
  env.at(36000); assert(env.audio('narration-09').paused); assert.equal(env.player.active,null);
  assert.equal(env.audio('camera-shutter').plays,1);
});

test('late metadata uses current clock, and expired late assets are never played', () => {
  const env = setup(), audio = env.audio(); audio.readyState = 0;
  env.at(5000); env.at(6500); assert.equal(audio.plays,0);
  audio.readyState = 1; audio.events.loadedmetadata(); assert.equal(audio.currentTime,1.5); assert.equal(audio.plays,1);
  const late = setup(); late.audio().readyState=0; late.at(8775);
  late.audio().readyState=1; late.audio().events.canplay(); assert.equal(late.audio().plays,0);
});

test('blocked or missing audio warns once and leaves visual resolution intact', async () => {
  const env = setup(); env.audio().failure=true; env.at(5000);
  await new Promise(resolve => setImmediate(resolve)); env.at(6000);
  assert.equal(env.audio().plays,1); assert.equal(env.warnings.length,1);
  env.audio('narration-02').events.error(); env.at(9000); assert.equal(env.audio('narration-02').plays,0);
  assert.equal(env.context.BrookwoodTimeline.resolve(env.timeline,36050).visuals.flash.opacity,1);
});

test('synchronous gesture priming neither consumes cues nor changes volume', async () => {
  const env = setup(); env.player.unlock(); assert.equal(env.player.handled.size,0);
  for(const [id,audio] of env.player.media) { assert.equal(audio.plays,1); assert(audio.paused); assert.equal(audio.muted,false); assert.equal(audio.volume,id==='camera-shutter'?.55:1); }
  env.at(5000); await Promise.resolve(); assert.equal(env.audio().plays,2);
  const tv = fs.readFileSync('tv.html','utf8');
  const prime = tv.indexOf("if(action==='start')narration.unlock()");
  const request = tv.indexOf("await lobbyRequest('/api/host'");
  assert(prime >= 0 && request > prime);
});

test('score and shutter assets are valid stereo 24-bit PCM WAVs with authoritative durations', () => {
  const env=setup(true), config=env.context.BrookwoodAudio.tvSoundtrack, cue=env.player.sfxCues[0];
  assert.equal(config.src,'/assets/chapter1/audio/brookwood-background.wav');
  assert.equal(cue.src,'/assets/chapter1/audio/sfx-camera-shutter.wav');
  for(const [src,size] of [[config.src,24576000],[cue.src,67536]]) {
    const meta=wavMetadata(fs.readFileSync(src.slice(1)));
    assert.equal(meta.encoding,1); assert.equal(meta.channels,2); assert.equal(meta.bits,24);
    assert.equal(meta.sampleRate,44100); assert.equal(meta.byteRate,264600); assert.equal(meta.dataSize,size);
    assert.equal(meta.durationMs,size/264600*1000);
  }
  assert.equal(cue.durationMs,67536/264600*1000); assert.equal(cue.at,36000); assert.equal(cue.volume,.55);
});

test('looping score ramps to lobby 0.18 and persists through Start, reset, polling, and new run', async () => {
  const env=setup(true), score=env.player.soundtrack, audio=score.audio;
  env.player.update({phase:'lobby',startedAt:null});
  assert.equal(score.target,.18); assert.equal(audio.volume,0); assert.equal(audio.loop,true);
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  env.setElapsed(175); env.player.update({phase:'lobby',startedAt:null}); assert(audio.volume>0 && audio.volume<.18);
  env.setElapsed(350); env.player.update({phase:'lobby',startedAt:null}); assert.equal(audio.volume,.18);
  audio.currentTime=42;
  env.player.unlock(); env.at(0); assert.equal(score.target,.15);
  assert.equal(audio.currentTime,42); assert.equal(audio.plays,1); assert.equal(audio.paused,false);
  env.at(5000); env.player.update({phase:'lobby',startedAt:null}); env.at(0,200000);
  assert.equal(audio.currentTime,42); assert.equal(audio.plays,1); assert.equal(audio.paused,false);
});

test('score ducks smoothly without touching narration and stays restrained through photo hold', () => {
  const env=setup(true), score=env.player.soundtrack;
  env.at(0); env.at(350); assert.equal(score.audio.volume,.15);
  env.at(5000); assert.equal(score.target,.08); assert.equal(score.audio.volume,.15);
  env.at(5100); assert(score.audio.volume>.08 && score.audio.volume<.15);
  env.at(5200); assert.equal(score.audio.volume,.08); assert.equal(env.audio().volume,1);
  env.at(8775); assert.equal(score.target,.12);
  env.at(8950); assert(score.audio.volume>.08 && score.audio.volume<.12);
  env.at(36000); assert.equal(score.target,.07);
  env.at(36200); assert.equal(score.audio.volume,.07);
  for(const ms of [37000,38000,38999]) {env.at(ms);assert.equal(score.target,.07);assert.equal(score.audio.volume,.07);}
  env.at(39000); assert.equal(score.target,.08); assert.equal(env.audio('narration-10').volume,1);
});

test('shutter executes once per run, seeks after reconnect, and skips the expired window', () => {
  const env=setup(); env.at(35999); assert.equal(env.audio('camera-shutter').plays,0);
  env.at(36000); env.at(36100); env.at(36100); assert.equal(env.audio('camera-shutter').plays,1);
  env.at(36000,200000); assert.equal(env.audio('camera-shutter').plays,2);
  const refreshed=setup(); refreshed.at(36100); assert.equal(refreshed.audio('camera-shutter').currentTime,.1);
  assert.equal(refreshed.audio('camera-shutter').plays,1);
  const expired=setup(); expired.at(36000+expired.player.sfxCues[0].durationMs);
  assert.equal(expired.audio('camera-shutter').plays,0); assert(expired.player.handled.has('camera-shutter'));
});

test('SFX uses generic cue metadata and late loading skips or seeks without restarting narration', () => {
  const env=setup(), shutter=env.audio('camera-shutter'); shutter.readyState=0;
  env.at(36000); env.at(36150); shutter.readyState=1; shutter.events.canplay();
  assert.equal(shutter.currentTime,.15); assert.equal(shutter.plays,1);
  env.at(39000); assert.equal(env.audio('narration-10').plays,1);
  const late=setup(); late.audio('camera-shutter').readyState=0;late.at(37000);
  late.audio('camera-shutter').readyState=1;late.audio('camera-shutter').events.canplay();
  assert.equal(late.audio('camera-shutter').plays,0);
  const custom={id:'test',end:1000,cues:[{id:'other-sfx',type:'sfx',at:200,src:'/test.wav',durationMs:400,volume:.3}]};
  const player=new env.context.BrookwoodAudio.Player(custom);player.update({phase:'opening',startedAt:138800});
  assert.equal(player.media.get('other-sfx').plays,1);assert.equal(player.media.get('other-sfx').volume,.3);
});

test('blocked score retries only on interaction and neither score nor shutter failure breaks narration/visuals', async () => {
  const env=setup(true), score=env.player.soundtrack; score.audio.failure=true;
  env.player.update({phase:'lobby',startedAt:null}); await new Promise(r=>setImmediate(r));
  env.at(5000); assert.equal(score.audio.plays,1); assert.equal(env.audio().plays,1);
  score.audio.failure=false;env.player.unlockBackground();await new Promise(r=>setImmediate(r));assert.equal(score.audio.plays,2);
  env.audio('camera-shutter').failure=true; env.at(36000);await new Promise(r=>setImmediate(r));env.at(36100);
  assert.equal(env.audio('camera-shutter').plays,1);
  assert.equal(env.context.BrookwoodTimeline.resolve(env.timeline,36050).visuals.flash.opacity,1);
  score.audio.events.error();env.at(39000);assert.equal(env.audio('narration-10').plays,1);
  assert.equal(env.context.BrookwoodTimeline.resolve(env.timeline,44000).done,true);
});

test('pending SFX completion from an old run cannot seek or stop the new run', async () => {
  const env=setup(), audio=env.audio('camera-shutter');let finish;
  audio.play=function(){this.plays++;this.paused=false;return new Promise(resolve=>{finish=resolve;});};
  env.at(36000);const oldFinish=finish;env.at(36100,200000);const newTime=audio.currentTime;
  oldFinish();await Promise.resolve();assert.equal(audio.currentTime,newTime);assert.equal(audio.paused,false);
});

test('WAV parser locates extra odd-size chunks and honors byte rate, rejecting truncation', () => {
  const original = fs.readFileSync('assets/chapter1/audio/narration-09.wav');
  const extra = Buffer.from([74,85,78,75,1,0,0,0,99,0]);
  const modified = Buffer.concat([original.subarray(0,12),extra,original.subarray(12)]);
  modified.writeUInt32LE(modified.length-8,4);
  assert.equal(wavMetadata(modified).durationMs,2275);
  assert.throws(() => wavMetadata(modified.subarray(0,modified.length-1)),/Truncated/);
});
