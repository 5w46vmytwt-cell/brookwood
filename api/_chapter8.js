import {startFinale,finaleHostAction,advanceFinale,validateFinale} from './_chapter8-finale.js';
import {finaleCheckpoints,finaleCues} from '../chapter8-finale-timing.js';
import {randomUUID} from 'node:crypto';
import {LobbyError,UNCHANGED} from './_state.js';
import {CLUE_IDS,PUZZLE_FADE_MS,narrationFor} from '../chapter8-puzzle.js';

export const isChapter8=s=>s.phase==='chapter8';
export const chapter8Checkpoints=['chapter8','chapter8-puzzle',...finaleCheckpoints];
function enter(s,step,now){const c=s.chapter8;c.step=step;c.phaseAt=now;c.audioStartedAt=null;c.deadline=step==='leaving'?now+PUZZLE_FADE_MS:null;c.sequence++;}
// Prepare run IDs and clocks once per authenticated request, outside CAS retries.
export function makeChapter8Starter(body={},checkpoint=null){
 const id=randomUUID(),now=Date.now();return s=>{
  if(checkpoint&&!chapter8Checkpoints.includes(checkpoint))throw new LobbyError(400,'Unknown Chapter 8 checkpoint.');
  if(!checkpoint){
   if(body.generation!==s.generation)throw new LobbyError(409,'The session changed.');
   if(isChapter8(s))return UNCHANGED;
   if(s.phase!=='chapter7'||s.chapter7?.id!==body.chapter7Id||s.chapter7?.investigation?.step!=='complete')throw new LobbyError(409,'Finish Chapter 7 before continuing.');
  }
  const target=checkpoint==='chapter8-puzzle'?'puzzle':'unexpected-evidence';
  if(!s.chapter8)s.chapter8={id,startedAt:now,step:target,phaseAt:now,audioStartedAt:null,deadline:null,sequence:0,revealedClues:[],photoSentAt:null,puzzleStartedAt:target==='puzzle'?now:null,completedAt:null};
  else {if(isChapter8(s)&&s.chapter8.step===target&&!finaleCheckpoints.includes(checkpoint))return UNCHANGED;enter(s,target,now);if(target==='puzzle')s.chapter8.puzzleStartedAt??=now;s.chapter8.completedAt=null;}
  if(finaleCheckpoints.includes(checkpoint)){const index=finaleCues.findIndex(c=>c.id===(checkpoint==='chapter8-finale-after-news'?'wife-16':checkpoint==='chapter8-finale-news'?'breaking-news':checkpoint==='chapter8-finale-silence'?'living-silence':'handoff'));startFinale(s.chapter8,now,index);s.chapter8.finale.testEntry=true;}else if(checkpoint)delete s.chapter8.finale;
  s.phase='chapter8';
 };
}
// A public progress request can only cross the already-completed Chapter 7 boundary.
// The starter is prepared once per request and CAS retries resume an existing run.
export function makeAutomaticChapter8Starter(){const body={},start=makeChapter8Starter(body);return s=>{if(isChapter8(s)||s.phase!=='chapter7'||s.chapter7?.investigation?.step!=='complete')return UNCHANGED;if(s.chapter8){s.phase='chapter8';return;}body.generation=s.generation;body.chapter7Id=s.chapter7.id;return start(s);};}
export function withinChapter8Run(change){let seen=false,id;return s=>{if(seen&&(!isChapter8(s)||s.chapter8?.id!==id))throw new LobbyError(409,'Chapter 8 changed.');seen=true;id=s.chapter8?.id;return change(s);};}
export function chapter8HostAction(s,b,now=Date.now()){
 const c=s.chapter8;if(!isChapter8(s)||!c||b.generation!==s.generation||b.chapter8Id!==c.id)throw new LobbyError(409,'Chapter 8 changed. Refresh the TV.');
 if(b.action.startsWith('chapter8-finale-'))return finaleHostAction(c,b,now);
 if(b.action==='chapter8-reveal'){
  if(c.step!=='puzzle')throw new LobbyError(409,'The puzzle is not active.');
  if(!Number.isInteger(b.clueId)||!CLUE_IDS.includes(b.clueId))throw new LobbyError(400,'Choose a numbered clue.');
  if(c.revealedClues.includes(b.clueId))return UNCHANGED;
  c.revealedClues.push(b.clueId);c.revealedClues.sort((a,b)=>a-b);c.sequence++;return;
 }
 if(b.action==='chapter8-photo-sent'&&c.photoSentAt!=null&&c.step!=='photo-waiting')return UNCHANGED;
 if(b.sequence!==c.sequence)throw new LobbyError(409,'The Chapter 8 scene changed.');
 if(b.action==='chapter8-photo-sent'){if(c.step!=='photo-waiting')throw new LobbyError(409,'Wait for the photograph request.');c.photoSentAt??=now;enter(s,'coded-message',now);return;}
 if(b.action==='chapter8-continue'){
  if(c.step!=='puzzle'||c.revealedClues.length!==CLUE_IDS.length)throw new LobbyError(409,'Reveal all 17 clues before continuing.');
  enter(s,'leaving',now);return;
 }
 const cue=narrationFor(c.step);
 if(!cue||b.recording!==cue.id)throw new LobbyError(409,'This recording does not belong to the current scene.');
 if(b.action==='chapter8-audio-playing'){if(c.audioStartedAt!==null)return UNCHANGED;c.audioStartedAt=now;return;}
 if(b.action==='chapter8-audio-ended'){
  if(c.audioStartedAt===null||now<c.audioStartedAt+cue.durationMs-250)throw new LobbyError(409,'Let the recording finish.');
  const next={'unexpected-evidence':'photo-waiting','coded-message':'puzzle',reaction:'finale'}[c.step];enter(s,next,now);
  if(next==='puzzle')c.puzzleStartedAt??=now;if(next==='finale')startFinale(c,now);return;
 }
 throw new LobbyError(400,'Unknown Chapter 8 action.');
}
export function advanceChapter8(s,now=Date.now()){
 if(isChapter8(s)&&s.chapter8.step==='finale')return advanceFinale(s.chapter8,now);
 if(!isChapter8(s)||s.chapter8.step!=='leaving'||now<s.chapter8.deadline)return UNCHANGED;
 enter(s,'reaction',now);
}
export function chapter8Progress(s){return isChapter8(s)?structuredClone(s.chapter8):null;}
export function validateChapter8(s){
 const c=s.chapter8,time=n=>Number.isFinite(n)&&n>0;
 if(!c||typeof c.id!=='string'||!c.id||!time(c.startedAt)||!time(c.phaseAt)||!['unexpected-evidence','photo-waiting','coded-message','puzzle','leaving','reaction','finale','complete'].includes(c.step)||!Number.isInteger(c.sequence)||c.sequence<0||!Array.isArray(c.revealedClues)||new Set(c.revealedClues).size!==c.revealedClues.length||c.revealedClues.some(id=>!Number.isInteger(id)||!CLUE_IDS.includes(id)))throw Error('Invalid Chapter 8 state.');
 if(c.photoSentAt!=null&&!time(c.photoSentAt))throw Error('Invalid Chapter 8 photo confirmation.');
 if(c.audioStartedAt!==null&&(!narrationFor(c.step)||!time(c.audioStartedAt)||c.audioStartedAt<c.phaseAt)||c.puzzleStartedAt!==null&&!time(c.puzzleStartedAt)||c.completedAt!==null&&!time(c.completedAt)||c.deadline!==(c.step==='leaving'?c.phaseAt+PUZZLE_FADE_MS:null))throw Error('Invalid Chapter 8 clock.');
 if(c.finale||c.step==='finale')validateFinale(c);
 if(['puzzle','leaving','reaction','finale','complete'].includes(c.step)&&!c.finale?.testEntry&&!time(c.puzzleStartedAt)||['leaving','reaction','finale','complete'].includes(c.step)&&!c.finale?.testEntry&&c.revealedClues.length!==17||(c.step==='complete'?!time(c.completedAt):c.completedAt!==null))throw Error('Invalid Chapter 8 progression.');
}
