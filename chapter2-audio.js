import { CHAPTER2_NARRATION, CHAPTER2_START_MS, PHOTO_PROMPT_MS, PHOTO_CHECKPOINT_MS } from './cinematic-timeline.js';

// Source frame metadata: 5519 MPEG-1 Layer III frames, 1152 samples at 44100 Hz.
export const partyTrack = Object.freeze({id:'chapter2-party', at:50000,
  src:'/assets/chapter2/audio/halloweenbeat.mp3', durationMs:5519*1152/44100*1000});
export const chapter2Narration = CHAPTER2_NARRATION.map(c=>Object.freeze({
  id:`chapter2-narration-${c.id}`, type:'narration', at:c.start, durationMs:c.duration,
  src:`/assets/chapter2/audio/narration-${c.id}.wav`
}));
const lerp=(a,b,t)=>a+(b-a)*Math.max(0,Math.min(1,t));
// Derive continuous duck windows from the locked schedule; never copy intervals.
export function duckWindows(cues=CHAPTER2_NARRATION) {
  const windows=[];
  for(const cue of cues){
    const last=windows.at(-1);
    if(last&&cue.start-last.end<500)last.end=cue.end;
    else windows.push({start:cue.start,end:cue.end});
  }
  return windows;
}
const windows=duckWindows();
export function partyVolume(elapsed) {
  if(elapsed<partyTrack.at)return 0;
  if(elapsed>=PHOTO_CHECKPOINT_MS)return .13;
  let bed=.14;
  if(elapsed>=73500&&elapsed<74500)bed=lerp(.14,.20,(elapsed-73500)/1000);
  else if(elapsed>=74500&&elapsed<75000)bed=lerp(.20,.14,(elapsed-74500)/500);
  // Gentle section changes; narration ceiling wins over the montage bed.
  const duck=elapsed<75000?.10:elapsed<75500?lerp(.10,.09,(elapsed-75000)/500):
    elapsed<80000?.09:elapsed<80500?lerp(.09,.08,(elapsed-80000)/500):.08;
  for(const w of windows){
    if(elapsed>=w.start-150&&elapsed<w.start)bed=Math.min(bed,lerp(.14,duck,(elapsed-w.start+150)/150));
    else if(elapsed>=w.start&&elapsed<w.end+100)bed=Math.min(bed,duck);
    else if(elapsed>=w.end+100&&elapsed<w.end+350)bed=lerp(duck,.12,(elapsed-w.end-100)/250);
  }
  if(elapsed>=85750+350)bed=.12;
  if(elapsed>=PHOTO_PROMPT_MS)bed=lerp(.12,.13,(elapsed-PHOTO_PROMPT_MS)/(PHOTO_CHECKPOINT_MS-PHOTO_PROMPT_MS));
  return bed*Math.min(1,(elapsed-partyTrack.at)/350);
}
export const chapter2Audio = Object.freeze({narration:chapter2Narration,tracks:[{...partyTrack,volumeAt:partyVolume}],
  persistPhases:['photo','photo-complete'],
  backgroundVolumeAt:elapsed=>elapsed<CHAPTER2_START_MS?null:lerp(.12,0,(elapsed-CHAPTER2_START_MS)/3000)});
