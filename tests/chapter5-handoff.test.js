import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {chapter5IntroTimeline,Chapter5View} from '../chapter5.js';
import {chapter5Opening,CHAPTER5_READY_MS} from '../chapter5-audio-timing.js';
const h=chapter5Opening[1],w=chapter5Opening[2];
function fixture(){
  let elapsed=0;const nodes=new Map();
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,{style:{setProperty(k,v){this[k]=v;}},classList:{toggle(){}},addEventListener(){}});return nodes.get(id);}};
  const context=vm.createContext({document});vm.runInContext(fs.readFileSync('cinematic-engine.js','utf8'),context);
  return {nodes,at(t){elapsed=t;},view:new Chapter5View(document,context.BrookwoodTimeline.Renderer,{elapsedNow:()=>elapsed,externallyDriven:true}),resolve:t=>context.BrookwoodTimeline.resolve(chapter5IntroTimeline,t).visuals};
}
const state=()=>({phase:'chapter5-intro',chapter5:{audioVersion:1,revealVersion:1,startedAt:100000,readyAt:null,rulesStartedAt:null,roundIndex:0,castStartedAt:null,completedAt:null,winners:[],round:{id:'screamer',startedAt:null,completedAt:null,voteCount:0,winner:null}}});
test('handoff keeps exact original audio starts, durations, safe tails and ready checkpoint',()=>{
  assert.deepEqual(chapter5Opening.map(c=>c.at),[0,15250,35325,56606]);assert.equal(h.durationMs,19875);assert.equal(h.end,h.at+h.durationMs+200);assert.equal(w.at,h.end);assert.equal(CHAPTER5_READY_MS,63154);
});
for(const [offset,id]of [[0,'complaint'],[5000,'overruled'],[10000,'unauthorized'],[13000,'approved'],[16000,'disconnected']])test('signoff '+id+' enters at relative '+offset+' without stale status layers',()=>{
  const e=fixture(),t=h.at+offset;
  if(offset)assert.equal(e.resolve(t-1)[id].opacity,0);
  const v=e.resolve(t);assert.equal(v[id].opacity,1);
  for(const other of ['complaint','overruled','unauthorized','approved','disconnected'].filter(k=>k!==id))assert.equal(v[other].opacity,0);
  assert.equal(v.party.opacity,0);assert.equal(v.wife.opacity,0);
});
test('radio fades darker during disconnect and remains disconnected through the unchanged 200ms audio tail',()=>{
  const e=fixture();assert.equal(e.resolve(h.at+16000).radio.opacity,1);
  assert(e.resolve(h.at+18000).radio.opacity<1);assert(e.resolve(h.at+18000).radio.opacity>.18);
  for(const t of [h.at+h.durationMs-1,h.at+h.durationMs,h.end-1])assert.equal(e.resolve(t).disconnected.opacity,1);
});
test('wife boundary immediately replaces studio with colorful background; no stale radio or empty black frame',()=>{
  const e=fixture();assert.equal(e.resolve(w.at-1).party.opacity,0);assert.equal(e.resolve(w.at).party.opacity,1);
  for(const t of [w.at,w.at+1,w.at+1000,w.end-1,w.end,CHAPTER5_READY_MS]){
    const v=e.resolve(t);assert.equal(v.party.opacity,1);for(const id of ['radio','complaint','overruled','unauthorized','approved','disconnected'])assert.equal(v[id].opacity,0);
  }
  assert.equal(e.resolve(w.at+1000).wife.opacity,1);assert.equal(e.resolve(w.end).wife.opacity,0);assert.equal(e.resolve(w.end).ready.opacity,1);
});
test('refresh and uninterrupted rendering sample identical handoff animations from scheduler elapsed',()=>{
  for(const t of [h.at,h.at+7500,h.at+10000,h.at+13100,h.at+18000,w.at,w.at+500,w.at+14000,w.end]){
    const normal=fixture(),refresh=fixture(),s=state();normal.at(h.at);normal.view.update(s);normal.at(t);normal.view.update(s);refresh.at(t);refresh.view.update(s);
    for(const id of ['chapter5-radio','chapter5-complaint','chapter5-overruled','chapter5-unauthorized','chapter5-approved','chapter5-disconnected','chapter5-party','chapter5-wife','chapter5-ready'])assert.equal(normal.nodes.get(id).style.opacity,refresh.nodes.get(id).style.opacity,id+' at '+t);
    for(const key of ['--handoff-delay','--stamp-delay','--glitch-delay','--party-delay'])assert.equal(normal.nodes.get('chapter5TV').style[key],refresh.nodes.get('chapter5TV').style[key]);
  }
});
test('colorful backdrop persists through indefinite host wait then leaves cleanly for existing rules',()=>{
  const e=fixture(),s=state();e.at(CHAPTER5_READY_MS+3600000);s.phase='chapter5-waiting';s.chapter5.readyAt=163154;e.view.update(s);
  assert.equal(Number(e.nodes.get('chapter5-party').style.opacity),1);assert.equal(Number(e.nodes.get('chapter5-ready').style.opacity),1);
  s.phase='chapter5-rules';s.chapter5.rulesStartedAt=3800000;e.at(3700000);e.view.update(s);
  assert.equal(Number(e.nodes.get('chapter5-party').style.opacity),0);assert.equal(Number(e.nodes.get('chapter5-ready').style.opacity),0);
});
test('handoff is scoped SVG/CSS/HTML only with paused canonical animations and explicit reduced-motion overrides',()=>{
  const html=fs.readFileSync('tv.html','utf8'),css=fs.readFileSync('chapter5.css','utf8');
  for(const copy of ['BROOKWOOD BROADCAST · LIVE','COMPLAINT RECEIVED','OVERRULED','UNAUTHORIZED','HOST CHANGE','APPROVED','NARRATOR DISCONNECTED','Reason: Killing the vibe.','PARTY MODE ACTIVATED!','Your new host has arrived.'])assert(html.includes(copy),copy);
  assert(html.includes('class="broadcast-mic" viewBox="0 0 200 320"'));assert(css.includes('animation-play-state:paused'));assert(css.includes('var(--handoff-delay'));assert(css.includes('var(--party-delay'));assert(css.includes('@media(prefers-reduced-motion:reduce){#chapter5TV .broadcast-wave'));
  const source=fs.readFileSync('chapter5.js','utf8');assert(!source.includes('setTimeout'));assert(!source.includes('Date.now'));assert(!source.includes('new Audio'));
});
