import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {InvestigationAmbient,INVESTIGATION_AMBIENT_VOLUME,AMBIENT_FADE_MS,AMBIENT_SRC,AMBIENT_DURATION_MS} from '../chapter7-ambient.js';
import {InvestigationAudio} from '../chapter7-story-audio.js';
import {storyRecording} from '../chapter7-story-timing.js';
import {mp3Metadata} from './mp3-metadata.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function harness({step='narrator',offset=0,deny=false,pending=false,ready=4}={}){
 let now=100000+offset,blocked=deny,synced=true;const media=[],calls=[];
 class Audio{
  constructor(src){this.src=src;this.volume=0;this.currentTime=0;this.readyState=ready;this.duration=src===AMBIENT_SRC?AMBIENT_DURATION_MS/1000:storyRecording('narrator').durationMs/1000;this.paused=true;this.plays=0;this.listeners=new Map();media.push(this);}
  addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
  removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
  emit(type){for(const fn of this.listeners.get(type)??[])fn();}
  load(){}
  play(){this.plays++;if(this.src===AMBIENT_SRC&&blocked)return Promise.reject(Error('Autoplay blocked'));this.paused=false;queueMicrotask(()=>this.emit('playing'));if(this.src===AMBIENT_SRC&&pending)return new Promise(resolve=>this.finishPlay=resolve);return Promise.resolve();}
  pause(){this.paused=true;}
 }
 const context=vm.createContext({Audio,console:{warn(){}},requestAnimationFrame(){throw Error('Unexpected second animation clock');},cancelAnimationFrame(){}});
 vm.runInContext(fs.readFileSync('cinematic-audio.js','utf8'),context);
 const Player=context.BrookwoodAudio.Player,clock={elapsedNow:()=>now-1000,canSync:()=>synced};
 const ambient=new InvestigationAmbient(clock,{Player});
 let state;
 const scene=(step,extra={})=>state={phase:'chapter7',generation:'g',chapter7:{id:'broadcast',step:'waiting',startedAt:1000,investigation:{id:'story',startedAt:100000,step,sequence:1,phaseAt:now,deadline:['theory-fade','ending-fade'].includes(step)?now+1600:null,audioStartedAt:null,offsetMs:0,polishVersion:2,...extra}}};
 scene(step);
 return {ambient,Player,clock,media,calls,get state(){return state;},get audio(){return ambient.track.audio;},scene,at:ms=>now=100000+ms,deny:v=>blocked=v,sync:v=>synced=v,update(position=0){ambient.update(state,position);},tick(ms,position=0){now=100000+ms;ambient.update(state,position);}};
}

test('supplied ambience remains byte-for-byte original and its measured loop duration matches the engine',()=>{
 const bytes=fs.readFileSync('.'+AMBIENT_SRC);assert.equal(createHash('sha256').update(bytes).digest('hex'),'4251eb6f0ca9892bdf86ad70f216163e145bc7bb90579ae8a0c2725e6588a1d1');assert.equal(mp3Metadata(bytes).durationMs,AMBIENT_DURATION_MS);assert.equal(INVESTIGATION_AMBIENT_VOLUME,.10);
});

test('one synchronized loop fades in and continues across eligible narrator, voting and photo scenes',async()=>{
 const h=harness();h.update();await flush();assert.equal(h.audio.volume,0);assert(h.audio.loop);assert.equal(h.audio.plays,1);h.tick(AMBIENT_FADE_MS/2);assert.equal(h.audio.volume,.05);h.tick(AMBIENT_FADE_MS);assert.equal(h.audio.volume,.1);
 h.audio.currentTime=37;for(const step of ['date-reveal','podcast-intro','vote-intro','theory-vote','vote-fade','spoken','theory-reveal','envelope-vote','retriever-reveal','retriever-fallback','envelope-waiting','photograph','photo-hold']){h.scene(step);h.update();assert.equal(h.audio.volume,.1);}
 assert.equal(h.audio.plays,1);assert.equal(h.media.length,1);assert.equal(h.audio.currentTime,37);
});

test('podcasts fade the same loop out, radio stays silent, and narrator return restores it without duplicates',async()=>{
 const h=harness();h.update();await flush();h.tick(1200);h.scene('possession');h.update();h.tick(1800);assert.equal(h.audio.volume,.05);h.tick(2400);assert.equal(h.audio.volume,0);assert(h.audio.paused);
 for(const step of ['officer','prophecy','reaction','premeditation','accomplice','theory2-transition','theory3-transition','narrator-transition']){h.scene(step);h.update();assert.equal(h.audio.volume,0);assert(h.audio.paused);}
 h.scene('vote-intro');h.update();await flush();h.tick(3600);assert.equal(h.audio.volume,.1);assert.equal(h.audio.plays,2);assert.equal(h.media.length,1);
});

test('podcast introduction fades out before the podcast dialogue instead of rebounding in its interlude',async()=>{
 const h=harness({step:'podcast-intro'}),duration=storyRecording('podcast-intro').durationMs;h.update();await flush();h.tick(1200,10000);assert.equal(h.audio.volume,.1);h.update(duration-600);assert.equal(h.audio.volume,.05);h.update(duration);assert.equal(h.audio.volume,0);
 h.scene('interlude');h.update();assert(h.audio.paused);h.scene('possession');h.update();assert.equal(h.audio.volume,0);assert.equal(h.audio.plays,1);
});

test('verdict fade reaches zero before fully silent black and ring; envelope voting fades the loop back in',async()=>{
 const h=harness({step:'theory-reveal'});h.update();await flush();h.tick(1200);h.scene('theory-fade');h.update();h.tick(2200);assert.equal(h.audio.volume,.05);h.tick(2800);assert.equal(h.audio.volume,0);h.scene('silent-black');h.update();assert(h.audio.paused);h.scene('incoming');h.update();assert.equal(h.audio.volume,0);assert.equal(h.audio.plays,1);
 h.scene('envelope-vote');h.update();await flush();h.tick(4000);assert.equal(h.audio.volume,.1);assert.equal(h.audio.plays,2);
});

test('broadcast, connection recovery and excluded refreshes never start the background',()=>{
 for(const step of ['connection','connection-black','possession','officer','prophecy','reaction','premeditation','accomplice','silent-black','incoming','complete']){const h=harness({step,offset:4000});h.update();assert.equal(h.audio.plays,0);assert.equal(h.audio.volume,0);assert(h.audio.paused);}
 const h=harness();delete h.state.chapter7.investigation;h.state.chapter7.step='playing';h.update();assert.equal(h.audio.plays,0);
});

test('refresh resumes a single native loop at the canonical modulo offset and fades from zero',async()=>{
 const offset=AMBIENT_DURATION_MS*2+3500,h=harness({step:'envelope-vote',offset});h.update();await flush();assert.equal(h.audio.currentTime,3.5);assert.equal(h.audio.volume,0);h.tick(offset+1200);for(let n=0;n<20;n++)h.update();assert.equal(h.audio.plays,1);assert.equal(h.media.length,1);assert.equal(h.audio.volume,.1);
 h.ambient.stop();assert(h.audio.paused);assert.equal(h.audio.volume,0);
});

test('autoplay refusal waits for the existing unlock gesture, then fades in on the same element',async()=>{
 const h=harness({deny:true});h.update();await flush();h.tick(1200);assert(h.ambient.needsUnlock());for(let n=0;n<10;n++)h.update();assert.equal(h.audio.plays,1);h.deny(false);h.ambient.unlock();await flush();assert.equal(h.audio.volume,0);h.tick(1800);assert.equal(h.audio.volume,.05);h.tick(2400);assert.equal(h.audio.volume,.1);assert.equal(h.audio.plays,2);assert(!h.ambient.needsUnlock());
});

test('late media readiness fades from actual playback and canonical seeking survives scheduler recovery',async()=>{
 const h=harness({ready:0});h.update();h.tick(3000);assert.equal(h.audio.plays,0);h.audio.readyState=4;h.audio.emit('canplay');await flush();assert.equal(h.audio.volume,0);assert.equal(h.audio.currentTime,3);h.tick(4200);assert.equal(h.audio.volume,.1);h.sync(false);h.tick(5000);h.sync(true);h.update();assert.equal(h.audio.plays,1);
});

test('ending fade and run replacement stop the old loop; pending play never creates another element',async()=>{
 const h=harness({step:'photo-hold',pending:true});h.update();await flush();h.tick(1200);h.scene('ending-fade');h.update();h.tick(2800);h.scene('complete');h.update();assert(h.audio.paused);assert.equal(h.audio.volume,0);h.audio.finishPlay();await flush();assert(h.audio.paused);assert.equal(h.media.length,1);
 h.scene('narrator',{id:'new-story',startedAt:102800});h.update();assert.equal(h.audio.currentTime,0);assert.equal(h.audio.volume,0);assert.equal(h.media.length,1);
});

test('a pending or blocked ambience never delays narration, changes its level, or prevents its media acknowledgment',async()=>{
 for(const options of [{pending:true},{deny:true}]){
  const h=harness(options),channel=new InvestigationAudio(h.clock,{Player:h.Player,request:async(_path,b)=>{h.calls.push(b);return {state:h.state};},onState(){}});channel.update(h.state);await flush();const narration=channel.player.media.get(storyRecording('narrator').id);assert.equal(narration.volume,1);assert.equal(narration.plays,1);assert(!narration.paused);assert(h.calls.some(b=>b.action==='investigation-audio-playing'));channel.stop();assert(narration.paused);
 }
});
