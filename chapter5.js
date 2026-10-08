import {revealTiming,COMPLETE_CAST_HOLD_MS,COMPLETE_CAST_END_MS,POLISHED_FINALE_MS} from './chapter5-reveal-timing.js';
import {castingRoles,CHAPTER5_INTRO_MS,CHAPTER5_LEGACY_INTRO_MS,CHAPTER5_FINALE_MS,castingCompletionMs,castingFinaleMs} from './chapter5-timing.js';
import {chapter5Opening,CHAPTER5_RULES_MS} from './chapter5-audio-timing.js';
const text=(id,at,end,target,copy,extra={})=>({id,type:'text',at,end,visual:{target,...(copy?{text:copy}:{}),...extra}});
const legacyIntroTimeline={id:'chapter5-legacy-intro',end:CHAPTER5_LEGACY_INTRO_MS,cues:[text('intro',0,10000,'chapter5-intro',null,{fadeOut:[9300,10000]})]};
const signoffAt=chapter5Opening[1].at,signoffEnd=chapter5Opening[1].end,wifeAt=chapter5Opening[2].at;
export const chapter5IntroTimeline={id:'chapter5-opening',end:CHAPTER5_INTRO_MS,cues:[
  text('item',0,chapter5Opening[0].end,'chapter5-item',null,{fadeOut:[chapter5Opening[0].end-500,chapter5Opening[0].end]}),
  text('radio',signoffAt,signoffEnd,'chapter5-radio',null,{darken:{range:[signoffAt+16000,signoffEnd],amount:.82}}),
  text('complaint',signoffAt,signoffAt+5000,'chapter5-complaint'),
  text('overruled',signoffAt+5000,signoffAt+10000,'chapter5-overruled'),
  text('unauthorized',signoffAt+10000,signoffAt+13000,'chapter5-unauthorized'),
  text('approved',signoffAt+13000,signoffAt+16000,'chapter5-approved'),
  text('disconnected',signoffAt+16000,signoffEnd,'chapter5-disconnected'),
  text('party',wifeAt,Infinity,'chapter5-party'),
  text('wife',wifeAt,chapter5Opening[2].end,'chapter5-wife',null,{fadeIn:[wifeAt,wifeAt+1000]}),
  text('ready',chapter5Opening[3].at,Infinity,'chapter5-ready')
]};
const waitingTimeline={id:'chapter5-waiting',end:Infinity,cues:[text('party',0,Infinity,'chapter5-party'),text('waiting',0,Infinity,'chapter5-ready')]};
export const chapter5RulesTimeline={id:'chapter5-rules',end:CHAPTER5_RULES_MS,cues:[text('rules',0,CHAPTER5_RULES_MS,'chapter5-gameIntro',null,{fadeOut:[CHAPTER5_RULES_MS-700,CHAPTER5_RULES_MS]})]};
export function castingCardTimeline(role){
  const killer=role.id==='killer',at=killer?0:500,fadeEnd=killer?1500:1200;
  return {id:'casting-'+role.id,end:Infinity,cues:[text('card',at,Infinity,'chapter5-card',null,{fadeIn:[at,fadeEnd]})]};
}
export function castingResultTimeline(role,revealVersion=0){
  if(revealVersion===1){
    const t=revealTiming(role.id);
    return {id:role.id+'-narrated-result',end:t.end,cues:[
      text('hold',0,1000,'chapter5-card'),
      text('intro',1000,t.roleAt,'chapter5-revealIntro','THE GROUP HAS SPOKEN...'),
      text('role',t.roleAt,t.winnerAt,'chapter5-revealRole',role.title+' IS...'),
      text('winner',t.winnerAt,t.fadeEnd,'chapter5-winner',null,{fadeOut:[t.fadeAt,t.fadeEnd]})
    ]};
  }
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
export function polishedFinaleTimeline(){
  const shift=COMPLETE_CAST_END_MS-8500;
  return {id:'chapter5-narrated-finale',end:POLISHED_FINALE_MS,cues:chapter5FinaleTimeline.cues.map(c=>c.id==='cast'?{...c,end:COMPLETE_CAST_END_MS,visual:{...c.visual,fadeOut:[COMPLETE_CAST_HOLD_MS,COMPLETE_CAST_END_MS]}}:{...c,at:c.at+shift,end:c.end+shift,visual:{...c.visual,fadeOut:c.visual.fadeOut.map(t=>t+shift)}})};
}
export class Chapter5View{
  constructor(document,Renderer,clock){this.document=document;this.Renderer=Renderer;this.clock=clock;this.renderer=null;this.key=null;this.state=null;}
  update(state){
    const previous=this.state?.chapter5,next=state.chapter5;
    // Ignore stale polling responses: a completed round can never become a card again.
    if(previous?.startedAt===next.startedAt&&(previous.roundIndex>next.roundIndex||(previous.roundIndex===next.roundIndex&&previous.round.completedAt!==null&&next.round.completedAt===null)||(previous.castStartedAt!==null&&next.castStartedAt===null)||(previous.completedAt!==null&&next.completedAt===null)))return;
    // A late pre-reveal projection must not erase this same persisted result.
    if(previous?.startedAt===next.startedAt&&previous.roundIndex===next.roundIndex&&previous.round.completedAt===next.round.completedAt&&previous.round.winner&&!next.round.winner){
      state={...state,chapter5:{...next,round:{...next.round,winner:previous.round.winner}}};
    }
    this.state=state;const c=state.chapter5,r=c.round,role=castingRoles[c.roundIndex],intro=state.phase==='chapter5-intro',finale=['chapter5-finale','chapter5-complete'].includes(state.phase);
    // Paused CSS animation sampling follows the same authoritative elapsed
    // clock as scene cues, including arbitrary refresh and reconstruction.
    const surface=this.document.getElementById('chapter5TV');
    const elapsed=this.clock.elapsedNow();
    surface.style.setProperty?.('--handoff-delay',`${-Math.max(0,elapsed-signoffAt)}ms`);
    surface.style.setProperty?.('--stamp-delay',`${-Math.max(0,elapsed-signoffAt-5000)}ms`);
    surface.style.setProperty?.('--glitch-delay',`${-Math.max(0,elapsed-signoffAt-13000)}ms`);
    surface.style.setProperty?.('--party-delay',`${-Math.max(0,elapsed-wifeAt)}ms`);
    this.document.getElementById('chapter5TV').classList?.toggle('playful',c.audioVersion===1&&!finale&&this.clock.elapsedNow()>=chapter5Opening[2].at);
    this.document.getElementById('chapter5TV').classList?.toggle('killer',!finale&&role.id==='killer');
    const waiting=state.phase==='chapter5-waiting',rules=state.phase==='chapter5-rules';
    const key=[c.startedAt,intro?'intro':waiting?'waiting':rules?'rules':finale?'finale':r.id,r.completedAt,c.completedAt].join(':');
    if(key!==this.key){
      this.stop();this.key=key;
      if(state.phase==='chapter5-complete')return;
      const timeline=intro?(c.audioVersion===1?chapter5IntroTimeline:legacyIntroTimeline):waiting?waitingTimeline:rules?chapter5RulesTimeline:finale?(c.revealVersion===1?polishedFinaleTimeline():chapter5FinaleTimeline):r.completedAt!==null?castingResultTimeline(role,c.revealVersion):castingCardTimeline(role);
      this.renderer=new this.Renderer(this.document,timeline,{...this.clock,elapsedNow:()=>{
        const current=this.state.chapter5,base=['chapter5-intro','chapter5-waiting'].includes(this.state.phase)?current.startedAt:this.state.phase==='chapter5-rules'?current.rulesStartedAt:['chapter5-finale','chapter5-complete'].includes(this.state.phase)?current.castStartedAt:current.round.completedAt??current.round.startedAt;
        return Math.max(0,this.clock.elapsedNow()-(base-current.startedAt));
      }});
      const image=this.document.getElementById('chapter5-cardImage');
      if((image.getAttribute?.('src')??image.src)!==role.src){
        // Browsers may keep painting the old bitmap while a new src decodes.
        // Hide it until THIS round's image is ready, not for an arbitrary delay.
        image.hidden=true;image.src=role.src;
        const current=()=>this.state?.chapter5.round.id===role.id&&(image.getAttribute?.('src')??image.src)===role.src;
        image.onerror=()=>{if(current())image.hidden=true;};
        if(image.decode)image.decode().then(()=>{if(current())image.hidden=false;},()=>{});
        else image.hidden=false;
      }
    }
    this.document.getElementById('chapter5-itemHolder').textContent=state.package?.holderPlayer?.name||'';
    this.document.getElementById('chapter5-waitingCopy').textContent=waiting||(intro&&c.audioVersion===1&&this.clock.elapsedNow()>=CHAPTER5_INTRO_MS)?'WAITING FOR THE HOST':'';
    this.document.getElementById('chapter5-roundProgress').textContent='ROUND '+(c.roundIndex+1)+' / 6';
    this.document.getElementById('chapter5-timeToVote').hidden=!r.votingActive;
    this.document.getElementById('chapter5-voteCount').textContent='CASTING IN PROGRESS... '+r.voteCount+' / 12 HAVE VOTED';
    this.document.getElementById('chapter5-winnerRole').textContent=role.title;
    this.document.getElementById('chapter5-winnerName').textContent=r.winner?.name||'';
    this.document.getElementById('chapter5-goodLuck').hidden=role.id!=='sacrifice';
    this.document.getElementById('chapter5-killerNote').hidden=role.id!=='killer';
    for(const role of castingRoles)this.document.getElementById('chapter5-cast-'+role.id).textContent=c.winners.find(w=>w.roleId===role.id)?.player.name||'';
    this.renderer?.update({phase:'opening',startedAt:c.startedAt});
    // Scheduler elapsed may reach the winner boundary before the next safe
    // server projection includes its name. Keep the existing suspense visible;
    // never paint the winner heading alone or disclose a result early.
    const winner=this.document.getElementById('chapter5-winner');
    const suspense=this.document.getElementById('chapter5-revealRole');
    if(!this.renderer?.timeline.cues.some(cue=>cue.visual?.target==='chapter5-revealRole'))suspense.style.opacity=0;
    if(!intro&&!waiting&&!rules&&!finale&&r.completedAt!==null&&!r.winner&&Number(winner.style.opacity)>0){
      winner.style.opacity=0;suspense.textContent=role.title+' IS...';suspense.style.opacity=1;
    }
  }
  progressDue(elapsed,state){
    const c=state.chapter5;
    if(state.phase==='chapter5-intro')return elapsed>=(c.audioVersion===1?CHAPTER5_INTRO_MS:CHAPTER5_LEGACY_INTRO_MS);
    if(state.phase==='chapter5-rules')return elapsed>=c.rulesStartedAt-c.startedAt+CHAPTER5_RULES_MS;
    if(state.phase==='chapter5-finale')return elapsed>=c.castStartedAt-c.startedAt+castingFinaleMs(c.revealVersion);
    if(state.phase==='chapter5-casting'&&c.round.completedAt!==null)return elapsed>=c.round.completedAt-c.startedAt+castingCompletionMs(c.round.id,c.revealVersion);
    return false;
  }
  stop(){
    if(this.renderer){for(const {node} of this.renderer.layers)node.style.opacity=0;this.renderer.stop();}
    this.renderer=null;this.key=null;
  }
}
