import {storyRecordings} from './chapter7-recordings.js';
export {storyRecordings};
export const narrationOrder=['narrator','podcast-intro','possession','officer','prophecy','reaction','premeditation','accomplice','vote-intro'];
export const theories=[['possession','POSSESSION','Something supernatural controlled Daniel.'],['premeditation','PREMEDITATION','Daniel planned the murders.'],['accomplice','ACCOMPLICE','Someone else, possibly Nathan Reeve, helped him.']];
export const storyRecording=step=>step==='scare'?undefined:storyRecordings.find(r=>r.step===step);
// The final ~900 ms is the dying radio/static tail; keep the last intelligible call clear.
export const POLICE_OVERLAP_MS=900;
export const PROPHECY_AT_MS=storyRecording('officer').durationMs-POLICE_OVERLAP_MS;
export const TRANSMISSION_MS=PROPHECY_AT_MS+storyRecording('prophecy').durationMs;
export const narrationDuration=i=>i.step==='officer'&&i.polishVersion===1?TRANSMISSION_MS:storyRecording(i.step)?.durationMs;
export const TRANSITION_MS=8000;
export function transitionFrame(elapsed,narrator=false){const delay=narrator?2000:0;return {out:Math.max(0,1-elapsed/1200),title:Math.min(1,Math.max(0,(elapsed-delay-2000)/700),Math.max(0,(6300+delay-elapsed)/700)),incoming:Math.min(1,Math.max(0,(elapsed-delay-6500)/1500))};}
// Located in the supplied WAV using local recognition and audio-envelope alignment.
// Farmhouse sentence: 29.730–31.770 s. Upstairs-window sentence: 32.530–34.090 s.
export const PHOTO_ATTENTION_MS=29730;
export const PHOTO_ENHANCED_MS=34300;
export const PHOTO_HOLD_MS=12000;
export const SCARE_IMAGE_MS=900;
export const timedScenes={'theory2-transition':TRANSITION_MS,'theory3-transition':TRANSITION_MS,'narrator-transition':TRANSITION_MS+2000,interlude:900,'vote-fade':800,spoken:3000,'theory-reveal':6500,'theory-fade':1200,'silent-black':3500,'after-scare':1000,'message-hold':3000,'retriever-reveal':4500,'photo-hold':PHOTO_HOLD_MS,'ending-fade':1000};
export const storyCheckpoints=[['chapter7-narrator','NARRATOR RETURNS','narrator'],['chapter7-podcast','FIRST PODCAST','possession'],['chapter7-police','POLICE RADIO','officer'],['chapter7-second','SECOND PODCAST','premeditation'],['chapter7-third','THIRD PODCAST','accomplice'],['chapter7-theory-vote','THEORY VOTING','theory-vote'],['chapter7-spoken','THE GROUP HAS SPOKEN','spoken'],['chapter7-message','INCOMING ENVELOPE MESSAGE','incoming'],['chapter7-envelope-vote','ENVELOPE RETRIEVAL VOTE','envelope-vote'],['chapter7-waiting','WAITING FOR SELECTED PLAYER','envelope-waiting'],['chapter7-photo','PHOTOGRAPH REVEAL','photograph'],['chapter7-window','ENHANCED WINDOW REVEAL','photograph']];
export function storyProgressDue(c,now){const i=c.investigation;return i?i.step==='scare'||i.deadline!==null&&now>=i.deadline:c.step==='waiting';}
