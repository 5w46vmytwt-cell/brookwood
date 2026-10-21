import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {ConnectionPlayback} from '../chapter7-connection.js';
import {InvestigationAudio} from '../chapter7-story-audio.js';
import {Chapter7Investigation} from '../chapter7-story.js';
import {connectionCue,connectionFrame,dateFrame,narratorFrame,storyRecording,CONNECTION_BLACK_MS,DATE_REVEAL_MS} from '../chapter7-story-timing.js';
import {mp3Metadata} from './mp3-metadata.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function hardware({suspended=false,fail=false}={}){
 const sources=[],contexts=[];let resume;
 class Context{
  constructor(){this.state=suspended?'suspended':'running';this.currentTime=0;this.destination={};contexts.push(this);}
  decodeAudioData(){return Promise.resolve({duration:connectionCue.durationMs/2000});}
  resume(){if(this.state==='running')return Promise.resolve();return new Promise(resolve=>resume=()=>{this.state='running';resolve();});}
  createBufferSource(){const source={connect(){},disconnect(){},start(...args){this.startArgs=args;},stop(time){this.stopAt=time;}};sources.push(source);return source;}
  createGain(){return {gain:{value:0},connect(){},disconnect(){}};}
 }
 const options={Context,fetchAudio:async()=>({ok:!fail,arrayBuffer:async()=>new ArrayBuffer(1)})};
 return {options,sources,contexts,get context(){return contexts[0];},allow(){resume?.();}};
}

test('newly supplied sound is unchanged and two decoded plays total 6.374 seconds',()=>{
 const bytes=fs.readFileSync('.'+connectionCue.src);assert.equal(bytes.length,101982);assert.equal(createHash('sha256').update(bytes).digest('hex'),'93d13ebe50495e0c200f29a2f2b54e2cf5587f291921407682c27527c8a7c296');assert.equal(mp3Metadata(bytes).durationMs*2,connectionCue.durationMs);
});

test('one sample-clock source loops twice with no restart gap and emits native completion only after the second copy',async()=>{
 const h=hardware(),audio=new ConnectionPlayback(h.options),events=[];await flush();audio.addEventListener('playing',()=>events.push('playing'));audio.addEventListener('ended',()=>events.push('ended'));await audio.play();const source=h.sources[0];assert.equal(h.sources.length,1);assert.equal(source.loop,true);assert.equal(source.loopEnd,audio.duration/2);assert.equal(source.stopAt,source.loopEnd*2);assert.deepEqual(source.startArgs,[0,0]);assert.deepEqual(events,['playing']);
 h.context.currentTime=source.loopEnd+.1;assert(audio.currentTime>audio.duration/2);assert.equal(h.sources.length,1);h.context.currentTime=source.stopAt;source.onended();assert(audio.ended);assert(audio.paused);assert.equal(audio.currentTime,audio.duration);assert.deepEqual(events,['playing','ended']);
});

test('refresh into the second repetition seeks within that copy and schedules only its remaining samples',async()=>{
 const h=hardware(),audio=new ConnectionPlayback(h.options);await flush();audio.currentTime=audio.duration/2+1;await audio.play();const source=h.sources[0];assert(Math.abs(source.startArgs[1]-1)<1e-10);assert(Math.abs(source.stopAt-(audio.duration/2-1))<1e-10);audio.pause();assert(audio.paused);assert.equal(source.onended,null);
});

test('autoplay waits for an actual unlock and obsolete pending starts cannot survive navigation',async()=>{
 const h=hardware({suspended:true}),audio=new ConnectionPlayback(h.options);await flush();const promise=audio.play();assert.equal(h.sources.length,0);h.allow();await promise;assert.equal(h.sources.length,1);audio.pause();assert(audio.paused);
 const other=hardware({suspended:true}),stale=new ConnectionPlayback(other.options);await flush();const old=stale.play();stale.pause();other.allow();await old;assert.equal(other.sources.length,0);
});

test('loading failure stays stopped rather than inventing a completed connection',async()=>{
 const h=hardware({fail:true}),audio=new ConnectionPlayback(h.options);await flush();assert(audio.failed);assert.equal(audio.readyState,0);assert(audio.paused);assert(!audio.ended);assert.equal(h.sources.length,0);
});

test('connection completion uses existing authenticated acknowledgments; updates cannot duplicate its source or start narration',async()=>{
 const h=hardware(),calls=[];
 class Connection extends ConnectionPlayback{constructor(){super(h.options);}}
 class Player{constructor(){this.media=new Map();}stop(){for(const audio of this.media.values())audio.pause();}}
 const state={phase:'chapter7',generation:'g',chapter7:{id:'b',startedAt:1000,step:'waiting',investigation:{id:'i',startedAt:100000,step:'connection',sequence:1,phaseAt:100000,deadline:null,audioStartedAt:null,offsetMs:0,polishVersion:3}}};let now=100000;
 const audio=new InvestigationAudio({elapsedNow:()=>now-1000},{Player,Connection,request:async(_path,b)=>{calls.push(b);if(b.action==='investigation-audio-playing')state.chapter7.investigation.audioStartedAt=now;return {state};},onState:s=>audio.update(s)});
 audio.update(state);await flush();audio.update(state);await flush();for(let n=0;n<20;n++)audio.update(state);assert.equal(h.sources.length,1);assert.equal(calls.length,1);assert.equal(calls[0].recording,connectionCue.id);assert.equal(audio.entry.audio.volume,1);now+=connectionCue.durationMs;h.context.currentTime=connectionCue.durationMs/1000;h.sources[0].onended();await flush();assert(calls.some(b=>b.action==='investigation-audio-ended'));assert.equal(state.chapter7.investigation.step,'connection');audio.stop();
});

function viewHarness(){
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:'',dataset:{},style:{setProperty(key,value){this[key]=value;}},classList:{toggle(){}},replaceChildren(){},append(){},appendChild(){},getAttribute(){return null;}});return nodes.get(id);};
 const document={getElementById:node,createElement:()=>node('generated')};let now=100000,position=0;
 class Player{constructor(){this.media=new Map();}stop(){}}
 const view=new Chapter7Investigation(document,{elapsedNow:()=>now-1000},{Player,request:async()=>({}),onState(){}});
 view.audio={entry:{audio:{paused:false},ended:false},update(){},position:()=>position,blocked:false,stop(){},photoAppearance(){}};
 const state={phase:'chapter7',generation:'g',chapter7:{id:'b',step:'waiting',startedAt:1000,investigation:{id:'i',startedAt:100000,sequence:1,phaseAt:100000,deadline:null,audioStartedAt:100000,offsetMs:0,polishVersion:3,testMode:true,step:'connection',election:null}}};
 return {view,state,node,at:n=>now=n,position:n=>position=n,show(step){state.chapter7.investigation.step=step;view.update(state);view.authenticated=true;view.update(state);}};
}

test('enlarged interference follows both sound copies, black hold hides it, and test controls stay out of cinematic scenes',()=>{
 const h=viewHarness();h.position(100);h.show('connection');assert(!h.node('ch7Connection').hidden);assert(h.node('ch7Connection').style.opacity>0);const first=h.node('ch7Connection').style['--signal-y'];h.position(connectionCue.durationMs/2+200);h.show('connection');assert.notEqual(h.node('ch7Connection').style['--signal-y'],first);assert(h.node('ch7Connection').style.opacity>0);assert(h.node('ch7Scene').hidden);assert(h.node('ch7TestFill').hidden);assert(h.node('ch7TestVotes').hidden);
 h.show('connection-black');assert(h.node('ch7Connection').hidden);assert(h.node('ch7Scene').hidden);for(const step of ['narrator','podcast-intro','possession','officer','reaction','premeditation','accomplice','vote-intro','date-reveal','theory-reveal']){h.show(step);assert(h.node('ch7TestFill').hidden);assert(h.node('ch7TestVotes').hidden);assert(!h.node('ch7Eyebrow').textContent.includes('HOST TEST MODE'));}
});

test('date never overlays narrator audio; its separate post-narration phase owns the year zoom',()=>{
 const h=viewHarness();for(const position of [0,3500,10000,storyRecording('narrator').durationMs-1]){h.position(position);h.show('narrator');assert(h.node('ch7Date').hidden);assert.equal(narratorFrame(position).date,0);}
 h.at(103000);h.show('date-reveal');assert(!h.node('ch7Date').hidden);assert(h.node('ch7Scene').hidden);assert(Number(h.node('ch7Year').style.transform.match(/[\d.]+/)[0])>1);assert.equal(CONNECTION_BLACK_MS,1000);assert.equal(dateFrame(DATE_REVEAL_MS).yearScale,1.25);assert.equal(connectionFrame(connectionCue.durationMs).opacity,0);
});

test('native fetch keeps its browser receiver and synchronous load failures remain recoverable',async()=>{
 const h=hardware();const audio=new ConnectionPlayback({...h.options,fetchAudio:async function(){assert.equal(this,undefined);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}});await flush();assert.equal(audio.readyState,4);
 const broken=new ConnectionPlayback({...h.options,fetchAudio(){throw Error('Network unavailable');}});await flush();assert(broken.failed);assert.equal(broken.readyState,0);assert(broken.paused);
});

test('host unlock retries the playing acknowledgment without restarting the active connection',()=>{
 let playing=0,starts=0;const audio=Object.create(InvestigationAudio.prototype);
 audio.connection={unlock(){}};audio.ambient={unlock(){}};audio.entry={failed:new Set(['investigation-audio-playing']),audio:{paused:false},playing(){playing++;},ended:false};audio.play=()=>starts++;
 audio.unlock();assert.equal(playing,1);assert.equal(audio.entry.failed.size,0);assert.equal(starts,1);
});


test('second narrator restores its original scene before Theory 01 fades into the unchanged Unseen podcast',()=>{
 const h=viewHarness();h.show('podcast-intro');assert.equal(h.node('ch7Title').textContent,'THREE THEORIES');assert(h.node('ch7PodcastLogo').hidden);h.at(104000);h.show('theory1-transition');assert.equal(h.node('ch7TransitionNumber').textContent,'THEORY 01');assert.equal(h.node('ch7TransitionTitle').textContent,'POSSESSION');assert.equal(h.node('ch7Transition').style.opacity,'1');assert.equal(h.node('ch7Scene').style.opacity,'0');assert(h.node('ch7Waveform').hidden);
 h.at(108000);h.show('theory1-transition');assert.equal(h.node('ch7Title').textContent,'PODCAST: THE UNSEEN');assert.equal(h.node('ch7PodcastLogo').dataset.identity,'THE UNSEEN');const opacity=h.node('ch7Scene').style.opacity;h.show('theory2-transition');assert.equal(h.node('ch7Scene').style.opacity,opacity);h.show('possession');assert.equal(h.node('ch7Title').textContent,'PODCAST: THE UNSEEN');
});


test('rings show only the incoming heading and hide retrieval controls until the instruction recording ends',()=>{
 const h=viewHarness();h.state.chapter7.investigation.polishVersion=4;for(const step of ['incoming','ring-gap','incoming-second']){h.show(step);assert.equal(h.node('ch7Title').textContent,'INCOMING MESSAGE!');assert.equal(h.node('ch7Subtitle').textContent,'');assert.equal(h.node('ch7Eyebrow').textContent,'');assert(h.node('ch7CloseVoting').hidden);assert(h.node('ch7TestVotes').hidden);}h.show('envelope-instructions');assert.equal(h.node('ch7Title').textContent,'AN ENVELOPE IS WAITING.');assert.equal(h.node('ch7Subtitle').textContent,'UNDER THE STAIRS.');for(const step of ['photo-appearance','photo-delay']){h.show(step);assert(!h.node('ch7PhotoStage').hidden);assert(!h.node('ch7Original').hidden);assert(h.node('ch7Enhanced').hidden);}
});
