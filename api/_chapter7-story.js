import {randomUUID} from 'node:crypto';
import {LobbyError,UNCHANGED} from './_state.js';
import {tokenVoteWinner} from './_chapter6.js';
import {narrationOrder,theories,storyRecording,timedScenes,storyCheckpoints,PHOTO_ENHANCED_MS,narrationDuration,sceneDuration} from '../chapter7-story-timing.js';
const realPlayers=s=>s.players.filter(p=>p.simulated!==true);
const theoryIds=theories.map(t=>t[0]);
const validSteps=['connection','theory2-transition','theory3-transition','narrator-transition',...narrationOrder,'interlude','theory-vote','vote-fade','spoken','theory-reveal','theory-fade','silent-black','scare','after-scare','incoming','message-hold','envelope-vote','retriever-fallback','retriever-reveal','envelope-waiting','photograph','photo-hold','ending-fade','complete'];
export function previousRetrievers(s){
 const ids=new Set();
 function visit(value,path=''){
  if(!value||typeof value!=='object')return;
  for(const [k,v] of Object.entries(value)){
   if(k==='chapter7')continue;
   if(typeof v==='string'&&(k==='macheteHolderPlayerId'||k==='selectedPlayerId'||/^(retrieverId|retrieverPlayerId|selectedRetrieverId)$/.test(k)))ids.add(v);
   if(typeof v==='string'&&k==='playerId'&&/retriev|physical|machete|envelope|package/i.test(path))ids.add(v);
   if(Array.isArray(v)&&/retriev.*Ids$/i.test(k))for(const id of v)if(typeof id==='string')ids.add(id);
   if(typeof v==='object')visit(v,path+'/'+k);
  }
 }
 visit(s);return ids;
}
export const envelopeCandidates=s=>realPlayers(s).filter(p=>!previousRetrievers(s).has(p.id));
export function startInvestigation(s,now=Date.now()){
 const c=s.chapter7;if(s.phase!=='chapter7'||c.step!=='waiting'||c.investigation)return UNCHANGED;
 c.investigation={polishVersion:2,id:randomUUID(),startedAt:now,sequence:0,step:'connection',phaseAt:now,deadline:now+timedScenes.connection,audioStartedAt:null,offsetMs:0,presence:{},elections:{},testMode:s.players.some(p=>p.simulated===true),testSetup:null,hostRetriever:false,envelopeReturnedAt:null,completedAt:null};c.sequence++;
}
function enter(s,step,now,extra={}){
 const i=s.chapter7.investigation;i.polishVersion=2;i.step=step;i.phaseAt=now;i.deadline=sceneDuration(i,step)===undefined?null:now+sceneDuration(i,step);i.audioStartedAt=null;i.offsetMs=0;delete i.next;Object.assign(i,extra);i.sequence++;s.chapter7.sequence++;
}
function interlude(s,next,now){enter(s,'interlude',now,{next});}
const electionKey=i=>i.step==='theory-vote'?'theory':'envelope';
function election(i,key){return i.testMode?i.testElections?.[key]:i.elections[key];}
function connectedVoters(s,now){const i=s.chapter7.investigation,seen=realPlayers(s).filter(p=>Number.isFinite(i.presence[p.id])&&now-i.presence[p.id]<=120000);return [...(i.testMode?realPlayers(s):seen.length?seen:realPlayers(s)),...(i.testMode?s.players.filter(p=>p.simulated===true):[])].map(p=>p.id);}
// Host-created simulated identities are durable test-cast evidence, not phone presence.
// Repair only unfinished legacy Chapter 7 test polls; never rewrite saved real results.
function simulatedRecoveryDue(s){
 const i=s.chapter7?.investigation;if(!i||!s.players.some(p=>p.simulated===true))return false;
 if(!i.testMode)return true;
 const e=i.testElections?.envelope;if(!e||e.closedAt!==null)return false;
 const eligible=s.players.filter(p=>!previousRetrievers(s).has(p.id));
 return s.players.some(p=>!e.voterIds.includes(p.id))||eligible.some(p=>!e.candidateIds.includes(p.id))||i.step==='retriever-fallback'&&eligible.length>0;
}
export function recoverSimulatedSession(s,now=Date.now()){
 const i=s.chapter7?.investigation;if(!i||!s.players.some(p=>p.simulated===true))return false;
 let changed=false;
 if(!i.testMode){i.testMode=true;i.testElections={...structuredClone(i.elections),...i.testElections};changed=true;}
 const e=i.testElections?.envelope;
 if(e&&e.closedAt===null){
  const voters=s.players.map(p=>p.id),candidates=s.players.filter(p=>!previousRetrievers(s).has(p.id)).map(p=>p.id);
  for(const id of voters)if(!e.voterIds.includes(id)){e.voterIds.push(id);changed=true;}
  for(const id of candidates)if(!e.candidateIds.includes(id)){e.candidateIds.push(id);changed=true;}
  if(i.step==='retriever-fallback'&&e.voterIds.length&&e.candidateIds.length){enter(s,'envelope-vote',now);changed=true;}
 }
 return changed;
}
function openElection(s,key,now){
 recoverSimulatedSession(s,now);
 const i=s.chapter7.investigation,store=i.testMode?(i.testElections??={}):i.elections;
 if(store[key])return;
 store[key]={id:randomUUID(),openedAt:now,voterIds:connectedVoters(s,now),candidateIds:key==='theory'?[...theoryIds]:(i.testMode?s.players.filter(p=>!previousRetrievers(s).has(p.id)):envelopeCandidates(s)).map(p=>p.id),votes:{},closedAt:null,winnerId:null};
}
function beginVote(s,key,now){openElection(s,key,now);const i=s.chapter7.investigation,e=election(i,key);if(e.closedAt!==null){if(key==='envelope'&&i.envelopeReturnedAt!==null)interlude(s,'photograph',now);else enter(s,key==='theory'?'vote-fade':'retriever-reveal',now);return;}enter(s,key==='envelope'&&(!e.candidateIds.length||!e.voterIds.length)?'retriever-fallback':key+'-vote',now);}
function winner(s,e){return tokenVoteWinner({...s,chapter6:{startedAt:e.openedAt,votes:e.votes}});}
function closeElection(s,key,now,reason){
 const i=s.chapter7.investigation,e=election(i,key);if(e.closedAt!==null)return UNCHANGED;
 if(!Object.keys(e.votes).length)throw new LobbyError(409,'At least one vote is required before closing voting.');
 e.winnerId=winner(s,e);e.closedAt=now;e.closeReason=reason;
 // Finish the single native ring before showing an early completed result.
 if(key==='envelope'&&i.step==='incoming')return;
 enter(s,key==='theory'?'vote-fade':'retriever-reveal',now);
}
export function touchInvestigationPresence(s,id,now=Date.now()){
 const i=s.chapter7?.investigation;if(s.phase!=='chapter7'||!i||!realPlayers(s).some(p=>p.id===id)||now-(i.presence[id]??0)<10000)return UNCHANGED;
 i.presence[id]=now;
}
export function checkInvestigation(s,b){
 const i=s.chapter7?.investigation;
 if(s.phase!=='chapter7'||!i||b.generation!==s.generation||b.broadcastId!==s.chapter7.id||b.investigationId!==i.id)throw new LobbyError(409,'The investigation changed. Refresh your screen.');
 return i;
}
export function investigationVote(s,id,target,b,now=Date.now()){
 const i=checkInvestigation(s,b),key=b.election;
 if(!['theory','envelope'].includes(key)||!realPlayers(s).some(p=>p.id===id))throw new LobbyError(403,'Only real participants can vote.');
 const e=election(i,key);if(!e||e.id!==b.electionId)throw new LobbyError(409,'The vote changed.');
 if(Object.hasOwn(e.votes,id)){if(e.votes[id]===target)return UNCHANGED;throw new LobbyError(409,'Your vote is already recorded.');}
 if(!(i.step===key+'-vote'||key==='envelope'&&i.step==='incoming')||e.closedAt!==null||b.sequence!==i.sequence)throw new LobbyError(409,'Voting is not active.');
 if(!e.voterIds.includes(id))throw new LobbyError(403,'You were not in the connected voting group when voting opened.');
 if(!e.candidateIds.includes(target))throw new LobbyError(400,'Choose an eligible option.');
 e.votes[id]=target;
 if(Object.keys(e.votes).length===e.voterIds.length)closeElection(s,key,now,'all');
}
export function advanceInvestigation(s,now=Date.now()){
 const i=s.chapter7?.investigation;if(!i)return startInvestigation(s,now);
 const repaired=recoverSimulatedSession(s,now);
 if(i.step==='scare'){enter(s,'silent-black',now);return;}
 if(i.deadline===null||now<i.deadline)return repaired?undefined:UNCHANGED;
 const next={connection:'narrator','vote-fade':'spoken',spoken:'theory-reveal','theory-reveal':'theory-fade','theory-fade':'silent-black','silent-black':'incoming','after-scare':'incoming','retriever-reveal':'envelope-waiting','photo-hold':'ending-fade','ending-fade':'complete','theory2-transition':'premeditation','theory3-transition':'accomplice','narrator-transition':'vote-intro'}[i.step];
 if(i.step==='interlude'){if(i.next==='theory-vote')beginVote(s,'theory',now);else enter(s,i.next,now);return;}
 if(i.step==='message-hold'){beginVote(s,'envelope',now);return;}
 if(!next)return UNCHANGED;
 enter(s,next,now);if(next==='incoming')openElection(s,'envelope',now);if(next==='complete')i.completedAt=now;
}
export function investigationHostAction(s,b,now=Date.now()){
 const i=checkInvestigation(s,b);
 if(b.action==='investigation-envelope-return'&&i.envelopeReturnedAt!==null&&i.step!=='envelope-waiting')return UNCHANGED;
 if(b.sequence!==i.sequence)throw new LobbyError(409,'The investigation scene changed.');
 if(b.action==='investigation-test-vote'){
  if(!i.testMode)throw new LobbyError(403,'Enable an explicit Chapter 7 test checkpoint first.');
  if(!['theory-vote','envelope-vote','incoming'].includes(i.step))throw new LobbyError(409,'Voting is not active.');
  const key=electionKey(i),e=election(i,key);
  if(!e||e.id!==b.electionId||b.election!==key)throw new LobbyError(409,'The test vote changed.');
  if(!b.votes||Array.isArray(b.votes)||typeof b.votes!=='object'||!Object.keys(b.votes).length)throw new LobbyError(400,'Assign simulated test votes.');
  for(const [id,target] of Object.entries(b.votes)){
   if(!s.players.some(p=>p.id===id&&p.simulated===true)||!e.voterIds.includes(id))throw new LobbyError(403,'Only simulated voters can be controlled here.');
   if(!e.candidateIds.includes(target))throw new LobbyError(400,'Choose an eligible option.');
   if(Object.hasOwn(e.votes,id)&&e.votes[id]!==target)throw new LobbyError(409,'A simulated vote is already recorded.');
  }
  let changed=false;for(const [id,target] of Object.entries(b.votes))if(!Object.hasOwn(e.votes,id)){e.votes[id]=target;changed=true;}
  if(!changed)return UNCHANGED;
  if(Object.keys(e.votes).length===e.voterIds.length)closeElection(s,key,now,'all');
  return;
 }
 if(b.action==='investigation-photo-sound'){
  if(!(i.polishVersion>=2)||i.step!=='photograph'||i.offsetMs!==0||i.photoSoundPlayedAt!=null)return UNCHANGED;
  i.photoSoundPlayedAt=now;return {playSound:true};
 }
 const cue=storyRecording(i.step);
 if(b.action==='investigation-audio-playing'){
  if(!cue||b.recording!==cue.id)throw new LobbyError(409,'No recording belongs to this scene.');
  if(i.audioStartedAt!==null)return UNCHANGED;
  i.audioStartedAt=now;return;
 }
 if(b.action==='investigation-audio-ended'){
  if(!cue||b.recording!==cue.id||i.audioStartedAt===null||now<i.audioStartedAt+narrationDuration(i)-i.offsetMs-250)throw new LobbyError(409,'The recording has not finished.');
  if(i.step==='photograph'){enter(s,'photo-hold',now);return;}
  if(i.step==='incoming'){beginVote(s,'envelope',now);return;}
  if(i.polishVersion>=1&&i.step==='officer'){interlude(s,'reaction',now);return;}
  const transition={reaction:'theory2-transition',premeditation:'theory3-transition',accomplice:'narrator-transition'}[i.step];
  if(transition){enter(s,transition,now);return;}
  const index=narrationOrder.indexOf(i.step);interlude(s,narrationOrder[index+1]??'theory-vote',now);return;
 }
 if(b.action==='investigation-close-voting'){
  if(!['theory-vote','envelope-vote','incoming'].includes(i.step))throw new LobbyError(409,'Voting is not active.');
  return closeElection(s,electionKey(i),now,'host');
 }
 if(b.action==='investigation-host-retrieval'){
  if(i.step!=='retriever-fallback')throw new LobbyError(409,'The host fallback is not active.');
  if(!i.testMode)i.hostRetrievalAt??=now;
  i.hostRetriever=true;enter(s,'envelope-waiting',now);return;
 }
 if(b.action==='investigation-envelope-return'){
  if(i.step!=='envelope-waiting')throw new LobbyError(409,'Wait for the envelope retriever.');
  i.envelopeReturnedAt??=now;interlude(s,'photograph',now);return;
 }
 throw new LobbyError(400,'Unknown investigation action.');
}
export function investigationProgress(s,playerId){
 const i=s.chapter7?.investigation;if(!i)return null;
 const active=['theory-vote','envelope-vote','incoming'].includes(i.step)?election(i,electionKey(i)):null;
 const theory=election(i,'theory')?.winnerId??i.testSetup?.theoryId??null;
 const retriever=election(i,'envelope')?.winnerId??i.testSetup?.retrieverId??null;
 const p=s.players.find(p=>p.id===retriever);
 return {needsRecovery:simulatedRecoveryDue(s),polishVersion:i.polishVersion??0,id:i.id,startedAt:i.startedAt,sequence:i.sequence,step:i.step,phaseAt:i.phaseAt,deadline:i.deadline,audioStartedAt:i.audioStartedAt,offsetMs:i.offsetMs,photoSoundPlayedAt:i.photoSoundPlayedAt??null,testMode:i.testMode,completedAt:i.completedAt,hostRetriever:i.hostRetriever,
  winningTheory:['theory-vote','vote-fade','spoken'].includes(i.step)?null:theory,
  selectedPlayer:p?{id:p.id,name:p.name}:null,
  election:active?{id:active.id,key:electionKey(i),voteCount:Object.keys(active.votes).length,voterCount:active.voterIds.length,closed:active.closedAt!==null,testData:i.testMode,simulatedVoteCount:Object.keys(active.votes).filter(id=>s.players.some(p=>p.id===id&&p.simulated)).length,...(playerId?{voted:Object.hasOwn(active.votes,playerId),canVote:active.closedAt===null&&active.voterIds.includes(playerId),candidates:active.candidateIds.map(id=>active===election(i,'theory')?{id,name:theories.find(t=>t[0]===id)?.[1],description:theories.find(t=>t[0]===id)?.[2]}:{id,name:s.players.find(p=>p.id===id)?.name??''})}:{})}:null};
}
export function validateInvestigation(s){
 const i=s.chapter7.investigation;if(!i)return;
 if(typeof i.id!=='string'||!i.id||!Number.isFinite(i.startedAt)||!validSteps.includes(i.step)||!Number.isInteger(i.sequence)||i.sequence<0||!Number.isFinite(i.phaseAt)||!Number.isFinite(i.offsetMs)||i.offsetMs<0||i.audioStartedAt!==null&&!Number.isFinite(i.audioStartedAt)||typeof i.testMode!=='boolean'||!i.presence||!i.elections)throw Error('Invalid Chapter 7 investigation.');
 if(i.polishVersion!==undefined&&![1,2].includes(i.polishVersion)||i.photoSoundPlayedAt!=null&&!Number.isFinite(i.photoSoundPlayedAt))throw Error('Invalid investigation polish metadata.');
 if(sceneDuration(i)===undefined?i.deadline!==null:i.deadline!==i.phaseAt+sceneDuration(i))throw Error('Invalid investigation clock.');
 const players=new Set(s.players.map(p=>p.id));
 for(const store of [i.elections,i.testElections??{}])for(const [key,e] of Object.entries(store)){
  if(!['theory','envelope'].includes(key)||typeof e.id!=='string'||!Array.isArray(e.voterIds)||new Set(e.voterIds).size!==e.voterIds.length||e.voterIds.some(id=>!players.has(id))||!Array.isArray(e.candidateIds)||new Set(e.candidateIds).size!==e.candidateIds.length||e.candidateIds.some(id=>key==='theory'?!theoryIds.includes(id):!players.has(id))||!e.votes||Object.entries(e.votes).some(([id,target])=>!e.voterIds.includes(id)||!e.candidateIds.includes(target))||!Number.isFinite(e.openedAt))throw Error('Invalid investigation ballot.');
  if(e.closedAt===null?e.winnerId!==null:!Number.isFinite(e.closedAt)||e.winnerId!==winner(s,e))throw Error('Invalid investigation outcome.');
 }
}
export function selectInvestigationCheckpoint(s,checkpoint,b,now=Date.now()){
 const target=storyCheckpoints.find(c=>c[0]===checkpoint)?.[2];if(!target)throw new LobbyError(400,'Unknown investigation checkpoint.');
 startInvestigation(s,now);const i=s.chapter7.investigation;
 if(!i)throw new LobbyError(409,'Finish or explicitly skip the broadcast first.');
 i.polishVersion=2;i.testMode=b.testMode===true||s.players.some(p=>p.simulated===true);i.testSetup=null;i.hostRetriever=false;
 const theory=election(i,'theory')?.winnerId,retriever=election(i,'envelope')?.winnerId;
 if(['envelope-waiting','photograph'].includes(target)&&Number.isFinite(i.hostRetrievalAt)&&!b.testRetrieverId)i.hostRetriever=true;
 const needsTheory=['spoken','theory-reveal'].includes(target),needsRetriever=['envelope-waiting','photograph'].includes(target)&&!i.hostRetriever;
 if(needsTheory&&!theory||needsRetriever&&!retriever){
  if(!i.testMode)throw new LobbyError(409,'This checkpoint needs a saved result. Explicitly enable test mode and choose a test outcome. Saved votes will remain unchanged.');
  if(needsTheory&&!theory&&!theoryIds.includes(b.testTheory))throw new LobbyError(400,'Choose a test theory.');
  if(needsRetriever&&!retriever&&!(i.testMode?s.players.filter(p=>!previousRetrievers(s).has(p.id)):envelopeCandidates(s)).some(p=>p.id===b.testRetrieverId))throw new LobbyError(400,'Choose an eligible test retriever.');
  i.testSetup={theoryId:theory??b.testTheory??null,retrieverId:retriever??b.testRetrieverId??null};
 }
 if(target==='theory-vote'||target==='envelope-vote'){
  const key=target==='theory-vote'?'theory':'envelope';
  if(i.testMode&&election(i,key)?.closedAt!==null&&election(i,key)){(i.testHistory??=[]).push({key,...structuredClone(election(i,key))});delete i.testElections[key];}
  if(election(i,key)?.closedAt!==null&&election(i,key))throw new LobbyError(409,'This vote is already final. Enable a separate test vote to rehearse it.');
  beginVote(s,key,now);
 }else {enter(s,target,now);if(target==='incoming')openElection(s,'envelope',now);}
 if(target==='photograph'){delete i.photoSoundPlayedAt;}
 if(checkpoint==='chapter7-window'){i.offsetMs=PHOTO_ENHANCED_MS;i.photoSoundPlayedAt=now;}
}
