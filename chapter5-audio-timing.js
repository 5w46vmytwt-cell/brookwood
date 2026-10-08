// Measured RIFF data/byte-rate or complete MPEG frame samples at 44,100 Hz.
// Keep the original media unchanged. Integer scene gates round UP, then add a tail.
export const CHAPTER5_AUDIO_TAIL_MS=200;
const mp3=(id,file,samples)=>({id,type:'narration',src:'/assets/chapter5/audio/'+file,durationMs:samples/44100*1000});
export const chapter5Recordings=[
  {id:'item-acquired',type:'narration',src:'/assets/chapter5/audio/01-item-acquired.wav',durationMs:15050},
  {id:'husband-signoff',type:'narration',src:'/assets/chapter5/audio/02-husband-signoff.wav',durationMs:19875},
  mp3('wife-intro','03-wife-intro.mp3',929664),mp3('wife-ready','04-wife-ready.mp3',279936),
  mp3('wife-rules','05-wife-rules.mp3',1804032),mp3('screamer','06-screamer.mp3',548352),
  mp3('terribleDecisionMaker','07-decision-maker.mp3',668160),mp3('tripper','08-tripper.mp3',806400),
  mp3('denier','09-denier.mp3',827136),mp3('sacrifice','10-sacrifice.mp3',859392),mp3('killer','11-killer.mp3',1070208)
].map(c=>({...c,id:'chapter5-'+c.id}));
export const recordingFor=id=>chapter5Recordings.find(c=>c.id==='chapter5-'+id);
export const narrationGate=id=>Math.ceil(recordingFor(id).durationMs)+CHAPTER5_AUDIO_TAIL_MS;
let openingAt=0;
export const chapter5Opening=chapter5Recordings.slice(0,4).map(c=>{
  const at=openingAt;openingAt+=Math.ceil(c.durationMs)+CHAPTER5_AUDIO_TAIL_MS;
  return {...c,at,end:openingAt};
});
export const CHAPTER5_READY_MS=openingAt;
export const CHAPTER5_RULES_MS=narrationGate('wife-rules');
export const roleNarrationOffset=id=>id==='killer'?2500:1200;
export const roleVotingOffset=id=>roleNarrationOffset(id)+narrationGate(id);
export const castBackground={id:'chapter5-cast-background',src:'/assets/chapter5/audio/cast-background.mp3',durationMs:4050432/44100*1000,at:chapter5Opening[2].at};
