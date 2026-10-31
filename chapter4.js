import {chapter4Scenes,CHAPTER4_DOORBELL_MS,CHAPTER4_VOTING_MS,CHAPTER4_DOORBELL_DURATION_MS} from './chapter4-timing.js';
export const PACKAGE_RESULT_HOLD_MS=3000;
export const PACKAGE_RESULT_FADE_MS=400;
export function packageResultFrame(c,serverNow){
  const age=Number.isFinite(c.completedAt)?serverNow-c.completedAt:Infinity;
  return {visible:age>=PACKAGE_RESULT_HOLD_MS,opacity:Math.max(0,Math.min(1,(age-PACKAGE_RESULT_HOLD_MS)/PACKAGE_RESULT_FADE_MS))};
}
export const chapter4Timeline={id:'chapter4',end:CHAPTER4_VOTING_MS,cues:[
  ...chapter4Scenes.map(s=>({id:'scene-'+s.id,type:'image',at:s.at,end:s.end,visual:{target:'chapter4-scene-'+s.id,src:s.src,...(!s.cut?{fadeIn:[s.at,s.at+250]}:{}),fadeOut:[s.end-300,s.end]}})),
  {id:'vote',type:'text',at:CHAPTER4_VOTING_MS,end:Infinity,visual:{target:'chapter4-vote',content:[
    {selector:'h2',text:'SOMEONE LEFT A PACKAGE AT YOUR DOORSTEP'},
    {selector:'.chapter4-door-question',text:'Decide as a group who should go'}
  ]}}
]};
export const chapter4AudioTimeline={id:'chapter4-audio',cues:[
  ...chapter4Scenes.map(s=>({id:'chapter4-narration-'+s.id,type:'narration',at:s.at,durationMs:s.end-s.at,src:'/assets/chapter4/audio/narration-'+s.id+'.wav'})),
  {id:'chapter4-doorbell',type:'sfx',at:CHAPTER4_DOORBELL_MS,durationMs:CHAPTER4_DOORBELL_DURATION_MS,src:'/assets/chapter4/audio/doorbell.mp3',volume:1}
]};
export class Chapter4View{
  constructor(document,Renderer,clock){this.document=document;this.clock=clock;this.renderer=new Renderer(document,chapter4Timeline,clock);}
  update(state,serverNow=state.chapter4.startedAt+this.clock.elapsedNow()){
    const c=state.chapter4,complete=c.complete;
    this.document.getElementById('chapter4-cinematic').hidden=complete;
    this.document.getElementById('chapter4-result').hidden=!complete;
    this.document.getElementById('chapter4-count').textContent=c.voteCount+' / 12 VOTES RECORDED';
    const frame=packageResultFrame(c,serverNow),details=this.document.getElementById('chapter4-resultDetails');
    details.hidden=!frame.visible;details.style.opacity=frame.opacity;
    this.document.getElementById('chapter4-selected').textContent=frame.visible?c.selectedPlayer?.name||'':'';
    this.renderer.update({phase:'opening',startedAt:c.startedAt});
  }
  stop(){this.renderer.stop();}
}
