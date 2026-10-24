import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {Chapter8Audio} from '../chapter8-audio.js';import {narrationFor,ambientCue} from '../chapter8-puzzle.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness(step='puzzle',{offset=0,deny=false,ready=4}={}){
 let now=100000+offset;const audios=[],requests=[];
 class Audio{
  constructor(src){this.src=src;this.readyState=ready;this.duration=src.endsWith('.mp3')?144.84:src.includes('01_')?13.45:src.includes('02_')?23.15:14.4;this.currentTime=0;this.volume=1;this.paused=true;this.plays=0;this.listeners=new Map();audios.push(this);}
  addEventListener(n,fn){if(!this.listeners.has(n))this.listeners.set(n,new Set());this.listeners.get(n).add(fn);}removeEventListener(n,fn){this.listeners.get(n)?.delete(fn);}emit(n){for(const fn of this.listeners.get(n)??[])fn();}load(){}
  play(){this.plays++;if(deny)return Promise.reject(Error('Autoplay'));this.paused=false;queueMicrotask(()=>this.emit('playing'));return Promise.resolve();}pause(){this.paused=true;}
 }
 const context=vm.createContext({Audio,console:{warn(){}},requestAnimationFrame(){throw Error('No second cinematic clock');},cancelAnimationFrame(){}});vm.runInContext(fs.readFileSync('cinematic-audio.js','utf8'),context);
 const state={phase:'chapter8',generation:'g',chapter8:{id:'c',startedAt:100000,step,phaseAt:100000,audioStartedAt:null,puzzleStartedAt:100000,deadline:null,sequence:0,revealedClues:[]}};
 const audio=new Chapter8Audio({elapsedNow:()=>now-100000},{Player:context.BrookwoodAudio.Player,request:async(_path,b)=>{requests.push(b);if(b.action==='chapter8-audio-playing')state.chapter8.audioStartedAt=now;return {state};},onState:s=>audio.update(s)});
 return {audio,state,audios,requests,at:value=>now=100000+value,deny:value=>deny=value,update:()=>audio.update(state),track:()=>audio.track.audio,voice:()=>audio.player.media.get(narrationFor(state.chapter8.step)?.id)};
}
test('one native loop fades gently, stays continuous during reveals, and reconstructs its modulo offset after refresh',async()=>{
 const h=harness('puzzle',{offset:ambientCue.durationMs*2+3000});h.update();await flush();assert(h.track().loop);assert.equal(h.track().currentTime,3);assert.equal(h.track().volume,0);h.at(ambientCue.durationMs*2+3800);h.update();assert.equal(h.track().volume,.035);h.at(ambientCue.durationMs*2+4600);h.update();assert.equal(h.track().volume,.07);for(let n=0;n<17;n++){h.state.chapter8.sequence++;h.update();}assert.equal(h.track().plays,1);assert.equal(h.audios.filter(a=>a.src===ambientCue.src).length,1);
});
test('Continue fades only ambience to zero before reaction; narration remains at full volume',async()=>{
 const h=harness();h.update();await flush();h.at(1600);h.update();h.state.chapter8.step='leaving';h.state.chapter8.deadline=103200;h.update();h.at(2400);h.update();assert.equal(h.track().volume,.035);h.at(3200);h.update();assert.equal(h.track().volume,0);h.state.chapter8.step='reaction';h.state.chapter8.sequence++;h.update();await flush();assert(h.track().paused);assert.equal(h.voice().volume,1);assert.equal(h.voice().currentTime,0);assert.equal(h.voice().plays,1);
});
test('autoplay failures wait for the existing gesture without starting a second element',async()=>{
 const h=harness('puzzle',{deny:true});h.update();await flush();assert(h.audio.needsUnlock());for(let n=0;n<10;n++)h.update();assert.equal(h.track().plays,1);h.deny(false);h.audio.unlock();await flush();assert(!h.track().paused);assert.equal(h.track().plays,2);assert.equal(h.audios.filter(a=>a.src===ambientCue.src).length,1);
});
test('native narration completion and refresh use the current recording, never a second voice or puzzle timer',async()=>{
 const h=harness('coded-message',{offset:7000});h.state.chapter8.audioStartedAt=100000;h.update();await flush();assert.equal(h.voice().currentTime,7);assert.equal(h.voice().volume,1);for(let n=0;n<10;n++)h.update();assert.equal(h.voice().plays,1);assert.equal(h.requests.length,0);assert(h.track().paused);h.at(23150);h.voice().ended=true;h.voice().paused=true;h.voice().emit('ended');h.voice().emit('ended');await flush();assert.equal(h.requests.filter(b=>b.action==='chapter8-audio-ended').length,1);h.audio.stop();assert(h.audios.every(a=>a.paused));
});
test('late narration media starts at the first word and normal native playing sets its clock only once',async()=>{
 const h=harness('unexpected-evidence',{ready:0});h.update();assert.equal(h.voice().plays,0);h.at(9000);h.voice().readyState=4;h.update();await flush();assert.equal(h.voice().currentTime,0);assert.equal(h.voice().volume,1);assert.equal(h.requests.filter(b=>b.action==='chapter8-audio-playing').length,1);
});
