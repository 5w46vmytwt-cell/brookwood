import test,{beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fresh,CAS_SCRIPT,UNCHANGED,publicState} from '../api/_state.js';
import {advanceChapter6} from '../api/_chapter6.js';
import {finalNarrationFixture} from './chapter7-fixture.js';
import {startChapter7,validateChapter7,broadcastHostAction,advanceChapter7,makeBroadcastTestSelector,withinBroadcastRun} from '../api/_chapter7.js';
import {BLACKOUT_MS,BROADCAST_DURATION_MS,BROADCAST_SRC,BROADCAST_FADE_MS} from '../chapter7-timing.js';
import {Chapter7View} from '../chapter7.js';
import host from '../api/host.js';
import me from '../api/me.js';
import progress from '../api/progress.js';
let now,raw,realNow,realFetch;
beforeEach(()=>{now=10000000;raw=null;realNow=Date.now;realFetch=global.fetch;Date.now=()=>now;process.env.HOST_KEY='chapter7-test';process.env.KV_REST_API_URL='https://redis.invalid';process.env.KV_REST_API_TOKEN='test';global.fetch=async(_url,options)=>{const a=JSON.parse(options.body);let result;if(a[0]==='GET')result=raw;else{assert.equal(a[0],'EVAL');assert.equal(a[1],CAS_SCRIPT);result=(raw??'')===a[4]?1:0;if(result)raw=a[5];}return {ok:true,json:async()=>({result})};};});
afterEach(()=>{Date.now=realNow;global.fetch=realFetch;});
async function call(handler,body={},cookie=''){let status,data;const headers={};await handler({method:'POST',body,headers:{cookie}},{status(n){status=n;return this;},setHeader(k,v){headers[k]=v;},json(j){data=j;}});return {status,data,headers};}
const finale=()=>finalNarrationFixture(now);
function broadcast(){const s=fresh();makeBroadcastTestSelector('chapter7')(s);validateChapter7(s);return s;}
function action(s,name){return {action:name,generation:s.generation,broadcastId:s.chapter7.id};}
test('supplied MP4 is unchanged and authoritative duration matches its movie presentation',()=>{
 const result=spawnSync(process.execPath,['scripts/measure-chapter7.mjs'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);const media=JSON.parse(result.stdout);assert.equal(media.sha256,'5186fd97669cc33ce6a6842b2b4707358faf69de263cfae20607323d0b7b67ab');assert.equal(media.durationSeconds*1000,BROADCAST_DURATION_MS);assert.equal(media.tracks[0].codec,'avc1.4d401f');assert.equal(media.tracks[0].width,1280);assert.equal(media.tracks[0].height,720);assert.equal(media.tracks[1].channels,2);assert.equal(media.tracks[1].sampleRate,48000);assert(media.fastStart);
});
test('host can explicitly select Chapter 7 without creating or resetting an earlier cast',async()=>{
 const s=fresh();raw=JSON.stringify(s);const result=await call(host,{action:'chapter-select',checkpoint:'chapter7',code:'chapter7-test'});assert.equal(result.status,200);const next=JSON.parse(raw);assert.deepEqual(next.players,[]);assert.equal(next.generation,s.generation);assert.equal(next.startedAt,null);assert(!next.chapter6);assert.equal(next.chapter7.step,'blackout');
});
test('final killer narration remains gated by native completion; blackout starts only after complete',async()=>{
 const s=finale();now=s.chapter6.deadline+15000;assert.equal(advanceChapter6(s),UNCHANGED);assert.equal(startChapter7(s),UNCHANGED);raw=JSON.stringify(s);await call(progress);assert.equal(JSON.parse(raw).phase,'chapter6');
 const body={action:'maze-audio-ended',generation:s.generation,chapter6StartedAt:s.chapter6.startedAt,sequence:s.chapter6.sequence,recording:31,code:'chapter7-test'};assert.equal((await call(host,body)).status,200);assert.equal(JSON.parse(raw).chapter6.step,'complete');
 const ending=JSON.parse(raw).chapter6;await call(progress);const next=JSON.parse(raw);assert.equal(next.phase,'chapter7');assert.equal(next.chapter7.startedAt,now);assert.deepEqual(next.chapter6,ending);validateChapter7(next);
});
test('three-second blackout cannot be bypassed; loading and blocked playback do not start clocks',()=>{
 const s=finale();now=s.chapter6.deadline;advanceChapter6(s,now,true);startChapter7(s);const start=now;now+=2999;assert.throws(()=>broadcastHostAction(s,action(s,'broadcast-playing')));assert.equal(advanceChapter7(s),UNCHANGED);assert.equal(s.chapter7.playbackStartedAt,null);now=start+3000+12000;broadcastHostAction(s,action(s,'broadcast-playing'));assert.equal(s.chapter7.playbackStartedAt,now);validateChapter7(s);
});
test('authenticated checkpoint preserves cast, lives, ballots, generation and all saved data',async()=>{
 const s=finale();raw=JSON.stringify(s);const before=structuredClone(s);assert.equal((await call(host,{action:'chapter-select',checkpoint:'chapter7'})).status,403);
 const login=await call(host,{action:'maze-login',code:'chapter7-test'}),cookie=login.headers['Set-Cookie'].split(';')[0];const result=await call(host,{action:'chapter-select',checkpoint:'chapter7'},cookie);assert.equal(result.status,200);const next=JSON.parse(raw);for(const key of Object.keys(before).filter(k=>!['phase','revision','updatedAt'].includes(k)))assert.deepEqual(next[key],before[key],key);assert.equal(result.data.state.chapter7.step,'blackout');
 assert.equal((await call(host,{action:'chapter-select',checkpoint:'chapter7-after'},cookie)).status,200);assert.equal(JSON.parse(raw).chapter7.step,'waiting');validateChapter7(JSON.parse(raw));
});
test('media events require host session and matching generation/run; stale requests cannot advance',async()=>{
 const s=broadcast();raw=JSON.stringify(s);assert.equal((await call(host,action(s,'broadcast-playing'))).status,403);const login=await call(host,{action:'maze-login',code:'chapter7-test'}),cookie=login.headers['Set-Cookie'].split(';')[0];assert.equal((await call(host,{...action(s,'broadcast-playing'),generation:'stale'},cookie)).status,409);assert.equal((await call(host,action(s,'broadcast-playing'),cookie)).status,200);const stored=raw;await call(host,action(s,'broadcast-playing'),cookie);assert.equal(raw,stored);const fenced=withinBroadcastRun(()=>UNCHANGED);fenced(s);assert.throws(()=>fenced({...s,chapter7:{...s.chapter7,id:'other'}}));
});
test('refresh preserves playback clock; end is once-only, followed by persistent black waiting',()=>{
 const s=broadcast();broadcastHostAction(s,action(s,'broadcast-playing'));const start=now;assert.throws(()=>broadcastHostAction(s,action(s,'broadcast-ended')));now+=BROADCAST_DURATION_MS+5;const restored=JSON.parse(JSON.stringify(s));assert.equal(publicState(restored).chapter7.playbackStartedAt,start);broadcastHostAction(restored,action(restored,'broadcast-ended'));const end=now;assert.equal(broadcastHostAction(restored,action(restored,'broadcast-ended')),UNCHANGED);now=end+799;assert.equal(advanceChapter7(restored),UNCHANGED);now=end+BROADCAST_FADE_MS;advanceChapter7(restored);assert.equal(restored.chapter7.step,'waiting');assert.equal(advanceChapter7(restored),UNCHANGED);assert.equal(startChapter7(restored),UNCHANGED);validateChapter7(restored);
});
test('phones project Chapter 7 without media or Chapter 6 presence writes',async()=>{
 const s=finale();makeBroadcastTestSelector('chapter7')(s);raw=JSON.stringify(s);const result=await call(me,{id:'p0',token:'t0'});assert.equal(result.status,200);assert.equal(result.data.chapter7.step,'blackout');assert(!result.data.chapter6);assert.equal(raw,JSON.stringify(s));const phone=fs.readFileSync('join.html','utf8');assert(!phone.includes('chapter7Video'));assert(!phone.includes(BROADCAST_SRC));assert(phone.includes("if(j.chapter7)"));
});
const flush=()=>new Promise(r=>setImmediate(r));
function viewHarness({ready=4,deny=false,authenticated=true}={}){
 const listeners={},calls=[],nodes={};let elapsed=3000,plays=0,denied=deny;
 const video={style:{},readyState:ready,duration:BROADCAST_DURATION_MS/1000,currentTime:0,paused:true,ended:false,volume:1,muted:false,load(){},removeAttribute(){delete this.src;},pause(){this.paused=true;},addEventListener(type,fn){listeners[type]=fn;},play(){plays++;if(denied){denied=false;return Promise.reject(Error('NotAllowedError'));}this.paused=false;queueMicrotask(()=>listeners.playing());return Promise.resolve();}};
 nodes.chapter7Video=video;nodes.chapter7Play={hidden:true};nodes.chapter7Error={hidden:true};const s=broadcast();s.chapter7.startedAt=now-3000;
 const view=new Chapter7View({getElementById:id=>nodes[id]},{elapsedNow:()=>elapsed,canSync:()=>true},{request:async(_path,b)=>{calls.push(b);if(b.action==='maze-session'){if(!authenticated)throw Error('403');return {authenticated:true};}broadcastHostAction(s,b);return {state:structuredClone(s)};},onState:next=>view.update(next)});
 return {view,video,nodes,calls,listeners,state:s,at:t=>{elapsed=t;},plays:()=>plays};
}
test('actual playing event starts clock once; repeated renders never create duplicate players',async()=>{
 const h=viewHarness();h.view.update(h.state);await flush();for(let i=0;i<10;i++)h.view.update(h.state);await flush();assert.equal(h.plays(),1);assert.equal(h.calls.filter(x=>x.action==='broadcast-playing').length,1);assert.equal(h.video.src,BROADCAST_SRC);assert.equal(h.video.volume,1);assert(!h.video.muted);assert(h.nodes.chapter7Play.hidden);
});
test('slow media load leaves clock unset until playable',async()=>{
 const h=viewHarness({ready:0});h.view.update(h.state);await flush();assert.equal(h.plays(),0);assert.equal(h.state.chapter7.playbackStartedAt,null);h.video.readyState=4;h.view.update(h.state);await flush();assert.equal(h.plays(),1);assert.equal(h.state.chapter7.step,'playing');
});
test('autoplay refusal exposes host-only gesture control without advancing; gesture resumes same player',async()=>{
 const h=viewHarness({deny:true});h.view.update(h.state);await flush();assert(!h.nodes.chapter7Play.hidden);assert.equal(h.state.chapter7.playbackStartedAt,null);for(let i=0;i<5;i++)h.view.update(h.state);assert.equal(h.plays(),1);h.nodes.chapter7Play.onclick();await flush();assert.equal(h.state.chapter7.step,'playing');assert(h.nodes.chapter7Play.hidden);
 const untrusted=viewHarness({authenticated:false});untrusted.view.update(untrusted.state);await flush();assert(untrusted.nodes.chapter7Play.hidden);assert.equal(untrusted.plays(),0);
});
test('refresh seeks near authoritative position; subsequent updates do not seek or replay',async()=>{
 const h=viewHarness();Object.assign(h.state.chapter7,{step:'playing',playbackStartedAt:now-15000});h.view.update(h.state);await flush();assert.equal(h.video.currentTime,15);h.video.currentTime=16;h.at(5000);h.view.update(h.state);assert.equal(h.video.currentTime,16);assert.equal(h.plays(),1);assert.equal(h.calls.filter(x=>x.action==='broadcast-playing').length,0);
});
test('native ended acknowledges once; fade and black waiting stop media without restarting',async()=>{
 const h=viewHarness();h.view.update(h.state);await flush();now+=BROADCAST_DURATION_MS+10;h.at(3000+BROADCAST_DURATION_MS+10);h.video.ended=true;h.video.paused=true;h.listeners.ended();h.listeners.ended();await flush();assert.equal(h.calls.filter(x=>x.action==='broadcast-ended').length,1);assert.equal(h.state.chapter7.step,'fading');h.at(3400+BROADCAST_DURATION_MS+10);h.view.update(h.state);assert(Math.abs(Number(h.video.style.opacity)-.5)<.01);now+=800;advanceChapter7(h.state);h.view.update(h.state);assert.equal(h.video.style.opacity,'0');assert(h.video.paused);assert(h.nodes.chapter7Play.hidden);assert.equal(h.plays(),1);
});
test('navigation fences pending media acknowledgments and removes video source',async()=>{
 const h=viewHarness();h.view.update(h.state);h.view.stop();await flush();assert.equal(h.plays(),0);assert(!h.video.src);assert(h.video.paused);
});
test('TV presentation contains only contained broadcast on black; build includes MP4; earlier audio is gated',()=>{
 const tv=fs.readFileSync('tv.html','utf8'),css=fs.readFileSync('chapter7.css','utf8'),runtime=fs.readFileSync('tv-cinematic.js','utf8');const section=tv.match(/<section id="chapter7TV"[\s\S]*?<\/section>/)[0];assert(!/HUD|Lives|Timer|caption|subtitle|controls=/.test(section));assert(css.includes('object-fit:contain'));assert(css.includes('position:fixed;inset:0'));assert(css.includes('background:#000'));assert(fs.readFileSync('scripts/build.mjs','utf8').includes('png|mp3|wav|mp4'));assert(fs.existsSync('.'+BROADCAST_SRC));assert(runtime.includes('this.chapter6Visuals.stopNarration();this.chapter6Visuals.ambient.stop();'));assert(runtime.includes('this.audio.soundtrack?.cancel()'));assert(runtime.includes('if(!state.chapter7&&!chapter3'));assert(runtime.includes('if(this.state?.chapter7||this.state?.chapter6)return;'));
});
