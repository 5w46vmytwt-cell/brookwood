import {castingRoles,CHAPTER5_INTRO_MS,CHAPTER5_FINALE_MS,castingCompletionMs} from './chapter5-timing.js';
const text=(id,at,end,target,copy,extra={})=>({id,type:'text',at,end,visual:{target,...(copy?{text:copy}:{}),...extra}});
export const chapter5IntroTimeline={id:'chapter5-intro',end:CHAPTER5_INTRO_MS,cues:[text('intro',0,CHAPTER5_INTRO_MS,'chapter5-intro',null,{fadeOut:[9300,10000]})]};
export function castingCardTimeline(role){
  const killer=role.id==='killer',at=killer?0:500,fadeEnd=killer?1500:1200;
  return {id:'casting-'+role.id,end:Infinity,cues:[text('card',at,Infinity,'chapter5-card',null,{fadeIn:[at,fadeEnd]})]};
}
export function castingResultTimeline(role){
  if(role.id==='killer')return {id:'killer-result',end:11300,cues:[
    text('hold',0,2800,'chapter5-card',null,{fadeOut:[2000,2800]}),
    text('intro',4300,6300,'chapter5-revealIntro','THE KILLER IS...'),
    text('winner',6300,9300,'chapter5-winner'),
    text('complete',9300,11300,'chapter5-castComplete','THE CAST IS COMPLETE')
  ]};
  const sacrifice=role.id==='sacrifice',fadeAt=sacrifice?6200:5700,fadeEnd=fadeAt+700;
  return {id:role.id+'-result',end:castingCompletionMs(role.id),cues:[
    text('hold',0,1000,'chapter5-card'),text('intro',1000,2200,'chapter5-revealIntro','THE GROUP HAS SPOKEN'),
    text('winner',2200,fadeEnd,'chapter5-winner',null,{fadeOut:[fadeAt,fadeEnd]})
  ]};
}
export const chapter5FinaleTimeline={id:'chapter5-finale',end:CHAPTER5_FINALE_MS,cues:[
  text('cast',0,8500,'chapter5-cast',null,{fadeOut:[7000,8500]}),
  text('ofCourse',11000,15300,'chapter5-ofCourse','OF COURSE...',{fadeOut:[14500,15300]}),
  text('onlyGame',12000,15300,'chapter5-onlyGame',"THAT'S ONLY A GAME.",{fadeOut:[14500,15300]}),
  text('tonight',16800,21600,'chapter5-tonight','BUT TONIGHT,',{fadeOut:[20800,21600]}),
  text('someoneElse',17800,21600,'chapter5-someoneElse','SOMEONE ELSE IS PLAYING ONE TOO.',{fadeOut:[20800,21600]}),
  text('unlikeYours',23100,30100,'chapter5-unlikeYours','AND UNLIKE YOURS...',{fadeOut:[28600,30100]}),
  text('rules',24600,30100,'chapter5-rules',"YOU DON'T KNOW THE RULES YET.",{fadeOut:[28600,30100]})
]};
export class Chapter5View{
  constructor(document,Renderer,clock){this.document=document;this.Renderer=Renderer;this.clock=clock;this.renderer=null;this.key=null;this.state=null;}
  update(state){
    this.state=state;const c=state.chapter5,r=c.round,role=castingRoles[c.roundIndex],intro=state.phase==='chapter5-intro',finale=['chapter5-finale','chapter5-complete'].includes(state.phase);
    const key=[c.startedAt,intro?'intro':finale?'finale':r.id,r.completedAt,c.completedAt].join(':');
    if(key!==this.key){
      this.stop();this.key=key;
      if(state.phase==='chapter5-complete')return;
      const timeline=intro?chapter5IntroTimeline:finale?chapter5FinaleTimeline:r.completedAt!==null?castingResultTimeline(role):castingCardTimeline(role);
      this.renderer=new this.Renderer(this.document,timeline,{...this.clock,elapsedNow:()=>{
        const current=this.state.chapter5,base=this.state.phase==='chapter5-intro'?current.startedAt:['chapter5-finale','chapter5-complete'].includes(this.state.phase)?current.castStartedAt:current.round.completedAt??current.round.startedAt;
        return Math.max(0,this.clock.elapsedNow()-(base-current.startedAt));
      }});
      const image=this.document.getElementById('chapter5-cardImage');image.src=role.src;image.hidden=false;
      image.onerror=()=>{image.hidden=true;};
    }
    this.document.getElementById('chapter5-roleTitle').textContent=role.title;
    this.document.getElementById('chapter5-setup').textContent=role.setup;
    this.document.getElementById('chapter5-question').textContent=role.question;
    this.document.getElementById('chapter5-voteCount').textContent='CASTING IN PROGRESS... '+r.voteCount+' / 12 HAVE VOTED';
    this.document.getElementById('chapter5-winnerRole').textContent=role.title;
    this.document.getElementById('chapter5-winnerName').textContent=r.winner?.name||'';
    this.document.getElementById('chapter5-goodLuck').hidden=role.id!=='sacrifice';
    this.document.getElementById('chapter5-killerNote').hidden=role.id!=='killer';
    for(const role of castingRoles)this.document.getElementById('chapter5-cast-'+role.id).textContent=c.winners.find(w=>w.roleId===role.id)?.player.name||'';
    this.renderer?.update({phase:'opening',startedAt:c.startedAt});
  }
  progressDue(elapsed,state){
    const c=state.chapter5;
    if(state.phase==='chapter5-intro')return elapsed>=CHAPTER5_INTRO_MS;
    if(state.phase==='chapter5-finale')return elapsed>=c.castStartedAt-c.startedAt+CHAPTER5_FINALE_MS;
    if(state.phase==='chapter5-casting'&&c.round.completedAt!==null)return elapsed>=c.round.completedAt-c.startedAt+castingCompletionMs(c.round.id);
    return false;
  }
  stop(){
    if(this.renderer){for(const {node} of this.renderer.layers)node.style.opacity=0;this.renderer.stop();}
    this.renderer=null;this.key=null;
  }
}
