import test,{beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fresh,CAS_SCRIPT,publicState} from '../api/_state.js';
import join from '../api/join.js';
import host from '../api/host.js';
import me from '../api/me.js';
import player from '../api/player.js';
import progress from '../api/progress.js';
import chapter3 from '../api/chapter3.js';
import {makeMazeTestSelector,mazeHostAction,advanceChapter6,validateChapter6} from '../api/_chapter6.js';
import {phaseCues,answerWindows} from '../chapter6-timing.js';
import {polishedFinaleTimeline} from '../chapter5.js';
import {makeCastingVoter,makeCastingTestSelector,advanceCasting,confirmCastingReady,castingCandidates,validateChapter5,chapter5Progress} from '../api/_chapter5.js';
import {chapter5IntroDuration,CHAPTER5_RULES_MS,roleVotingOffset} from '../chapter5-audio-timing.js';
import {castingCompletionMs} from '../chapter5-timing.js';
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
test('independent odd/even lobbies, capacity CAS, persisted lock, host start and token recovery',async()=>{
 const players=await guests(19);const attempts=await Promise.all(Array.from({length:8},(_,i)=>call(join,{name:'Concurrent '+i})));
 assert.equal(attempts.filter(r=>r.status===200).length,1);assert.equal(saved().players.length,20);
 assert(attempts.filter(r=>r.status!==200).every(r=>r.data.error==='THIS ROOM IS FULL'));
 assert.equal((await call(host,{action:'lock-room'})).status,403);
 const auth=await call(host,{action:'maze-login',code:'local-host'});const cookie=auth.headers['Set-Cookie'].split(';')[0];
 assert.equal((await call(host,{action:'start'},cookie)).status,409);
 assert.equal((await call(host,{action:'lock-room'},cookie)).status,200);assert(saved().roomLocked);
 const revision=saved().revision;await call(host,{action:'lock-room'},cookie);assert.equal(saved().revision,revision);
 assert.equal((await call(join,{name:'Late guest'})).data.error,'THIS ROOM IS LOCKED');
 assert.equal((await call(me,players[0])).status,200);
 assert.equal((await call(host,{action:'start'},cookie)).status,200);const start=saved().startedAt;
 await call(host,{action:'start'},cookie);assert.equal(saved().startedAt,start);
 now+=200000;assert.equal((await call(progress)).status,200);assert.equal(saved().phase,'photo');
 for(const p of saved().players)assert.equal((await call(player,{...p,action:'photo-confirm'})).status,200);
 assert.equal(saved().phase,'photo-complete');assert.equal((await call(chapter3)).status,200);
 assert.equal(Object.keys(saved().chapter3.assignments).length,20);
 for(const a of Object.values(saved().chapter3.assignments))assert(!a.body.includes('{'));
});
test('one or odd participant lobby can lock and start without partners or ready',async()=>{
 for(const count of [1,3,12]){raw=null;await guests(count);assert.equal((await call(host,{action:'lock-room',code:'local-host'})).status,200);assert.equal((await call(host,{action:'start',code:'local-host'})).status,200);assert(saved().players.every(p=>!p.partnerId&&!p.ready));}
});
test('two real phones plus ten independent simulations retain tokens until explicit reset',async()=>{
 const real=await guests(2);assert.equal((await call(host,{action:'test-fill',code:'local-host'})).status,200);
 assert.equal(saved().players.length,12);assert.equal(saved().players.filter(p=>p.simulated).length,10);assert(saved().players.every(p=>!p.partnerId));
 assert.equal((await call(me,real[0])).status,200);await call(host,{action:'reset',code:'local-host'});assert.equal((await call(me,real[0])).status,401);
});
function fixture(){const s=fresh();s.players=Array.from({length:12},(_,i)=>({id:'p'+i,token:'t'+i,name:'Independent '+i,partnerId:null,ready:false,alive:true,hearts:3,inventory:[]}));makeMazeTestSelector()(s);return s;}
const request=(s,action,extra={})=>({action,generation:s.generation,chapter6StartedAt:s.chapter6.startedAt,sequence:s.chapter6.sequence,...extra});
function advance(s){now=s.chapter6.deadline;const cue=phaseCues(s.chapter6)[0];if(cue&&['intro','result','zero','finale','selected','return'].includes(s.chapter6.step))mazeHostAction(s,request(s,'maze-audio-ended',{recording:cue.number}),now);else advanceChapter6(s,now);validateChapter6(s);}
test('all five host starts are persisted, fenced and preserve authoritative game durations',async()=>{
 const s=fixture();validateChapter6(s);
 for(let game=0;game<5;game++){
  for(let guard=0;!['game-ready','memory-ready','silence-ready'].includes(s.chapter6.step);guard++){
   assert(guard<15);if(s.chapter6.step==='ready'){mazeHostAction(s,request(s,'maze-start-games'),now);continue;}advance(s);
  }
  assert.equal(s.chapter6.game,game);assert.equal(s.chapter6.deadline,null);const snapshot=JSON.stringify(s.chapter6);advanceChapter6(s,now+999999);assert.equal(JSON.stringify(s.chapter6),snapshot);
  raw=JSON.stringify(s);assert.equal((await call(host,request(s,'maze-start-games'))).status,403);
  const action=game===2?'maze-show-image':game===4?'maze-begin-silence':'maze-start-games',body=request(s,action);
  mazeHostAction(s,body,now);const phase=s.chapter6.phaseAt;assert.throws(()=>mazeHostAction(s,body,now+5000));
  if(game===2){mazeHostAction(s,request(s,'maze-image-ready'),now);assert.equal(s.chapter6.deadline-s.chapter6.phaseAt,30000);advance(s);advance(s);}
  assert.equal(s.chapter6.deadline-s.chapter6.phaseAt,answerWindows[game]);validateChapter6(s);
  const copy=structuredClone(s);assert.equal(copy.chapter6.deadline,s.chapter6.deadline);if(game!==2)assert.equal(s.chapter6.phaseAt,phase);
  if(game===4){advance(s);mazeHostAction(s,request(s,'maze-verdict',{answer:'pass'}),now);}else mazeHostAction(s,request(s,'maze-answer',{answer:['black','C','C','B'][game]}),now);
  for(let guard=0;s.chapter6.game===game&&game<4;guard++){assert(guard<10);advance(s);}
 }
 assert.equal(s.chapter6.lives,3);
});
test('new transition adds exactly 2s fully visible per beat and keeps legacy saved timing',()=>{
 const old=polishedFinaleTimeline(),next=polishedFinaleTimeline(1);assert.equal(next.end-old.end,16800);
 for(let i=1;i<next.cues.length;i++){const a=old.cues[i],b=next.cues[i];assert.equal(b.visual.text,a.visual.text);assert.equal((b.visual.fadeOut[0]-b.visual.fadeIn[1])-(a.visual.fadeOut[0]-a.visual.fadeIn[1]),2000);if(i>1)assert(b.at>=next.cues[i-1].end);}
});
test('static review bytes, overlay order and narration allowance remain untouched',()=>{
 assert.equal(createHash('sha256').update(fs.readFileSync('assets/chapter5/cast_final.png')).digest('hex'),'f437cf18dc1f01487f7702aad55dd8f872b674c31125bd0a149b92233e6febe6');
 const html=fs.readFileSync('tv.html','utf8');const section=html.slice(html.indexOf('<div id="chapter5-cast"'),html.indexOf('<div id="chapter5-ofCourse"'));
 assert.deepEqual([...section.matchAll(/id="chapter5-cast-([^"]+)"/g)].map(m=>m[1]),['screamer','terribleDecisionMaker','denier','tripper','killer','sacrifice']);
 assert(fs.readFileSync('chapter5-audio.js','utf8').includes('COMPLETE_CAST_PLAYBACK_TAIL_MS=1500'));
});
test('single participant reaches private messages safely and pauses on no-self-vote package eligibility',async()=>{
 const [p]=await guests(1);await call(host,{action:'lock-room',code:'local-host'});await call(host,{action:'start',code:'local-host'});now+=200000;await call(progress);await call(player,{...p,action:'photo-confirm'});assert.equal((await call(chapter3)).status,200);
 now+=200000;await call(progress);await call(player,{...p,action:'message-open'});await call(player,{...p,action:'message-read'});now+=3000;await call(progress);now+=200000;await call(progress);
 assert.equal(saved().phase,'door-vote');assert(publicState(saved()).chapter4.blockedReason.includes('no-self-voting'));assert.equal((await call(player,{...p,action:'door-vote',chapter4StartedAt:saved().chapter4.startedAt,targetId:p.id})).status,400);
});
test('20 independent voters complete all six unique cast roles with unchanged tallying and no-self voting',()=>{
 const s=fresh();s.players=Array.from({length:20},(_,i)=>({id:'p'+i,token:'t'+i,name:'Guest '+i,partnerId:null,ready:false}));
 makeCastingTestSelector('chapter5')(s);now=s.chapter5.startedAt+chapter5IntroDuration(s.chapter5);advanceCasting(s);confirmCastingReady(s,s.chapter5.startedAt);now+=CHAPTER5_RULES_MS;advanceCasting(s);
 const vote=makeCastingVoter(()=>0);
 for(let i=0;i<6;i++){
  const r=s.chapter5.rounds[i];now=r.startedAt+roleVotingOffset(r.id);
  const eligible=castingCandidates(s);const entries=s.players.map(p=>[p.id,eligible.find(q=>q.id!==p.id).id]);
  vote(s,entries,s.chapter5.startedAt,r.id);assert(r.winnerPlayerId);assert.equal(Object.keys(r.votes).length,20);validateChapter5(s);
  now=r.completedAt+castingCompletionMs(r.id,1);advanceCasting(s);
 }
 assert.equal(s.phase,'chapter5-finale');assert.equal(new Set(s.chapter5.rounds.map(r=>r.winnerPlayerId)).size,6);
 assert.equal(chapter5Progress(s).winners.length,6);
});
