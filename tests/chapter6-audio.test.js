import test from 'node:test';
import assert from 'node:assert/strict';
import {MazeNarration} from '../chapter6-audio.js';
import {gate,recordings} from '../chapter6-timing.js';
function harness(){let elapsed=0,stops=0,requests=[];const events=[];
 class Audio{constructor(){this.readyState=4;this.paused=true;this.currentTime=0;this.listeners=new Map();this.plays=0;this.volume=.1;}
  addEventListener(n,fn){if(!this.listeners.has(n))this.listeners.set(n,new Set());this.listeners.get(n).add(fn);}removeEventListener(n,fn){this.listeners.get(n)?.delete(fn);}emit(n){for(const fn of [...(this.listeners.get(n)??[])])fn();}play(){this.plays++;if(this.reject)return Promise.reject(Error('blocked'));this.paused=false;return this.delayed??Promise.resolve();}pause(){this.paused=true;this.emit('pause');}}
 const media=new Map(recordings.map(r=>[r.id,new Audio()])),player={media,stop(){stops++;}},state={generation:'one',chapter6:{audioVersion:2,startedAt:1000,phaseAt:1000,deadline:1000+gate(1),sequence:1,step:'intro',game:0,audioIndex:0}};
 const narration=new MazeNarration(player,{elapsedNow:()=>elapsed},{request:async(path,body)=>{requests.push(body);return {state:null};},onState:s=>events.push(s)});
 return {narration,state,media,requests,events,set:t=>elapsed=t,update:meta=>narration.update(state,meta),stops:()=>stops};}
const flush=()=>new Promise(r=>setImmediate(r));
test('delayed loading retains first words, plays at full volume and requires ended before progression',async()=>{
 const h=harness(),a=h.media.get('chapter6-1');a.readyState=0;h.set(5000);h.update();assert.equal(a.plays,0);a.readyState=4;h.update();await flush();assert.equal(a.currentTime,0);assert.equal(a.volume,1);h.set(gate(1)+100);h.update();assert.equal(h.requests.length,0);a.emit('ended');await flush();assert.equal(h.requests.length,1);assert.equal(h.requests[0].recording,1);
});
test('blocked playback resumes after a gesture and pauses never acknowledge completion',async()=>{
 const h=harness(),a=h.media.get('chapter6-1');a.reject=true;h.update();await flush();assert(h.narration.blocked);h.set(gate(1)+100);assert.equal(h.requests.length,0);a.reject=false;h.narration.unlock();await flush();a.pause();assert(h.narration.blocked);assert.equal(h.requests.length,0);h.narration.unlock();await flush();a.emit('ended');await flush();assert.equal(h.requests.length,1);
});
test('warning speech finishes before result speech and obsolete ended events cannot progress a different phase',async()=>{
 const h=harness();Object.assign(h.state.chapter6,{game:1,step:'answer',deadline:121000,audioIndex:0});h.set(60000);h.update();await flush();const warning=h.media.get('chapter6-9');assert.equal(warning.plays,1);
 Object.assign(h.state.chapter6,{step:'result',phaseAt:61000,sequence:2,deadline:61000+gate(12),results:[null,{recording:12}]});h.update();assert.equal(h.media.get('chapter6-12').plays,0);warning.emit('ended');h.update();await flush();assert.equal(h.media.get('chapter6-12').plays,1);assert.equal(h.requests.length,0);
});
test('navigation cancels pending playback and fences delayed promises and callbacks',async()=>{
 const h=harness(),a=h.media.get('chapter6-1');let resolve;a.delayed=new Promise(r=>resolve=r);h.update();const stale=[...a.listeners.get('ended')][0];h.narration.stop();resolve();stale();await flush();assert(a.paused);assert.equal(h.requests.length,0);assert.equal(h.narration.state,null);
});
test('refresh seeks only within the canonical active recording and never starts a second voice',async()=>{
 const h=harness(),a=h.media.get('chapter6-1');h.set(5000);h.update({reconstruct:true});await flush();assert.equal(a.currentTime,5);h.update();h.update();assert.equal(a.plays,1);
});
