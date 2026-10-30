import {smooth} from './chapter8-puzzle.js';

// Canonical, refresh-safe letter groups. No random animation clock or timers.
export const GREETING='HAPPY HALLOWEEN';
export const GREETING_HOLD_MS=10000;
export const GLITCH_DURATIONS=[600,800,1000,1200,1400];
export const LETTER_GROUPS=[[0,6,12],[2,8,13],[4,10,1],[5,11,7],[3,9]];
export const COLLECTOR_SRC='/assets/chapter8/collector-reveal-web.mp4';
export const COLLECTOR_DURATION_MS=104000;
export const FINAL_SONG_SRC='/assets/chapter8/audio/final-credits.mp3';
export const FINAL_SONG_DURATION_MS=251611.42857142858;
export const FINAL_SONG_VOLUME=.8;
export const HAPPY_TRACK={id:'happy-return',src:'/assets/chapter8/audio/fun-soundtrack.mp3',durationMs:99840};
export const HAPPY_START_MS=14800;
export function happyVolume(cue,elapsed){
 if(cue.id==='wife-16')return .16*smooth(elapsed/1200);
 return cue.id==='ending-in'?.16+.29*smooth(elapsed/1000):.45;
}
export function greetingFrame(cue,elapsed){
 const stage=cue?.glitch??0;
 return {stage,black:stage===5&&elapsed>=1200,gone:new Set(LETTER_GROUPS.slice(0,stage).flat()),
  opacity:cue?.id==='ending-in'?smooth(elapsed/1000):1,
  tear:stage?Math.sin(Math.floor(elapsed/(100-stage*12))*2.3)*stage*2:0};
}
