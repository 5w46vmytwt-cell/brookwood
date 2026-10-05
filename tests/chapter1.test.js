import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

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

test('Chapter 1 follows exact visual cues with four-second title offset', () => {
  const { frameAt } = setup(); const chapter = t => frameAt(t + 4);
  assert.equal(frameAt(0).title, 1); assert.equal(frameAt(4).title, 0);
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
  assert.equal(chapter(39).group, 0); assert(chapter(39.3).final > .99);
  for (const t of [40, 45, 1000]) {
    const frame = chapter(t); assert(frame.done);
    for (const key of ['title','date','farm','farmLabel','poster','time','friends','flash','group','final']) assert.equal(frame[key], 0);
  }
});

test('late TV load/reload resumes correct state and polling does not restart or duplicate animation', () => {
  const env = setup(); env.setTime(26); // Chapter 1 22 seconds: poster.
  const first = new env.Cinematic(env.document);
  first.update({ phase: 'opening', startedAt: 100000 });
  assert.equal(env.document.getElementById('chapterPoster').style.opacity, 1);
  assert.equal(env.document.getElementById('openingTitle').style.opacity, 0);
  first.update({ phase: 'opening', startedAt: 100000 }); assert.equal(env.frames.size, 1);
  first.stop();
  env.setTime(38); // Chapter 1 34 seconds: group photograph.
  const reloaded = new env.Cinematic(env.document);
  reloaded.update({ phase: 'opening', startedAt: 100000 });
  assert.equal(env.document.getElementById('chapterGroup').style.opacity, 1);
  assert.equal(env.document.getElementById('chapterPoster').style.opacity, 0);
  reloaded.update({ phase: 'lobby', startedAt: null }); assert.equal(env.frames.size, 0);
  env.setTime(60); reloaded.update({ phase: 'opening', startedAt: 100000 });
  assert.equal(env.frames.size, 0); assert.equal(env.document.getElementById('chapterFinal').style.opacity, 0);
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
  env.setTime(36.05); cinematic.update({ phase: 'opening', startedAt: 100000 });
  assert.equal(env.document.getElementById('chapterFlash').style.opacity, 1);
  env.setTime(45); cinematic.paint(); assert.equal(env.document.getElementById('chapterFlash').style.opacity, 0);
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
