import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {CHAPTER1_END_MS,PHOTO_PROMPT_MS,PHOTO_CHECKPOINT_MS,CHAPTER2_NARRATION} from '../cinematic-timeline.js';
import {chapter2Timeline} from '../chapter2.js';
import {partyTrack,partyVolume} from '../chapter2-audio.js';

function setup() {
  let now = 100000; let serial = 0;
  const nodes = new Map(), frames = new Map();
  const document = { getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, { style: {}, listeners: {}, addEventListener(name, cb) { this.listeners[name] = cb; } });
    return nodes.get(id);
  } };
  const context = vm.createContext({ document, Date: { now: () => now },
    requestAnimationFrame(cb) { const id = ++serial; frames.set(id, cb); return id; },
    cancelAnimationFrame(id) { frames.delete(id); } });
  vm.runInContext(fs.readFileSync('cinematic-engine.js','utf8'), context);
  vm.runInContext(fs.readFileSync('chapter1.js', 'utf8'), context);
  return { ...context.BrookwoodChapter1, document, frames, context, setTime(seconds) { now = 100000 + seconds * 1000; } };
}

test('Chapter 1 follows revised title, synchronized location, complete photo hold and black-to-2026 cue boundaries', () => {
  const { frameAt,chapter1Timeline } = setup(); const chapter = t => frameAt(t + 7);
  assert.equal(frameAt(0).title, 1); assert.equal(frameAt(4).title, 1);assert.equal(frameAt(6.4).title,1);assert.equal(frameAt(7).title,0);
  assert.equal(chapter(1).date, 0); assert.equal(chapter(3).date, 1);
  assert(chapter(6).date > .95); assert.equal(chapter(10).date, 0);
  assert.equal(chapter(12).farm, 1); assert.equal(chapter(13).farmLabel, 1);
  assert(chapter(18).farmScale > chapter(12).farmScale);
  assert(chapter(19.6).farm > 0 && chapter(19.6).poster > 0);
  assert.equal(chapter(22).poster, 1); assert.equal(chapter(25).poster, 0);
  assert.equal(chapter(26).time, 1); assert.equal(chapter(28).friends, 1);
  assert.equal(chapter(32).flash, 1); assert.equal(chapter(32.119).flash, 1);
  assert.equal(chapter(32.12).flash, 0); assert.equal(chapter(32.12).group, 1);
  assert.equal(chapter(34).group, 1); assert(chapter(37).group < chapter(35).group);
  const group=chapter1Timeline.cues.find(c=>c.id==='group'),last=chapter1Timeline.cues.find(c=>c.id==='narration-10');
  assert.equal(last.at+last.durationMs,45925);assert.equal(group.visual.fadeOut[0]-(last.at+last.durationMs),2000);assert.equal(group.visual.fadeOut[1]-group.visual.fadeOut[0],1000);assert(frameAt(47.925).group>0);assert.equal(frameAt(48.925).group,0);assert(!chapter1Timeline.cues.some(c=>c.id==='final'));
  const date=chapter1Timeline.cues.find(c=>c.id==='date');assert.equal(date.visual.content[1].text,'BRANDON, MANITOBA');
  const next=chapter2Timeline.cues.find(c=>c.id==='date2026');const welcome=chapter1Timeline.cues.find(c=>c.id==='welcome'),fun=chapter1Timeline.cues.find(c=>c.id==='welcomeFun');assert.equal(welcome.at,group.visual.fadeOut[1]);assert.equal(welcome.visual.fadeIn[1]-welcome.visual.fadeIn[0],1000);assert.equal(fun.at-welcome.visual.fadeIn[1],3000);assert.equal(fun.visual.fadeIn[1]-fun.at,1000);assert.equal(welcome.visual.fadeOut[0]-fun.visual.fadeIn[1],2000);assert.equal(welcome.visual.fadeOut[1]-welcome.visual.fadeOut[0],1000);assert.equal(CHAPTER1_END_MS,welcome.end);assert.equal(chapter1Timeline.cues.find(c=>c.id==='farmLabel').visual.text,'Brookwood Farm - Brandon Manitoba');assert.equal(next.at,CHAPTER1_END_MS);assert.equal(partyTrack.at,CHAPTER1_END_MS);assert.equal(next.end-next.at,5000);assert.equal(next.visual.fadeIn[1]-next.visual.fadeIn[0],350);assert.equal(next.visual.fadeOut[1]-next.visual.fadeOut[0],500);assert.equal(partyVolume(CHAPTER1_END_MS-1),0);assert(partyVolume(CHAPTER1_END_MS+100)>0);assert.equal(CHAPTER2_NARRATION[0].start,next.end+500);assert.equal(PHOTO_PROMPT_MS-CHAPTER2_NARRATION.at(-1).end,750);assert.equal(PHOTO_CHECKPOINT_MS,99925);
  for (const t of [50, 55, 1000]) {
    const frame = chapter(t); assert(frame.done);
    for (const key of ['title','date','farm','farmLabel','poster','time','friends','flash','group','welcome','welcomeFun']) assert.equal(frame[key], 0);
  }
});

test('late TV load/reload resumes correct state and polling does not restart or duplicate animation', () => {
  const env = setup(); env.setTime(29); // Retimed poster hold.
  const first = new env.Cinematic(env.document);
  first.update({ phase: 'opening', startedAt: 100000 });
  assert.equal(env.document.getElementById('chapterPoster').style.opacity, 1);
  assert.equal(env.document.getElementById('openingTitle').style.opacity, 0);
  first.update({ phase: 'opening', startedAt: 100000 }); assert.equal(env.frames.size, 1);
  first.stop();
  env.setTime(41); // Retimed group photograph.
  const reloaded = new env.Cinematic(env.document);
  reloaded.update({ phase: 'opening', startedAt: 100000 });
  assert.equal(env.document.getElementById('chapterGroup').style.opacity, 1);
  assert.equal(env.document.getElementById('chapterPoster').style.opacity, 0);
  reloaded.update({ phase: 'lobby', startedAt: null }); assert.equal(env.frames.size, 0);
  env.setTime(60); reloaded.update({ phase: 'opening', startedAt: 100000 });
  assert.equal(env.frames.size, 0); assert(!env.chapter1Timeline.cues.some(c=>c.id==='final'));
  assert.equal(env.document.getElementById('chapterGrain').style.opacity, 0);
});

test('missing imagery and unavailable audio APIs never stop visual progression', async () => {
  const env = setup();
  class BlockedAudio {
    constructor() { this.state = 'suspended'; }
    resume() { return Promise.reject(new Error('Autoplay blocked')); }
  }
  env.context.AudioContext = BlockedAudio;
  env.context.AbortSignal = AbortSignal;
  env.context.fetch = async () => ({ ok: false });
  const missing = env.document.getElementById('chapterFarm');
  missing.complete = true; missing.naturalWidth = 0;
  const cinematic = new env.Cinematic(env.document);
  assert.equal(missing.style.visibility, 'hidden');
  await new Promise(resolve => setImmediate(resolve));
  const image = env.document.getElementById('chapterGroup'); image.listeners.error({ target: image });
  assert.equal(image.style.visibility, 'hidden');
  env.setTime(39.05); cinematic.update({ phase: 'opening', startedAt: 100000 });
  assert.equal(env.document.getElementById('chapterFlash').style.opacity, 1);
  env.setTime(49); cinematic.paint(); assert.equal(env.document.getElementById('chapterFlash').style.opacity, 0);
  assert.equal(env.document.getElementById('chapterFinal').style.opacity, 0);
});

test('TV integration expects exact media paths and preserves phone/server code', () => {
  const tv = fs.readFileSync('tv.html', 'utf8');
  assert(!tv.includes('1998')); assert(tv.includes('OCTOBER 31 · 1996'));
  for (const name of ['farm','poster','group']) assert(tv.includes(`/assets/chapter1/brookwood-${name}.png`));
  assert(tv.includes('tvRuntime.acceptState(s,timing)')); assert(tv.includes('new BrookwoodTV.Runtime({document,timeline:BrookwoodChapter1.chapter1Timeline})'));
  assert(fs.readFileSync('tv-cinematic.js','utf8').includes('this.visuals.update(this.state)'));
  assert(tv.includes('TEST: FILL LOBBY'));
  assert(!fs.readFileSync('chapter1.js','utf8').includes('speechSynthesis'));
});
