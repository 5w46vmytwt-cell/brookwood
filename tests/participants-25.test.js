import test,{beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {CAS_SCRIPT,publicState} from '../api/_state.js';
import join from '../api/join.js';
import host from '../api/host.js';
import me from '../api/me.js';
import player from '../api/player.js';
import progress from '../api/progress.js';
import chapter3 from '../api/chapter3.js';
let raw,now,originalFetch,originalNow;
beforeEach(()=>{
 raw=null;now=10000000;originalFetch=global.fetch;originalNow=Date.now;Date.now=()=>now;
 process.env.KV_REST_API_URL='https://redis.invalid';process.env.KV_REST_API_TOKEN='isolated';process.env.HOST_KEY='local-host';
 global.fetch=async(url,options)=>{assert.equal(url,'https://redis.invalid');const a=JSON.parse(options.body);let result;
  if(a[0]==='GET')result=raw;else if(a[0]==='SET'){raw=a[2];result='OK';}else{assert.equal(a[1],CAS_SCRIPT);result=(raw??'')===a[4]?1:0;if(result)raw=a[5];}
  return {ok:true,json:async()=>({result})};};
});
afterEach(()=>{global.fetch=originalFetch;Date.now=originalNow;});
const saved=()=>JSON.parse(raw);
async function call(handler,body={},cookie){let status,data,headers={};await handler({method:'POST',body,headers:cookie?{cookie}:{}},{status(n){status=n;return this;},setHeader(k,v){headers[k]=v;},json(j){data=j;return j;}});return {status,data,headers};}
async function guests(n){const players=[];for(let i=0;i<n;i++){const r=await call(join,{name:'Independent '+i});assert.equal(r.status,200);players.push(r.data.player);}return players;}

import {messageTemplates,createAssignments} from '../api/_chapter3-messages.js';

import {randomUUID} from 'node:crypto';
import {getState,fresh} from '../api/_state.js';
import {makeCastingVoter,castingCandidates,castingVoterIds,validateChapter5,chapter5Progress} from '../api/_chapter5.js';
import {chapter5IntroDuration,CHAPTER5_RULES_MS} from '../chapter5-audio-timing.js';
import {castingVotingOffset,castingCompletionMs,castingFinaleMs} from '../chapter5-timing.js';
import {CHAPTER4_VOTING_MS} from '../chapter4-timing.js';
import maze from '../api/chapter6.js';
import {phaseCues,games} from '../chapter6-timing.js';
import {validateChapter6} from '../api/_chapter6.js';
import {finaleCue} from '../chapter8-finale-timing.js';
import {storyRecording,narrationDuration} from '../chapter7-story-timing.js';
import {narrationFor} from '../chapter8-puzzle.js';
import {BLACKOUT_MS,BROADCAST_DURATION_MS,BROADCAST_FADE_MS} from '../chapter7-timing.js';
import {previousRetrievers} from '../api/_chapter7-story.js';
const ok=async(handler,b={})=>{const r=await call(handler,b);assert.equal(r.status,200,JSON.stringify({request:b,error:r.data}));return r.data;};
const h=async(action,b={})=>ok(host,{action,code:'local-host',...b});
async function fill(n,extra={}){const s=await getState();return h('test-fill',{count:n,generation:s.generation,requestId:randomUUID(),...extra});}
function reqMaze(action,extra={}){const s=saved();return {action,generation:s.generation,chapter6StartedAt:s.chapter6.startedAt,sequence:s.chapter6.sequence,...extra};}
async function mazeAdvance(){const c=saved().chapter6;assert(c.deadline!==null,'No deadline for '+c.step);now=c.deadline;const cue=phaseCues(c)[0];if(c.audioVersion===2&&cue&&['intro','result','zero','finale','selected','return'].includes(c.step))await h('maze-audio-ended',reqMaze('maze-audio-ended',{recording:cue.number}));else await ok(progress);}
async function runScenario(realCount,simCount){
 const real=await guests(realCount);if(simCount)await fill(simCount);const initial=saved(),n=realCount+simCount;
 assert.equal(initial.players.length,n);assert.equal(new Set(initial.players.map(p=>p.id)).size,n);assert.equal(new Set(initial.players.map(p=>p.token)).size,n);assert.equal(new Set(initial.players.map(p=>p.name.toLowerCase())).size,n);
 assert.deepEqual(initial.players.slice(0,realCount),real.map(p=>initial.players.find(q=>q.id===p.id)));
 await h('lock-room');await h('start');const start=saved().startedAt;await h('start');assert.equal(saved().startedAt,start);for(const p of real)assert.equal((await call(me,p)).status,200);
 now+=200000;await ok(progress);const s=saved();await h('photo-taken',{generation:s.generation,startedAt:s.startedAt});await ok(chapter3);const assignments=saved().chapter3.assignments;
 assert.equal(Object.keys(assignments).length,n);assert.equal(new Set(Object.values(assignments).map(a=>a.templateId)).size,n);if(n===25)assert.deepEqual(new Set(Object.values(assignments).map(a=>a.templateId)),new Set(messageTemplates.map(t=>t.id)));
 await ok(chapter3);assert.deepEqual(saved().chapter3.assignments,assignments);now+=13000;await ok(progress);
 for(const p of real){await ok(player,{...p,action:'message-open'});const own=await ok(me,p);assert.equal(own.chapter3.assignment.body,assignments[p.id].body);await ok(player,{...p,action:'message-read'});}
 if(simCount)await h('test-read-simulated');assert.equal(saved().phase,'private-messages-complete');assert(!JSON.stringify(publicState(saved())).includes(Object.values(assignments)[0].body));
 now+=100000;await ok(progress);assert.equal(saved().phase,'chapter4-opening');now=saved().chapter4.startedAt+CHAPTER4_VOTING_MS;await ok(progress);
 if(simCount)await h('test-vote-simulated',{chapter4StartedAt:saved().chapter4.startedAt});
 for(const p of real)await ok(player,{...p,action:'door-vote',chapter4StartedAt:saved().chapter4.startedAt,targetId:saved().players.find(q=>q.id!==p.id).id});
 assert.equal(saved().phase,'door-vote-complete');const holder=saved().players.find(p=>p.id===saved().chapter4.selectedPlayerId);await ok(player,{...holder,action:'package-open',chapter4StartedAt:saved().chapter4.startedAt});
 now=saved().chapter5.startedAt+chapter5IntroDuration(saved().chapter5);await ok(progress);assert.equal(saved().phase,'chapter5-waiting');await h('casting-ready',{chapter5StartedAt:saved().chapter5.startedAt});now=saved().chapter5.rulesStartedAt+CHAPTER5_RULES_MS;await ok(progress);
 for(let round=0;round<6;round++){
  let s=saved(),c=s.chapter5,r=c.rounds[c.roundIndex];assert.equal(c.roundIndex,round);now=r.startedAt+castingVotingOffset(r.id,1);
  const voters=castingVoterIds(s);if(n===6&&round===5){assert.equal(voters.length,5);const excluded=s.players.find(p=>!voters.includes(p.id)),view=chapter5Progress(s,excluded.id);assert.equal(view.round.canVote,false);assert.equal(view.blockedReason,'');}
  const eligibleSim=s.players.filter(p=>p.simulated&&voters.includes(p.id));if(eligibleSim.length)await h('test-cast-simulated',{chapter5StartedAt:c.startedAt,roleId:r.id});
  for(const p of real.filter(p=>voters.includes(p.id)))await ok(player,{...p,action:'casting-vote',chapter5StartedAt:c.startedAt,roleId:r.id,targetId:castingCandidates(saved()).find(q=>q.id!==p.id).id});
  s=saved();validateChapter5(s);r=s.chapter5.rounds[round];assert(r.completedAt);assert.equal(Object.keys(r.votes).length,voters.length);assert(Object.entries(r.votes).every(([a,b])=>a!==b));now=r.completedAt+castingCompletionMs(r.id,1);await ok(progress);
 }
 assert.equal(saved().phase,'chapter5-finale');assert.equal(new Set(saved().chapter5.rounds.map(r=>r.winnerPlayerId)).size,6);now=saved().chapter5.castStartedAt+castingFinaleMs(1,1);await ok(progress);await ok(maze);
 for(let game=0;game<5;game++){
  for(let guard=0;!['game-ready','memory-ready','silence-ready'].includes(saved().chapter6.step);guard++){assert(guard<30);if(saved().chapter6.step==='ready')await h('maze-start-games',reqMaze('maze-start-games'));else await mazeAdvance();}
  assert.equal(saved().chapter6.game,game);const action=game===2?'maze-show-image':game===4?'maze-begin-silence':'maze-start-games';await h(action,reqMaze(action));
  if(game===2){await h('maze-image-ready',reqMaze('maze-image-ready'));for(let guard=0;saved().chapter6.step!=='answer';guard++){assert(guard<10);await mazeAdvance();}}
  if(game===4){await mazeAdvance();await h('maze-verdict',reqMaze('maze-verdict',{answer:'pass'}));}else await h('maze-answer',reqMaze('maze-answer',{answer:games[game].correct}));
 }
 for(let guard=0;saved().chapter6.step!=='vote';guard++){assert(guard<30);await mazeAdvance();}
 assert.equal(saved().chapter6.lives,3);if(simCount)await h('maze-test-vote',reqMaze('maze-test-vote'));
 for(const p of real){const s=saved(),target=s.players.find(q=>q.id!==p.id&&q.id!==s.macheteHolderPlayerId);await ok(player,{...p,action:'token-vote',targetId:target.id,...reqMaze('token-vote')});}
 assert.equal(saved().chapter6.step,'selected');assert.notEqual(saved().chapter6.selectedPlayerId,saved().macheteHolderPlayerId);
 await mazeAdvance();await h('maze-token-return',reqMaze('maze-token-return'));for(let guard=0;saved().phase==='chapter6'&&saved().chapter6.step!=='complete';guard++){assert(guard<10);await mazeAdvance();}
 assert.equal(saved().chapter6.step,'complete');await ok(progress);assert.equal(saved().phase,'chapter7');
 const broadcast=()=>({generation:saved().generation,broadcastId:saved().chapter7.id});now=saved().chapter7.startedAt+BLACKOUT_MS;await h('broadcast-playing',broadcast());now+=BROADCAST_DURATION_MS;await h('broadcast-ended',broadcast());now+=BROADCAST_FADE_MS;await ok(progress);
 const reqInvest=()=>{const s=saved(),i=s.chapter7.investigation;return {generation:s.generation,broadcastId:s.chapter7.id,investigationId:i.id,sequence:i.sequence};};
 for(let guard=0;saved().phase==='chapter7';guard++){
  assert(guard<80);let s=saved(),i=s.chapter7.investigation;
  if(i.step==='complete'){await ok(progress);continue;}
  if(i.step==='envelope-vote'){
   const e=(i.testMode?i.testElections:i.elections).envelope,base={...reqInvest(),election:'envelope',electionId:e.id};assert.equal(e.voterIds.length,n);assert(e.candidateIds.every(id=>!previousRetrievers(s).has(id)));
   const target=e.candidateIds[0];if(simCount)await h('investigation-test-vote',{...base,votes:Object.fromEntries(s.players.filter(p=>p.simulated).map(p=>[p.id,target]))});
   for(const p of real)await ok(player,{...p,action:'investigation-vote',...base,targetId:target});continue;
  }
  if(i.step==='envelope-waiting'){await h('investigation-envelope-return',reqInvest());continue;}
  const cue=storyRecording(i.step,i);if(cue){await h('investigation-audio-playing',{...reqInvest(),recording:cue.id});now+=narrationDuration(i)-i.offsetMs;await h('investigation-audio-ended',{...reqInvest(),recording:cue.id});}
  else{assert(i.deadline!==null,'No investigation gate: '+i.step);now=i.deadline;await ok(progress);}
 }
 assert.equal(saved().phase,'chapter8');
 const req8=()=>{const s=saved(),c=s.chapter8;return {generation:s.generation,chapter8Id:c.id,sequence:c.sequence};};
 for(let guard=0;saved().chapter8.step!=='complete';guard++){
  assert(guard<150);const c=saved().chapter8;
  if(c.step==='puzzle'){for(let clueId=1;clueId<=17;clueId++)await h('chapter8-reveal',{...req8(),clueId});await h('chapter8-continue',req8());continue;}
  if(c.step==='leaving'){now=c.deadline;await ok(progress);continue;}
  if(c.step==='finale'){
   const cue=finaleCue(c),extra=()=>({...req8(),finaleId:saved().chapter8.finale.id,cueId:cue.id});
   if(cue.kind==='hold'){if(c.finale.deadline===null)await h('chapter8-finale-ready',extra());now=saved().chapter8.finale.deadline;await ok(progress);}
   else{await h('chapter8-finale-playing',extra());now+=cue.durationMs;await h('chapter8-finale-ended',extra());}continue;
  }
  const cue=narrationFor(c.step,c);assert(cue,c.step);await h('chapter8-audio-playing',{...req8(),recording:cue.id});now+=cue.durationMs;await h('chapter8-audio-ended',{...req8(),recording:cue.id});
 }
 assert.equal(saved().players.length,n);for(const p of real)assert.equal((await call(me,p)).status,200);return {n,winners:saved().chapter5.rounds.map(r=>r.winnerPlayerId)};
}
for(const [realCount,simCount] of [[0,6],[2,4],[6,0],[2,10],[2,18],[2,23],[0,25]])test('complete affected stages: '+realCount+' real + '+simCount+' simulated',async()=>{await runScenario(realCount,simCount);});
test('minimum start is six, additive fill preserves existing identities, requests deduplicate and reset fences old fills',async()=>{
 await fill(3);await fill(2);const first=saved();await h('lock-room');assert.equal((await call(host,{action:'start',code:'local-host'})).status,409);assert.equal(saved().phase,'lobby');
 await h('reset');await fill(5);const before=saved().players;const generation=saved().generation,id=randomUUID();await fill(3,{generation,requestId:id});assert.equal(saved().players.length,8);assert.deepEqual(saved().players.slice(0,5),before);await fill(3,{generation,requestId:id});assert.equal(saved().players.length,8);
 await h('reset');assert.equal((await call(host,{action:'test-fill',count:3,generation,requestId:id,code:'local-host'})).status,409);await fill(25);assert.equal(saved().players.length,25);assert.equal((await call(join,{name:'Twenty six'})).status,409);
});
test('concurrent real joins and additive batches cannot exceed 25; unauthorized, invalid and locked fills are rejected',async()=>{
 await fill(22);const s=saved(),body={action:'test-fill',count:2,generation:s.generation,requestId:randomUUID()};assert.equal((await call(host,body)).status,403);
 const results=await Promise.all([call(host,{...body,code:'local-host'}),...Array.from({length:8},(_,i)=>call(join,{name:'Concurrent '+i}))]);assert(saved().players.length<=25);assert.equal(saved().players.length,25);assert.equal(new Set(saved().players.map(p=>p.id)).size,25);
 assert(results.some(r=>r.status===409));for(const count of [0,-1,26,2.5,'3'])assert.equal((await call(host,{...body,count,code:'local-host'})).status,400);
 await h('lock-room');assert.equal((await call(host,{...body,code:'local-host'})).status,409);
});

test('existing message bodies survive the pool refresh and real names reserved for simulations are preserved',async()=>{
 const real=(await ok(join,{name:'Test 1A'})).player;await fill(5);assert.equal(saved().players.length,6);assert.equal(new Set(saved().players.map(p=>p.name.toLowerCase())).size,6);assert.equal(saved().players.find(p=>p.id===real.id).token,real.token);
 await h('lock-room');await h('start');now+=200000;await ok(progress);await h('photo-taken',{generation:saved().generation,startedAt:saved().startedAt});await ok(chapter3);
 const legacy=saved();legacy.chapter3.assignments[real.id].body='Do not tell your partner what this message says. Even if they ask.';raw=JSON.stringify(legacy);await ok(chapter3);assert.equal(saved().chapter3.assignments[real.id].body,legacy.chapter3.assignments[real.id].body);
 now+=13000;await ok(progress);await ok(player,{...real,action:'message-open'});assert.equal((await ok(me,real)).chapter3.assignment.body,legacy.chapter3.assignments[real.id].body);
 assert.equal((await call(me,{id:saved().players[1].id,token:real.token})).status,401);assert.equal(messageTemplates.length,25);assert.equal(new Set(messageTemplates.map(m=>m.body)).size,25);
});
test('simultaneous replay of one fill operation creates only one additive batch',async()=>{
 const generation=(await getState()).generation,body={action:'test-fill',code:'local-host',count:6,generation,requestId:randomUUID()};const results=await Promise.all([call(host,body),call(host,body),call(host,body)]);assert(results.every(r=>r.status===200));assert.equal(saved().players.length,6);assert.equal(new Set(saved().players.map(p=>p.id)).size,6);
});

import {makeMazeTestSelector} from '../api/_chapter6.js';

test('unfinished legacy six-person cast recovers once without rewriting recorded votes, roles or narration clocks',async()=>{
 for(const ballotCount of [0,5]){const s=fresh();s.players=Array.from({length:6},(_,i)=>({id:'p'+i,token:'t'+i,name:'Guest '+i,partnerId:null,ready:false,alive:true,hearts:3,inventory:[]}));makeMazeTestSelector()(s);delete s.chapter6;s.phase='chapter5-casting';const c=s.chapter5;c.eligibilityVersion=1;c.castStartedAt=null;c.completedAt=null;const r=c.rounds[5];r.startedAt=now-castingVotingOffset(r.id,1);r.completedAt=null;r.winnerPlayerId=null;r.votes=Object.fromEntries(s.players.slice(0,ballotCount).map(p=>[p.id,'p5']));validateChapter5(s);
  const previous=structuredClone(c),votes=structuredClone(r.votes);raw=JSON.stringify(s);assert(publicState(s).chapter5.needsEligibilityRecovery);await ok(progress);const after=saved();assert.equal(after.chapter5.eligibilityVersion,2);assert.deepEqual(after.chapter5.rounds.slice(0,5),previous.rounds.slice(0,5));assert.deepEqual(after.chapter5.rounds[5].votes,votes);assert.equal(after.chapter5.rounds[5].startedAt,previous.rounds[5].startedAt);assert.equal(after.chapter5.startedAt,previous.startedAt);validateChapter5(after);
  if(ballotCount===5){assert.equal(after.chapter5.rounds[5].winnerPlayerId,'p5');const at=after.chapter5.rounds[5].completedAt;await ok(progress);assert.equal(saved().chapter5.rounds[5].completedAt,at);}else assert.equal(after.chapter5.rounds[5].completedAt,null);
 }
});
