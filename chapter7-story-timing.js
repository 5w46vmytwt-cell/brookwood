import {storyRecordings} from './chapter7-recordings.js';
export {storyRecordings};
export const narrationOrder=['narrator','podcast-intro','possession','officer','prophecy','reaction','premeditation','accomplice','vote-intro'];
export const theories=[['possession','POSSESSION','Something supernatural controlled Daniel.'],['premeditation','PREMEDITATION','Daniel planned the murders.'],['accomplice','ACCOMPLICE','Someone else, possibly Nathan Reeve, helped him.']];
export const storyRecording=step=>storyRecordings.find(r=>r.step===step);
// Located in the supplied WAV using local recognition and audio-envelope alignment.
// Farmhouse sentence: 29.730–31.770 s. Upstairs-window sentence: 32.530–34.090 s.
export const PHOTO_ATTENTION_MS=29730;
export const PHOTO_ENHANCED_MS=34300;
export const PHOTO_HOLD_MS=12000;
export const SCARE_IMAGE_MS=900;
export const timedScenes={interlude:900,'vote-fade':800,spoken:3000,'theory-reveal':6500,'theory-fade':1200,'silent-black':3500,'after-scare':1000,'message-hold':3000,'retriever-reveal':4500,'photo-hold':PHOTO_HOLD_MS,'ending-fade':1000};
export const storyCheckpoints=[['chapter7-narrator','NARRATOR RETURNS','narrator'],['chapter7-podcast','FIRST PODCAST','possession'],['chapter7-police','POLICE RADIO','officer'],['chapter7-second','SECOND PODCAST','premeditation'],['chapter7-third','THIRD PODCAST','accomplice'],['chapter7-theory-vote','THEORY VOTING','theory-vote'],['chapter7-spoken','THE GROUP HAS SPOKEN','spoken'],['chapter7-message','INCOMING ENVELOPE MESSAGE','incoming'],['chapter7-envelope-vote','ENVELOPE RETRIEVAL VOTE','envelope-vote'],['chapter7-waiting','WAITING FOR SELECTED PLAYER','envelope-waiting'],['chapter7-photo','PHOTOGRAPH REVEAL','photograph'],['chapter7-window','ENHANCED WINDOW REVEAL','photograph']];
export function storyProgressDue(c,now){const i=c.investigation;return i?i.deadline!==null&&now>=i.deadline:c.step==='waiting';}
