import {chapter4Scenes,CHAPTER4_DOORBELL_MS,CHAPTER4_VOTING_MS,CHAPTER4_DOORBELL_DURATION_MS} from './chapter4-timing.js';
export const chapter4Timeline={id:'chapter4',end:CHAPTER4_VOTING_MS,cues:[
  ...chapter4Scenes.map(s=>({id:'scene-'+s.id,type:'image',at:s.at,end:s.end,visual:{target:'chapter4-scene-'+s.id,src:s.src,...(!s.cut?{fadeIn:[s.at,s.at+250]}:{}),fadeOut:[s.end-300,s.end]}})),
  {id:'door',type:'text',at:CHAPTER4_DOORBELL_MS,end:CHAPTER4_VOTING_MS,visual:{target:'chapter4-door',text:"THERE'S SOMETHING AT THE DOOR."}},
  {id:'vote',type:'text',at:CHAPTER4_VOTING_MS,end:Infinity,visual:{target:'chapter4-vote'}}
]};
export const chapter4AudioTimeline={id:'chapter4-audio',cues:[
  ...chapter4Scenes.map(s=>({id:'chapter4-narration-'+s.id,type:'narration',at:s.at,durationMs:s.end-s.at,src:'/assets/chapter4/audio/narration-'+s.id+'.wav'})),
  {id:'chapter4-doorbell',type:'sfx',at:CHAPTER4_DOORBELL_MS,durationMs:CHAPTER4_DOORBELL_DURATION_MS,src:'/assets/chapter4/audio/doorbell.mp3',volume:1}
]};
export class Chapter4View{
  constructor(document,Renderer,clock){this.document=document;this.renderer=new Renderer(document,chapter4Timeline,clock);}
  update(state){
    const c=state.chapter4,complete=c.complete;
    this.document.getElementById('chapter4-cinematic').hidden=complete;
    this.document.getElementById('chapter4-result').hidden=!complete;
    this.document.getElementById('chapter4-count').textContent=c.voteCount+' / 12 VOTES RECORDED';
    this.document.getElementById('chapter4-selected').textContent=c.selectedPlayer?.name||'';
    this.renderer.update({phase:'opening',startedAt:c.startedAt});
  }
  stop(){this.renderer.stop();}
}
