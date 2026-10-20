import {storyRecordings} from './chapter7-recordings.js';
export {storyRecordings};
export const narrationOrder=['narrator','podcast-intro','possession','officer','prophecy','reaction','premeditation','accomplice','vote-intro'];
export const theories=[['possession','POSSESSION','Something supernatural controlled Daniel.'],['premeditation','PREMEDITATION','Daniel planned the murders.'],['accomplice','ACCOMPLICE','Someone else, possibly Nathan Reeve, helped him.']];
export const storyRecording=step=>step==='connection'?connectionCue:step==='scare'?undefined:storyRecordings.find(r=>r.step===step);
// Revised handoff: one second earlier, within the final damaged transmission.
export const POLICE_OVERLAP_MS=1900;
export const PROPHECY_AT_MS=storyRecording('officer').durationMs-POLICE_OVERLAP_MS;
export const TRANSMISSION_MS=PROPHECY_AT_MS+storyRecording('prophecy').durationMs;
export const prophecyAt=i=>storyRecording('officer').durationMs-(i.polishVersion>=2?POLICE_OVERLAP_MS:900);
export const narrationDuration=i=>i.step==='officer'&&i.polishVersion>=1?prophecyAt(i)+storyRecording('prophecy').durationMs:storyRecording(i.step)?.durationMs;
export const cameraCue={id:'chapter7-camera',src:'/assets/chapter1/audio/sfx-camera-shutter.wav',type:'sfx',volume:.55,durationMs:67536/264600*1000};
export const CONNECTION_MS=2800; // Legacy silent recovery, preserved for stored clocks.
export const connectionCue={step:'connection',id:'chapter7-connection',src:'/assets/chapter7/audio/ch7_connection_recovery.mp3',type:'sfx',volume:1,durationMs:140544/44100*1000*2};
export const CONNECTION_BLACK_MS=1000;
export const DATE_REVEAL_MS=6500;
export function connectionFrame(position,playing=true){const tick=Math.floor(position/70),pulse=.28+.28*((tick*7)%11)/10;return {opacity:playing&&position<connectionCue.durationMs?pulse:0,y:((tick*13)%23-11)*1.8,scale:.72+((tick*3)%9)/28,skew:((tick*11)%7-3)*1.4};}
export function dateFrame(elapsed){return {opacity:smooth(elapsed/1200)*(1-smooth((elapsed-(DATE_REVEAL_MS-1200))/1200)),yearScale:1+.25*smooth(elapsed/DATE_REVEAL_MS)};}
export const smooth=x=>{const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t);};
// The narrator plays in full; the date belongs only to the later date-reveal phase.
export function narratorFrame(position){const end=storyRecording('narrator').durationMs;return {date:0,yearScale:1,scene:smooth((position-3500)/2500)*(1-smooth((position-(end-1000))/1000))};}
export function sceneDuration(i,step=i.step){if(step==='connection'&&i.polishVersion>=3)return undefined;if(i.polishVersion>=2){if(step==='theory2-transition'||step==='theory3-transition')return 9000;if(step==='narrator-transition')return 11000;if(step==='vote-fade')return 1000;if(step==='theory-fade'||step==='ending-fade')return 1600;}return timedScenes[step];}
export const TRANSITION_MS=8000;
export function transitionFrame(elapsed,narrator=false,version=2){const delay=narrator?2000:0;if(version<2)return {out:1-smooth(elapsed/1200),title:smooth((elapsed-delay-2000)/700)*(1-smooth((elapsed-delay-5600)/700)),incoming:smooth((elapsed-delay-6500)/1500)};return {out:1-smooth(elapsed/1600),title:smooth((elapsed-delay-2300)/900)*(1-smooth((elapsed-delay-6200)/900)),incoming:smooth((elapsed-delay-7300)/1700)};}
// Located in the supplied WAV using local recognition and audio-envelope alignment.
// Farmhouse sentence: 29.730–31.770 s. Upstairs-window sentence: 32.530–34.090 s.
export const PHOTO_ATTENTION_MS=29730;
export const PHOTO_ENHANCED_MS=34300;
export const PHOTO_HOLD_MS=12000;
export const SCARE_IMAGE_MS=900;
export const timedScenes={'connection-black':CONNECTION_BLACK_MS,'date-reveal':DATE_REVEAL_MS,connection:CONNECTION_MS,'theory2-transition':TRANSITION_MS,'theory3-transition':TRANSITION_MS,'narrator-transition':TRANSITION_MS+2000,interlude:900,'vote-fade':800,spoken:3000,'theory-reveal':6500,'theory-fade':1200,'silent-black':3500,'after-scare':1000,'message-hold':3000,'retriever-reveal':4500,'photo-hold':PHOTO_HOLD_MS,'ending-fade':1000};
export const storyCheckpoints=[['chapter7-narrator','NARRATOR RETURNS','narrator'],['chapter7-podcast','FIRST PODCAST','possession'],['chapter7-police','POLICE RADIO','officer'],['chapter7-second','SECOND PODCAST','premeditation'],['chapter7-third','THIRD PODCAST','accomplice'],['chapter7-theory-vote','THEORY VOTING','theory-vote'],['chapter7-spoken','THE GROUP HAS SPOKEN','spoken'],['chapter7-message','INCOMING ENVELOPE MESSAGE','incoming'],['chapter7-envelope-vote','ENVELOPE RETRIEVAL VOTE','envelope-vote'],['chapter7-waiting','WAITING FOR SELECTED PLAYER','envelope-waiting'],['chapter7-photo','PHOTOGRAPH REVEAL','photograph'],['chapter7-window','ENHANCED WINDOW REVEAL','photograph']];
export function storyProgressDue(c,now){const i=c.investigation;return i?i.needsRecovery||i.step==='connection'&&i.polishVersion<3||i.step==='scare'||i.deadline!==null&&now>=i.deadline:c.step==='waiting';}
