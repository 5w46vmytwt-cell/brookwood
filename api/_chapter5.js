import {randomInt} from 'node:crypto';
import {LobbyError,UNCHANGED,validChapter3Cast,validateChapter4,makeTestChapterSelector} from './_state.js';
import {castingRoles,chapter5Phases,CHAPTER5_INTRO_MS,CHAPTER5_FINALE_MS,castingVotingOffset,castingRevealOffset,castingCompletionMs} from '../chapter5-timing.js';

export const isChapter5=s=>chapter5Phases.includes(s.phase);
const positive=t=>Number.isFinite(t)&&t>0;
const freshChapter5=startedAt=>({startedAt,roundIndex:0,rounds:castingRoles.map(r=>({id:r.id,startedAt:null,votes:{},winnerPlayerId:null,completedAt:null})),castStartedAt:null,completedAt:null});
export function validatePackage(s){
  if(!positive(s.packageOpenedAt)||s.macheteHolderPlayerId!==s.chapter4?.selectedPlayerId||s.packageOpenedAt<s.chapter4.completedAt)throw Error('Invalid package confirmation.');
}
export function validateChapter5(s){
  validateChapter4({...s,phase:'door-vote-complete'});validatePackage(s);
  const c=s.chapter5,cast=new Set(s.players.map(p=>p.id));
  if(!validChapter3Cast(s)||!c||!positive(c.startedAt)||c.startedAt<s.packageOpenedAt||!Array.isArray(c.rounds)||c.rounds.length!==6||!Number.isInteger(c.roundIndex)||c.roundIndex<0||c.roundIndex>5)throw Error('Invalid Chapter 5 state.');
  for(const [i,r] of c.rounds.entries()){
    if(r.id!==castingRoles[i].id||!r.votes||Array.isArray(r.votes)||typeof r.votes!=='object')throw Error('Invalid casting round.');
    const entries=Object.entries(r.votes);
    if(entries.some(([v,t])=>!cast.has(v)||!cast.has(t)||v===t))throw Error('Invalid casting ballot.');
    if(r.startedAt===null){if(entries.length||r.completedAt!==null||r.winnerPlayerId!==null)throw Error('Invalid future round.');}
    else if(!positive(r.startedAt)||r.startedAt<(i===0?c.startedAt+CHAPTER5_INTRO_MS:c.rounds[i-1].completedAt+castingCompletionMs(c.rounds[i-1].id)-(r.id==='killer'?0:500)))throw Error('Invalid casting clock.');
    if(r.completedAt===null){if(entries.length>=12||r.winnerPlayerId!==null)throw Error('Invalid incomplete casting round.');}
    else{
      const counts=new Map();for(const [,id] of entries)counts.set(id,(counts.get(id)||0)+1);
      if(entries.length!==12||!positive(r.completedAt)||r.startedAt===null||r.completedAt<r.startedAt+castingVotingOffset(r.id)||!cast.has(r.winnerPlayerId)||counts.get(r.winnerPlayerId)!==Math.max(...counts.values()))throw Error('Invalid casting winner.');
    }
    if(i<c.roundIndex&&r.completedAt===null)throw Error('Missing prior casting result.');
    if(i>c.roundIndex&&r.startedAt!==null)throw Error('Started future casting round.');
  }
  if(s.phase==='chapter5-intro'&&(c.roundIndex!==0||c.rounds.some(r=>r.startedAt!==null)))throw Error('Invalid casting introduction.');
  if(s.phase==='chapter5-casting'&&c.rounds[c.roundIndex].startedAt===null)throw Error('Missing casting round clock.');
  const finale=['chapter5-finale','chapter5-complete'].includes(s.phase);
  if(finale){if(c.roundIndex!==5||c.rounds.some(r=>r.completedAt===null)||!positive(c.castStartedAt)||c.castStartedAt<c.rounds[5].completedAt+castingCompletionMs('killer'))throw Error('Invalid final cast.');}
  else if(c.castStartedAt!==null||c.completedAt!==null)throw Error('Premature casting finale.');
  if(s.phase==='chapter5-finale'&&c.completedAt!==null)throw Error('Premature Chapter 5 completion.');
  if(s.phase==='chapter5-complete'&&(!positive(c.completedAt)||c.completedAt<c.castStartedAt+CHAPTER5_FINALE_MS))throw Error('Invalid Chapter 5 completion.');
}
export function withinCastingRun(change){let seen=false,run,index;return s=>{
  if(seen&&(s.chapter5?.startedAt!==run||s.chapter5?.roundIndex!==index))throw new LobbyError(409,'The casting round changed. Refresh your phone.');
  seen=true;run=s.chapter5?.startedAt;index=s.chapter5?.roundIndex;return change(s);
};}
export function openPackage(s,playerId,run){
  if(!s.chapter4||run!==s.chapter4.startedAt)throw new LobbyError(409,'The package run changed.');
  if(playerId!==s.chapter4.selectedPlayerId)throw new LobbyError(403,'Only the selected player may open the package.');
  if(isChapter5(s)){validatePackage(s);return UNCHANGED;}
  if(s.phase!=='door-vote-complete')throw new LobbyError(409,'Complete door voting first.');
  validateChapter4(s);const now=Date.now();s.packageOpenedAt=now;s.macheteHolderPlayerId=playerId;
  s.chapter5=freshChapter5(now);s.phase='chapter5-intro';
}
export function advanceCasting(s){
  if(!isChapter5(s)||s.phase==='chapter5-complete')return UNCHANGED;
  const c=s.chapter5,now=Date.now();
  if(s.phase==='chapter5-intro'){
    if(now<c.startedAt+CHAPTER5_INTRO_MS)return UNCHANGED;
    c.rounds[0].startedAt=c.startedAt+CHAPTER5_INTRO_MS;s.phase='chapter5-casting';return;
  }
  if(s.phase==='chapter5-finale'){
    if(now<c.castStartedAt+CHAPTER5_FINALE_MS)return UNCHANGED;
    c.completedAt=c.castStartedAt+CHAPTER5_FINALE_MS;s.phase='chapter5-complete';return;
  }
  const r=c.rounds[c.roundIndex];
  if(r.completedAt===null||now<r.completedAt+castingCompletionMs(r.id))return UNCHANGED;
  const next=r.completedAt+castingCompletionMs(r.id);
  if(c.roundIndex===5){c.castStartedAt=next;s.phase='chapter5-finale';}
  else{c.roundIndex++;const upcoming=c.rounds[c.roundIndex];
    // Share the outgoing black tail with the next card's initial 500ms black;
    // do not accidentally add another half-second to the specified transition.
    upcoming.startedAt=next-(upcoming.id==='killer'?0:500);
  }
}
export function makeCastingVoter(choose=randomInt){
  const decisions=new Map();
  return (s,entries,run,roleId)=>{
    if(!isChapter5(s)||s.phase!=='chapter5-casting'||run!==s.chapter5.startedAt)throw new LobbyError(409,'Casting is not active for this run.');
    const r=s.chapter5.rounds[s.chapter5.roundIndex],cast=new Set(s.players.map(p=>p.id));
    if(roleId!==r.id)throw new LobbyError(409,'The casting round changed.');
    if(Date.now()<r.startedAt+castingVotingOffset(r.id))throw new LobbyError(409,'Wait for the role card.');
    if(entries.some(([v,t])=>typeof t!=='string'||!cast.has(v)||!cast.has(t)||v===t))throw new LobbyError(400,'Choose another current player.');
    const pending=entries.filter(([id])=>!Object.hasOwn(r.votes,id));if(!pending.length)return UNCHANGED;
    if(r.completedAt!==null)throw new LobbyError(409,'Casting is complete for this role.');
    for(const [id,target] of pending)r.votes[id]=target;
    if(Object.keys(r.votes).length===12){
      const counts=new Map();for(const id of Object.values(r.votes))counts.set(id,(counts.get(id)||0)+1);
      const max=Math.max(...counts.values()),leaders=[...counts].filter(([,n])=>n===max).map(([id])=>id).sort(),key=r.id+JSON.stringify(leaders);
      if(!decisions.has(key))decisions.set(key,leaders[choose(leaders.length)]);
      r.winnerPlayerId=decisions.get(key);r.completedAt=Date.now();
    }
  };
}
export function chapter5Progress(s,playerId){
  if(!isChapter5(s))return null;
  const c=s.chapter5,now=Date.now(),r=c.rounds[c.roundIndex],player=id=>{const p=s.players.find(p=>p.id===id);return p?{id:p.id,name:p.name}:null;};
  const revealed=round=>round.completedAt!==null&&now>=round.completedAt+castingRevealOffset(round.id);
  return {startedAt:c.startedAt,roundIndex:c.roundIndex,castStartedAt:c.castStartedAt,completedAt:c.completedAt,
    round:{id:r.id,title:castingRoles[c.roundIndex].title,setup:castingRoles[c.roundIndex].setup,question:castingRoles[c.roundIndex].question,startedAt:r.startedAt,completedAt:r.completedAt,votingActive:s.phase==='chapter5-casting'&&r.completedAt===null&&now>=r.startedAt+castingVotingOffset(r.id),
      voteCount:Object.keys(r.votes).length,winner:revealed(r)?player(r.winnerPlayerId):null,...(playerId?{voted:Object.hasOwn(r.votes,playerId)}:{})},
    winners:c.rounds.filter(revealed).map(r=>({roleId:r.id,title:castingRoles.find(role=>role.id===r.id).title,player:player(r.winnerPlayerId)}))};
}
export function packageProgress(s){const p=s.players.find(p=>p.id===s.macheteHolderPlayerId);return s.packageOpenedAt?{openedAt:s.packageOpenedAt,holderPlayer:p?{id:p.id,name:p.name}:null}:null;}
export function makeCastingTestSelector(checkpoint){
  const base=makeTestChapterSelector('chapter4');let prepared;
  return s=>{
    if(!prepared){const now=Date.now();prepared={now,chapter5At:Math.max(now,(s.chapter5?.startedAt??0)+1),oldDoor:s.chapter4?.startedAt};}
    base(s);const now=prepared.now,c=s.chapter4;
    c.startedAt=now-114474-(now-114474===prepared.oldDoor?1:0);c.votingActivatedAt=c.startedAt+114474;c.completedAt=now;
    s.chapter3.startedAt=c.startedAt-16600;s.chapter3.privateMessagesActivatedAt=c.startedAt-4000;s.chapter3.completedAt=c.startedAt-2000;
    for(const a of Object.values(s.chapter3.assignments)){a.openedAt=s.chapter3.completedAt;a.readAt=s.chapter3.completedAt;}
    s.startedAt=s.chapter3.startedAt-88000;s.photo.promptedAt=s.chapter3.startedAt;s.photo.confirmedAt=s.chapter3.startedAt;
    const selected=s.players.find(p=>!p.simulated)||s.players[0];c.selectedPlayerId=selected.id;
    c.votes=Object.fromEntries(s.players.map(p=>[p.id,p.id===selected.id?s.players.find(q=>q.id!==p.id).id:selected.id]));s.phase='door-vote-complete';
    if(checkpoint==='chapter5'){openPackage(s,selected.id,c.startedAt);s.chapter5.startedAt=prepared.chapter5At;}
  };
}
