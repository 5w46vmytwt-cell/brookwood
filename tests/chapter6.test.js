import test,{beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fresh,CAS_SCRIPT,publicState,updateState,resetState} from '../api/_state.js';
import {startChapter6,advanceChapter6,validateChapter6,mazeHostAction,makeMazeTestSelector,makeTokenVoter,touchMazePresence,chapter6Progress,withinMazeRun} from '../api/_chapter6.js';
import {recordings,gate,introDuration,phaseCues,memoryVisible,jumpVisible,games} from '../chapter6-timing.js';
import {mp3Metadata} from './mp3-metadata.js';
import host from '../api/host.js';
import player from '../api/player.js';
import me from '../api/me.js';
import progress from '../api/progress.js';
import chapter6 from '../api/chapter6.js';
let now,raw,held,realDate,realFetch;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
beforeEach(()=>{
 now=10000000;realDate=Date.now;realFetch=global.fetch;Date.now=()=>now;held=null;raw=null;
 process.env.KV_REST_API_URL='https://redis.invalid';process.env.KV_REST_API_TOKEN='test';process.env.HOST_KEY='maze-host';
 global.fetch=async(_url,options)=>{const a=JSON.parse(options.body);let result;
  if(a[0]==='GET')result=raw;
  else if(a[0]==='SET'){raw=a[2];result='OK';}
  else{assert.equal(a[0],'EVAL');assert.equal(a[1],CAS_SCRIPT);if(held){const h=held;held=null;h.entered.resolve();await h.release.promise;}result=(raw??'')===a[4]?1:0;if(result)raw=a[5];}
  return {ok:true,json:async()=>({result})};
 };
});
afterEach(()=>{Date.now=realDate;global.fetch=realFetch;});
function fixture(real=12){
 const s=fresh();s.players=Array.from({length:12},(_,i)=>({id:'p'+i,token:'t'+i,name:'Guest '+i,partnerId:'p'+(i%2?i-1:i+1),ready:true,alive:true,hearts:3,inventory:[],...(i>=real?{simulated:true}:{})}));
 makeMazeTestSelector()(s);validateChapter6(s);return s;
}
function request(s,action,extra={}){return {action,generation:s.generation,chapter6StartedAt:s.chapter6.startedAt,sequence:s.chapter6.sequence,...extra};}
function advance(s){now=s.chapter6.deadline;advanceChapter6(s);validateChapter6(s);}
function answer(s,value){mazeHostAction(s,request(s,'maze-answer',{answer:value}));validateChapter6(s);}
function finish(s){advance(s);if(s.chapter6.step==='zero')advance(s);assert.equal(s.chapter6.step,'transition');advance(s);}
function play(s,values=['black','C','C','B','pass']){
 for(let i=0;i<5;i++){advance(s);if(i===4){advance(s);mazeHostAction(s,request(s,'maze-verdict',{answer:values[i]}));}else answer(s,values[i]);finish(s);}
}
async function call(handler,body={},method='POST',headers={}){let status,data;const responseHeaders={};await handler({method,body,headers},{status(v){status=v;return this;},setHeader(key,value){responseHeaders[key]=value;},json(v){data=v;}});return {status,data,headers:responseHeaders};}

test('all five cinematic transitions wait for full narration, persist once and recover at the exact deadline',()=>{
 const s=fixture();
 for(let game=0;game<5;game++){
  advance(s);if(game===4){advance(s);mazeHostAction(s,request(s,'maze-verdict',{answer:'pass'}));}else answer(s,games[game].correct);
  const resultEnd=s.chapter6.deadline,recording=s.chapter6.results[game].recording;
  assert.equal(resultEnd,s.chapter6.results[game].resolvedAt+gate(recording));
  now=resultEnd-1;advanceChapter6(s);assert.equal(s.chapter6.step,'result');
  now=resultEnd;advanceChapter6(s);validateChapter6(s);assert.equal(s.chapter6.step,'transition');
  assert.equal(s.chapter6.deadline,resultEnd+4000);assert.deepEqual(phaseCues(s.chapter6),[]);
  assert.equal(chapter6Progress(s,'p1').step,'transition');assert.equal(chapter6Progress(s).transitionFrom.step,'result');
  assert.throws(()=>mazeHostAction(s,request(s,'maze-answer',{answer:'A'})));
  const resumed=structuredClone(s),snapshot=JSON.stringify(resumed);
  now=resultEnd+3999;advanceChapter6(resumed);assert.equal(JSON.stringify(resumed),snapshot);
  now=resultEnd+4000;advanceChapter6(resumed);validateChapter6(resumed);
  assert.equal(resumed.chapter6.phaseAt,now);assert.equal(resumed.chapter6.game,Math.min(game+1,4));
  assert.equal(resumed.chapter6.step,game===4?'finale':'intro');
  assert.equal(phaseCues(resumed.chapter6)[0].at,now-resumed.chapter6.startedAt);
  const next=JSON.stringify(resumed);advanceChapter6(resumed);assert.equal(JSON.stringify(resumed),next);
  Object.assign(s,resumed);
 }
});
test('zero-life narration completes before the silent transition and never replays after reconnect',()=>{
 const s=fixture();for(const value of ['red','A']){advance(s);answer(s,value);finish(s);}
 advance(s);answer(s,'A');advance(s);assert.equal(s.chapter6.step,'zero');
 const zeroEnd=s.chapter6.deadline;now=zeroEnd-1;advanceChapter6(s);assert.equal(s.chapter6.step,'zero');
 now=zeroEnd;advanceChapter6(s);assert.equal(s.chapter6.step,'transition');assert.equal(s.chapter6.transitionFrom.step,'zero');
 assert.deepEqual(phaseCues(s.chapter6),[]);const resumed=structuredClone(s);advance(resumed);
 assert.equal(resumed.chapter6.game,3);assert(resumed.chapter6.zeroConsumed);assert(!phaseCues(resumed.chapter6).some(x=>x.number===32));
});
test('host login sets a private cookie without Redis writes; cookie authorizes only Chapter 6 and survives refresh',async()=>{
 const s=fixture();advance(s);raw=JSON.stringify(s);const before=raw;
 const login=await call(host,{action:'maze-login',code:'maze-host'},'POST',{'x-forwarded-proto':'https'});
 assert.equal(login.status,200);assert.equal(raw,before);
 const setCookie=login.headers['Set-Cookie'];assert(setCookie.includes('HttpOnly'));assert(setCookie.includes('SameSite=Strict'));assert(setCookie.includes('Secure'));assert(!setCookie.includes('maze-host.'));
 assert(!JSON.stringify(login.data).includes('maze-host'));const cookie=setCookie.split(';')[0],headers={cookie,host:'brookwood.vercel.app',origin:'https://brookwood.vercel.app'};
 assert.equal((await call(host,{action:'maze-session'},'POST',headers)).status,200);assert.equal(raw,before);
 assert.equal((await call(host,{action:'reset'},'POST',headers)).status,403);assert.equal(raw,before);
 assert.equal((await call(host,{action:'casting-ready'},'POST',headers)).status,403);
 const result=await call(host,request(s,'maze-answer',{answer:'black'}),'POST',headers);assert.equal(result.status,200);
 assert.equal(JSON.parse(raw).chapter6.results.length,1);
 assert.equal((await call(host,{action:'maze-session'},'POST',{...headers,origin:'https://attacker.invalid'})).status,403);
 assert.equal((await call(host,{action:'maze-session'},'POST',{...headers,cookie:cookie+'x'})).status,403);
 now+=12*60*60*1000;assert.equal((await call(host,{action:'maze-session'},'POST',headers)).status,403);
});
test('normal PIN authentication establishes the maze session while old chapter actions still require their PIN',async()=>{
 const login=await call(host,{action:'test-fill',code:'maze-host'});assert.equal(login.status,409);
 const cookie=login.headers['Set-Cookie'].split(';')[0];assert.equal((await call(host,{action:'maze-session'},'POST',{cookie})).status,200);
 assert.equal((await call(host,{action:'start'},'POST',{cookie})).status,403);
 process.env.HOST_KEY='rotated';assert.equal((await call(host,{action:'maze-session'},'POST',{cookie})).status,403);
});
test('all 43 assets and exact MPEG durations match runtime cues',()=>{
 for(const r of recordings){const b=fs.readFileSync('.'+r.src);assert.equal(mp3Metadata(b).durationMs,r.durationMs);}
 const images=['red_door','blue_door','green_door','black_door','red_reveal','blue_reveal','green_reveal','black_reveal','morgue_memory','bridge_background','silence_jumpscare'];
 for(const name of images)assert.equal(fs.readFileSync('assets/chapter6/'+name+'.png').toString('hex',0,8),'89504e470d0a1a0a');
 assert.equal(fs.readdirSync('assets/chapter6/audio').length,32);
});
test('Chapter 5 completion starts once, preserves all chapter results and identities, sequences 1/2/3',()=>{
 const s=fixture();delete s.chapter6;s.phase='chapter5-complete';const prior=structuredClone(s);
 startChapter6(s);assert.deepEqual(s.players,prior.players);assert.deepEqual(s.chapter5,prior.chapter5);assert.deepEqual(s.chapter4,prior.chapter4);assert.equal(s.macheteHolderPlayerId,prior.macheteHolderPlayerId);
 const c=s.chapter6;assert.equal(c.lives,3);assert.equal(c.screamerId,s.chapter5.rounds[0].winnerPlayerId);
 const cues=phaseCues(c);assert.deepEqual(cues.map(x=>x.number),[1,2,3]);assert.equal(cues[0].at,0);assert.equal(cues[1].at,gate(1));assert.equal(cues[2].at,gate(1)+gate(2));assert.equal(c.deadline,c.startedAt+introDuration(0));
 const snapshot=JSON.stringify(s);startChapter6(s);assert.equal(JSON.stringify(s),snapshot);
});
for(const [door,n,correct] of [['red',4,false],['blue',5,false],['green',6,false],['black',7,true]])test('Four Doors '+door+' reveals once with correct life deduction',()=>{
 const s=fixture();advance(s);answer(s,door);assert.equal(s.chapter6.results[0].recording,n);assert.equal(s.chapter6.lives,correct?3:2);assert.equal(s.chapter6.deadline,now+gate(n));assert.throws(()=>answer(s,door));finish(s);assert.equal(s.chapter6.game,1);
});
test('Four Doors timeout has no fabricated door or dialogue and rejects late overwrite',()=>{
 const s=fixture();advance(s);now=s.chapter6.deadline;answer(s,'black');assert.equal(s.chapter6.results[0].answer,null);assert.equal(s.chapter6.results[0].recording,null);assert.equal(s.chapter6.lives,2);assert.deepEqual(phaseCues(s.chapter6),[]);assert.throws(()=>answer(s,'black'));
});
for(const game of [1,2,3])for(const outcome of ['correct','wrong','timeout'])test('Game '+(game+1)+' '+outcome+' locks server answer window',()=>{
 const s=fixture();for(let i=0;i<game;i++){advance(s);answer(s,games[i].correct);finish(s);}const end=s.chapter6.deadline;
 now=end-1;assert.throws(()=>answer(s,games[game].correct));now=end;advanceChapter6(s);assert.equal(s.chapter6.deadline,end+[120000,120000,90000,180000][game]);
 if(outcome==='timeout')advance(s);else answer(s,outcome==='correct'?games[game].correct:'A');
 assert.equal(s.chapter6.results[game].correct,outcome==='correct');assert.equal(s.chapter6.lives,outcome==='correct'?3:2);assert.throws(()=>answer(s,games[game].correct));
});
test('Box Office warnings occur at 60/30 and final measured countdown ending at deadline; resolution cancels them',()=>{
 const s=fixture();advance(s);answer(s,'black');finish(s);advance(s);const cues=phaseCues(s.chapter6),offset=s.chapter6.phaseAt-s.chapter6.startedAt;
 assert.deepEqual(cues.map(x=>x.number),[9,10,11]);assert.equal(cues[0].at-offset,60000);assert.equal(cues[1].at-offset,90000);assert.equal(cues[2].at-offset+Math.ceil(cues[2].durationMs),120000);
 answer(s,'C');assert.deepEqual(phaseCues(s.chapter6).map(x=>x.number),[12]);
});
test('Memory exposure is exactly 15000 ms and never reappears in question/result or refresh',()=>{
 const s=fixture();for(const value of ['black','C']){advance(s);answer(s,value);finish(s);}const c=s.chapter6,start=c.phaseAt+gate(14);
 assert(!memoryVisible(c,start-1));assert(memoryVisible(c,start));assert(memoryVisible(c,start+14999));assert(!memoryVisible(c,start+15000));
 const cues=phaseCues(c);assert.equal(cues[1].at,c.phaseAt-c.startedAt+gate(14)+15000);
 const refreshed=structuredClone(c);assert(!memoryVisible(refreshed,start+15000));advance(s);assert(!memoryVisible(c,now));answer(s,'C');assert(!memoryVisible(c,now));
});
test('Silence cues at 24/17/10 remaining, 500ms jump scare, no verdict before zero or automatic pass',()=>{
 const s=fixture();for(const value of ['black','C','C','B']){advance(s);answer(s,value);finish(s);}advance(s);const c=s.chapter6;
 assert.equal(c.step,'silence');assert.equal(c.deadline-c.phaseAt,30000);const offset=c.phaseAt-c.startedAt;
 assert.deepEqual(phaseCues(c).map(x=>[x.number,x.at-offset,x.type]),[[23,6000,'sfx'],[24,13000,'sfx'],[25,20000,'sfx']]);
 assert(!jumpVisible(c,c.phaseAt+24999));assert(jumpVisible(c,c.phaseAt+25000));assert(jumpVisible(c,c.phaseAt+25499));assert(!jumpVisible(c,c.phaseAt+25500));
 assert.throws(()=>mazeHostAction(s,request(s,'maze-verdict',{answer:'pass'})));advance(s);assert.equal(c.step,'verdict');assert.equal(c.results.length,4);assert.equal(c.deadline,null);
});
test('zero lives plays 32 once after current failure; all five games continue and finale loses',()=>{
 const s=fixture();let zero=0;
 for(let i=0;i<5;i++){advance(s);if(i===4){advance(s);mazeHostAction(s,request(s,'maze-verdict',{answer:'fail'}));}else answer(s,i===0?'red':'A');
  assert.equal(s.chapter6.step,'result');assert(!phaseCues(s.chapter6).some(x=>x.number===32));advance(s);
  if(s.chapter6.step==='zero'){zero++;assert.equal(i,2);assert.equal(phaseCues(s.chapter6)[0].number,32);assert(s.chapter6.zeroConsumed);const reload=structuredClone(s);advance(reload);Object.assign(s,reload);}
  assert.equal(s.chapter6.step,'transition');advance(s);
  assert(s.chapter6.lives>=0);
 }
 assert.equal(zero,1);assert.equal(s.chapter6.results.length,5);assert.equal(s.chapter6.lives,0);assert.equal(phaseCues(s.chapter6)[0].number,29);validateChapter6(s);
});
test('third life lost in Game 5 plays 32 before lose finale; surviving lives choose recording 28',()=>{
 const s=fixture();play(s,['red','A','C','B','fail']);assert.equal(s.chapter6.zeroConsumed,true);assert.equal(s.chapter6.zeroAt,s.chapter6.results[4].resolvedAt+gate(27));assert.equal(phaseCues(s.chapter6)[0].number,29);
 const win=fixture();play(win);assert.equal(win.chapter6.lives,3);assert.equal(phaseCues(win.chapter6)[0].number,28);
});
test('real connected electorate is dynamic; holder may vote but cannot be candidate; ballots remain private',()=>{
 const s=fixture();s.chapter6.testMode=false;play(s);now=s.chapter6.deadline;
 for(const id of ['p0','p1','p2'])touchMazePresence(s,id);advanceChapter6(s);assert.deepEqual(s.chapter6.voterIds,['p0','p1','p2']);
 const vote=makeTokenVoter(()=>0),b=request(s,'token-vote');assert.throws(()=>vote(s,'p1','p0',b));assert.throws(()=>vote(s,'p1','p1',b));vote(s,'p0','p1',b);assert.throws(()=>vote(s,'p0','p2',b));assert.throws(()=>vote(s,'p3','p1',b));
 const pub=JSON.stringify(publicState(s));assert(!pub.includes('"votes"'));assert(!pub.includes('"voterIds"'));assert(!pub.includes('"token"'));assert(!chapter6Progress(s,'p1').candidates.some(p=>p.id==='p0'));
 vote(s,'p1','p2',b);vote(s,'p2','p1',b);assert.equal(s.chapter6.selectedPlayerId,'p1');validateChapter6(s);
});
test('tie resolution uses existing random leader rule and keeps retry decision stable',()=>{
 const s=fixture();play(s);now=s.chapter6.deadline;for(const id of ['p0','p1'])touchMazePresence(s,id);advanceChapter6(s);
 let calls=0;const vote=makeTokenVoter(n=>{calls++;assert.equal(n,2);return 1;}),b=request(s,'token-vote');vote(s,'p0','p1',b);const retry=structuredClone(s);vote(s,'p1','p2',b);vote(retry,'p1','p2',b);assert.equal(calls,1);assert.equal(s.chapter6.selectedPlayerId,'p2');assert.equal(retry.chapter6.selectedPlayerId,'p2');
});
test('selected narration -> indefinite token wait -> host confirmation -> final measured narration -> black complete',()=>{
 const s=fixture();play(s);now=s.chapter6.deadline;touchMazePresence(s,'p0');advanceChapter6(s);makeTokenVoter()(s,'p0','p1',request(s,'token-vote'));
 assert.equal(phaseCues(s.chapter6)[0].number,30);assert.throws(()=>mazeHostAction(s,request(s,'maze-token-return')));advance(s);assert.equal(s.chapter6.step,'waiting');assert.equal(s.chapter6.deadline,null);
 mazeHostAction(s,request(s,'maze-token-return'));assert.equal(phaseCues(s.chapter6)[0].number,31);now=s.chapter6.deadline-1;advanceChapter6(s);assert.equal(s.chapter6.step,'return');
});
test('final completion remains fixed on refresh with no next chapter',()=>{
 const s=fixture();play(s);now=s.chapter6.deadline;touchMazePresence(s,'p0');advanceChapter6(s);makeTokenVoter()(s,'p0','p1',request(s,'token-vote'));advance(s);mazeHostAction(s,request(s,'maze-token-return'));const end=s.chapter6.deadline;
 now=end-1;advanceChapter6(s);assert.equal(s.chapter6.step,'return');now=end;advanceChapter6(s);assert.equal(s.chapter6.step,'complete');assert.equal(s.chapter6.completedAt,end);assert.deepEqual(phaseCues(s.chapter6),[]);const saved=JSON.stringify(s);now+=100000;advanceChapter6(s);assert.equal(JSON.stringify(s),saved);validateChapter6(s);
});
test('host answer/verdict/token actions reject ordinary players, wrong codes, stale generation and sequence',async()=>{
 const s=fixture();raw=JSON.stringify(s);const b=request(s,'maze-answer',{answer:'black'});
 assert.equal((await call(host,b)).status,403);assert.equal((await call(player,{...b,id:'p0',token:'t0'})).status,409);
 assert.equal((await call(host,{...b,code:'maze-host',generation:'old'})).status,409);
 assert.equal((await call(host,{...b,code:'maze-host',sequence:999})).status,409);
 for(const action of ['maze-verdict','maze-token-return'])assert.equal((await call(host,request(s,action))).status,403);
});
test('concurrent host results commit exactly once through Redis CAS',async()=>{
 const s=fixture();advance(s);raw=JSON.stringify(s);const b={...request(s,'maze-answer',{answer:'red'}),code:'maze-host'};
 const responses=await Promise.all([call(host,b),call(host,b),call(host,b)]);assert.equal(responses.filter(x=>x.status===200).length,1);const current=JSON.parse(raw);assert.equal(current.chapter6.lives,2);assert.equal(current.chapter6.results.length,1);validateChapter6(current);
});
test('reset fences a paused host CAS write, including authorization with reused token',async()=>{
 const s=fixture();advance(s);raw=JSON.stringify(s);const h=held={entered:deferred(),release:deferred()};const work=call(host,{...request(s,'maze-answer',{answer:'red'}),code:'maze-host'});await h.entered.promise;await resetState();const after=raw;h.release.resolve();assert.equal((await work).status,409);assert.equal(raw,after);
});
test('Chapter 6 start is fixed-purpose, POST-only, preserves existing completion on ordinary progress',async()=>{
 const s=fixture();delete s.chapter6;s.phase='chapter5-complete';raw=JSON.stringify(s);const prior=raw;assert.equal((await call(progress,{phase:'chapter6'})).status,200);assert.equal(raw,prior);
 assert.equal((await call(chapter6,{},'GET')).status,405);assert.equal((await call(chapter6,{lives:99,startedAt:2})).status,200);assert.equal(JSON.parse(raw).chapter6.lives,3);const saved=raw;assert.equal((await call(chapter6)).status,200);assert.equal(raw,saved);
});
test('authenticated phone reconnect refreshes presence, not timers/outcomes, and rejects old sessions',async()=>{
 const s=fixture(2);raw=JSON.stringify(s);const first=await call(me,{id:'p1',token:'t1'});assert.equal(first.status,200);assert.equal(first.data.chapter6.startedAt,s.chapter6.startedAt);assert.equal(first.data.chapter6.deadline,s.chapter6.deadline);const saved=raw;await call(me,{id:'p1',token:'t1'});assert.equal(raw,saved);assert.equal((await call(me,{id:'p1',token:'wrong'})).status,401);
});
test('host-only test selector supports two real phones and simulated voting explicitly',async()=>{
 const s=fixture(2);play(s);now=s.chapter6.deadline;touchMazePresence(s,'p0');touchMazePresence(s,'p1');advanceChapter6(s);raw=JSON.stringify(s);
 const b=request(s,'maze-test-vote');assert.equal((await call(host,b)).status,403);assert.equal((await call(host,{...b,code:'maze-host'})).status,200);const current=JSON.parse(raw);assert.equal(Object.keys(current.chapter6.votes).length,10);assert.equal(current.chapter6.voterIds.length,12);
 assert.equal((await call(player,{...request(current,'token-vote'),id:'p2',token:'t2',targetId:'p1'})).status,403);
 for(const id of ['p0','p1'])assert.equal((await call(player,{...request(current,'token-vote'),id,token:'t'+id.slice(1),targetId:'p3'})).status,200);
 assert.equal(JSON.parse(raw).chapter6.step,'selected');assert.deepEqual(JSON.parse(raw).players,s.players);
});
test('corrupt life count, votes, retriever and phase are rejected without repairing state',async()=>{
 for(const corrupt of [s=>s.chapter6.lives=2,s=>s.chapter6.step='unknown',s=>s.chapter6.selectedPlayerId='p0',s=>s.chapter6.votes.p1='p0']){
  const s=fixture();corrupt(s);raw=JSON.stringify(s);const saved=raw;assert.equal((await call(progress)).status,503);assert.equal(raw,saved);
 }
});
test('host navigation leaves the maze cleanly and reinitializes Chapter 6 prerequisites, cast and clocks',async()=>{
 const s=fixture(2);advance(s);answer(s,'red');raw=JSON.stringify(s);const oldGeneration=s.generation,players=structuredClone(s.players);
 const leave=await call(host,{action:'chapter-select',checkpoint:'chapter1',code:'maze-host'});
 assert.equal(leave.status,200);assert.equal(leave.data.state.phase,'opening');
 const earlier=JSON.parse(raw);assert(!earlier.chapter6);assert.notEqual(earlier.generation,oldGeneration);assert.deepEqual(earlier.players,players);
 const enter=await call(host,{action:'chapter-select',checkpoint:'chapter6',code:'maze-host'});assert.equal(enter.status,200);
 const maze=JSON.parse(raw);validateChapter6(maze);assert.equal(maze.chapter6.lives,3);assert.equal(maze.chapter6.step,'intro');assert.equal(maze.chapter6.results.length,0);
 assert.equal(maze.chapter6.deadline,maze.chapter6.startedAt+introDuration(0));assert.equal(maze.chapter6.screamerId,maze.chapter5.rounds[0].winnerPlayerId);assert.equal(maze.chapter6.macheteId,maze.chapter4.selectedPlayerId);
 assert.deepEqual(maze.players,players);assert.notEqual(maze.generation,earlier.generation);assert.equal(enter.data.state.chapter6.startedAt,maze.chapter6.startedAt);
 const refreshed=await call(me,{id:'p1',token:'t1'});assert.equal(refreshed.data.chapter6.startedAt,maze.chapter6.startedAt);assert.equal(refreshed.data.chapter6.lives,3);
});
test('chapter navigation requires the existing host PIN and twelve-player test cast; maze session cannot grant access',async()=>{
 const s=fixture();raw=JSON.stringify(s);const saved=raw;
 assert.equal((await call(host,{action:'chapter-select',checkpoint:'chapter1',id:'p0',token:'t0'})).status,403);
 const login=await call(host,{action:'maze-login',code:'maze-host'}),cookie=login.headers['Set-Cookie'].split(';')[0];
 assert.equal((await call(host,{action:'chapter-select',checkpoint:'chapter6'},'POST',{cookie})).status,403);assert.equal(raw,saved);
 const lobby=fresh();lobby.players=s.players.slice(0,2);raw=JSON.stringify(lobby);const prior=raw;
 assert.equal((await call(host,{action:'chapter-select',checkpoint:'chapter6',code:'maze-host'})).status,409);assert.equal(raw,prior);
});
test('chapter navigation fences an in-flight maze answer CAS and old generation requests cannot affect the fresh run',async()=>{
 const s=fixture();advance(s);raw=JSON.stringify(s);const h=held={entered:deferred(),release:deferred()};
 const body={...request(s,'maze-answer',{answer:'red'}),code:'maze-host'},pending=call(host,body);await h.entered.promise;
 const jump=await call(host,{action:'chapter-select',checkpoint:'chapter6',code:'maze-host'});assert.equal(jump.status,200);
 const after=raw;h.release.resolve();assert.equal((await pending).status,409);assert.equal(raw,after);
 assert.equal((await call(host,body)).status,409);assert.equal(raw,after);assert.equal(JSON.parse(raw).chapter6.lives,3);
});
