import test,{beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fresh,CAS_SCRIPT,UNCHANGED,publicState} from '../api/_state.js';
import {makeBroadcastTestSelector,advanceChapter7,validateChapter7} from '../api/_chapter7.js';
import {startInvestigation,advanceInvestigation,investigationHostAction,investigationVote,touchInvestigationPresence,envelopeCandidates,previousRetrievers,investigationProgress,recoverSimulatedSession} from '../api/_chapter7-story.js';
import {storyRecordings,storyRecording,narrationOrder,timedScenes,PHOTO_ENHANCED_MS,PHOTO_ATTENTION_MS,narrationDuration,TRANSMISSION_MS,PROPHECY_AT_MS,transitionFrame,narratorFrame,cameraCue,CONNECTION_MS,sceneDuration,storyProgressDue,connectionCue,CONNECTION_BLACK_MS,DATE_REVEAL_MS,dateFrame} from '../chapter7-story-timing.js';
import {photographFrame} from '../chapter7-story.js';
import {finalNarrationFixture} from './chapter7-fixture.js';
import {wavMetadata} from './wav-metadata.js';import {mp3Metadata} from './mp3-metadata.js';
import progress from '../api/progress.js';import host from '../api/host.js';import player from '../api/player.js';import me from '../api/me.js';
let now,raw,realDate,realFetch;
beforeEach(()=>{now=10000000;raw=null;realDate=Date.now;realFetch=global.fetch;Date.now=()=>now;process.env.HOST_KEY='story-host';process.env.KV_REST_API_URL='https://redis.invalid';process.env.KV_REST_API_TOKEN='test';global.fetch=async(_url,options)=>{const a=JSON.parse(options.body);let result;if(a[0]==='GET')result=raw;else{assert.equal(a[0],'EVAL');assert.equal(a[1],CAS_SCRIPT);result=(raw??'')===a[4]?1:0;if(result)raw=a[5];}return {ok:true,json:async()=>({result})};};});
afterEach(()=>{Date.now=realDate;global.fetch=realFetch;});
function fixture(real=4,simulated=false){const s=finalNarrationFixture(now);s.players.forEach((p,i)=>p.simulated=i>=real);if(!simulated)s.players=s.players.slice(0,real);makeBroadcastTestSelector('chapter7-after')(s);startInvestigation(s);endAudio(s);advance(s);return s;}
const inv=s=>s.chapter7.investigation;
const body=(s,action,extra={})=>({action,generation:s.generation,broadcastId:s.chapter7.id,investigationId:inv(s).id,sequence:inv(s).sequence,...extra});
function jump(s,checkpoint,extra={}){makeBroadcastTestSelector(checkpoint,extra)(s);validateChapter7(s);}
function endAudio(s){const cue=storyRecording(inv(s).step);investigationHostAction(s,body(s,'investigation-audio-playing',{recording:cue.id}));now+=Math.ceil(narrationDuration(inv(s))-inv(s).offsetMs)+1;investigationHostAction(s,body(s,'investigation-audio-ended',{recording:cue.id}));validateChapter7(s);}
function advance(s){now=inv(s).deadline;advanceInvestigation(s);validateChapter7(s);}
function vote(s,id,target,key='theory'){const e=inv(s).elections[key];return investigationVote(s,id,target,body(s,'investigation-vote',{election:key,electionId:e.id}),now);}
async function call(handler,b={},cookie=''){let status,data;const headers={};await handler({method:'POST',body:b,headers:{cookie}},{status(n){status=n;return this;},setHeader(k,v){headers[k]=v;},json(j){data=j;}});return {status,data,headers};}

test('all supplied recordings and reused effects match measured metadata and preserved hashes',()=>{
 const media=JSON.parse(fs.readFileSync('chapter7-story-media.json'));assert.equal(media.length,12);
 for(const item of media){const b=fs.readFileSync('.'+item.src),measured=item.src.endsWith('.wav')?wavMetadata(b):mp3Metadata(b);assert.equal(measured.durationMs,item.durationMs);assert.equal(createHash('sha256').update(b).digest('hex'),item.sha256);if(item.step!=='scare')assert.equal(storyRecording(item.step).durationMs,item.durationMs);}
 assert.equal(storyRecordings.filter(r=>r.src.startsWith('/assets/chapter7/')).length,10);
});
test('broadcast ending is preserved and its completed fade enters narrator without replaying media',()=>{
 const s=fixture();delete s.chapter7.investigation;s.chapter7.step='fading';s.chapter7.completedAt=null;s.chapter7.endedAt=now-799;assert.equal(advanceChapter7(s),UNCHANGED);now++;advanceChapter7(s);assert.equal(s.chapter7.step,'waiting');assert.equal(inv(s).step,'connection');assert.equal(s.chapter7.playbackStartedAt,s.chapter7.startedAt+3000);validateChapter7(s);
});
test('native completion drives all ten story recordings in order, including podcast introduction',()=>{
 const s=fixture(),heard=[];
 while(inv(s).step!=='theory-vote'){
  const i=inv(s);if(storyRecording(i.step)){heard.push(i.step);const snapshot=JSON.stringify(s);now+=90000;assert.equal(advanceInvestigation(s),UNCHANGED);assert.equal(JSON.stringify(s),snapshot);endAudio(s);}else advance(s);
 }
 assert.deepEqual(heard,narrationOrder.filter(s=>s!=='prophecy'));assert(inv(s).elections.theory);assert.equal(inv(s).elections.theory.voterIds.length,4);
});
test('loading never starts the audio clock, early completion is rejected and delayed audio retains its full gate',()=>{
 const s=fixture(),cue=storyRecording('narrator');now+=60000;assert.equal(inv(s).audioStartedAt,null);assert.throws(()=>investigationHostAction(s,body(s,'investigation-audio-ended',{recording:cue.id})));investigationHostAction(s,body(s,'investigation-audio-playing',{recording:cue.id}));assert.equal(inv(s).audioStartedAt,now);assert.throws(()=>investigationHostAction(s,body(s,'investigation-audio-ended',{recording:cue.id})));now+=Math.ceil(cue.durationMs);investigationHostAction(s,body(s,'investigation-audio-ended',{recording:cue.id}));assert.equal(inv(s).step,'date-reveal');
});
test('theory ballots remain private, immutable, refresh-safe and unresolved after the first vote',()=>{
 const s=fixture();jump(s,'chapter7-theory-vote');vote(s,'p0','possession');assert.equal(inv(s).step,'theory-vote');assert.equal(inv(s).elections.theory.winnerId,null);assert.equal(vote(s,'p0','possession'),UNCHANGED);assert.throws(()=>vote(s,'p0','accomplice'));const p=publicState(s);assert(!JSON.stringify(p).includes('"votes"'));assert.equal(p.chapter7.investigation.winningTheory,null);assert.equal(investigationProgress(s,'p0').election.voted,true);assert.equal(investigationProgress(JSON.parse(JSON.stringify(s)),'p1').election.voteCount,1);vote(s,'p1','possession');vote(s,'p2','possession');assert.equal(inv(s).step,'theory-vote');vote(s,'p3','premeditation');assert.equal(inv(s).elections.theory.winnerId,'possession');assert.equal(inv(s).step,'vote-fade');
});
test('theory ties use the existing deterministic hash ranking and persist across refresh',()=>{
 const a=fixture(),b=structuredClone(a);jump(a,'chapter7-theory-vote');jump(b,'chapter7-theory-vote');for(const s of [a,b]){vote(s,'p0','possession');vote(s,'p1','premeditation');vote(s,'p2','possession');vote(s,'p3','premeditation');}assert.equal(inv(a).elections.theory.winnerId,inv(b).elections.theory.winnerId);assert.equal(inv(JSON.parse(JSON.stringify(a))).elections.theory.winnerId,inv(a).elections.theory.winnerId);
});
test('host closes voting after ballots; zero-ballot closure and public host actions are rejected',async()=>{
 const s=fixture();jump(s,'chapter7-theory-vote');assert.throws(()=>investigationHostAction(s,body(s,'investigation-close-voting')));vote(s,'p0','accomplice');raw=JSON.stringify(s);assert.equal((await call(host,body(s,'investigation-close-voting'))).status,403);const auth=await call(host,{action:'maze-login',code:'story-host'}),cookie=auth.headers['Set-Cookie'].split(';')[0];const result=await call(host,body(s,'investigation-close-voting'),cookie);assert.equal(result.status,200);assert.equal(inv(JSON.parse(raw)).elections.theory.winnerId,'accomplice');assert(!JSON.stringify(result.data.state).includes('"votes"'));
});
test('real phones observed in the investigation establish the connected electorate and simulated players cannot vote',()=>{
 const s=fixture();touchInvestigationPresence(s,'p0');touchInvestigationPresence(s,'p1');jump(s,'chapter7-theory-vote');assert.deepEqual(inv(s).elections.theory.voterIds,['p0','p1']);assert.throws(()=>vote(s,'p2','possession'));assert.throws(()=>vote(s,'p4','possession'));vote(s,'p0','possession');assert.equal(inv(s).step,'theory-vote');vote(s,'p1','possession');assert.equal(inv(s).step,'vote-fade');
});
test('group-spoken reveal is exclusive: 3-second headline, 1.5-second reveal plus 5-second hold, fade, silent black',()=>{
 assert.match(fs.readFileSync('chapter7.css','utf8'),/#chapter7Investigation\{[^}]*background:#000;/);
 const s=fixture();jump(s,'chapter7-theory-vote');vote(s,'p0','possession');investigationHostAction(s,body(s,'investigation-close-voting'));advance(s);assert.equal(inv(s).step,'spoken');assert.equal(investigationProgress(s).winningTheory,null);assert.equal(inv(s).deadline-inv(s).phaseAt,3000);advance(s);assert.equal(inv(s).step,'theory-reveal');assert.equal(investigationProgress(s).winningTheory,'possession');assert.equal(inv(s).deadline-inv(s).phaseAt,6500);advance(s);assert.equal(inv(s).step,'theory-fade');advance(s);assert.equal(inv(s).step,'silent-black');assert.equal(inv(s).deadline-inv(s).phaseAt,3500);assert(!storyRecording(inv(s).step));advance(s);assert.equal(inv(s).step,'incoming');
});
test('verdict omits scare and opens a persistent private envelope poll during the incoming ring',()=>{
 const s=fixture();jump(s,'chapter7-spoken',{testMode:true,testTheory:'possession'});while(inv(s).step!=='incoming')advance(s);
 assert.equal(storyRecording('scare'),undefined);assert(inv(s).testElections.envelope);assert.equal(investigationProgress(s,'p0').election.key,'envelope');
 endAudio(s);assert.equal(inv(s).step,'envelope-vote');now+=900000;assert.equal(advanceInvestigation(s),UNCHANGED);assert.equal(inv(s).deadline,null);
});
test('all recorded retrieval identities are excluded as candidates, including generic retrieval history',()=>{
 const s=fixture(6);s.physicalRetrievals=[{playerId:'p2',task:'other'}];s.chapter2Retrieval={retrieverPlayerId:'p3'};assert.deepEqual([...previousRetrievers(s)].sort(),['p0','p1','p2','p3']);assert.deepEqual(envelopeCandidates(s).map(p=>p.id),['p4','p5']);jump(s,'chapter7-envelope-vote');assert.deepEqual(investigationProgress(s,'p0').election.candidates.map(p=>p.id),['p4','p5']);assert.throws(()=>vote(s,'p0','p1','envelope'));vote(s,'p0','p4','envelope');vote(s,'p1','p4','envelope');assert.equal(inv(s).step,'envelope-vote');assert.equal(inv(s).elections.envelope.votes.p0,'p4');
});
test('envelope voting persists a deterministic retriever, waits indefinitely, then requires authenticated return',async()=>{
 const s=fixture();jump(s,'chapter7-envelope-vote');for(const id of ['p0','p1','p2','p3'])vote(s,id,'p2','envelope');assert.equal(inv(s).step,'retriever-reveal');assert.equal(investigationProgress(s).selectedPlayer.name,'Guest 2');advance(s);assert.equal(inv(s).step,'envelope-waiting');now+=900000;assert.equal(advanceInvestigation(s),UNCHANGED);raw=JSON.stringify(s);assert.equal((await call(host,body(s,'investigation-envelope-return'))).status,403);const request={...body(s,'investigation-envelope-return'),code:'story-host'},result=await call(host,request);assert.equal(result.status,200);const returned=JSON.parse(raw);assert.equal(inv(returned).step,'interlude');assert.equal((await call(host,request)).status,200);assert.equal(JSON.parse(raw).chapter7.investigation.envelopeReturnedAt,now);
});
test('no eligible retriever produces a host-controlled fallback without reusing an excluded player',()=>{
 const s=fixture(2);jump(s,'chapter7-envelope-vote');assert.equal(inv(s).step,'retriever-fallback');investigationHostAction(s,body(s,'investigation-host-retrieval'));assert.equal(inv(s).step,'envelope-waiting');assert.equal(investigationProgress(s).selectedPlayer,null);assert.equal(investigationProgress(s).hostRetriever,true);investigationHostAction(s,body(s,'investigation-envelope-return'));advance(s);assert.equal(inv(s).step,'photograph');
});
test('photograph checkpoints retain an explicitly confirmed host fallback when no eligible player exists',()=>{
 const s=fixture(2);jump(s,'chapter7-envelope-vote');investigationHostAction(s,body(s,'investigation-host-retrieval'));const chosenAt=inv(s).hostRetrievalAt;investigationHostAction(s,body(s,'investigation-envelope-return'));jump(s,'chapter7-photo');assert.equal(inv(s).hostRetriever,true);assert.equal(inv(s).hostRetrievalAt,chosenAt);assert.equal(inv(s).step,'photograph');jump(s,'chapter7-window');assert.equal(inv(s).hostRetriever,true);assert.equal(inv(s).offsetMs,PHOTO_ENHANCED_MS);
});
test('photograph stays original through the window line and enhanced reveal holds after full narration',()=>{
 assert.equal(photographFrame(PHOTO_ATTENTION_MS-1).attention,0);assert.equal(photographFrame(PHOTO_ENHANCED_MS-1).enhanced,false);assert.equal(photographFrame(PHOTO_ENHANCED_MS).enhanced,true);const s=fixture();jump(s,'chapter7-photo',{testMode:true,testRetrieverId:'p2'});assert.equal(inv(s).offsetMs,0);endAudio(s);assert.equal(inv(s).step,'photo-hold');assert.equal(inv(s).deadline-inv(s).phaseAt,12000);advance(s);assert.equal(inv(s).step,'ending-fade');advance(s);assert.equal(inv(s).step,'complete');assert.equal(advanceInvestigation(s),UNCHANGED);
});
test('checkpoints never fabricate real results: missing prerequisites require explicit separate test outcomes',()=>{
 const s=fixture(),history=structuredClone({players:s.players,chapter4:s.chapter4,chapter5:s.chapter5,chapter6:s.chapter6});assert.throws(()=>jump(s,'chapter7-spoken'));assert.throws(()=>jump(s,'chapter7-photo'));jump(s,'chapter7-spoken',{testMode:true,testTheory:'premeditation'});assert.equal(inv(s).elections.theory,undefined);assert.equal(inv(s).testSetup.theoryId,'premeditation');jump(s,'chapter7-window',{testMode:true,testRetrieverId:'p2'});assert.equal(inv(s).offsetMs,34300);assert.equal(inv(s).elections.envelope,undefined);assert.deepEqual({players:s.players,chapter4:s.chapter4,chapter5:s.chapter5,chapter6:s.chapter6},history);
});
test('navigating completed real votes preserves ballots and outcomes; explicit test ballots use separate storage',()=>{
 const s=fixture();jump(s,'chapter7-theory-vote');vote(s,'p0','accomplice');investigationHostAction(s,body(s,'investigation-close-voting'));const saved=structuredClone(inv(s).elections);jump(s,'chapter7-spoken');assert.deepEqual(inv(s).elections,saved);assert.throws(()=>jump(s,'chapter7-theory-vote'));jump(s,'chapter7-theory-vote',{testMode:true});const e=inv(s).testElections.theory;for(const id of ['p0','p1','p2','p3'])investigationVote(s,id,'possession',body(s,'investigation-vote',{election:'theory',electionId:e.id}));if(inv(s).step==='theory-vote')investigationHostAction(s,body(s,'investigation-close-voting'));assert.equal(inv(s).testElections.theory.winnerId,'possession');assert.deepEqual(inv(s).elections,saved);
});
test('player credentials, generation, election ID and scene sequence fence stale votes and media events',async()=>{
 const s=fixture();jump(s,'chapter7-theory-vote');const b=body(s,'investigation-vote',{election:'theory',electionId:inv(s).elections.theory.id,targetId:'possession'});raw=JSON.stringify(s);assert.equal((await call(player,{...b,id:'p0',token:'wrong'})).status,401);assert.equal((await call(player,{...b,id:'p0',token:'t0',generation:'stale'})).status,409);assert.equal((await call(player,{...b,id:'p0',token:'t0',sequence:b.sequence-1})).status,409);assert.equal((await call(player,{...b,id:'p0',token:'t0'})).status,200);const p=await call(me,{id:'p0',token:'t0'});assert.equal(p.data.chapter7.investigation.election.voted,true);assert(!JSON.stringify(p.data).includes('"votes"'));jump(s,'chapter7-narrator');assert.throws(()=>investigationHostAction(s,{...body(s,'investigation-audio-playing',{recording:storyRecording('narrator').id}),sequence:0}));
});
test('checkpoint API requires host authorization and reuses the existing cookie without another PIN',async()=>{
 const s=fixture();raw=JSON.stringify(s);assert.equal((await call(host,{action:'chapter-select',checkpoint:'chapter7-narrator'})).status,403);const auth=await call(host,{action:'maze-login',code:'story-host'}),cookie=auth.headers['Set-Cookie'].split(';')[0];assert.equal((await call(host,{action:'chapter-select',checkpoint:'chapter7-narrator'},cookie)).status,200);const options=await call(host,{action:'investigation-checkpoint-options'},cookie);assert.equal(options.status,200);assert.deepEqual(options.data.candidates.map(p=>p.id),['p2','p3']);assert.equal((await call(host,{action:'chapter-select',checkpoint:'chapter7-waiting'},cookie)).status,409);
});

test('podcast transitions hold a full title, keep narration silent and enter the next native recording only at the deadline',()=>{
 const s=fixture();for(const [checkpoint,transition,next] of [['chapter7-second','theory3-transition','accomplice'],['chapter7-third','narrator-transition','vote-intro']]){
  jump(s,checkpoint);endAudio(s);assert.equal(inv(s).step,transition);assert.equal(inv(s).deadline-inv(s).phaseAt,transition==='narrator-transition'?11000:9000);assert.equal(inv(s).audioStartedAt,null);
  now=inv(s).deadline-1;assert.equal(advanceInvestigation(s),UNCHANGED);advance(s);assert.equal(inv(s).step,next);assert.equal(inv(s).audioStartedAt,null);
 }
 assert.equal(transitionFrame(3200).title,1);assert.equal(transitionFrame(6000).title,1);assert.equal(transitionFrame(1500).title,0);assert.equal(transitionFrame(9000).incoming,1);
});
test('combined transmission rejects officer-only completion and advances directly to reaction after prophecy',()=>{
 const s=fixture();jump(s,'chapter7-police');const cue=storyRecording('officer');investigationHostAction(s,body(s,'investigation-audio-playing',{recording:cue.id}));now+=Math.ceil(cue.durationMs);assert.throws(()=>investigationHostAction(s,body(s,'investigation-audio-ended',{recording:cue.id})));assert.equal(PROPHECY_AT_MS,cue.durationMs-1900);now+=Math.ceil(TRANSMISSION_MS-cue.durationMs);investigationHostAction(s,body(s,'investigation-audio-ended',{recording:cue.id}));assert.equal(inv(s).next,'reaction');advance(s);assert.equal(inv(s).step,'reaction');
});
test('host simulated assignments are isolated test data, preserve real ballots, support ties and fence stale polls',async()=>{
 const s=fixture(2,true);jump(s,'chapter7-theory-vote',{testMode:true});const e=inv(s).testElections.theory;assert.equal(e.voterIds.length,12);assert.equal(inv(s).elections.theory,undefined);
 const rb=body(s,'investigation-vote',{election:'theory',electionId:e.id});investigationVote(s,'p0','possession',rb);const assignments=Object.fromEntries(s.players.filter(p=>p.simulated).map((p,n)=>[p.id,n<5?'possession':'premeditation']));
 const b=body(s,'investigation-test-vote',{election:'theory',electionId:e.id,votes:assignments});raw=JSON.stringify(s);assert.equal((await call(host,b)).status,403);
 const login=await call(host,{action:'maze-login',code:'story-host'}),cookie=login.headers['Set-Cookie'].split(';')[0];assert.equal((await call(host,b,cookie)).status,200);const voted=JSON.parse(raw);assert.equal(inv(voted).step,'theory-vote');assert.equal(inv(voted).testElections.theory.votes.p0,'possession');assert.equal(investigationProgress(voted).election.simulatedVoteCount,10);
 assert.equal((await call(host,{...b,votes:{p0:'accomplice'}},cookie)).status,403);assert.equal((await call(host,{...b,electionId:'stale'},cookie)).status,409);
 investigationVote(voted,'p1','premeditation',body(voted,'investigation-vote',{election:'theory',electionId:e.id}));assert.equal(inv(voted).step,'vote-fade');assert.deepEqual(inv(voted).elections,{});
 jump(voted,'chapter7-envelope-vote',{testMode:true});const env=inv(voted).testElections.envelope;assert.equal(env.voterIds.length,12);assert(!env.candidateIds.includes('p0'));assert(!env.candidateIds.includes('p1'));assert(env.candidateIds.includes('p2'));assert.equal(investigationProgress(voted,'p0').election.canVote,true);
 assert.throws(()=>investigationHostAction(voted,body(voted,'investigation-test-vote',{election:'envelope',electionId:env.id,votes:{p2:'p0'}})));
 validateChapter7(voted);
});
test('Chapter 7 test fill reuses authenticated controls without rewriting historical selections',async()=>{
 const s=fixture(2);s.players=s.players.slice(0,2);jump(s,'chapter7-narrator',{testMode:true});raw=JSON.stringify(s);const history=structuredClone({chapter4:s.chapter4,chapter5:s.chapter5,chapter6:s.chapter6});const b=body(s,'investigation-test-fill');assert.equal((await call(host,b)).status,403);assert.equal((await call(host,{...b,code:'story-host'})).status,200);const filled=JSON.parse(raw);assert.equal(filled.players.length,12);assert.equal(filled.players.filter(p=>p.simulated).length,10);assert.deepEqual({chapter4:filled.chapter4,chapter5:filled.chapter5,chapter6:filled.chapter6},history);
});

test('host test actions are unavailable during normal gameplay and legacy scare state recovers silently',async()=>{
 const s=fixture();jump(s,'chapter7-theory-vote');raw=JSON.stringify(s);const b=body(s,'investigation-test-vote',{election:'theory',electionId:inv(s).elections.theory.id,votes:{p4:'possession'},code:'story-host'});assert.equal((await call(host,b)).status,403);assert.equal((await call(host,{action:'investigation-test-options',code:'story-host'})).status,403);assert.equal((await call(host,body(s,'investigation-test-fill',{code:'story-host'}))).status,409);
 inv(s).step='scare';inv(s).deadline=null;advanceInvestigation(s);assert.equal(inv(s).step,'silent-black');assert(!storyRecording('scare'));validateChapter7(s);
});
test('envelope test ballots allow an eligible simulated retriever and real voters can vote during ringing',()=>{
 const s=fixture(2,true);jump(s,'chapter7-message',{testMode:true});const e=inv(s).testElections.envelope;investigationVote(s,'p0','p2',body(s,'investigation-vote',{election:'envelope',electionId:e.id}));assert.equal(inv(s).step,'incoming');
 investigationHostAction(s,body(s,'investigation-test-vote',{election:'envelope',electionId:e.id,votes:Object.fromEntries(s.players.filter(p=>p.simulated).map(p=>[p.id,'p2']))}));assert.equal(inv(s).step,'incoming');investigationVote(s,'p1','p2',body(s,'investigation-vote',{election:'envelope',electionId:e.id}));assert.equal(inv(s).step,'incoming');endAudio(s);assert.equal(inv(s).step,'retriever-reveal');assert.equal(inv(s).testElections.envelope.winnerId,'p2');assert.equal(inv(s).elections.envelope,undefined);jump(s,'chapter7-photo',{testMode:true,testRetrieverId:'p2'});assert.equal(inv(s).step,'photograph');validateChapter7(s);
});

test('natural Chapter 7 entry inherits the persisted simulated cast, retains exclusions and completes both polls without checkpoint opt-in',()=>{
 const s=finalNarrationFixture(now);s.players.forEach((p,n)=>p.simulated=n>=2);makeBroadcastTestSelector('chapter7-after')(s);const history=structuredClone({players:s.players,chapter4:s.chapter4,chapter5:s.chapter5,chapter6:s.chapter6});startInvestigation(s);assert.equal(inv(s).testMode,true);assert.equal(inv(s).step,'connection');now+=90000;assert.equal(advanceInvestigation(s),UNCHANGED);endAudio(s);assert.equal(inv(s).step,'connection-black');advance(s);assert.equal(inv(s).step,'narrator');
 jump(s,'chapter7-theory-vote');const theory=inv(s).testElections.theory;assert.equal(theory.voterIds.length,12);
 investigationHostAction(s,body(s,'investigation-test-vote',{election:'theory',electionId:theory.id,votes:Object.fromEntries(s.players.filter(p=>p.simulated).map(p=>[p.id,'possession']))}));assert.equal(inv(s).step,'theory-vote');for(const id of ['p0','p1'])investigationVote(s,id,'possession',body(s,'investigation-vote',{election:'theory',electionId:theory.id}));while(inv(s).step!=='incoming')advance(s);
 const env=inv(s).testElections.envelope;assert.equal(env.voterIds.length,12);assert.deepEqual(env.candidateIds,Array.from({length:10},(_,n)=>'p'+(n+2)));endAudio(s);now+=600000;assert.equal(advanceInvestigation(s),UNCHANGED);assert.equal(inv(s).step,'envelope-vote');
 investigationHostAction(s,body(s,'investigation-test-vote',{election:'envelope',electionId:env.id,votes:Object.fromEntries(s.players.filter(p=>p.simulated).map(p=>[p.id,'p2']))}));for(const id of ['p0','p1'])investigationVote(s,id,'p2',body(s,'investigation-vote',{election:'envelope',electionId:env.id}));advance(s);assert.equal(inv(s).step,'envelope-waiting');investigationHostAction(s,body(s,'investigation-envelope-return'));advance(s);assert.equal(inv(s).step,'photograph');assert.deepEqual({players:s.players,chapter4:s.chapter4,chapter5:s.chapter5,chapter6:s.chapter6},history);validateChapter7(s);
});
test('legacy real-only envelope fallback repairs the persisted test cast without overwriting either saved real election',()=>{
 const s=fixture(2,true);jump(s,'chapter7-theory-vote');const i=inv(s),e=structuredClone(i.testElections.theory);e.voterIds=['p0','p1'];e.votes={p0:'possession',p1:'possession'};e.winnerId='possession';e.closedAt=now;
 i.elections={theory:e,envelope:{id:'old-envelope',openedAt:now,voterIds:['p0','p1'],candidateIds:[],votes:{},closedAt:null,winnerId:null}};delete i.testElections;i.testMode=false;i.step='retriever-fallback';i.phaseAt=now;i.deadline=null;const saved=structuredClone(i.elections),players=structuredClone(s.players);
 assert.equal(investigationProgress(s).needsRecovery,true);assert.equal(storyProgressDue(publicState(s).chapter7,now),true);advanceInvestigation(s);assert.equal(i.step,'envelope-vote');assert.equal(i.testMode,true);assert.deepEqual(i.elections,saved);assert.deepEqual(s.players,players);assert.equal(i.testElections.envelope.voterIds.length,12);assert.equal(i.testElections.envelope.candidateIds.length,10);assert.equal(investigationProgress(s).winningTheory,'possession');assert.equal(investigationProgress(s).needsRecovery,false);validateChapter7(s);
 const snapshot=JSON.stringify(s);assert.equal(advanceInvestigation(s),UNCHANGED);assert.equal(JSON.stringify(s),snapshot);
});
test('date is absent throughout narration and has a separate reveal frame; podcast identities stay consistent',()=>{
 for(const t of [0,2050,3500,7400,9600,33400])assert.equal(narratorFrame(t).date,0);assert.equal(dateFrame(1200).opacity,1);assert.equal(dateFrame(DATE_REVEAL_MS).opacity,0);assert.equal(dateFrame(DATE_REVEAL_MS).yearScale,1.25);
 for(let t=0;t<=11000;t+=10){const f=transitionFrame(t);assert(!(f.title>0&&f.incoming>0));assert(!(f.out>0&&f.title>0));}
 const view=fs.readFileSync('chapter7-story.js','utf8'),css=fs.readFileSync('chapter7.css','utf8');assert(view.includes("title='PODCAST: '+identity"));assert(view.includes('THE MISSING PIECE'));assert(!view.includes('THE THIRTEENTH VOICE'));assert(css.includes('THE MISSING PIECE'));assert.equal(wavMetadata(fs.readFileSync('.'+cameraCue.src)).durationMs,cameraCue.durationMs);
});
test('camera sound is an authenticated atomic one-shot and checkpoint window skips it',async()=>{
 const s=fixture();jump(s,'chapter7-photo',{testMode:true,testRetrieverId:'p2'});const b=body(s,'investigation-photo-sound');raw=JSON.stringify(s);assert.equal((await call(host,b)).status,403);const results=await Promise.all([call(host,{...b,code:'story-host'}),call(host,{...b,code:'story-host'})]);assert(results.every(r=>r.status===200));assert.equal(results.filter(r=>r.data.playSound===true).length,1);assert.equal(results.filter(r=>r.data.playSound===false).length,1);assert.equal(inv(JSON.parse(raw)).photoSoundPlayedAt,now);jump(s,'chapter7-window',{testMode:true,testRetrieverId:'p2'});assert.equal(investigationHostAction(s,body(s,'investigation-photo-sound')),UNCHANGED);
});

test('public progression atomically recovers a legacy test fallback and keeps saved votes and player identities',async()=>{
 const s=fixture(2,true),i=inv(s);i.testMode=false;delete i.testElections;i.step='retriever-fallback';i.deadline=null;i.elections.envelope={id:'legacy-fallback',openedAt:now,voterIds:['p0','p1'],candidateIds:[],votes:{},closedAt:null,winnerId:null};const saved=structuredClone(i.elections),players=structuredClone(s.players);raw=JSON.stringify(s);
 const result=await call(progress,{});assert.equal(result.status,200);const stored=JSON.parse(raw);assert.equal(inv(stored).step,'envelope-vote');assert.equal(inv(stored).testElections.envelope.voterIds.length,12);assert.equal(inv(stored).testElections.envelope.candidateIds.length,10);assert.deepEqual(inv(stored).elections,saved);assert.deepEqual(stored.players,players);assert.equal(result.data.state.chapter7.investigation.needsRecovery,false);
});
test('authenticated CLOSE VOTING resolves a simulated retrieval tie, finishes the ring once, and retains host-only return',async()=>{
 const s=fixture(2,true);jump(s,'chapter7-message');const e=inv(s).testElections.envelope;
 investigationHostAction(s,body(s,'investigation-test-vote',{election:'envelope',electionId:e.id,votes:{p2:'p3',p3:'p2'}}));raw=JSON.stringify(s);assert.equal((await call(host,body(s,'investigation-close-voting'))).status,403);assert.equal((await call(host,body(s,'investigation-close-voting',{code:'story-host'}))).status,200);
 const closed=JSON.parse(raw);assert.equal(inv(closed).step,'incoming');assert(['p2','p3'].includes(inv(closed).testElections.envelope.winnerId));assert.equal(investigationProgress(closed,'p0').election.canVote,false);endAudio(closed);assert.equal(inv(closed).step,'retriever-reveal');advance(closed);assert.equal(inv(closed).step,'envelope-waiting');assert.equal(inv(closed).envelopeReturnedAt,null);validateChapter7(closed);
});

test('an active legacy transmission completes its original gate, then future scenes receive the current polish and camera behavior',()=>{
 const s=fixture();jump(s,'chapter7-police');inv(s).polishVersion=1;const oldDuration=narrationDuration(inv(s));assert.equal(oldDuration,TRANSMISSION_MS+1000);endAudio(s);assert.equal(inv(s).step,'interlude');assert.equal(inv(s).polishVersion,3);
 jump(s,'chapter7-waiting',{testMode:true,testRetrieverId:'p2'});inv(s).polishVersion=1;investigationHostAction(s,body(s,'investigation-envelope-return'));advance(s);assert.equal(inv(s).step,'photograph');assert.equal(inv(s).polishVersion,3);assert.deepEqual(investigationHostAction(s,body(s,'investigation-photo-sound')),{playSound:true});validateChapter7(s);
});

test('connection requires both native plays, then exactly one second of black, and the complete narrator precedes the standalone date',()=>{
 const s=fixture();delete s.chapter7.investigation;startInvestigation(s);const cue=storyRecording('connection'),i=inv(s);assert.equal(i.deadline,null);assert.equal(i.polishVersion,3);now+=90000;assert.equal(advanceInvestigation(s),UNCHANGED);investigationHostAction(s,body(s,'investigation-audio-playing',{recording:cue.id}));now+=cue.durationMs/2;assert.throws(()=>investigationHostAction(s,body(s,'investigation-audio-ended',{recording:cue.id})));now+=cue.durationMs/2;investigationHostAction(s,body(s,'investigation-audio-ended',{recording:cue.id}));assert.equal(i.step,'connection-black');assert.equal(i.deadline-i.phaseAt,CONNECTION_BLACK_MS);now=i.deadline-1;assert.equal(advanceInvestigation(s),UNCHANGED);now++;advanceInvestigation(s);assert.equal(i.step,'narrator');assert.equal(i.audioStartedAt,null);
 const narrator=storyRecording('narrator');investigationHostAction(s,body(s,'investigation-audio-playing',{recording:narrator.id}));now+=narrator.durationMs-251;assert.equal(advanceInvestigation(s),UNCHANGED);assert.throws(()=>investigationHostAction(s,body(s,'investigation-audio-ended',{recording:narrator.id})));now+=251;investigationHostAction(s,body(s,'investigation-audio-ended',{recording:narrator.id}));assert.equal(i.step,'date-reveal');assert.equal(i.deadline-i.phaseAt,DATE_REVEAL_MS);assert.equal(storyRecording(i.step),undefined);advance(s);assert.equal(i.step,'theory1-transition');advance(s);assert.equal(i.step,'podcast-intro');validateChapter7(s);
});
test('stored silent connection states upgrade without replaying the news or bypassing the new audio gate',()=>{
 const s=fixture();inv(s).polishVersion=2;inv(s).step='connection';inv(s).phaseAt=now;inv(s).deadline=now+CONNECTION_MS;const broadcast=s.chapter7.id;validateChapter7(s);assert.equal(storyProgressDue(publicState(s).chapter7,now),true);advanceInvestigation(s);assert.equal(inv(s).polishVersion,3);assert.equal(inv(s).deadline,null);assert.equal(inv(s).step,'connection');assert.equal(s.chapter7.id,broadcast);validateChapter7(s);
});


test('Theory 01 follows the date, uses the existing theory duration, and gates the first introduction recording',()=>{
 const s=fixture();endAudio(s);assert.equal(inv(s).step,'date-reveal');advance(s);const i=inv(s);assert.equal(i.step,'theory1-transition');assert.equal(sceneDuration(i),sceneDuration({...i,step:'theory2-transition'}));assert.equal(sceneDuration(i),sceneDuration({...i,step:'theory3-transition'}));assert.equal(sceneDuration(i),9000);assert.equal(storyRecording(i.step),undefined);assert.equal(i.audioStartedAt,null);
 now=i.deadline-1;assert.equal(advanceInvestigation(s),UNCHANGED);assert.throws(()=>investigationHostAction(s,body(s,'investigation-audio-playing',{recording:storyRecording('podcast-intro').id})));
 const refreshed=JSON.parse(JSON.stringify(s));validateChapter7(refreshed);now=i.deadline;advanceInvestigation(refreshed);assert.equal(inv(refreshed).step,'podcast-intro');assert.equal(inv(refreshed).audioStartedAt,null);validateChapter7(refreshed);
});
