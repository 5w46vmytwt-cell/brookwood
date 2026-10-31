import test,{beforeEach,afterEach} from 'node:test';import assert from 'node:assert/strict';
import {fresh,CAS_SCRIPT,publicState} from '../api/_state.js';
import {makeMazeTestSelector,makePostMazeTestSelector,advanceChapter6,validateChapter6,touchMazePresence} from '../api/_chapter6.js';
import {games,resultRecording,gate,phaseCues} from '../chapter6-timing.js';
import player from '../api/player.js';import host from '../api/host.js';import me from '../api/me.js';
let raw,now,oldFetch,oldNow,writes;
beforeEach(()=>{raw=null;now=10000000;writes=[];oldFetch=global.fetch;oldNow=Date.now;Date.now=()=>now;process.env.KV_REST_API_URL='https://quorum.invalid';process.env.KV_REST_API_TOKEN='isolated';process.env.HOST_KEY='local-host';
 global.fetch=async(url,options)=>{assert.equal(url,'https://quorum.invalid');const a=JSON.parse(options.body);let result;if(a[0]==='GET')result=raw;else{assert.equal(a[0],'EVAL');assert.equal(a[1],CAS_SCRIPT);result=(raw??'')===a[4]?1:0;if(result&&a[5]!==raw){raw=a[5];writes.push(JSON.parse(raw));}}return {ok:true,json:async()=>({result})};};
});
afterEach(()=>{global.fetch=oldFetch;Date.now=oldNow;});
const state=()=>JSON.parse(raw);
async function call(fn,body){let status,data;await fn({method:'POST',body,headers:{}},{status(n){status=n;return this;},setHeader(){},json(j){data=j;}});return {status,data};}
function fixture(n,real=n){const s=fresh();s.players=Array.from({length:n},(_,i)=>({id:'p'+i,token:'t'+i,name:'Guest '+i,partnerId:null,ready:false,alive:true,hearts:3,inventory:[],...(i>=real?{simulated:true}:{})}));makeMazeTestSelector()(s);const c=s.chapter6;Object.assign(c,{step:'finale',game:4,phaseAt:now,deadline:now+gate(28),results:games.map((g,i)=>({game:i,answer:i===4?'pass':g.correct,correct:true,resolvedAt:now,recording:resultRecording(i,i===4?'pass':g.correct,true)})),testMode:real<n});touchMazePresence(s,'p0',now);now=c.deadline;advanceChapter6(s,now,true);validateChapter6(s);raw=JSON.stringify(s);return s;}
function request(action,extra={}){const s=state();return {action,generation:s.generation,chapter6StartedAt:s.chapter6.startedAt,sequence:s.chapter6.sequence,...extra};}
const ballot=(i,target=i===1?'p2':'p1')=>call(player,{...request('token-vote'),id:'p'+i,token:'t'+i,targetId:target});

import {finalNarrationFixture} from './chapter7-fixture.js';import progress from '../api/progress.js';import {previousRetrievers} from '../api/_chapter7-story.js';
const select=()=>call(host,{action:'chapter-select',checkpoint:'chapter6-after-results',code:'local-host'});
for(const n of [6,12,25])test('post-Maze checkpoint opens the normal laundry vote with '+n+' persisted participants and no timers',async()=>{
 const before=fixture(n);assert.equal((await call(host,{action:'chapter-select',checkpoint:'chapter6-after-results'})).status,403);assert.equal((await select()).status,200);const after=state();validateChapter6(after);
 assert.equal(after.chapter6.step,'vote');assert.equal(after.chapter6.game,4);assert.equal(after.chapter6.deadline,null);assert.equal(after.chapter6.testMode,true);assert.equal(after.chapter6.testCheckpoint,'after-maze-results');assert.equal(after.chapter6.voterIds.length,n);assert.deepEqual(after.chapter6.votes,{});assert.equal(after.chapter6.selectedPlayerId,null);assert.deepEqual(phaseCues(after.chapter6),[]);
 assert.deepEqual(after.chapter6.results,before.chapter6.results);assert.deepEqual(after.chapter5,before.chapter5);assert.deepEqual(after.players,before.players);assert.deepEqual(after.postMazeCheckpointSource.chapter6,before.chapter6);assert.notEqual(after.generation,before.generation);assert(!('postMazeCheckpointSource' in publicState(after)));assert(!JSON.stringify(publicState(after)).includes('"votes"'));
 const snapshot=structuredClone(after);now+=60000;await call(progress,{});assert.deepEqual(state().chapter6,snapshot.chapter6);assert.equal((await call(me,{id:'p0',token:'t0'})).status,200);assert.equal(state().chapter6.step,'vote');
 for(let i=0;i<n;i++){assert.equal((await ballot(i)).status,200);if(i<n-1)assert.equal(state().chapter6.step,'vote');}assert.equal(state().chapter6.step,'selected');assert.equal(phaseCues(state().chapter6)[0].number,30);
 now=state().chapter6.deadline;assert.equal((await call(host,{...request('maze-audio-ended',{recording:30}),code:'local-host'})).status,200);assert.equal(state().chapter6.step,'waiting');assert.equal((await call(host,{...request('maze-token-return'),code:'local-host'})).status,200);now=state().chapter6.deadline;await call(progress,{});assert.equal(phaseCues(state().chapter6)[0].number,31);now=state().chapter6.deadline;assert.equal((await call(host,{...request('maze-audio-ended',{recording:31}),code:'local-host'})).status,200);await call(progress,{});assert.equal(state().phase,'chapter7');assert.equal(state().chapter7.step,'blackout');assert.equal(state().chapter7.playbackStartedAt,null);
});
test('missing test prerequisites are built only by the explicit authorized checkpoint',async()=>{
 const s=fresh();s.players=Array.from({length:6},(_,i)=>({id:'p'+i,token:'t'+i,name:'Guest '+i,partnerId:null,ready:false,alive:true,hearts:3,inventory:[],simulated:true}));raw=JSON.stringify(s);assert.equal((await select()).status,200);const next=state();validateChapter6(next);assert.equal(next.phase,'chapter6');assert.equal(next.chapter6.step,'vote');assert.deepEqual(next.chapter6.syntheticResults,[0,1,2,3,4]);assert.equal(next.postMazeCheckpointSource.phase,'lobby');assert.equal(Object.keys(next.chapter6.votes).length,0);
});
test('saved loss, cast, retriever identity and later story records remain intact in private source history',async()=>{
 const s=finalNarrationFixture(now);Object.assign(s.chapter6.results[0],{answer:'red',correct:false,recording:4});s.chapter6.lives=2;const prior=structuredClone(s);validateChapter6(s);s.phase='chapter8';s.chapter8={privateSentinel:'saved finale'};
 makePostMazeTestSelector()(s);validateChapter6(s);assert.deepEqual(s.chapter6.results,prior.chapter6.results);assert.equal(s.chapter6.lives,2);assert.deepEqual(s.chapter5,prior.chapter5);assert.deepEqual(s.postMazeCheckpointSource.chapter6,prior.chapter6);assert.equal(s.postMazeCheckpointSource.chapter8.privateSentinel,'saved finale');assert.equal(s.chapter8,undefined);assert(previousRetrievers(s).has(prior.chapter6.selectedPlayerId));assert(!JSON.stringify(publicState(s)).includes('privateSentinel'));
});
test('partial Maze results are preserved and only missing outcomes are explicitly tagged synthetic',()=>{
 const s=fixture(12);Object.assign(s.chapter6,{results:s.chapter6.results.slice(0,2),game:1,step:'result',phaseAt:now,deadline:now+gate(12),votes:{},voterIds:[],electorateLocked:false});delete s.chapter6.voteVersion;validateChapter6(s);const results=structuredClone(s.chapter6.results);makePostMazeTestSelector()(s);assert.deepEqual(s.chapter6.results.slice(0,2),results);assert.deepEqual(s.chapter6.syntheticResults,[2,3,4]);validateChapter6(s);
});
test('checkpoint CAS retry cannot overwrite a concurrently changed real result',()=>{
 const source=fixture(12),selector=makePostMazeTestSelector(),first=structuredClone(source);selector(first);const newer=structuredClone(source);newer.revision='changed-revision';newer.chapter6.votes={p0:'p1'};assert.throws(()=>selector(newer),/game changed/);assert.deepEqual(newer.chapter6.votes,{p0:'p1'});
});

test('unfinished cast retains finalized assignments and ballots when test prerequisites are completed',()=>{
 const s=fixture(12);delete s.chapter6;s.phase='chapter5-casting';const c=s.chapter5;c.roundIndex=2;c.castStartedAt=null;c.completedAt=null;
 for(let i=2;i<6;i++){Object.assign(c.rounds[i],{votes:{},winnerPlayerId:null,completedAt:null});if(i>2)c.rounds[i].startedAt=null;}
 const original=structuredClone(c);makePostMazeTestSelector()(s);validateChapter6(s);assert.equal(s.chapter6.step,'vote');
 for(let i=0;i<2;i++){assert.equal(s.chapter5.rounds[i].winnerPlayerId,original.rounds[i].winnerPlayerId);assert.deepEqual(s.chapter5.rounds[i].votes,original.rounds[i].votes);}assert.deepEqual(s.postMazeCheckpointSource.chapter5,original);
});
