import test from 'node:test';import assert from 'node:assert/strict';
import {InvestigationAudio} from '../chapter7-story-audio.js';
import {storyRecording,PROPHECY_AT_MS,TRANSMISSION_MS,cameraCue,prophecyAt} from '../chapter7-story-timing.js';
const flush=()=>new Promise(r=>setImmediate(r));
function harness({step='narrator',ready=4,deny=false,startedAt=null,offsetMs=0,polishVersion=2,deferPlay=false}={}){
 let now=100000,denied=deny;const calls=[],accepted=[];
 class Audio{
  constructor(cue){this.src=cue.src;this.duration=cue.durationMs/1000;this.readyState=ready;this.currentTime=0;this.paused=true;this.ended=false;this.listeners=new Map();this.plays=0;}
  addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
  removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
  emit(type){for(const fn of this.listeners.get(type)??[])fn();}
  play(){this.plays++;if(denied){denied=false;return Promise.reject(Error('blocked'));}this.paused=false;queueMicrotask(()=>this.emit('playing'));if(deferPlay&&!this.deferredOnce){this.deferredOnce=true;return new Promise(resolve=>this.releasePlay=resolve);}return Promise.resolve();}
  pause(){const playing=!this.paused;this.paused=true;if(playing)this.emit('pause');}
 }
 class Player{constructor(timeline){this.media=new Map(timeline.cues.map(c=>[c.id,new Audio(c)]));}stop(){for(const a of this.media.values())a.pause();}}
 const state={phase:'chapter7',generation:'g',chapter7:{id:'broadcast',startedAt:1000,investigation:{polishVersion,id:'story',step,phaseAt:now,sequence:1,audioStartedAt:startedAt,offsetMs}}};
 const channel=new InvestigationAudio({elapsedNow:()=>now-1000},{Player,request:async(_path,b)=>{calls.push(b);if(b.action==='investigation-audio-playing')state.chapter7.investigation.audioStartedAt=now;const playSound=b.action==='investigation-photo-sound'&&state.chapter7.investigation.photoSoundPlayedAt==null;if(playSound)state.chapter7.investigation.photoSoundPlayedAt=now;return {state:structuredClone(state),playSound};},onState:s=>{accepted.push(s);channel.update(s);}});
 return {channel,state,calls,accepted,at:n=>now=n,audio:()=>channel.player.media.get(storyRecording(step).id)};
}
test('delayed narration loading starts at its first word and full supplied level, not a metadata offset',async()=>{
 const h=harness({ready:0});h.channel.update(h.state);assert.equal(h.audio().plays,0);h.at(150000);h.audio().readyState=4;h.channel.update(h.state);await flush();assert.equal(h.audio().currentTime,0);assert.equal(h.audio().volume,1);assert.equal(h.audio().muted,false);assert.equal(h.calls[0].action,'investigation-audio-playing');assert.equal(h.state.chapter7.investigation.audioStartedAt,150000);
});
test('autoplay refusal holds scene without acknowledgments; gesture retries only the current channel',async()=>{
 const h=harness({deny:true});h.channel.update(h.state);await flush();assert(h.channel.blocked);assert.equal(h.calls.length,0);h.channel.unlock();await flush();assert.equal(h.calls.length,1);assert(!h.channel.blocked);assert.equal(h.audio().plays,2);assert.equal([...h.channel.player.media.values()].filter(a=>!a.paused).length,1);
});
test('native pause never advances; native ended alone authorizes the next scene after measured duration',async()=>{
 const h=harness();h.channel.update(h.state);await flush();h.audio().pause();assert(h.channel.blocked);assert(!h.calls.some(c=>c.action==='investigation-audio-ended'));h.channel.unlock();await flush();h.at(100000+33400);h.audio().ended=true;h.audio().paused=true;h.audio().emit('ended');h.audio().emit('ended');await flush();assert.equal(h.calls.filter(c=>c.action==='investigation-audio-ended').length,1);assert.equal(h.audio().volume,1);
});
test('refresh reconstructs within the active recording and never creates a second voice on state updates',async()=>{
 const h=harness({startedAt:90000});h.channel.update(h.state);await flush();assert.equal(h.audio().currentTime,10);for(let j=0;j<10;j++)h.channel.update(h.state);assert.equal(h.audio().plays,1);assert.equal(h.calls.length,0);assert.equal([...h.channel.player.media.values()].filter(a=>!a.paused).length,1);
});
test('expired reconstructed ring is acknowledged silently instead of replaying a consumed sound',async()=>{
 const h=harness({step:'incoming',startedAt:95000});h.channel.update(h.state);await flush();assert.equal(h.audio().plays,0);assert.equal(h.calls[0].action,'investigation-audio-ended');
});
test('checkpoint navigation pauses the prior channel and fences its late native completion',async()=>{
 const h=harness();h.channel.update(h.state);await flush();const old=h.audio();h.state.chapter7.investigation={...h.state.chapter7.investigation,step:'premeditation',sequence:2,audioStartedAt:null};h.channel.update(h.state);await flush();assert(old.paused);old.emit('ended');await flush();assert(!h.calls.some(c=>c.action==='investigation-audio-ended'));assert.equal([...h.channel.player.media.values()].filter(a=>!a.paused).length,1);h.channel.stop();assert.equal([...h.channel.player.media.values()].filter(a=>!a.paused).length,0);
});

test('radio handoff overlaps only its final static, keeps both native recordings and refreshes within prophecy',async()=>{
 const h=harness({step:'officer',startedAt:100000});h.channel.update(h.state);await flush();const officer=h.audio(),prophecy=h.channel.player.media.get(storyRecording('prophecy').id);
 officer.currentTime=(PROPHECY_AT_MS-1)/1000;h.channel.update(h.state);assert.equal(prophecy.plays,0);
 officer.currentTime=(PROPHECY_AT_MS+20)/1000;h.channel.update(h.state);await flush();assert.equal(prophecy.plays,1);assert(Math.abs(prophecy.currentTime-.02)<.001);assert.equal(officer.paused,false);assert.equal(prophecy.volume,1);
 officer.ended=true;officer.paused=true;officer.emit('ended');assert(!h.calls.some(b=>b.action==='investigation-audio-ended'));h.at(100000+Math.ceil(TRANSMISSION_MS));prophecy.paused=true;prophecy.ended=true;prophecy.emit('ended');await flush();assert.equal(h.calls.filter(b=>b.action==='investigation-audio-ended').length,1);
 const r=harness({step:'officer',startedAt:100000-PROPHECY_AT_MS-2000});r.channel.update(r.state);await flush();const p=r.channel.player.media.get(storyRecording('prophecy').id);assert.equal(r.audio().plays,0);assert.equal(p.plays,1);assert(Math.abs(p.currentTime-2)<.001);r.channel.stop();assert(p.paused);
});

test('camera plays once at original-photo appearance, preserves full narration level and stays consumed after refresh',async()=>{
 const h=harness({step:'photograph'});h.channel.update(h.state);await flush();h.channel.photoAppearance();h.channel.photoAppearance();await flush();const camera=h.channel.player.media.get(cameraCue.id);assert.equal(camera.plays,1);assert.equal(camera.volume,.55);assert.equal(h.audio().volume,1);assert.equal(h.audio().paused,false);h.channel.release();h.channel.update(h.state);h.channel.photoAppearance();await flush();assert.equal(camera.plays,1);h.channel.stop();
});
test('legacy transmission retains its persisted overlap while new runs start prophecy exactly one second earlier',()=>{
 assert.equal(prophecyAt({polishVersion:1})-prophecyAt({polishVersion:2}),1000);
});

test('refresh queues prophecy safely while the native officer play/seek promise is pending',async()=>{
 const h=harness({step:'officer',startedAt:100000-PROPHECY_AT_MS-500,deferPlay:true});h.channel.update(h.state);h.channel.update(h.state);const p=h.channel.player.media.get(storyRecording('prophecy').id);assert.equal(p.plays,0);h.audio().releasePlay();await flush();h.channel.update(h.state);assert.equal(p.plays,1);assert.equal(p.paused,false);p.releasePlay();await flush();h.channel.stop();
});
