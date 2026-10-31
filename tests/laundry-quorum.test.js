import test,{beforeEach,afterEach} from 'node:test';import assert from 'node:assert/strict';
import {fresh,CAS_SCRIPT,publicState} from '../api/_state.js';
import {makeMazeTestSelector,advanceChapter6,validateChapter6,touchMazePresence} from '../api/_chapter6.js';
import {games,resultRecording,gate} from '../chapter6-timing.js';
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
for(const n of [6,12,20,25])test(n+' registered real voters: first through penultimate ballot never reveal a result',async()=>{
 fixture(n);assert.equal(state().chapter6.voterIds.length,n);assert.equal(state().chapter6.voteVersion,3);
 for(let i=0;i<n;i++){const r=await ballot(i);assert.equal(r.status,200);const s=state();validateChapter6(s);assert.equal(Object.keys(s.chapter6.votes).length,i+1);
  if(i<n-1){assert.equal(s.chapter6.step,'vote');assert.equal(s.chapter6.selectedPlayerId,null);assert.equal(publicState(s).chapter6.selectedPlayer,null);}
  if(i===0){const snapshot=raw;assert.equal((await ballot(i)).status,200);assert.equal(raw,snapshot);await call(me,{id:'p0',token:'t0'});assert.equal(state().chapter6.voterIds.length,n);}
 }
 assert.equal(state().chapter6.step,'selected');const winner=state().chapter6.selectedPlayerId,final=raw;assert.equal((await ballot(0)).status,200);assert.equal(raw,final);assert.equal((await ballot(0,'p2')).status,409);assert.equal(state().chapter6.selectedPlayerId,winner);
});
test('legacy open one-phone electorate expands without losing votes; finalized legacy result remains intact',async()=>{
 fixture(12);let s=state();Object.assign(s.chapter6,{voteVersion:2,voterIds:['p0'],votes:{p0:'p1'}});raw=JSON.stringify(s);assert.equal((await call(me,{id:'p1',token:'t1'})).status,200);assert.equal(state().chapter6.voterIds.length,12);assert.deepEqual(state().chapter6.votes,{p0:'p1'});assert.equal(state().chapter6.step,'vote');
 for(let i=1;i<12;i++)assert.equal((await ballot(i)).status,200);assert.equal(state().chapter6.step,'selected');
 s=state();s.chapter6.voteVersion=2;s.chapter6.voterIds=['p0'];s.chapter6.votes={p0:'p1'};s.chapter6.selectedPlayerId='p1';raw=JSON.stringify(s);await call(me,{id:'p2',token:'t2'});assert.equal(state().chapter6.selectedPlayerId,'p1');assert.deepEqual(state().chapter6.voterIds,['p0']);
});
test('mixed simulation waits for both real phones, preserves first ballot and allows additive host test voting',async()=>{
 fixture(12,2);assert.equal((await ballot(0)).status,200);assert.equal(state().chapter6.step,'vote');const first=state().chapter6.votes.p0;
 assert.equal((await call(host,{...request('maze-test-vote'),code:'local-host'})).status,200);assert.equal(state().chapter6.voterIds.length,12);assert.equal(Object.keys(state().chapter6.votes).length,11);assert.equal(state().chapter6.votes.p0,first);assert.equal(state().chapter6.step,'vote');
 const votes=structuredClone(state().chapter6.votes);await call(host,{...request('maze-test-vote'),code:'local-host'});assert.deepEqual(state().chapter6.votes,votes);assert.equal((await ballot(1)).status,200);assert.equal(state().chapter6.step,'selected');
});
test('25 simultaneous real ballots complete only at the full quorum, while explicit host override remains authenticated',async()=>{
 fixture(25);const replies=await Promise.all(Array.from({length:25},(_,i)=>ballot(i)));assert(replies.every(r=>r.status===200));assert.equal(Object.keys(state().chapter6.votes).length,25);assert(writes.filter(s=>s.chapter6.step==='selected').every(s=>Object.keys(s.chapter6.votes).length===25));
 fixture(6);await ballot(0);assert.equal((await call(host,request('maze-close-voting'))).status,403);assert.equal(state().chapter6.step,'vote');assert.equal((await call(host,{...request('maze-close-voting'),code:'local-host'})).status,200);assert.equal(state().chapter6.step,'selected');assert.equal(state().chapter6.voteClosedAt,now);
});
test('all-simulated voting uses every persisted simulated participant',async()=>{
 fixture(25,0);assert.equal(state().chapter6.voterIds.length,25);assert.equal((await call(host,{...request('maze-test-vote'),code:'local-host'})).status,200);assert.equal(state().chapter6.step,'selected');assert.equal(Object.keys(state().chapter6.votes).length,25);
});
