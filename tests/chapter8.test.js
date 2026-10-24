import test,{beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fresh,CAS_SCRIPT,UNCHANGED,publicState} from '../api/_state.js';
import {makeChapter8Starter,chapter8HostAction,advanceChapter8,validateChapter8} from '../api/_chapter8.js';
import {clues,narrationFor,PUZZLE_FADE_MS} from '../chapter8-puzzle.js';
import host from '../api/host.js';import me from '../api/me.js';import progress from '../api/progress.js';
import {finalNarrationFixture} from './chapter7-fixture.js';
import {makeBroadcastTestSelector} from '../api/_chapter7.js';
import {startInvestigation} from '../api/_chapter7-story.js';
import {wavMetadata} from './wav-metadata.js';import {mp3Metadata} from './mp3-metadata.js';
let now,raw,realNow,realFetch,env;
beforeEach(()=>{now=10000000;raw=null;realNow=Date.now;realFetch=global.fetch;env={...process.env};Date.now=()=>now;process.env.HOST_KEY='chapter8-local-test';process.env.KV_REST_API_URL='https://redis.invalid';process.env.KV_REST_API_TOKEN='test';global.fetch=async(_url,options)=>{const a=JSON.parse(options.body);let result;if(a[0]==='GET')result=raw;else {assert.equal(a[0],'EVAL');assert.equal(a[1],CAS_SCRIPT);result=(raw??'')===a[4]?1:0;if(result)raw=a[5];}return {ok:true,json:async()=>({result})};};});
afterEach(()=>{Date.now=realNow;global.fetch=realFetch;for(const k of ['HOST_KEY','KV_REST_API_URL','KV_REST_API_TOKEN'])if(env[k]===undefined)delete process.env[k];else process.env[k]=env[k];});
function fixture(step='puzzle'){const s=finalNarrationFixture(now);s.players.forEach((p,i)=>p.simulated=i>=2);makeChapter8Starter({},step==='puzzle'?'chapter8-puzzle':'chapter8')(s);return s;}
const body=(s,action,extra={})=>({action,generation:s.generation,chapter8Id:s.chapter8.id,sequence:s.chapter8.sequence,...extra});
async function call(handler,b={},cookie=''){let status,data;const headers={};await handler({method:'POST',body:b,headers:{cookie}},{status(n){status=n;return this;},setHeader(k,v){headers[k]=v;},json(j){data=j;}});return {status,data,headers};}
function revealAll(s){for(const clue of [...clues].reverse())chapter8HostAction(s,body(s,'chapter8-reveal',{clueId:clue.id}));}

test('exact seventeen mappings, percentage bounds and original supplied media are preserved',()=>{
 assert.deepEqual(clues.map(c=>c.letter),['I','M','A','L','R','E','A','D','Y','H','E','R','E','H','I','D','E']);assert.deepEqual(clues.map(c=>c.id),Array.from({length:17},(_,n)=>n+1));
 for(const c of clues){assert(c.x>=0&&c.y>=0&&c.x+c.w<=100&&c.y+c.h<=100);assert(c.label);}
 const metadata=JSON.parse(fs.readFileSync('chapter8-media.json'));for(const m of metadata){const b=fs.readFileSync('.'+m.src);assert.equal(createHash('sha256').update(b).digest('hex'),m.sha256);if(m.src.endsWith('.wav'))assert.equal(wavMetadata(b).durationMs,m.durationMs);if(m.src.endsWith('.mp3'))assert.equal(mp3Metadata(b).durationMs,m.durationMs);}
});

test('only authenticated host sessions reveal; player credentials and anonymous clients cannot mutate',async()=>{
 const s=fixture();raw=JSON.stringify(s);const request=body(s,'chapter8-reveal',{clueId:7});assert.equal((await call(host,request)).status,403);assert.equal((await call(host,{...request,id:'p0',token:'t0'})).status,403);
 const auth=await call(host,{action:'maze-login',code:'chapter8-local-test'}),cookie=auth.headers['Set-Cookie'].split(';')[0];assert.equal((await call(host,request,cookie)).status,200);assert.deepEqual(JSON.parse(raw).chapter8.revealedClues,[7]);assert.equal((await call(host,{...request,clueId:'1'},cookie)).status,400);assert.equal((await call(host,{...request,clueId:18},cookie)).status,400);
});

test('unordered concurrent reveals merge atomically and duplicate reveals do not write new revisions',async()=>{
 const s=fixture();raw=JSON.stringify(s);const requests=[17,2,11,1].map(clueId=>call(host,body(s,'chapter8-reveal',{clueId,code:'chapter8-local-test'})));const results=await Promise.all(requests);assert(results.every(r=>r.status===200));assert.deepEqual(JSON.parse(raw).chapter8.revealedClues,[1,2,11,17]);const saved=raw;assert.equal((await call(host,body(s,'chapter8-reveal',{clueId:2,code:'chapter8-local-test'}))).status,200);assert.equal(raw,saved);
});

test('all letters persist across state and phone refresh; public progress cannot reveal or auto-complete',async()=>{
 const s=fixture();revealAll(s);raw=JSON.stringify(s);const saved=raw;now+=900000;assert.equal(advanceChapter8(s),UNCHANGED);assert.equal((await call(progress,{action:'chapter8-continue'})).status,200);assert.equal(raw,saved);assert.equal(publicState(JSON.parse(raw)).chapter8.revealedClues.length,17);
 const phone=await call(me,{id:'p0',token:'t0'});assert.equal(phone.status,200);assert.equal(phone.data.chapter8.revealedClues.length,17);assert(!JSON.stringify(phone.data).includes('token'));assert(!phone.data.chapter7);assert.deepEqual(JSON.parse(raw).players,s.players);
});

test('Continue requires every clue and host session, fades before reaction, and stops before security scenes',async()=>{
 const s=fixture();raw=JSON.stringify(s);assert.equal((await call(host,body(s,'chapter8-continue',{code:'chapter8-local-test'}))).status,409);revealAll(s);raw=JSON.stringify(s);assert.equal((await call(host,body(s,'chapter8-continue'))).status,403);assert.equal((await call(host,body(s,'chapter8-continue',{code:'chapter8-local-test'}))).status,200);const next=JSON.parse(raw);assert.equal(next.chapter8.step,'leaving');assert.equal(next.chapter8.deadline-now,PUZZLE_FADE_MS);now+=PUZZLE_FADE_MS-1;assert.equal(advanceChapter8(next),UNCHANGED);now++;advanceChapter8(next);assert.equal(next.chapter8.step,'reaction');const cue=narrationFor('reaction');chapter8HostAction(next,body(next,'chapter8-audio-playing',{recording:cue.id}));now+=cue.durationMs;chapter8HostAction(next,body(next,'chapter8-audio-ended',{recording:cue.id}));assert.equal(next.chapter8.step,'complete');assert.equal(advanceChapter8(next),UNCHANGED);validateChapter8(next);
});

test('opening narration uses full native gates and refresh keeps its clock without exposing puzzle controls',()=>{
 const s=fixture('opening');for(const step of ['unexpected-evidence','coded-message']){assert.equal(s.chapter8.step,step);const cue=narrationFor(step);assert.throws(()=>chapter8HostAction(s,body(s,'chapter8-reveal',{clueId:1})));assert.throws(()=>chapter8HostAction(s,body(s,'chapter8-audio-ended',{recording:cue.id})));chapter8HostAction(s,body(s,'chapter8-audio-playing',{recording:cue.id}));now+=5000;const restored=JSON.parse(JSON.stringify(s));validateChapter8(restored);assert.equal(restored.chapter8.audioStartedAt,s.chapter8.audioStartedAt);assert.equal(advanceChapter8(restored),UNCHANGED);assert.throws(()=>chapter8HostAction(restored,body(restored,'chapter8-audio-ended',{recording:cue.id})));now+=cue.durationMs-5000;chapter8HostAction(s,body(s,'chapter8-audio-ended',{recording:cue.id}));}assert.equal(s.chapter8.step,'puzzle');
});

test('stale generation, phase and run requests fail; corrupt clue IDs fail closed',()=>{
 const s=fixture();for(const extra of [{generation:'old'},{chapter8Id:'old'}])assert.throws(()=>chapter8HostAction(s,body(s,'chapter8-reveal',{clueId:1,...extra})));s.chapter8.revealedClues=[1,1];assert.throws(()=>validateChapter8(s));s.chapter8.revealedClues=[99];assert.throws(()=>validateChapter8(s));
});

test('existing authenticated checkpoint preserves Chapters 1–7, cast and revealed letters on revisit',async()=>{
 const s=fixture();chapter8HostAction(s,body(s,'chapter8-reveal',{clueId:12}));const history=structuredClone({players:s.players,chapter4:s.chapter4,chapter5:s.chapter5,chapter6:s.chapter6});raw=JSON.stringify(s);const auth=await call(host,{action:'maze-login',code:'chapter8-local-test'}),cookie=auth.headers['Set-Cookie'].split(';')[0];assert.equal((await call(host,{action:'chapter-select',checkpoint:'chapter8'},cookie)).status,200);assert.equal((await call(host,{action:'chapter-select',checkpoint:'chapter8-puzzle'},cookie)).status,200);const stored=JSON.parse(raw);assert.deepEqual(stored.chapter8.revealedClues,[12]);assert.deepEqual({players:stored.players,chapter4:stored.chapter4,chapter5:stored.chapter5,chapter6:stored.chapter6},history);assert.equal(stored.generation,s.generation);
});

test('normal Chapter 8 entry requires completed Chapter 7 and preserves its exact stored state',()=>{
 const s=finalNarrationFixture(now);assert.throws(()=>makeChapter8Starter({generation:s.generation})(s));makeBroadcastTestSelector('chapter7-after')(s);startInvestigation(s);assert.throws(()=>makeChapter8Starter({generation:s.generation,chapter7Id:s.chapter7.id})(s));Object.assign(s.chapter7.investigation,{step:'complete',deadline:null,completedAt:now});const previous=structuredClone(s.chapter7);makeChapter8Starter({generation:s.generation,chapter7Id:s.chapter7.id})(s);assert.equal(s.chapter8.step,'unexpected-evidence');assert.deepEqual(s.chapter7,previous);validateChapter8(s);
});
