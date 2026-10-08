// Original MPEG frame samples measured at 44,100 Hz. No audio processing.
const recording=(id,file,samples)=>({id:'chapter5-'+id,type:'narration',src:'/assets/chapter5/audio/'+file,durationMs:samples/44100*1000});
export const chapter5Reveals=[
  recording('reveal-screamer','12-reveal-screamer.mp3',339840),
  recording('reveal-terribleDecisionMaker','13-reveal-decision-maker.mp3',382464),
  recording('reveal-tripper','14-reveal-tripper.mp3',319104),
  recording('reveal-denier','15-reveal-denier.mp3',276480),
  recording('reveal-sacrifice','16-reveal-sacrifice.mp3',298368),
  recording('reveal-killer','17-reveal-killer.mp3',375552)
];
export const completeCastRecording=recording('complete-cast','18-complete-cast.mp3',1374336);
export function revealTiming(role){
  const cue=chapter5Reveals.find(c=>c.id==='chapter5-reveal-'+role);
  const narrationAt=1000,narrationEnd=narrationAt+Math.ceil(cue.durationMs);
  const winnerAt=narrationEnd+(role==='killer'?2500:1500);
  return {narrationAt,narrationEnd,roleAt:Math.max(narrationAt,narrationEnd-2000),winnerAt,fadeAt:winnerAt+5000,fadeEnd:winnerAt+5700,end:winnerAt+6200};
}
export const COMPLETE_CAST_HOLD_MS=Math.ceil(completeCastRecording.durationMs)+3000;
export const COMPLETE_CAST_END_MS=COMPLETE_CAST_HOLD_MS+1500;
export const POLISHED_FINALE_MS=COMPLETE_CAST_END_MS+21600;
