import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { chapter2Timeline, formatBrandonTime, FROZEN_TIME_OFFSET_MS } from '../chapter2.js';
import { TVCinematicRuntime } from '../tv-cinematic.js';
import { CHAPTER2_NARRATION } from '../cinematic-timeline.js';
function setup(){
  let elapsed=0,serial=0;const frames=new Map(),nodes=new Map();
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,{style:{},textContent:'',addEventListener(){}});return nodes.get(id);}};
  class Audio{constructor(src){this.src=src;this.readyState=1;this.paused=true;this.currentTime=0;this.plays=0;}addEventListener(){}load(){}pause(){this.paused=true;}play(){this.plays++;this.paused=false;return Promise.resolve();}}
  const context=vm.createContext({Audio,document,Date:{now:()=>0},console:{warn(){}},requestAnimationFrame(){throw Error('No extra visual RAF')},cancelAnimationFrame(){}});
  for(const f of ['cinematic-engine.js','chapter1.js','cinematic-audio.js'])vm.runInContext(fs.readFileSync(f,'utf8'),context);
  const runtime=new TVCinematicRuntime({document,timeline:context.BrookwoodChapter1.chapter1Timeline,Renderer:context.BrookwoodTimeline.Renderer,
    Player:context.BrookwoodAudio.Player,soundtrack:null,now:()=>elapsed,requestFrame:cb=>{frames.set(++serial,cb);return serial;},cancelFrame:id=>frames.delete(id)});
  return {runtime,nodes,frames,resolve:t=>context.BrookwoodTimeline.resolve(chapter2Timeline,t),
    at(t,startedAt=1000000,phase='opening'){elapsed=t;runtime.acceptState({phase,startedAt,serverNow:startedAt+t},{hard:true});},
    opacity:id=>Number(nodes.get(`chapter2-${id}`).style.opacity)};
}
const cues=Object.fromEntries(chapter2Timeline.cues.map(c=>[c.id,c]));
test('Chapter 2 definition locks every visual start/end and has no narration/SFX/server event',()=>{
  assert.equal(chapter2Timeline.start,44000);assert.equal(chapter2Timeline.end,88000);
  const expected={date2026:[48000,50000],brandon:[50500,55000],street:[54400,60025],house:[59425,65700],invite:[65100,68875],
    costumes:[68875,69950],drinks:[69950,70700],food:[70700,71600],party:[71600,75500],brookwood:[75000,80500],presentDate:[75700,80500],presentTime:[76500,80500],
    onePhoto:[86500,Infinity],beforeNight:[87000,Infinity],getTogether:[87500,Infinity]};
  assert.equal(chapter2Timeline.cues.length,Object.keys(expected).length);
  for(const [id,range] of Object.entries(expected))assert.deepEqual([cues[id].at,cues[id].end],range);
  assert(chapter2Timeline.cues.every(c=>['image','text'].includes(c.type)));
});
test('exactly eight approved image mappings exist, with valid PNGs and unique DOM targets',()=>{
  const expected={brandon:'brandon-modern-dusk',street:'brookwood-street',house:'halloween-house',invite:'party-invite',costumes:'costumes',drinks:'drinks',food:'food',party:'party-ready'};
  const html=fs.readFileSync('tv.html','utf8');assert.equal(chapter2Timeline.cues.filter(c=>c.type==='image').length,8);
  for(const [id,name] of Object.entries(expected)){
    const src=`/assets/chapter2/${name}.png`;assert.equal(cues[id].visual.src,src);
    assert.equal(fs.readFileSync(src.slice(1)).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  }
  for(const cue of chapter2Timeline.cues)assert.equal(html.split(`id="${cue.visual.target}"`).length-1,1);
  assert(!html.includes('brookwood-night'));assert(!fs.readFileSync('chapter2.css','utf8').includes('object-fit:cover'));
});
test('Chapter 2 contributes zero visual opacity throughout frozen Chapter 1 and black bridge',()=>{
  const e=setup();for(let t=0;t<48000;t+=1)for(const v of Object.values(e.resolve(t).visuals))assert.equal(v.opacity,0,`at ${t}`);
});
test('date fades cleanly at 48000 and back to black at 50000, without flicker or texture',()=>{
  const e=setup();assert.equal(cues.date2026.visual.text,'OCTOBER 31 · 2026');
  assert.equal(e.resolve(48000).visuals.date2026.opacity,0);assert.equal(e.resolve(48350).visuals.date2026.opacity,1);
  assert.equal(e.resolve(49750).visuals.date2026.opacity,.5);assert.equal(e.resolve(50000).visuals.date2026.opacity,0);
  assert(chapter2Timeline.cues.every(c=>!c.visual.flicker));
});
test('every visual boundary is deterministic immediately before, at, and after the cue',()=>{
  const e=setup();for(const c of chapter2Timeline.cues){
    assert.equal(e.resolve(c.at-.01).visuals[c.id].opacity,0,c.id);
    assert.equal(e.resolve(c.at).visuals[c.id].opacity,c.visual.fadeIn?0:1,c.id);
    if(Number.isFinite(c.end))assert.equal(e.resolve(c.end).visuals[c.id].opacity,0,c.id);
    for(const t of [c.at-.01,c.at,c.at+.01,c.end-.01].filter(Number.isFinite)){
      const a=e.resolve(t),b=e.resolve(t);assert.deepEqual(a,b);const v=a.visuals[c.id];assert(v.opacity>=0&&v.opacity<=1);assert(v.scale>=1&&v.scale<=1.025);
    }
  }
});
test('landscape dissolves are 600ms; Halloween house continues through both narration lines',()=>{
  assert.deepEqual(cues.brandon.visual.fadeOut,cues.street.visual.fadeIn);
  assert.deepEqual(cues.street.visual.fadeOut,cues.house.visual.fadeIn);
  assert.deepEqual(cues.house.visual.fadeOut,cues.invite.visual.fadeIn);
  const e=setup();for(const t of [60300,62300,62400,64950,65100])assert.equal(e.resolve(t).visuals.house.opacity,1);
  assert(!cues.invite.visual.scale);
});
test('montage boundaries cut cleanly with no extra black between Costumes, Drinks and Food',()=>{
  const e=setup();for(const [t,id,previous] of [[68875,'costumes','invite'],[69950,'drinks','costumes'],[70700,'food','drinks']]){
    assert.equal(e.resolve(t).visuals[id].opacity,1);assert.equal(e.resolve(t).visuals[previous].opacity,0);
  }
  assert.equal(e.resolve(71450).visuals.food.opacity,1);
});
test('party-ready holds then darkens/fades from 74600 and disappears by 75500',()=>{
  const e=setup();assert.equal(e.resolve(74000).visuals.party.opacity,1);assert.equal(e.resolve(74600).visuals.party.opacity,1);
  assert(e.resolve(75000).visuals.party.opacity<.65);assert.equal(e.resolve(75500).visuals.party.opacity,0);
});
test('BROOKWOOD, date and frozen time enter at 75000/75700/76500 and fade 80025–80500',()=>{
  const e=setup();for(const id of ['brookwood','presentDate','presentTime'])assert.deepEqual(cues[id].visual.fadeOut,[80025,80500]);
  assert.equal(cues.brookwood.visual.text,'BROOKWOOD');assert.equal(cues.presentDate.visual.text,'OCTOBER 31 · 2026');
  for(const id of ['brookwood','presentDate','presentTime']){assert.equal(e.resolve(80025).visuals[id].opacity,1);assert.equal(e.resolve(80262.5).visuals[id].opacity,.5);assert.equal(e.resolve(80500).visuals[id].opacity,0);}
});
test('Brandon frozen time uses exactly startedAt+76500 and America/Winnipeg DST rules',()=>{
  assert.equal(FROZEN_TIME_OFFSET_MS,76500);
  assert.equal(formatBrandonTime(Date.UTC(2026,9,31,23,58,43,500)),'7:00 PM');
  assert.equal(formatBrandonTime(Date.UTC(2026,11,1,7)),'1:01 AM');
  const start=Date.UTC(2026,9,31,23,58,43,500),e=setup();e.at(77000,start);
  const text=e.nodes.get('chapter2-presentTime').textContent;assert.equal(text,'7:00 PM');
  e.at(79999,start);assert.equal(e.nodes.get('chapter2-presentTime').textContent,text);
  const refreshed=setup();refreshed.at(77000,start);assert.equal(refreshed.nodes.get('chapter2-presentTime').textContent,text);
});
test('photo setup stays black and the entire locked 85750–86500 pause is pure black',()=>{
  const e=setup();for(let t=80500;t<86500;t++)for(const v of Object.values(e.resolve(t).visuals))assert.equal(v.opacity,0);
  assert.equal(CHAPTER2_NARRATION.at(-1).end,85750);assert.equal(cues.onePhoto.at-CHAPTER2_NARRATION.at(-1).end,750);
});
test('photo prompt progressively reveals at 86500/87000/87500, holding while server remains opening',()=>{
  const e=setup();for(const [t,visible] of [[86700,['onePhoto']],[87200,['onePhoto','beforeNight']],[87700,['onePhoto','beforeNight','getTogether']],[88000,['onePhoto','beforeNight','getTogether']]]){
    for(const id of ['onePhoto','beforeNight','getTogether'])assert.equal(e.resolve(t).visuals[id].opacity,visible.includes(id)?1:0);
  }
  e.at(90000);assert.equal(e.runtime.state.phase,'opening');assert.equal(e.opacity('getTogether'),1);
});
for(const [t,id] of [[52000,'brandon'],[60000,'house'],[67000,'invite'],[70200,'drinks'],[73000,'party'],[77000,'brookwood'],[87600,'getTogether']]){
  test(`refresh at ${t} immediately reconstructs ${id} without timers or extra RAF`,()=>{
    const e=setup();e.at(t);assert(e.opacity(id)>0);assert.equal(e.frames.size,1);
    assert.equal(e.runtime.visuals.raf,null);assert.equal(e.runtime.chapter2Visuals.raf,null);
    assert.equal(e.runtime.audio.media.get('camera-shutter').plays,0);
  });
}
test('refresh at 83000 is black and resumes only the active narration, with no historical shutter',()=>{
  const e=setup();e.at(83000);for(const c of chapter2Timeline.cues)assert.equal(e.opacity(c.id),0);
  assert.equal(e.runtime.audio.media.get('chapter2-narration-13').plays,1);
  assert.equal(e.runtime.audio.media.get('chapter2-narration-12').plays,0);
  assert.equal(e.runtime.audio.media.get('camera-shutter').plays,0);
});
test('production code has no client host secret or automatic photo mutation',()=>{
  for(const f of ['chapter2.js','tv-cinematic.js','tv.html']){
    const source=fs.readFileSync(f,'utf8');assert(!source.includes('HOST_KEY'));assert(!source.includes('begin-photo'));
  }
  assert(!fs.readFileSync('chapter2.js','utf8').includes('setTimeout'));
});
