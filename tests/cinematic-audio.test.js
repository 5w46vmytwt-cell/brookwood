import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { wavMetadata } from './wav-metadata.js';

function setup() {
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
  const player = new context.BrookwoodAudio.Player(timeline);
  return { context, timeline, player, frames, warnings, at(ms, startedAt = 100000) { now = startedAt + ms; player.update({ phase:'opening', startedAt }); }, audio(id = 'narration-01') { return player.media.get(id); } };
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

test('preloads narration only, centralized volume is one, and no playback speed is changed', () => {
  const { player } = setup();
  for (const audio of player.media.values()) { assert(audio.loaded); assert.equal(audio.preload,'auto'); assert.equal(audio.volume,1); assert.equal(audio.playbackRate,undefined); }
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
  assert.equal(env.player.handled.size,10); assert.equal(env.frames.size,0);
});

test('zero-gap boundaries stop previous clip before next, and flash has no sound', () => {
  const env = setup(); env.at(31949); env.at(31950);
  assert(env.audio('narration-07').paused); assert.equal(env.audio('narration-08').plays,1);
  env.at(33725); assert(env.audio('narration-08').paused); assert.equal(env.audio('narration-09').plays,1);
  env.at(36000); assert(env.audio('narration-09').paused); assert.equal(env.player.active,null);
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
  for(const audio of env.player.media.values()) { assert.equal(audio.plays,1); assert(audio.paused); assert.equal(audio.muted,false); assert.equal(audio.volume,1); }
  env.at(5000); await Promise.resolve(); assert.equal(env.audio().plays,2);
  const tv = fs.readFileSync('tv.html','utf8');
  const prime = tv.indexOf("if(action==='start')narration.unlock()");
  const request = tv.indexOf("await lobbyRequest('/api/host'");
  assert(prime >= 0 && request > prime);
});

test('WAV parser locates extra odd-size chunks and honors byte rate, rejecting truncation', () => {
  const original = fs.readFileSync('assets/chapter1/audio/narration-09.wav');
  const extra = Buffer.from([74,85,78,75,1,0,0,0,99,0]);
  const modified = Buffer.concat([original.subarray(0,12),extra,original.subarray(12)]);
  modified.writeUInt32LE(modified.length-8,4);
  assert.equal(wavMetadata(modified).durationMs,2275);
  assert.throws(() => wavMetadata(modified.subarray(0,modified.length-1)),/Truncated/);
});
