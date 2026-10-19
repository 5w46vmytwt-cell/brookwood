import {randomUUID} from 'node:crypto';
import {LobbyError,UNCHANGED} from './_state.js';
import {BLACKOUT_MS,BROADCAST_DURATION_MS,BROADCAST_FADE_MS} from '../chapter7-timing.js';
import {advanceInvestigation,startInvestigation,validateInvestigation,investigationProgress,selectInvestigationCheckpoint} from './_chapter7-story.js';
import {storyCheckpoints} from '../chapter7-story-timing.js';

export const isChapter7=s=>s.phase==='chapter7';
export function startChapter7(s,now=Date.now()){
 if(isChapter7(s))return UNCHANGED;
 if(s.phase!=='chapter6'||s.chapter6?.step!=='complete')return UNCHANGED;
 // Start at the observed blackout, never backdate into the final recording.
 s.phase='chapter7';s.chapter7={id:randomUUID(),step:'blackout',startedAt:now,playbackStartedAt:null,endedAt:null,completedAt:null,sequence:0};
}
export function validateChapter7(s){
 const c=s.chapter7,positive=n=>Number.isFinite(n)&&n>0;
 if(!c||typeof c.id!=='string'||!c.id||!['blackout','playing','fading','waiting'].includes(c.step)||!positive(c.startedAt)||!Number.isInteger(c.sequence)||c.sequence<0)throw Error('Invalid Chapter 7 state.');
 if(c.step==='blackout'?c.playbackStartedAt!==null:!positive(c.playbackStartedAt)||c.playbackStartedAt<c.startedAt+BLACKOUT_MS)throw Error('Invalid broadcast start.');
 if(['fading','waiting'].includes(c.step)?!positive(c.endedAt)||c.endedAt<c.playbackStartedAt+BROADCAST_DURATION_MS-250:c.endedAt!==null)throw Error('Invalid broadcast ending.');
 if(c.step==='waiting'?!positive(c.completedAt)||c.completedAt<c.endedAt+BROADCAST_FADE_MS:c.completedAt!==null)throw Error('Invalid broadcast completion.');
 if(c.investigation&&c.step!=='waiting')throw Error('Investigation precedes broadcast completion.');
 validateInvestigation(s);
}
export function chapter7Progress(s,playerId){return isChapter7(s)?{...s.chapter7,...(s.chapter7.investigation?{investigation:investigationProgress(s,playerId)}:{})}:null;}
export function withinBroadcastRun(change){let seen=false,id;return s=>{if(seen&&s.chapter7?.id!==id)throw new LobbyError(409,'The broadcast changed.');seen=true;id=s.chapter7?.id;return change(s);};}
export function advanceChapter7(s,now=Date.now()){
 if(!isChapter7(s))return startChapter7(s,now);
 if(s.chapter7.step==='waiting')return advanceInvestigation(s,now);
 const c=s.chapter7;if(c.step!=='fading'||now<c.endedAt+BROADCAST_FADE_MS)return UNCHANGED;
 c.step='waiting';c.completedAt=c.endedAt+BROADCAST_FADE_MS;c.sequence++;
 startInvestigation(s,now);
}
export function broadcastHostAction(s,b,now=Date.now()){
 const c=s.chapter7;
 if(!isChapter7(s)||b.generation!==s.generation||b.broadcastId!==c.id)throw new LobbyError(409,'The broadcast changed.');
 if(b.action==='broadcast-playing'){
  if(c.playbackStartedAt!==null)return UNCHANGED;
  if(now<c.startedAt+BLACKOUT_MS)throw new LobbyError(409,'The blackout is not complete.');
  c.step='playing';c.playbackStartedAt=now;c.sequence++;return;
 }
 if(b.action==='broadcast-ended'){
  if(['fading','waiting'].includes(c.step))return UNCHANGED;
  if(c.step!=='playing'||now<c.playbackStartedAt+BROADCAST_DURATION_MS-250)throw new LobbyError(409,'The broadcast has not finished.');
  c.step='fading';c.endedAt=now;c.sequence++;return;
 }
 throw new LobbyError(400,'Unknown broadcast action.');
}
export function makeBroadcastTestSelector(checkpoint,body={}){
 const id=randomUUID(),now=Date.now();return s=>{
  if(storyCheckpoints.some(c=>c[0]===checkpoint)){
   if(s.phase!=='chapter7'||s.chapter7?.step!=='waiting'){
    const prior=s.chapter7;s.phase='chapter7';s.chapter7={...prior,id:prior?.id??id,step:'waiting',startedAt:now-BLACKOUT_MS-BROADCAST_DURATION_MS-BROADCAST_FADE_MS,playbackStartedAt:now-BROADCAST_DURATION_MS-BROADCAST_FADE_MS,endedAt:now-BROADCAST_FADE_MS,completedAt:now,sequence:(prior?.sequence??0)+1};
   }
   selectInvestigationCheckpoint(s,checkpoint,body,now);return;
  }
  // Explicit host navigation changes only Chapter 7, leaving all saved game data intact.
  s.phase='chapter7';s.chapter7={id,step:checkpoint==='chapter7-after'?'waiting':'blackout',startedAt:now-BLACKOUT_MS,playbackStartedAt:null,endedAt:null,completedAt:null,sequence:0};
  if(checkpoint==='chapter7-after')Object.assign(s.chapter7,{playbackStartedAt:now-BROADCAST_DURATION_MS-BROADCAST_FADE_MS,endedAt:now-BROADCAST_FADE_MS,completedAt:now});
  if(checkpoint==='chapter7-after')s.chapter7.startedAt=s.chapter7.playbackStartedAt-BLACKOUT_MS;
 };
}
