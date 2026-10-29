import {LobbyError,UNCHANGED} from './_state.js';
import {finaleCues,finaleCue,cuesFor} from '../chapter8-finale-timing.js';

function enter(c,index,now){
 c.sequence++;const cue=cuesFor(c)[index];
 if(!cue){c.step='complete';c.phaseAt=now;c.completedAt=now;c.finale.completedAt=now;c.finale.deadline=null;return;}
 if(cue.id==='news-black'){c.finale.soundAnchors??={};c.finale.soundAnchors.news=now;}
 if(cue.id==='garage-alarm-lead'){c.finale.soundAnchors??={};c.finale.soundAnchors.garage=now;}
 Object.assign(c.finale,{index,phaseAt:now,mediaStartedAt:null,deadline:cue.kind==='hold'&&cue.id!=='living-silence'&&!cue.readyImage?now+cue.durationMs:null});
}
export function startFinale(c,now,index=0){
 c.step='finale';c.phaseAt=now;c.audioStartedAt=null;c.deadline=null;c.completedAt=null;
 c.finale={id:c.id+':finale:'+c.sequence,startedAt:now,polishVersion:4,index:0,phaseAt:now,mediaStartedAt:null,deadline:null,completedAt:null};enter(c,index,now);
}
export function finaleHostAction(c,b,now){
 const f=c.finale,cue=finaleCue(c);
 if(c.step!=='finale'||!cue||b.finaleId!==f.id||b.cueId!==cue.id||b.sequence!==c.sequence)throw new LobbyError(409,'The finale scene changed.');
 if(b.action==='chapter8-finale-ready'){
  if(cue.id!=='living-silence'&&!cue.readyImage)throw new LobbyError(409,'This scene is not waiting for an image.');
  if(f.deadline!==null)return UNCHANGED;f.deadline=now+cue.durationMs;f.phaseAt=now;return;
 }
 if(cue.kind==='hold')throw new LobbyError(409,'This scene has no recording.');
 if(b.action==='chapter8-finale-playing'){if(f.mediaStartedAt!==null)return UNCHANGED;f.mediaStartedAt=now;if(cue.id==='wife-13'){f.soundAnchors??={};f.soundAnchors.sirens=now;}return;}
 if(b.action==='chapter8-finale-ended'){
  if(f.mediaStartedAt===null||now<f.mediaStartedAt+cue.durationMs-250)throw new LobbyError(409,'Let the complete recording finish.');
  enter(c,f.index+1,now);return;
 }
 throw new LobbyError(400,'Unknown finale action.');
}
export function advanceFinale(c,now){
 const f=c.finale,cue=finaleCue(c);if(c.step!=='finale'||cue?.kind!=='hold'||f.deadline===null||now<f.deadline)return UNCHANGED;
 // Preserve the absolute scare window, including after a late poll/refresh.
 // Once this window expires, the image cannot be played a second time.
 enter(c,f.index+1,f.deadline);
}
export function validateFinale(c){
 const f=c.finale,time=n=>Number.isFinite(n)&&n>0,cue=finaleCue(c);
 if(!f||typeof f.id!=='string'||!f.id||!time(f.startedAt)||!time(f.phaseAt)||!Number.isInteger(f.index)||!cue||f.mediaStartedAt!==null&&(!time(f.mediaStartedAt)||f.mediaStartedAt<f.phaseAt||cue.kind==='hold')||f.completedAt!==null&&!time(f.completedAt)||f.testEntry!==undefined&&typeof f.testEntry!=='boolean')throw Error('Invalid Chapter 8 finale.');
 if(f.polishVersion!==undefined&&![1,2,3,4].includes(f.polishVersion))throw Error('Invalid finale polish version.');
 if(f.soundAnchors&&(typeof f.soundAnchors!=='object'||Array.isArray(f.soundAnchors)||Object.entries(f.soundAnchors).some(([k,v])=>!['garage','sirens','news'].includes(k)||!time(v))))throw Error('Invalid finale sound anchor.');
 if(c.step==='finale'){
  if(cue.kind==='hold'){if(f.deadline!==null&&(!time(f.deadline)||f.deadline!==f.phaseAt+cue.durationMs)||f.deadline===null&&cue.id!=='living-silence'&&!cue.readyImage)throw Error('Invalid finale hold.');}
  else if(f.deadline!==null)throw Error('Invalid finale media deadline.');
  if(f.completedAt!==null)throw Error('Invalid finale completion.');
 }
 if(c.step==='complete'&&f.completedAt!==c.completedAt)throw Error('Invalid finale completion clock.');
}
