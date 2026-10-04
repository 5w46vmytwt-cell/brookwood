import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { frameAt as approvedFrame } from './chapter1-approved-fixture.js';

function engine() {
  let now = 100000, serial = 0;
  const frames = new Map(), nodes = new Map();
  const document = { getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, { style: {}, addEventListener() {} });
    return nodes.get(id);
  } };
  const context = vm.createContext({ Date: { now: () => now },
    requestAnimationFrame(cb) { const id = ++serial; frames.set(id, cb); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout() { throw new Error('Page-load-relative timers are forbidden'); },
    Audio() { throw new Error('Audio is forbidden'); }, fetch() { throw new Error('Media requests are forbidden'); }
  });
  for (const file of ['cinematic-engine.js', 'chapter1.js']) vm.runInContext(fs.readFileSync(file,'utf8'), context);
  return { ...context.BrookwoodTimeline, timeline: context.BrookwoodChapter1.chapter1Timeline,
    frameAt: context.BrookwoodChapter1.frameAt, document, nodes, frames, setElapsed(ms) { now = 100000 + ms; } };
}

test('cue resolver matches approved visual formulas at every millisecond and fractional boundaries', () => {
  const env = engine();
  const check = ms => {
    const expected = approvedFrame(ms / 1000), actual = env.frameAt(ms / 1000);
    for (const key of Object.keys(expected)) {
      if (typeof expected[key] === 'number') assert(Math.abs(expected[key] - actual[key]) < 1e-12, `${key} differs at ${ms}ms`);
      else assert.equal(actual[key], expected[key]);
    }
  };
  for (let ms = -100; ms <= 45000; ms++) check(ms);
  for (const cue of env.timeline.cues) for (const boundary of [cue.at, cue.end, ...(cue.visual.fadeIn || []), ...(cue.visual.fadeOut || [])]) {
    for (const offset of [-.01, 0, .01]) check(boundary + offset);
  }
});

const states = [
  ['before start', -1, null], ['opening title', 1000, 'title'], ['date', 7500, 'date'],
  ['farmhouse', 18000, 'farm'], ['poster', 26000, 'poster'], ['9:30 PM', 30000, 'time'],
  ['13 FRIENDS', 32500, 'friends'], ['photograph setup', 34000, 'friends'],
  ['flash', 36050, 'flash'], ['group photograph', 38000, 'group'],
  ['final title', 43300, 'final'], ['final black', 44000, null], ['after end', 90000, null]
];
for (const [name, elapsed, active] of states) test(`deterministic state: ${name}`, () => {
  const { resolve, timeline } = engine();
  const result = resolve(timeline, elapsed);
  assert.deepEqual(result, resolve(timeline, elapsed));
  if (active) assert(result.visuals[active].opacity > 0);
  else assert(Object.values(result.visuals).every(v => v.opacity === 0));
});

test('flash is a refresh-safe 120ms state, not a page-load event', () => {
  const { resolve, timeline } = engine();
  for (const [ms, expected] of [[35999.99,0],[36000,1],[36119.99,1],[36120,0],[36120.01,0],[40000,0]]) {
    assert.equal(resolve(timeline,ms).visuals.flash.opacity, expected);
  }
});

test('renderer seeks on load, keeps one RAF loop, preserves nodes and stops on reset/end', () => {
  const env = engine(), renderer = new env.Renderer(env.document, env.timeline);
  const originalNodes = [...env.nodes.values()];
  env.setElapsed(26000); renderer.update({ phase:'opening', startedAt:100000 });
  assert.equal(env.nodes.get('chapterPoster').style.opacity, 1);
  for (let i=0;i<20;i++) renderer.update({ phase:'opening', startedAt:100000 });
  assert.equal(env.frames.size,1); assert.deepEqual([...env.nodes.values()],originalNodes);
  renderer.update({ phase:'lobby', startedAt:null }); assert.equal(env.frames.size,0);
  env.setElapsed(44000); renderer.update({ phase:'opening', startedAt:100000 });
  assert.equal(env.frames.size,0); assert.equal(env.nodes.get('chapterFinal').style.opacity,0);
  env.setElapsed(36050); renderer.update({ phase:'opening', startedAt:100000 });
  assert.equal(env.nodes.get('chapterFlash').style.opacity,1);
  env.setElapsed(37000); renderer.paint(); assert.equal(env.nodes.get('chapterFlash').style.opacity,0);
});

test('engine accepts independent chapter definitions and ignores optional future metadata', () => {
  const { resolve } = engine();
  const definition = { id:'test-only', end:2000, cues:[
    { id:'custom', type:'text', at:500, end:1500, narration:'optional metadata', sfx:'optional metadata', visual:{target:'customNode',text:'Fixture',fadeIn:[500,1000]} },
    { id:'future-event',type:'game-event',at:600,end:601 }
  ] };
  assert.equal(resolve(definition,750).visuals.custom.opacity,.5);
  assert.equal(resolve(definition,2000).visuals.custom.opacity,0);
});
