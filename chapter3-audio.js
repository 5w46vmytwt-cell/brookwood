import {CHAPTER3_NARRATION_START_MS,CHAPTER3_NARRATION_DURATION_MS,CHAPTER3_VIBRATION_START_MS,CHAPTER3_VIBRATION_DURATION_MS} from './chapter3-timing.js';
export const chapter3AudioTimeline={id:'chapter3-audio',cues:[
  {id:'chapter3-opening',type:'narration',at:CHAPTER3_NARRATION_START_MS,durationMs:CHAPTER3_NARRATION_DURATION_MS,src:'/assets/chapter3/audio/chapter3-opening.wav'},
  {id:'private-message-vibration',type:'sfx',at:CHAPTER3_VIBRATION_START_MS,durationMs:CHAPTER3_VIBRATION_DURATION_MS,src:'/assets/chapter3/audio/private-message-vibration.wav',volume:1}
]};
export const chapter3PartyGain=elapsed=>elapsed<2000?1:Math.max(0,1-(elapsed-2000)/1250);
