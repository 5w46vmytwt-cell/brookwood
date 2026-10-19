import {InvestigationAudio} from './chapter7-story-audio.js';
import {theories,storyRecording,PHOTO_ATTENTION_MS,PHOTO_ENHANCED_MS,SCARE_IMAGE_MS} from './chapter7-story-timing.js';
const clamp=x=>Math.min(1,Math.max(0,x));
export function photographFrame(position){return {attention:clamp((position-PHOTO_ATTENTION_MS)/5000),enhanced:position>=PHOTO_ENHANCED_MS,mix:clamp((position-PHOTO_ENHANCED_MS)/1500)};}
const podcasts={possession:['BEYOND THE STATIC','POSSESSION','A PARANORMAL THEORY'],officer:['BROOKWOOD FARM','POLICE RADIO','ARCHIVED TRANSMISSION · OCTOBER 31, 1996'],prophecy:['BROOKWOOD FARM','RECOVERED AUDIO','THE RECORDING CONTINUES'],reaction:['BEYOND THE STATIC','POSSESSION','AN UNRESOLVED QUESTION'],premeditation:['THE EVIDENCE ROOM','PREMEDITATION','A SKEPTICAL THEORY'],accomplice:['THE MISSING CHAPTER','ACCOMPLICE','AN INVESTIGATIVE THEORY']};
export class Chapter7Investigation{
 constructor(document,clock,{request,onState,Player}={}){
  this.document=document;this.clock=clock;this.request=request;this.onState=onState;this.state=null;this.id=null;this.authenticated=false;this.epoch=0;this.pending=false;
  this.audio=new InvestigationAudio(clock,{Player,request,onState});
  this.node=id=>document.getElementById(id);
  for(const [id,action] of [['ch7CloseVoting','investigation-close-voting'],['ch7EnvelopeReturned','investigation-envelope-return'],['ch7HostRetrieve','investigation-host-retrieval']])this.node(id).onclick=()=>this.submit(action);
  this.node('ch7Resume').onclick=async()=>{await this.recoverHost();this.audio.unlock();};
 }
 async recoverHost(){const epoch=this.epoch;try{await this.request('/api/host',{action:'maze-session'});if(this.epoch===epoch){this.authenticated=true;this.node('ch7HostError').textContent='';}}catch{if(this.epoch===epoch)this.authenticated=false;}}
 update(state){
  this.state=state;const c=state.chapter7,i=c.investigation;
  if(this.id!==i.id){this.id=i.id;this.epoch++;this.recoverHost();}
  if(this.clock.canSync?.()===false)return;
  this.audio.update(state);
  const now=c.startedAt+this.clock.elapsedNow(),elapsed=Math.max(0,now-i.phaseAt),cue=storyRecording(i.step),position=this.audio.entry?this.audio.position():i.offsetMs+(i.audioStartedAt===null?0:Math.max(0,now-i.audioStartedAt));
  const node=this.node,scene=node('ch7Scene'),stage=node('ch7PhotoStage'),scare=node('ch7Scare');
  node('chapter7Investigation').hidden=false;scene.hidden=false;scene.style.opacity='1';stage.hidden=true;stage.style.opacity='1';scare.hidden=true;node('ch7Curtain').style.opacity='0';
  node('ch7Options').replaceChildren();node('ch7Progress').textContent='';node('ch7Waveform').hidden=!cue||cue.type!=='narration';node('ch7Waveform').classList.toggle('speaking',!!this.audio.entry&&!this.audio.entry.audio.paused&&!this.audio.entry.ended);
  const root=node('chapter7Investigation');root.dataset.scene=i.step;root.dataset.voice=podcasts[i.step]?.[0]??'narrator';
  let eyebrow='BROOKWOOD FARM · CASE FILE 1996',title='',subtitle='';
  if(i.step==='narrator'){title='OCTOBER 31, 1996';subtitle='THE QUESTIONS REMAIN.';}
  if(i.step==='podcast-intro'){title='THREE THEORIES';subtitle='ONE NIGHT. THREE POSSIBLE EXPLANATIONS.';}
  if(podcasts[i.step])[eyebrow,title,subtitle]=podcasts[i.step];
  if(i.testMode)eyebrow='HOST TEST MODE · '+eyebrow;
  const voting=['theory-vote','vote-fade'].includes(i.step);
  if(voting){title='CHOOSE YOUR THEORY';subtitle='Your decision determines the direction of the investigation.';for(const [,name,description] of theories){const card=this.document.createElement('article'),h=this.document.createElement('h2'),p=this.document.createElement('p');h.textContent=name;p.textContent=description;card.append(h,p);node('ch7Options').appendChild(card);}node('ch7Progress').textContent=i.election?i.election.voteCount+' / '+i.election.voterCount+' VOTES RECORDED':'VOTING CLOSED';if(i.step==='vote-fade')scene.style.opacity=this.fade(elapsed,800,false);}
  if(i.step==='vote-intro'){title='THE DIRECTION OF THE INVESTIGATION';subtitle='Listen carefully. Then make your choice.';}
  if(['spoken','theory-reveal','theory-fade'].includes(i.step)){eyebrow='';title='THE GROUP HAS SPOKEN.';const theory=theories.find(t=>t[0]===i.winningTheory);subtitle=i.step==='spoken'?'':theory?.[1]??'';node('ch7Subtitle').style.opacity=i.step==='theory-reveal'?this.fade(elapsed,1500,true):'1';if(i.step==='theory-fade')scene.style.opacity=this.fade(elapsed,1200,false);}else node('ch7Subtitle').style.opacity='1';
  if(['interlude','silent-black','after-scare','scare','complete'].includes(i.step))scene.hidden=true;
  if(i.step==='scare'&&i.audioStartedAt!==null&&position<SCARE_IMAGE_MS)scare.hidden=false;
  if(['incoming','message-hold'].includes(i.step)){eyebrow='INCOMING MESSAGE';title='AN ENVELOPE IS WAITING.';subtitle='UNDER THE STAIRS.\n\nCHOOSE SOMEONE TO RETRIEVE IT.';}
  if(i.step==='envelope-vote'){eyebrow='THE ROOM UNDER THE STAIRS';title='CHOOSE THE RETRIEVER';subtitle='Vote privately on your phone.';node('ch7Progress').textContent=i.election.voteCount+' / '+i.election.voterCount+' VOTES RECORDED';}
  if(i.step==='retriever-fallback'){title='NO ELIGIBLE VOTING GROUP';subtitle='WAITING FOR THE HOST TO ARRANGE RETRIEVAL.';}
  if(i.step==='retriever-reveal'){eyebrow='THE ENVELOPE';title=i.selectedPlayer?.name??'';subtitle='THE GROUP HAS CHOSEN.';scene.style.opacity=this.fade(elapsed,1500,true);}
  if(i.step==='envelope-waiting'){eyebrow='UNDER THE STAIRS';title=i.hostRetriever?'WAITING FOR THE HOST TO RETURN.':'WAITING FOR '+(i.selectedPlayer?.name??'THE SELECTED PLAYER')+' TO RETURN.';subtitle='';}
  if(['photograph','photo-hold','ending-fade'].includes(i.step)){
   scene.hidden=true;stage.hidden=false;const original=node('ch7Original'),enhanced=node('ch7Enhanced'),frame=photographFrame(i.step==='photograph'?position:PHOTO_ENHANCED_MS+15000);
   if(!original.getAttribute('src'))original.src='/assets/chapter7/ch7_group_photo_1996.png';
   original.hidden=false;original.style.opacity=String(1-frame.mix);original.style.transform='scale('+(1+.15*frame.attention)+')';
   enhanced.hidden=!frame.enhanced;if(frame.enhanced){if(!enhanced.getAttribute('src'))enhanced.src='/assets/chapter7/ch7_window_enhanced.png';enhanced.style.opacity=String(frame.mix);enhanced.style.transform='scale('+(1+.035*clamp((position-PHOTO_ENHANCED_MS)/15000))+')';}
   if(i.step==='ending-fade')stage.style.opacity=this.fade(elapsed,1000,false);
  }
  node('ch7Eyebrow').textContent=eyebrow;node('ch7Title').textContent=title;node('ch7Subtitle').textContent=subtitle;
  node('ch7CloseVoting').hidden=!this.authenticated||!['theory-vote','envelope-vote'].includes(i.step);node('ch7CloseVoting').disabled=this.pending||!i.election?.voteCount;
  node('ch7HostRetrieve').hidden=!this.authenticated||i.step!=='retriever-fallback';node('ch7HostRetrieve').disabled=this.pending;
  node('ch7EnvelopeReturned').hidden=!this.authenticated||i.step!=='envelope-waiting';node('ch7EnvelopeReturned').disabled=this.pending;
  node('ch7Resume').hidden=!this.audio.blocked;node('ch7Resume').textContent=this.audio.message||'ENABLE AUDIO / RESUME';
 }
 fade(elapsed,duration,inward){const frame=globalThis.BrookwoodTimeline.resolve({end:duration+1,cues:[{id:'fade',at:0,end:duration+1,visual:{[inward?'fadeIn':'fadeOut']:[0,duration]}}]},Math.min(duration,elapsed));return String(frame.visuals.fade.opacity);}
 async submit(action){
  if(this.pending||!this.authenticated||!this.state)return;this.pending=true;this.node('ch7HostError').textContent='';const state=this.state,i=state.chapter7.investigation,epoch=this.epoch,sentAt=performance.now();
  try{const result=await this.request('/api/host',{action,generation:state.generation,broadcastId:state.chapter7.id,investigationId:i.id,sequence:i.sequence});if(this.epoch===epoch&&this.state.chapter7.investigation.sequence===i.sequence)this.onState(result.state,{sentAt,receivedAt:performance.now()});}
  catch(error){if(this.epoch===epoch)this.node('ch7HostError').textContent=error.message;}
  finally{this.pending=false;}
 }
 stop(){this.epoch++;this.audio.stop();this.state=null;this.id=null;this.authenticated=false;this.node('chapter7Investigation').hidden=true;this.node('ch7HostError').textContent='';}
}
