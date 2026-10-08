import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Chapter5Audio,chapter5Narration,chapter5ScoreVolume} from '../chapter5-audio.js';
import {chapter5Recordings,chapter5Opening,castBackground,CHAPTER5_READY_MS,CHAPTER5_RULES_MS,narrationGate,roleNarrationOffset,roleVotingOffset} from '../chapter5-audio-timing.js';
import {wavMetadata} from './wav-metadata.js';
import {mp3Metadata} from './mp3-metadata.js';
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
function state(phase='chapter5-intro'){
  return {phase,chapter5:{audioVersion:1,startedAt:100000,readyAt:null,rulesStartedAt:null,castStartedAt:null,completedAt:null,roundIndex:0,round:{id:'screamer',startedAt:null,completedAt:null,voteCount:0,winner:null}}};
}
function setup({permission=true,ready=true}={}){
  let elapsed=0,gesture=false;const warnings=[];
  class Audio{
    constructor(src){this.src=src;this.readyState=ready?1:0;this.currentTime=0;this.paused=true;this.volume=1;this.plays=0;this.events={};this.unlocked=permission;}
    load(){}addEventListener(n,f){this.events[n]=f;}pause(){this.paused=true;}
    play(){this.plays++;if(gesture&&!this.muted)this.unlocked=true;if(!this.unlocked){this.paused=true;return Promise.reject(Object.assign(Error('gesture required'),{name:'NotAllowedError'}));}this.paused=false;return Promise.resolve();}
  }
  const context=vm.createContext({Audio,console:{warn:(...args)=>warnings.push(args)},requestAnimationFrame(){throw Error('No independent RAF');},cancelAnimationFrame(){}});
  vm.runInContext(fs.readFileSync('cinematic-audio.js','utf8'),context);
  const audio=new Chapter5Audio(context.BrookwoodAudio.Player,{elapsedNow:()=>elapsed,externallyDriven:true,canSync:()=>true});
  return {audio,warnings,at(t,s,meta={}){elapsed=t;audio.update(s,meta);},media:id=>audio.player.media.get('chapter5-'+id),score:audio.player.tracks[0].audio,gesture(){gesture=true;try{audio.unlock();}finally{gesture=false;}},elapsed(t){elapsed=t;}};
}

test('all 12 Chapter 5 recordings are valid originals and durations match exact RIFF/MPEG frame metadata',()=>{
  assert.equal(chapter5Recordings.length,11);
  for(const cue of [...chapter5Recordings,castBackground]){
    const b=fs.readFileSync('.'+cue.src),m=cue.src.endsWith('.wav')?wavMetadata(b):mp3Metadata(b);
    assert.equal(m.durationMs,cue.durationMs,cue.src);
    assert.equal(m.channels,cue===castBackground?2:1);
    if(cue.src.endsWith('.wav')){assert.equal(m.sampleRate,24000);assert.equal(m.bits,32);assert.equal(m.encoding,3);}
    else{assert.equal(m.sampleRate,44100);assert.deepEqual(m.bitrates,[cue===castBackground?256:128]);}
  }
  assert.throws(()=>mp3Metadata(Buffer.from('not an mp3')));
  const b=fs.readFileSync('.'+castBackground.src);assert.throws(()=>mp3Metadata(b.subarray(0,b.length-1)),/Truncated/);
});

test('opening lines are sequential with exact durations, integer gates and a 200ms safe tail; host-ready stays fixed',()=>{
  assert.deepEqual(chapter5Opening.map(c=>c.at),[0,15250,35325,56606]);assert.equal(CHAPTER5_READY_MS,63154);assert.equal(CHAPTER5_RULES_MS,41108);
  chapter5Opening.forEach((c,i)=>{assert(c.end-c.at-c.durationMs>=200);assert(c.end-c.at-c.durationMs<201);if(i)assert.equal(c.at,chapter5Opening[i-1].end);});
  for(const role of ['screamer','terribleDecisionMaker','tripper','denier','sacrifice','killer'])assert.equal(roleVotingOffset(role),roleNarrationOffset(role)+narrationGate(role));
});

test('every opening narration starts once at its server-clock boundary, stops at its end and never restarts from polling',async()=>{
  const e=setup(),s=state();
  for(const c of chapter5Opening){
    const id=c.id.slice(9),a=e.media(id);if(c.at)e.at(c.at-1,s);assert.equal(a.plays,0);
    e.at(c.at,s);await flush();assert.equal(a.plays,1);assert.equal(a.volume,1);assert.equal(a.currentTime,0);
    e.at(c.at+100,s);e.at(c.at+100,s);assert.equal(a.plays,1);
    e.at(c.at+c.durationMs,s);assert(a.paused);
  }
  s.phase='chapter5-waiting';s.chapter5.readyAt=100000+CHAPTER5_READY_MS;e.at(CHAPTER5_READY_MS+3600000,s);assert([...e.audio.player.media.values()].every(a=>a.paused));assert.equal(e.score.volume,.14);
});

test('refresh seeks each active narration and consumes expired opening lines without playback',async()=>{
  for(const c of chapter5Opening){const e=setup(),s=state();e.at(c.at+500,s,{reconstruct:true});await flush();assert.equal(e.media(c.id.slice(9)).currentTime,.5);assert.equal(e.media(c.id.slice(9)).plays,1);for(const old of chapter5Opening.filter(p=>p.end<c.at))assert.equal(e.media(old.id.slice(9)).plays,0);}
  const e=setup();e.at(CHAPTER5_READY_MS+9000,state('chapter5-waiting'),{reconstruct:true});assert([...e.audio.player.media.values()].every(a=>a.plays===0));
});

test('host rules and all six role narrations derive their cue clocks from persisted scene timestamps',async()=>{
  for(const role of ['screamer','terribleDecisionMaker','tripper','denier','sacrifice','killer']){
    const s=state('chapter5-casting');s.chapter5.readyAt=163154;s.chapter5.rulesStartedAt=200000;s.chapter5.round.id=role;s.chapter5.round.startedAt=300000;
    const cues=chapter5Narration(s),cue=cues.find(c=>c.id==='chapter5-'+role);
    assert.equal(cues.find(c=>c.id==='chapter5-wife-rules').at,100000);assert.equal(cue.at,200000+roleNarrationOffset(role));
    const e=setup();e.at(cue.at-1,s);assert.equal(e.media(role).plays,0);e.at(cue.at+1000,s,{reconstruct:true});await flush();assert.equal(e.media(role).currentTime,1);assert.equal(e.media(role).volume,1);
    e.at(cue.at+cue.durationMs,s);assert(e.media(role).paused);e.at(200000+roleVotingOffset(role),s);assert.equal(e.media(role).plays,1);
  }
});

test('one score element loops continuously through opening, indefinite host wait, rules and rounds; refresh uses absolute modulo',async()=>{
  const e=setup(),s=state();e.at(castBackground.at-1,s);assert.equal(e.score.plays,0);e.at(castBackground.at+1000,s);await flush();assert.equal(e.score.plays,1);assert(e.score.loop);assert.equal(e.score.currentTime,1);
  s.phase='chapter5-waiting';s.chapter5.readyAt=163154;e.at(CHAPTER5_READY_MS+3600000,s,{reconstruct:true});assert.equal(e.score.plays,1);
  assert(Math.abs(e.score.currentTime-((CHAPTER5_READY_MS+3600000-castBackground.at)%castBackground.durationMs)/1000)<1e-9);
  s.phase='chapter5-rules';s.chapter5.rulesStartedAt=3800000;e.at(3700100,s);assert.equal(e.score.plays,1);
  s.phase='chapter5-casting';s.chapter5.round.startedAt=3900000;e.at(3802000,s);assert.equal(e.score.plays,1);
  const refresh=setup();refresh.at(3802000,s,{reconstruct:true});await flush();assert(Math.abs(refresh.score.currentTime-((3802000-castBackground.at)%castBackground.durationMs)/1000)<1e-9);
});

test('score fades in, derives narration duck/hold/release, and reaches silence before the mystery turn',()=>{
  const s=state();assert.equal(chapter5ScoreVolume(castBackground.at-1,s),0);assert.equal(chapter5ScoreVolume(castBackground.at,s),0);
  assert(Math.abs(chapter5ScoreVolume(castBackground.at+1000,s)-.056)<1e-12);
  const ready=chapter5Opening[3],end=ready.at+ready.durationMs;
  assert(Math.abs(chapter5ScoreVolume(end+100,s)-.056)<1e-9);assert(Math.abs(chapter5ScoreVolume(end+225,s)-.098)<1e-9);assert.equal(chapter5ScoreVolume(end+350,s),.14);
  s.phase='chapter5-finale';s.chapter5.castStartedAt=400000;
  assert.equal(chapter5ScoreVolume(305500,s),.14);assert(Math.abs(chapter5ScoreVolume(307000,s)-.07)<1e-12);
  for(const t of [308500,311000,330100,999999])assert.equal(chapter5ScoreVolume(t,s),0);
});

test('blocked refresh audio is isolated and active-safe gesture recovery resumes the current line without replaying history',async()=>{
  const e=setup({permission:false}),s=state();e.at(chapter5Opening[2].at+1000,s,{reconstruct:true});await flush();assert(e.audio.needsUnlock());assert(e.warnings.length>0);
  e.gesture();await flush();assert.equal(e.media('wife-intro').paused,false);assert.equal(e.media('wife-intro').currentTime,1);assert.equal(e.score.paused,false);assert.equal(e.audio.needsUnlock(),false);
  const active=e.media('wife-intro'),plays=active.plays;e.gesture();await flush();assert.equal(active.plays,plays);assert.equal(active.paused,false);assert.equal(active.volume,1);
  for(const c of chapter5Opening.slice(0,2))assert(e.audio.player.handled.has(c.id));
});

test('a delayed rejection from a superseded play attempt cannot pause successful gesture recovery in the same run',async()=>{
  const e=setup(),s=state(),a=e.media('item-acquired');let reject;
  a.play=()=>{a.paused=true;return new Promise((_,r)=>{reject=r;});};e.at(1000,s);
  a.play=()=>{a.paused=false;return Promise.resolve();};e.gesture();
  reject(Object.assign(Error('old blocked attempt'),{name:'NotAllowedError'}));await flush();
  assert.equal(a.paused,false);assert.equal(e.audio.player.active.audio,a);assert.equal(a.currentTime,1);
});

test('late metadata seeks the current line/score; an expired load never triggers narration',async()=>{
  const e=setup({ready:false}),s=state();e.at(chapter5Opening[2].at+2000,s);assert.equal(e.media('wife-intro').plays,0);
  const a=e.media('wife-intro');a.readyState=1;a.events.canplay();await flush();assert.equal(a.currentTime,2);assert.equal(a.plays,1);
  e.score.readyState=1;e.score.events.canplay();await flush();assert.equal(e.score.currentTime,2);
  const late=setup({ready:false});late.at(CHAPTER5_READY_MS+1000,state('chapter5-waiting'));const old=late.media('wife-intro');old.readyState=1;old.events.canplay();assert.equal(old.plays,0);
});

test('new startedAt rearms audio, old-run play completion cannot alter a new run, and stop/complete leave no competing audio',async()=>{
  const e=setup(),s=state();e.at(1000,s);const original=e.media('item-acquired');assert(!original.paused);
  s.chapter5.startedAt=200000;e.at(0,s);await flush();assert.equal(original.currentTime,0);assert.equal(original.plays,2);
  e.audio.stop();assert([...e.audio.player.media.values()].every(a=>a.paused));assert(e.score.paused);
  e.at(400000,state('chapter5-complete'));assert([...e.audio.player.media.values()].every(a=>a.paused));assert(e.score.paused);
});
