import {clues,PUZZLE_SRC,PUZZLE_FADE_MS,smooth} from './chapter8-puzzle.js';
import {Chapter8Audio} from './chapter8-audio.js';

export class Chapter8View{
 constructor(document,clock,{request=(...a)=>globalThis.lobbyRequest(...a),onState=(state,timing)=>document.dispatchEvent(new CustomEvent('brookwood-chapter8-state',{detail:{state,timing}})),Player}={}){
  this.document=document;this.clock=clock;this.request=request;this.onState=onState;this.Player=Player;this.state=null;this.authenticated=false;this.authPending=false;this.pending=false;this.revealing=new Set();this.buttons=new Map();this.tabs=new Map();this.epoch=0;
 }
 node(id){return this.document.getElementById(id);}
 async authenticate(){if(this.authPending)return;this.authPending=true;const epoch=this.epoch;try{await this.request('/api/host',{action:'maze-session'});if(epoch===this.epoch)this.authenticated=true;}catch{if(epoch===this.epoch)this.authenticated=false;}finally{this.authPending=false;}}
 setup(){
  if(this.audio)return;this.audio=new Chapter8Audio(this.clock,{Player:this.Player,request:this.request,onState:this.onState});
  const canvas=this.node('chapter8Canvas');this.node('chapter8Artwork').src=PUZZLE_SRC;
  for(const c of clues){
   const button=this.document.createElement('button');button.className='ch8-clue';button.type='button';button.dataset.clue=String(c.id);button.style.left=c.x+'%';button.style.top=c.y+'%';button.style.width=c.w+'%';button.style.height=c.h+'%';
   // Sample unmarked paper from the same supplied PNG; never alter the asset.
   button.style.backgroundSize=(10000/c.w)+'% '+(10000/c.h)+'%';button.style.backgroundPosition=(80.8/(100-c.w)*100)+'% '+(44/(100-c.h)*100)+'%';
   button.addEventListener('pointerdown',event=>{if(!event.isPrimary||event.button!==0)return;this.pointer={id:c.id,x:event.clientX,y:event.clientY,pointerId:event.pointerId,scene:this.state?.chapter8?.id+':'+this.state?.chapter8?.step};});
   button.addEventListener('pointercancel',()=>this.pointer=null);
   button.addEventListener('pointerup',event=>{const p=this.pointer;this.pointer=null;if(!p||p.id!==c.id||p.pointerId!==event.pointerId||Math.hypot(p.x-event.clientX,p.y-event.clientY)>8||p.scene!==this.state?.chapter8?.id+':'+this.state?.chapter8?.step)return;this.reveal(c.id);});
   button.addEventListener('click',event=>{if(event.detail===0)this.reveal(c.id);});canvas.appendChild(button);this.buttons.set(c.id,button);
   // Restore the original numbered paper tab above the replacement, using an
   // exact crop of the supplied PNG rather than redrawing the artwork/text.
   const tab=this.document.createElement('span'),tx=c.x-.5,ty=c.id<=9?13:c.id<=13?42:65.5,tw=c.id<=9?5.0:5.5,th=6.5;
   tab.className='ch8-number-tab';tab.hidden=true;tab.setAttribute('aria-hidden','true');tab.style.left=tx+'%';tab.style.top=ty+'%';tab.style.width=tw+'%';tab.style.height=th+'%';tab.style.backgroundSize=(10000/tw)+'% '+(10000/th)+'%';tab.style.backgroundPosition=(tx/(100-tw)*100)+'% '+(ty/(100-th)*100)+'%';canvas.appendChild(tab);this.tabs.set(c.id,tab);
  }
  this.node('chapter8Continue').onclick=()=>this.submit('chapter8-continue');this.node('chapter8Resume').onclick=async()=>{await this.authenticate();this.audio.unlock();};
 }
 update(state){
  const previous=this.state;this.state=state;const c=state.chapter8,ready=state.phase==='chapter7'&&state.chapter7?.investigation?.step==='complete';
  const start=this.node('chapter8Start');if(!start)return;
  if((c&&!previous?.chapter8||ready&&!this.ready)||c&&previous?.chapter8?.id!==c.id)this.authenticate();this.ready=ready;
  start.hidden=!ready||!this.authenticated||!this.node('chapterSelectPanel')?.hidden;start.disabled=this.pending;start.onclick=()=>this.submit('chapter8-start');
  if(!c){this.node('chapter8TV').hidden=true;this.audio?.stop();return;}
  this.setup();this.node('chapter8TV').hidden=false;if(this.clock.canSync?.()===false)return;this.audio.update(state);
  const puzzle=['puzzle','leaving'].includes(c.step);this.node('chapter8Canvas').hidden=!puzzle;this.node('chapter8Canvas').style.opacity=String(c.step==='leaving'?smooth((c.deadline-c.startedAt-this.clock.elapsedNow())/PUZZLE_FADE_MS):1);
  this.node('chapter8Narrator').hidden=puzzle||c.step==='complete';this.node('chapter8Heading').textContent=({'unexpected-evidence':'UNEXPECTED EVIDENCE','coded-message':'A CODED MESSAGE',reaction:'THE MESSAGE'})[c.step]??'';
  this.node('chapter8Wave').classList.toggle('speaking',!!this.audio.entry&&!this.audio.entry.audio.paused&&!this.audio.entry.ended);
  const nav=this.node('chapterSelectPanel'),navigating=nav&&!nav.hidden;if(navigating)this.pointer=null;
  for(const clue of clues){const button=this.buttons.get(clue.id),revealed=c.revealedClues.includes(clue.id),interactive=this.authenticated&&c.step==='puzzle'&&!revealed&&!this.pending&&!this.revealing.has(clue.id)&&!navigating;
   button.textContent=revealed?clue.letter:'';button.dataset.revealed=String(revealed);button.dataset.interactive=String(interactive);button.disabled=!interactive;button.tabIndex=interactive?0:-1;button.setAttribute('aria-label',revealed?'Clue '+clue.id+': '+clue.letter:'Reveal clue '+clue.id);this.tabs.get(clue.id).hidden=!revealed;
  }
  this.node('chapter8Continue').hidden=!this.authenticated||c.step!=='puzzle'||c.revealedClues.length!==17;this.node('chapter8Continue').disabled=this.pending||navigating;
  this.node('chapter8Resume').hidden=!this.authenticated||!this.audio.needsUnlock();this.node('chapter8Resume').textContent=this.audio.message||'ENABLE AUDIO';
 }
 reveal(id){const c=this.state?.chapter8;if(!this.authenticated||this.pending||this.revealing.has(id)||c?.step!=='puzzle'||c.revealedClues.includes(id)||!this.node('chapterSelectPanel')?.hidden)return;this.submit('chapter8-reveal',{clueId:id});}
 async submit(action,extra={}){
  if(!this.authenticated||this.pending)return;const state=this.state,c=state.chapter8,epoch=this.epoch,isReveal=action==='chapter8-reveal';if(isReveal)this.revealing.add(extra.clueId);else this.pending=true;this.pointer=null;const error=this.node('chapter8Error');error.textContent='';
  try{const sentAt=performance.now(),result=await this.request('/api/host',{action,generation:state.generation,...(c?{chapter8Id:c.id,sequence:c.sequence}:{chapter7Id:state.chapter7?.id}),...extra});if(epoch===this.epoch)this.onState(result.state,{sentAt,receivedAt:performance.now()});}
  catch(e){if(epoch===this.epoch){error.textContent=e.message;if(e.status===403)this.authenticated=false;}}
  finally{if(isReveal)this.revealing.delete(extra.clueId);else this.pending=false;}
 }
 progressDue(now){const c=this.state?.chapter8;return c?.step==='leaving'&&now>=c.deadline;}
 stop(){this.epoch++;this.pointer=null;this.audio?.stop();this.state=null;this.ready=false;this.authenticated=false;const root=this.node('chapter8TV'),start=this.node('chapter8Start');if(root)root.hidden=true;if(start)start.hidden=true;}
}
