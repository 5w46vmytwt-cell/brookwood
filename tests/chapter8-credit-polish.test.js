import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {finaleCues,version7FinaleCues,cuesFor} from '../chapter8-finale-timing.js';
import {creditFrame,Chapter8CreditsAudio} from '../chapter8-credits.js';
const cue=id=>finaleCues.find(c=>c.id===id);
function audio(){const listeners=new Map();let time=0;const m={readyState:4,duration:251.611428571,paused:true,ended:false,volume:1,muted:false,plays:0,pauses:0,seeks:0,
 get currentTime(){return time;},set currentTime(v){this.seeks++;time=v;},tick(dt){time+=dt;},addEventListener(n,f){listeners.set(n,f);},removeEventListener(n){listeners.delete(n);},play(){this.plays++;this.paused=false;listeners.get('playing')?.();return Promise.resolve();},pause(){this.pauses++;this.paused=true;listeners.get('pause')?.();},end(){this.ended=true;this.paused=true;listeners.get('ended')?.();}};return {m,controller:new Chapter8CreditsAudio(m,()=>{})};}
const state=()=>({step:'finale',finale:{id:'run8',polishVersion:8,phaseAt:100000,deadline:105500,soundAnchors:{credits:100000}}});

test('credits-polish extends each photo by exactly 2000 ms while preserving old saves, entry/exit geometry and numeric order',()=>{
 assert.equal(cuesFor({finale:{polishVersion:7}}),version7FinaleCues);assert.deepEqual(finaleCues.map(c=>c.id),version7FinaleCues.map(c=>c.id));
 for(const old of version7FinaleCues){const current=cue(old.id);assert.equal(current.durationMs,old.durationMs+(old.photo?2000:0));if(!old.photo)continue;assert.equal(current.durationMs,11000);assert.equal(creditFrame(current,0).opacity,0);assert.equal(creditFrame(current,900).opacity,1);assert.equal(creditFrame(current,9900).opacity,1);assert.equal(creditFrame(current,10800).opacity,0);assert.equal(creditFrame(current,10999).opacity,0);
  for(const t of [0,400,900]){const a=creditFrame(old,t),b=creditFrame(current,t);assert.equal(a.opacity,b.opacity);assert.equal(a.x,b.x);assert.equal(a.y,b.y);assert.equal(a.angle,b.angle);}
  for(const t of [7900,8300,8800,8999]){const a=creditFrame(old,t),b=creditFrame(current,t+2000);assert.equal(a.opacity,b.opacity);assert.equal(a.x,b.x);assert.equal(a.y,b.y);assert.equal(a.angle,b.angle);}
 }
});

test('credits-polish keeps one playing song through fade, shutdown mute and final9 unmute with zero phase-change pauses, plays or seeks',()=>{
 const {m,controller}=audio(),c=state();controller.update(c,cue('credits-intro'),100000);const original={plays:m.plays,pauses:m.pauses,seeks:m.seeks};assert.equal(m.volume,.8);m.tick(93.5);c.finale.phaseAt=193500;controller.update(c,cue('credits-music-out'),196000);assert.equal(m.volume,0);assert(!m.paused);
 c.finale.phaseAt=196000;for(let n=0;n<5;n++){m.tick(1);controller.update(c,cue('shutdown'),196000+n*1000);assert(m.muted);assert.equal(m.volume,.8);assert(!m.paused);assert.equal(m.loop,false);}
 const before=m.currentTime;c.finale.phaseAt=201258.34375;m.tick(.3);controller.update(c,cue('final-image'),201558);assert(!m.muted);assert.equal(m.volume,.8);assert(m.currentTime>before);assert(!m.paused);c.step='complete';controller.update(c,cue('final-image'),203000);assert(!m.paused);assert.deepEqual({plays:m.plays,pauses:m.pauses,seeks:m.seeks},original);controller.destroy();assert(m.paused);
});

test('credits-polish native song completion is terminal, including host unlock and refresh after its original duration',()=>{
 const {m,controller}=audio(),c=state();controller.update(c,cue('credits-intro'),100000);m.end();const plays=m.plays;c.step='complete';controller.update(c,cue('final-image'),400000);controller.unlock();controller.update(c,cue('final-image'),410000);assert.equal(m.plays,plays);assert(m.paused);assert.equal(m.loop,false);assert(!controller.blocked);
 const restored=audio();restored.controller.update(c,cue('final-image'),400000);assert.equal(restored.m.plays,0);assert.equal(restored.m.seeks,0);assert(restored.m.paused);
 const during=audio();c.step='finale';during.controller.update(c,cue('shutdown'),202000);assert.equal(during.m.currentTime,102);assert(during.m.muted);assert.equal(during.m.plays,1);during.m.tick(1);during.controller.update(c,cue('final-image'),203000);assert.equal(during.m.currentTime,103);assert.equal(during.m.plays,1);assert.equal(during.m.seeks,1);assert(!during.m.muted);
});

test('credits-polish checkpoint is a visible enabled entry in the same authenticated test selector and uses existing cleanup',()=>{
 const html=fs.readFileSync('tv.html','utf8');const option=html.match(/<option\b[^>]*value="chapter8-finale-credits"[^>]*>[^<]*<\/option>/)?.[0];assert(option);assert(option.includes('Skip to Final Credits'));assert(!/\b(hidden|disabled)\b/.test(option));assert(html.includes("'chapter8-finale-credits'].includes(value)"));assert(html.includes("'chapter8-finale-credits'].includes(document.getElementById('chapterSelectCheckpoint').value))tvRuntime.chapter8Visuals.stop()"));
});
