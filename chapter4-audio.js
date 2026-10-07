import {chapter4Scenes} from './chapter4-timing.js';

const lerp=(from,to,t)=>from+(to-from)*Math.max(0,Math.min(1,t));
// Chapter 4-relative automation. The approved scene intervals are also the
// narration intervals; derive ducking from them rather than duplicate timing.
const levels=[
  [0,0],[3000,.09],[37475,.09],[38475,.115],[52325,.13],
  [77575,.13],[79575,.035],[95300,.035],[96800,.115],
  [103450,.14],[108450,0]
];
export function chapter4ScoreVolume(elapsed){
  if(elapsed<=0||elapsed>=chapter4Scenes.at(-1).end)return 0;
  const next=levels.findIndex(([at])=>at>elapsed),a=levels[next-1],b=levels[next];
  const bed=lerp(a[1],b[1],(elapsed-a[0])/(b[0]-a[0]));
  let gain=1;
  for(const scene of chapter4Scenes){
    if(elapsed>=scene.at-150&&elapsed<scene.at)gain=Math.min(gain,lerp(1,.6,(elapsed-scene.at+150)/150));
    else if(elapsed>=scene.at&&elapsed<scene.end+100)gain=Math.min(gain,.6);
    else if(elapsed>=scene.end+100&&elapsed<scene.end+400)gain=Math.min(gain,lerp(.6,1,(elapsed-scene.end-100)/300));
  }
  return bed*gain;
}
export const chapter4Score=Object.freeze({
  id:'chapter4-brookwood-score',at:0,
  src:'/assets/chapter1/audio/brookwood-background.wav',
  // Original PCM WAV: 24,576,000 data bytes / 264,600 bytes per second.
  durationMs:24576000/264600*1000,volumeAt:chapter4ScoreVolume
});
export const chapter4Audio=Object.freeze({tracks:[chapter4Score]});
