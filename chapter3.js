import {PRIVATE_MESSAGES_MS,PRIVATE_CHECKPOINT_MS} from './chapter3-timing.js';
export const chapter3Timeline={id:'chapter3',end:PRIVATE_CHECKPOINT_MS,cues:[
  {id:'photoComplete',type:'text',at:0,end:2500,visual:{target:'chapter3-photoComplete',fadeOut:[2000,2500]}},
  {id:'checkPhones',type:'text',at:PRIVATE_MESSAGES_MS,end:PRIVATE_CHECKPOINT_MS,visual:{target:'chapter3-checkPhones',text:'CHECK YOUR PHONES.'}},
  {id:'privateMessages',type:'text',at:PRIVATE_CHECKPOINT_MS,end:Infinity,visual:{target:'chapter3-privateMessages'}}
]};
export const chapter3CompletionTimeline={id:'chapter3-completion',end:2000,cues:[
  {id:'completed',type:'text',at:0,end:2000,visual:{target:'chapter3-completed',fadeOut:[1500,2000]}}
]};
export class Chapter3View{
  constructor(document,Renderer,clock){
    this.document=document;this.elapsedNow=clock.elapsedNow;this.state=null;
    this.main=new Renderer(document,chapter3Timeline,clock);
    this.completion=new Renderer(document,chapter3CompletionTimeline,{...clock,elapsedNow:()=>Math.max(0,this.elapsedNow()-(this.state.chapter3.completedAt-this.state.chapter3.startedAt))});
  }
  update(state){
    this.state=state;const c=state.chapter3,complete=c.completedAt!==null;
    this.document.getElementById('chapter3-main').hidden=complete;
    this.document.getElementById('chapter3-completion').hidden=!complete;
    this.document.getElementById('chapter3-readCount').textContent=c.readCount+' / 12 READ';
    this.document.getElementById('chapter3Host').hidden=complete||this.elapsedNow()<PRIVATE_CHECKPOINT_MS;
    const pseudo={phase:'opening',startedAt:c.startedAt};
    if(complete)this.completion.update(pseudo);else this.main.update(pseudo);
  }
  stop(){this.main.stop();this.completion.stop();}
}
