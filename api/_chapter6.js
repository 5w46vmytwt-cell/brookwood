import {randomInt,createHash} from 'node:crypto';
import {LobbyError,UNCHANGED} from './_state.js';
import {validateChapter5,makeCastingTestSelector} from './_chapter5.js';
import {gate,introDuration,answerWindows,games,resultRecording,TRANSITION_MS,introNumbers,phaseCues} from '../chapter6-timing.js';
import {castingVotingOffset,castingCompletionMs,castingFinaleMs,CHAPTER5_INTRO_MS} from '../chapter5-timing.js';
import {CHAPTER5_RULES_MS} from '../chapter5-audio-timing.js';
export const isChapter6=s=>s.phase==='chapter6';
const steps=['takeover','exposure','locked','gameover','intro','answer','silence','verdict','result','zero','transition','finale','vote','selected','waiting','return','complete'];
const timed=['takeover','exposure','locked','gameover','intro','answer','silence','result','zero','transition','finale','selected','return'];
export const PRESENCE_MS=30000;
function shuffleDoors(){const original=['red','blue','green','black'];let order;do{order=[...original];for(let i=3;i>0;i--){const j=randomInt(i+1);[order[i],order[j]]=[order[j],order[i]];}}while(order.every((id,i)=>id===original[i]));return order;}
const realPlayers=s=>s.players.filter(p=>p.simulated!==true);
const candidatePlayers=s=>s.chapter6.testMode?s.players:realPlayers(s);
// REST polling cannot distinguish a backgrounded phone from a disconnect.
// Once observed during the maze, a phone retains its opportunity to vote.
// If no phone has been observed, conservatively include the real registered cast.
function establishElectorate(s){
 const c=s.chapter6;if(c.voteVersion===2)return;
 const observed=realPlayers(s).filter(p=>Number.isFinite(c.presence[p.id])).map(p=>p.id);
 c.voterIds=[...new Set([...c.voterIds,...Object.keys(c.votes),...(observed.length?observed:realPlayers(s).map(p=>p.id))])];
 c.electorateLocked=true;c.voteVersion=2;c.voteClosedAt=null;
}
export function tokenVoteWinner(s){
 const c=s.chapter6,counts=new Map();for(const id of Object.values(c.votes))counts.set(id,(counts.get(id)||0)+1);
 const max=Math.max(...counts.values()),leaders=[...counts].filter(([,n])=>n===max).map(([id])=>id);
 const rank=id=>createHash('sha256').update(JSON.stringify([s.generation,c.startedAt,id])).digest('hex');
 return leaders.sort((a,b)=>rank(a).localeCompare(rank(b))||a.localeCompare(b))[0];
}
function finalizeTokenVote(s,now){s.chapter6.selectedPlayerId=tokenVoteWinner(s);enter(s.chapter6,'selected',now,gate(30));}
export function startChapter6(s,now=Date.now(),doorOrder=shuffleDoors()){
 if(isChapter6(s))return UNCHANGED;
 if(s.phase!=='chapter5-complete')return UNCHANGED;
 validateChapter5(s);
 s.chapter6={audioVersion:2,audioIndex:0,doorOrder:[...doorOrder],startedAt:now,phaseAt:now,deadline:now+4000,step:'takeover',game:0,lives:3,zeroConsumed:false,zeroAt:null,results:[],screamerId:s.chapter5.rounds.find(r=>r.id==='screamer').winnerPlayerId,macheteId:s.macheteHolderPlayerId,sequence:0,presence:{},voterIds:[],electorateLocked:false,votes:{},selectedPlayerId:null,tokenReturnedAt:null,completedAt:null,testMode:s.players.some(p=>p.simulated===true)};
 s.phase='chapter6';
}
export function makeMazeStarter(){const order=shuffleDoors(),at=Date.now();return s=>startChapter6(s,at,order);}
export function validateChapter6(s){
 validateChapter5({...s,phase:'chapter5-complete'});
 const c=s.chapter6,cast=new Set(s.players.map(p=>p.id));
 if(!c||!Number.isFinite(c.startedAt)||c.startedAt<s.chapter5.completedAt||!steps.includes(c.step)||!Number.isInteger(c.game)||c.game<0||c.game>4||!Number.isInteger(c.sequence)||c.sequence<0||!Number.isFinite(c.phaseAt)||c.phaseAt<c.startedAt||!Number.isInteger(c.lives)||c.lives<0||c.lives>3||typeof c.zeroConsumed!=='boolean'||typeof c.testMode!=='boolean'||c.screamerId!==s.chapter5.rounds.find(r=>r.id==='screamer').winnerPlayerId||c.macheteId!==s.macheteHolderPlayerId)throw Error('Invalid Chapter 6 state.');
 if(c.audioVersion!==undefined&&c.audioVersion!==2)throw Error('Invalid maze audio version.');
 if(c.audioVersion===2&&(!Number.isInteger(c.audioIndex)||c.audioIndex<0||c.audioIndex>=introNumbers(c.game).length||!Array.isArray(c.doorOrder)||c.doorOrder.length!==4||new Set(c.doorOrder).size!==4||c.doorOrder.some(id=>!['red','blue','green','black'].includes(id))))throw Error('Invalid maze cue or doors.');
 if(timed.includes(c.step)?!Number.isFinite(c.deadline)||c.deadline<=c.phaseAt:c.deadline!==null)throw Error('Invalid maze deadline.');
 if(c.step==='transition'&&(!['result','zero'].includes(c.transitionFrom?.step)||!Number.isFinite(c.transitionFrom.phaseAt)||c.transitionFrom.phaseAt<c.startedAt||c.transitionFrom.phaseAt>c.phaseAt||c.deadline!==c.phaseAt+(c.audioVersion===2&&c.game===4?5000:TRANSITION_MS)))throw Error('Invalid maze transition.');
 if(!Array.isArray(c.results)||c.results.length>5||c.results.some((r,i)=>r.game!==i||!Number.isFinite(r.resolvedAt)||r.resolvedAt<c.startedAt||typeof r.correct!=='boolean'||r.recording!==resultRecording(i,r.answer,r.correct)))throw Error('Invalid maze results.');
 const losses=c.results.filter(r=>!r.correct).length;
 if(c.lives!==Math.max(0,3-losses)||c.results.length<c.game||c.results.length>c.game+1||(['locked','gameover','result','zero','transition','finale','vote','selected','waiting','return','complete'].includes(c.step)&&c.results.length!==c.game+1)||(['takeover','exposure','intro','answer','silence','verdict'].includes(c.step)&&c.results.length!==c.game))throw Error('Invalid maze progression.');
 if(c.results.some(r=>r.answer!==null&&(r.game<4?!games[r.game].options.some(([id])=>id===r.answer):!['pass','fail'].includes(r.answer)))||c.results.some(r=>r.correct!==(r.game===4?r.answer==='pass':r.answer===games[r.game].correct)))throw Error('Invalid maze answer.');
 if(c.zeroConsumed?(c.lives!==0||!Number.isFinite(c.zeroAt)):c.zeroAt!==null)throw Error('Invalid zero-lives narration.');
 if(['gameover','finale','vote','selected','waiting','return','complete'].includes(c.step)&&c.results.length!==5)throw Error('Premature finale.');
 if(!c.presence||Array.isArray(c.presence)||Object.entries(c.presence).some(([id,t])=>!cast.has(id)||!Number.isFinite(t))||!Array.isArray(c.voterIds)||new Set(c.voterIds).size!==c.voterIds.length||c.voterIds.some(id=>!cast.has(id)||(!c.testMode&&s.players.find(p=>p.id===id).simulated===true))||typeof c.electorateLocked!=='boolean'||!c.votes||Array.isArray(c.votes))throw Error('Invalid maze voters.');
 const candidates=new Set(candidatePlayers(s).filter(p=>p.id!==c.macheteId).map(p=>p.id));
 if(Object.entries(c.votes).some(([v,t])=>!c.voterIds.includes(v)||!candidates.has(t)||v===t)||(!c.electorateLocked&&Object.keys(c.votes).length))throw Error('Invalid token ballot.');
 if(c.selectedPlayerId!==null){
  const counts=new Map();for(const t of Object.values(c.votes))counts.set(t,(counts.get(t)||0)+1);
  if(!candidates.has(c.selectedPlayerId)||!c.electorateLocked||!c.voterIds.length||(!c.voteClosedAt&&Object.keys(c.votes).length!==c.voterIds.length)||counts.get(c.selectedPlayerId)!==Math.max(...counts.values()))throw Error('Invalid token retriever.');
 }
 if(c.voteClosedAt!==undefined&&c.voteClosedAt!==null&&(!Number.isFinite(c.voteClosedAt)||c.voteClosedAt<c.startedAt||!Object.keys(c.votes).length||c.selectedPlayerId===null))throw Error('Invalid early vote closure.');
 if(c.voteVersion!==undefined&&c.voteVersion!==2)throw Error('Invalid token voting version.');
 if(['selected','waiting','return','complete'].includes(c.step)&&c.selectedPlayerId===null)throw Error('Missing token retriever.');
 if(['return','complete'].includes(c.step)?!Number.isFinite(c.tokenReturnedAt)||c.tokenReturnedAt<c.phaseAt&&c.step==='return':c.tokenReturnedAt!==null)throw Error('Invalid token confirmation.');
 if(c.step==='complete'?!Number.isFinite(c.completedAt):c.completedAt!==null)throw Error('Invalid maze completion.');
}
function enter(c,step,at,duration=null){c.step=step;c.phaseAt=at;c.deadline=duration===null?null:at+duration;c.sequence++;}
function resolve(s,answer,now){
 const c=s.chapter6;if(c.results.length>c.game)return UNCHANGED;
 const correct=c.game===4?answer==='pass':answer===games[c.game].correct;
 const n=resultRecording(c.game,answer,correct);
 c.results.push({game:c.game,answer,correct,recording:n,resolvedAt:now});
 if(!correct)c.lives=Math.max(0,c.lives-1);
 enter(c,c.audioVersion===2?'locked':'result',now,c.audioVersion===2?(c.game<4?3000:1800):n?gate(n):1500);
}
function transition(c,now){
 c.transitionFrom={step:c.step,phaseAt:c.phaseAt};enter(c,'transition',now,c.audioVersion===2&&c.game===4?5000:TRANSITION_MS);
}
function nextGame(c,now){
 delete c.transitionFrom;
 if(c.game===4)enter(c,c.audioVersion===2?'gameover':'finale',now,c.audioVersion===2?3000:gate(c.lives>0?28:29));
 else{c.game++;c.audioIndex=0;enter(c,'intro',now,c.audioVersion===2?gate(introNumbers(c.game)[0]):introDuration(c.game));}
}
export function advanceChapter6(s,now=Date.now(),audioEnded=false){
 const c=s.chapter6;
 if(!isChapter6(s)||c.deadline===null||now<c.deadline)return UNCHANGED;
 if(c.audioVersion===2&&phaseCues(c).length&&['intro','result','zero','finale','selected','return'].includes(c.step)&&!audioEnded)return UNCHANGED;
 const end=c.deadline;
 if(c.step==='takeover'){c.audioIndex=0;enter(c,'intro',end,gate(1));}
 else if(c.step==='locked')enter(c,'result',end,c.results[c.game].recording?gate(c.results[c.game].recording):1500);
 else if(c.step==='gameover')enter(c,'finale',end,gate(c.lives>0?28:29));
 else if(c.step==='exposure'){c.audioIndex=1;enter(c,'intro',end,gate(15));}
 else if(c.step==='intro'){
  if(c.audioVersion===2&&c.game===2&&c.audioIndex===0)enter(c,'exposure',now,15000);
  else if(c.audioVersion===2&&c.audioIndex<introNumbers(c.game).length-1){c.audioIndex++;enter(c,'intro',now,gate(introNumbers(c.game)[c.audioIndex]));}
  else enter(c,c.game===4?'silence':'answer',c.audioVersion===2?now:end,answerWindows[c.game]);
 }
 else if(c.step==='answer')return resolve(s,null,now);
 else if(c.step==='silence')enter(c,'verdict',end);
 else if(c.step==='result'){
  if(c.lives===0&&!c.zeroConsumed&&c.game<4){c.zeroConsumed=true;c.zeroAt=now;enter(c,'zero',now,gate(32));}
  else transition(c,now);
 }else if(c.step==='zero')transition(c,now);
 else if(c.step==='transition')nextGame(c,end);
 else if(c.step==='finale'){enter(c,'vote',now);establishElectorate(s);}
 else if(c.step==='selected')enter(c,'waiting',now);
 else if(c.step==='return'){enter(c,'complete',end);c.completedAt=end;}
}
export function withinMazeRun(change){let run,seen=false;return s=>{if(seen&&s.chapter6?.startedAt!==run)throw new LobbyError(409,'The maze run changed.');seen=true;run=s.chapter6?.startedAt;return change(s);};}
export function checkMazeRequest(s,b){
 const c=s.chapter6;if(!isChapter6(s)||b.generation!==s.generation||b.chapter6StartedAt!==c.startedAt)throw new LobbyError(409,'The maze session changed. Refresh your screen.');
 return c;
}
export function mazeHostAction(s,b,now=Date.now()){
 const c=checkMazeRequest(s,b);
 if(b.sequence!==c.sequence)throw new LobbyError(409,'The maze scene changed.');
 if(b.action==='maze-audio-ended'){
  const cues=phaseCues(c);if(c.audioVersion!==2||!['intro','result','zero','finale','selected','return'].includes(c.step)||cues.length!==1||b.recording!==cues[0].number||now<c.deadline)throw new LobbyError(409,'Narration is not complete for this scene.');
  return advanceChapter6(s,now,true);
 }
 if(b.action==='maze-answer'){
  if(c.step!=='answer')throw new LobbyError(409,'The question is not accepting answers.');
  if(now>=c.deadline)return resolve(s,null,now); // Late request commits timeout, never its answer.
  if(!games[c.game].options.some(([id])=>id===b.answer))throw new LobbyError(400,'Choose a listed answer.');
  return resolve(s,b.answer,now);
 }
 if(b.action==='maze-verdict'){
  if(c.step!=='verdict'||c.game!==4)throw new LobbyError(409,'Wait until silence is complete.');
  if(!['pass','fail'].includes(b.answer))throw new LobbyError(400,'Choose Pass or Fail.');
  return resolve(s,b.answer,now);
 }
 if(b.action==='maze-token-return'){
  if(c.tokenReturnedAt!==null)return UNCHANGED;
  if(c.step!=='waiting')throw new LobbyError(409,'Wait for the selected retriever narration.');
  c.tokenReturnedAt=now;enter(c,'return',now,gate(31));return;
 }
 if(b.action==='maze-close-voting'){
  if(c.step!=='vote')throw new LobbyError(409,'Token voting is not active.');
  establishElectorate(s);if(!Object.keys(c.votes).length)throw new LobbyError(409,'Receive at least one valid ballot before closing voting.');
  c.voteClosedAt=now;finalizeTokenVote(s,now);return;
 }
 if(b.action==='maze-test-vote')return simulatedTokenVotes(s,now);
 throw new LobbyError(400,'Unknown maze action.');
}
export function touchMazePresence(s,id,now=Date.now()){
 if(!isChapter6(s)||s.players.find(p=>p.id===id)?.simulated===true)return UNCHANGED;
 const c=s.chapter6;if(now-(c.presence[id]??0)<10000)return UNCHANGED;
 c.presence[id]=now;
 if(c.step==='vote')establishElectorate(s);
}
export function makeTokenVoter(){return (s,id,target,b,now=Date.now())=>{
 const c=checkMazeRequest(s,b);
 if(c.step!=='vote')throw new LobbyError(409,'Token voting is not active.');
 if(s.players.find(p=>p.id===id)?.simulated===true)throw new LobbyError(403,'Only real players vote for the token.');
 if(Object.hasOwn(c.votes,id))throw new LobbyError(409,'Your vote is already recorded.');
 if(!candidatePlayers(s).some(p=>p.id===target)||target===c.macheteId||target===id)throw new LobbyError(400,'Choose another eligible player.');
 establishElectorate(s);
 if(!c.voterIds.includes(id))throw new LobbyError(403,'You were not connected when voting began.');
 c.votes[id]=target;
 if(Object.keys(c.votes).length===c.voterIds.length)finalizeTokenVote(s,now);
};}
export function chapter6Progress(s,playerId){
 if(!isChapter6(s))return null;const c=s.chapter6,name=id=>s.players.find(p=>p.id===id)?.name??'';
 return {audioVersion:c.audioVersion??1,audioIndex:c.audioIndex??0,doorOrder:c.doorOrder??['red','blue','green','black'],startedAt:c.startedAt,previousChapter5StartedAt:s.chapter5.startedAt,phaseAt:c.phaseAt,deadline:c.deadline,step:c.step,...(c.step==='transition'?{transitionFrom:{...c.transitionFrom}}:{}),game:c.game,lives:c.lives,sequence:c.sequence,zeroConsumed:c.zeroConsumed,results:c.results.map(r=>({...r})),screamer:{id:c.screamerId,name:name(c.screamerId)},macheteId:c.macheteId,selectedPlayer:c.selectedPlayerId?{id:c.selectedPlayerId,name:name(c.selectedPlayerId)}:null,completedAt:c.completedAt,voteCount:Object.keys(c.votes).length,voterCount:c.voterIds.length,voteClosedAt:c.voteClosedAt??null,electorateLocked:c.electorateLocked,testMode:c.testMode,
 ...(playerId?{voted:Object.hasOwn(c.votes,playerId),canVote:c.step==='vote'&&s.players.find(p=>p.id===playerId)?.simulated!==true&&(!c.electorateLocked||c.voterIds.includes(playerId)),candidates:candidatePlayers(s).filter(p=>p.id!==c.macheteId&&p.id!==playerId).map(p=>({id:p.id,name:p.name}))}:{})};
}
function simulatedTokenVotes(s,now){
 const c=s.chapter6,sim=s.players.filter(p=>p.simulated===true);
 if(!c.testMode||c.step!=='vote'||!sim.length)throw new LobbyError(409,'Simulated voting is only available in test mode during token voting.');
 if(sim.every(p=>Object.hasOwn(c.votes,p.id)))return UNCHANGED;
 if(Object.keys(c.votes).length)throw new LobbyError(409,'Run the simulated helper before any real ballots.');
 establishElectorate(s);const real=realPlayers(s).filter(p=>c.voterIds.includes(p.id));
 if(!real.length)throw new LobbyError(409,'Keep at least one real test phone connected.');
 c.voterIds=[...real,...sim].map(p=>p.id);c.electorateLocked=true;
 for(const p of sim)c.votes[p.id]=candidatePlayers(s).find(q=>q.id!==p.id&&q.id!==c.macheteId).id;
}
// Build Chapter 6's test prerequisite by exercising the approved Chapter 5
// mutation functions with server-generated clocks. Existing players/tokens remain.
export function makeMazeTestSelector(){const base=makeCastingTestSelector('chapter5');let prepared;return s=>{
 if(!prepared){base(s);const c=s.chapter5;
  c.readyAt=c.startedAt+CHAPTER5_INTRO_MS;c.rulesStartedAt=c.readyAt;s.phase='chapter5-casting';
  let at=c.rulesStartedAt+CHAPTER5_RULES_MS;
  for(const [i,r] of c.rounds.entries()){
   const winner=s.players[i],alternative=s.players[i+1];r.startedAt=at;r.votes=Object.fromEntries(s.players.map(p=>[p.id,p.id===winner.id?alternative.id:winner.id]));r.winnerPlayerId=winner.id;r.completedAt=at+castingVotingOffset(r.id,1);at=r.completedAt+castingCompletionMs(r.id,1);
  }
  c.roundIndex=5;c.castStartedAt=at;c.completedAt=at+castingFinaleMs(1);
  // Shift all prerequisite clocks together so the test starts now, not in the future.
  const shift=Date.now()-c.completedAt;
  s.startedAt+=shift;s.photo.promptedAt+=shift;s.photo.confirmedAt+=shift;
  for(const field of ['startedAt','privateMessagesActivatedAt','completedAt'])s.chapter3[field]+=shift;
  for(const a of Object.values(s.chapter3.assignments)){a.openedAt+=shift;a.readAt+=shift;}
  for(const field of ['startedAt','votingActivatedAt','completedAt'])s.chapter4[field]+=shift;
  s.packageOpenedAt+=shift;
  for(const field of ['startedAt','readyAt','rulesStartedAt','castStartedAt','completedAt'])c[field]+=shift;
  for(const r of c.rounds){r.startedAt+=shift;r.completedAt+=shift;}
  s.phase='chapter5-complete';startChapter6(s);s.chapter6.testMode=true;prepared=structuredClone(s);
 }else{Object.assign(s,structuredClone(prepared));}
};}
export function makeFinalCastTestSelector(){const build=makeMazeTestSelector();let prepared;return s=>{
 if(prepared){Object.assign(s,structuredClone(prepared));return;}
 const prior=structuredClone(s),complete=prior.chapter5?.rounds?.every(r=>r.completedAt!==null&&r.winnerPlayerId);
 build(s);const generation=s.generation;
 if(complete){Object.assign(s,prior);s.generation=generation;}
 else if(prior.chapter5){
  // This explicit testing jump may supply unfinished roles, but keeps every
  // actual completed assignment and ballot. Only synthetic clocks are used.
  const assigned=new Set(prior.chapter5.rounds.filter(r=>r.completedAt!==null).map(r=>r.winnerPlayerId));
  const available=s.players.filter(p=>!assigned.has(p.id));
  for(const [i,r] of s.chapter5.rounds.entries()){
   const actual=prior.chapter5.rounds[i];
   if(actual.completedAt!==null){r.winnerPlayerId=actual.winnerPlayerId;r.votes=structuredClone(actual.votes);}
   else{const winner=available.shift(),alternative=available[0];r.winnerPlayerId=winner.id;r.votes=Object.fromEntries(s.players.map(p=>[p.id,p.id===winner.id?alternative.id:winner.id]));}
  }
  if(prior.chapter5.eligibilityVersion!==1)delete s.chapter5.eligibilityVersion;
  const holder=prior.macheteHolderPlayerId;if(holder){s.chapter4.selectedPlayerId=holder;s.macheteHolderPlayerId=holder;s.chapter4.votes=Object.fromEntries(s.players.map(p=>[p.id,p.id===holder?s.players.find(q=>q.id!==holder).id:holder]));}
 }
 delete s.chapter6;const c=s.chapter5;c.navigationId=generation;c.castStartedAt=Date.now();c.completedAt=null;s.phase='chapter5-finale';
 prepared=structuredClone(s);
};}
