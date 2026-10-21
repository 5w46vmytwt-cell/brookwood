import {InvestigationAudio} from './chapter7-story-audio.js';
import {theories,storyRecording,PHOTO_ATTENTION_MS,PHOTO_ENHANCED_MS,transitionFrame,narratorFrame,sceneDuration,smooth,connectionFrame,dateFrame} from './chapter7-story-timing.js';
const clamp=x=>Math.min(1,Math.max(0,x));
export function photographFrame(position){return {attention:clamp((position-PHOTO_ATTENTION_MS)/5000),enhanced:position>=PHOTO_ENHANCED_MS,mix:clamp((position-PHOTO_ENHANCED_MS)/1500)};}
const logos={
 'THE UNSEEN':'<path d="M8 32 Q32 4 56 32 Q32 60 8 32Z"/><circle cx="32" cy="32" r="9"/><path d="M32 6V0 M32 64V58 M6 32H0 M64 32H58"/>',
 'COLD EVIDENCE':'<rect x="14" y="6" width="36" height="52" rx="2"/><path d="M22 17H42 M22 23H42 M23 43 Q20 31 32 31 Q44 31 41 45 M28 46 Q25 36 32 36 Q39 36 36 49 M32 41V51"/>',
 'THE MISSING PIECE':'<circle cx="25" cy="22" r="10"/><circle cx="42" cy="25" r="9"/><path d="M5 55 Q6 34 25 34 Q43 34 44 55 M35 38 Q58 35 59 55"/>'};
const podcasts={possession:['THE UNSEEN','POSSESSION','A PARANORMAL THEORY'],officer:['BROOKWOOD FARM','POLICE RADIO','ARCHIVED TRANSMISSION · OCTOBER 31, 1996'],prophecy:['BROOKWOOD FARM','POLICE RADIO','ARCHIVED TRANSMISSION - OCTOBER 31, 1996'],reaction:['THE UNSEEN','POSSESSION','AN UNRESOLVED QUESTION'],premeditation:['COLD EVIDENCE','PREMEDITATION','A SKEPTICAL THEORY'],accomplice:['THE MISSING PIECE','ACCOMPLICE','AN INVESTIGATIVE THEORY']};
export class Chapter7Investigation{
 constructor(document,clock,{request,onState,Player}={}){
  this.document=document;this.clock=clock;this.request=request;this.onState=onState;this.state=null;this.id=null;this.authenticated=false;this.epoch=0;this.pending=false;
  this.audio=new InvestigationAudio(clock,{Player,request,onState});
  this.node=id=>document.getElementById(id);
  for(const [id,action] of [['ch7CloseVoting','investigation-close-voting'],['ch7EnvelopeReturned','investigation-envelope-return'],['ch7HostRetrieve','investigation-host-retrieval']])this.node(id).onclick=()=>this.submit(action);
  this.node('ch7TestFill').onclick=()=>this.submit('investigation-test-fill');
  this.node('ch7TestVotes').onclick=()=>this.testVotes();
  this.node('ch7Resume').onclick=async()=>{await this.recoverHost();this.audio.unlock();};
 }
 async recoverHost(){const epoch=this.epoch;try{await this.request('/api/host',{action:'maze-session'});if(this.epoch===epoch){this.authenticated=true;this.node('ch7HostError').textContent='';}}catch{if(this.epoch===epoch)this.authenticated=false;}}
 update(state){
  this.state=state;const c=state.chapter7,i=c.investigation;
  if(this.id!==i.id){this.id=i.id;this.epoch++;this.recoverHost();}
  if(this.clock.canSync?.()===false)return;
  this.audio.update(state);
  const now=c.startedAt+this.clock.elapsedNow(),elapsed=Math.max(0,now-i.phaseAt),cue=storyRecording(i.step),position=this.audio.entry?this.audio.position():i.offsetMs+(i.audioStartedAt===null?0:Math.max(0,now-i.audioStartedAt));
  const node=this.node,scene=node('ch7Scene'),stage=node('ch7PhotoStage');
  node('chapter7Investigation').hidden=false;scene.hidden=false;scene.style.opacity='1';stage.hidden=true;stage.style.opacity='1';node('ch7Transition').hidden=true;node('ch7Date').hidden=true;node('ch7Connection').hidden=true;node('ch7Curtain').style.opacity='0';
  node('ch7Options').replaceChildren();node('ch7Progress').textContent='';node('ch7Waveform').hidden=!cue||cue.type!=='narration';node('ch7Waveform').classList.toggle('speaking',!!this.audio.entry&&!(this.audio.entry.secondary??this.audio.entry.audio).paused&&!this.audio.entry.ended);
  const root=node('chapter7Investigation');root.dataset.scene=i.step;root.dataset.voice=podcasts[i.step]?.[0]??'narrator';
  let eyebrow='BROOKWOOD FARM · CASE FILE 1996',title='',subtitle='';
  if(i.step==='narrator'){const f=narratorFrame(position);scene.style.opacity=String(f.scene);title='BROOKWOOD FARM';subtitle='THE QUESTIONS REMAIN.';}
  if(i.step==='podcast-intro'){title='THREE THEORIES';subtitle='ONE NIGHT. THREE POSSIBLE EXPLANATIONS.';}
  let identity=podcasts[i.step]?.[0];
  if(podcasts[i.step])[eyebrow,title,subtitle]=podcasts[i.step];
  const transition={'theory1-transition':['podcast-intro','possession','THEORY 01','POSSESSION'],'theory2-transition':['reaction','premeditation','THEORY 02','PREMEDITATION'],'theory3-transition':['premeditation','accomplice','THEORY 03','ACCOMPLICE'],'narrator-transition':['accomplice','vote-intro','','THE INVESTIGATION CONTINUES']}[i.step];
  if(transition){
   const f=transitionFrame(elapsed,i.step==='narrator-transition',i.polishVersion),incoming=elapsed>=((i.polishVersion>=2?7300:6500)+(i.step==='narrator-transition'?2000:0)),visible=podcasts[transition[incoming?1:0]];
   identity=visible?.[0];if(visible)[eyebrow,title,subtitle]=visible;else{eyebrow='BROOKWOOD FARM - CASE FILE 1996';title=i.step==='theory1-transition'?'THREE THEORIES':'THE DIRECTION OF THE INVESTIGATION';subtitle=i.step==='theory1-transition'?'ONE NIGHT. THREE POSSIBLE EXPLANATIONS.':'Listen carefully. Then make your choice.';}
   scene.style.opacity=String(incoming?f.incoming:f.out);node('ch7Waveform').hidden=true;
   node('ch7Transition').hidden=false;node('ch7Transition').style.opacity=String(f.title);node('ch7TransitionNumber').textContent=transition[2];node('ch7TransitionTitle').textContent=transition[3];
  }
  root.dataset.voice=identity??'narrator';
  const logo=node('ch7PodcastLogo');logo.hidden=!logos[identity];
  if(logos[identity]&&logo.dataset.identity!==identity){logo.innerHTML='<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">'+logos[identity]+'</svg>';logo.dataset.identity=identity;}
  if(logos[identity]){eyebrow=title;title='PODCAST: '+identity;subtitle='';}
  if(i.testMode&&i.election)eyebrow='HOST TEST MODE · '+eyebrow;
  const voting=['theory-vote','vote-fade'].includes(i.step);
  if(voting){title='CHOOSE YOUR THEORY';subtitle='Your decision determines the direction of the investigation.';for(const [,name,description] of theories){const card=this.document.createElement('article'),h=this.document.createElement('h2'),p=this.document.createElement('p');h.textContent=name;p.textContent=description;card.append(h,p);node('ch7Options').appendChild(card);}node('ch7Progress').textContent=i.election?i.election.voteCount+' / '+i.election.voterCount+' VOTES RECORDED':'VOTING CLOSED';if(i.step==='vote-fade')scene.style.opacity=this.fade(elapsed,sceneDuration(i),false);}
  if(i.step==='vote-intro'){title='THE DIRECTION OF THE INVESTIGATION';subtitle='Listen carefully. Then make your choice.';}
  if(['spoken','theory-reveal','theory-fade'].includes(i.step)){eyebrow='';title='THE GROUP HAS SPOKEN.';const theory=theories.find(t=>t[0]===i.winningTheory);subtitle=i.step==='spoken'?'':theory?.[1]??'';node('ch7Subtitle').style.transform='scale('+(1+.2*((x)=>x*x*(3-2*x))(clamp((i.step==='theory-fade'?6500:elapsed)/6500)))+')';node('ch7Subtitle').style.opacity=i.step==='theory-reveal'?this.fade(elapsed,1800,true):'1';if(i.step==='theory-fade')scene.style.opacity=this.fade(elapsed,sceneDuration(i),false);}else {node('ch7Subtitle').style.opacity='1';node('ch7Subtitle').style.transform='';}
  if(i.step==='connection'){scene.hidden=true;const f=connectionFrame(position,!!this.audio.entry&&!this.audio.entry.audio.paused&&!this.audio.entry.ended),signal=node('ch7Connection');signal.hidden=false;signal.style.opacity=String(f.opacity);signal.style.setProperty('--signal-y',f.y+'vh');signal.style.setProperty('--signal-scale',String(f.scale));signal.style.setProperty('--signal-skew',f.skew+'deg');}
  if(i.step==='date-reveal'){scene.hidden=true;const f=dateFrame(elapsed);node('ch7Date').hidden=false;node('ch7Date').style.opacity=String(f.opacity);node('ch7Year').style.transform='scale('+f.yearScale+')';}
  if(['connection-black','interlude','silent-black','after-scare','scare','complete'].includes(i.step))scene.hidden=true;
  if(['incoming','message-hold','envelope-vote'].includes(i.step)){eyebrow='INCOMING MESSAGE';title='AN ENVELOPE IS WAITING.';subtitle='UNDER THE STAIRS.\n\nCHOOSE SOMEONE TO RETRIEVE IT.';}
  if(['incoming','envelope-vote'].includes(i.step)&&i.election){node('ch7Progress').textContent=i.election.voteCount+' / '+i.election.voterCount+' VOTES RECORDED';}
  if(i.step==='retriever-fallback'){title='NO ELIGIBLE RETRIEVER';subtitle='All registered candidates have retrieved earlier objects, or the voting cast is empty. The authenticated host can arrange retrieval.';}
  if(i.step==='retriever-reveal'){eyebrow='THE ENVELOPE';title=i.selectedPlayer?.name??'';subtitle='THE GROUP HAS CHOSEN.';scene.style.opacity=this.fade(elapsed,1500,true);}
  if(i.step==='envelope-waiting'){eyebrow='UNDER THE STAIRS';title=i.hostRetriever?'WAITING FOR THE HOST TO RETURN.':'WAITING FOR '+(i.selectedPlayer?.name??'THE SELECTED PLAYER')+' TO RETURN.';subtitle='';}
  if(['photograph','photo-hold','ending-fade'].includes(i.step)){
   scene.hidden=true;stage.hidden=false;const original=node('ch7Original'),enhanced=node('ch7Enhanced'),frame=photographFrame(i.step==='photograph'?position:PHOTO_ENHANCED_MS+15000);
   if(!original.getAttribute('src'))original.src='/assets/chapter7/ch7_group_photo_1996.png';
   original.hidden=false;if(i.step==='photograph'&&original.complete&&original.naturalWidth>0)this.audio.photoAppearance();original.style.opacity=String(1-frame.mix);original.style.transform='scale('+(1+.15*frame.attention)+')';
   enhanced.hidden=!frame.enhanced;if(frame.enhanced){if(!enhanced.getAttribute('src'))enhanced.src='/assets/chapter7/ch7_window_enhanced.png';enhanced.style.opacity=String(frame.mix);enhanced.style.transform='scale('+(1+.035*clamp((position-PHOTO_ENHANCED_MS)/15000))+')';}
   if(i.step==='ending-fade')stage.style.opacity=this.fade(elapsed,sceneDuration(i),false);
  }
  if(i.testMode&&i.election)node('ch7Progress').textContent+=' / TEST DATA: '+i.election.simulatedVoteCount+' SIMULATED';
  node('ch7Eyebrow').textContent=eyebrow;node('ch7Title').textContent=title;node('ch7Subtitle').textContent=subtitle;
  node('ch7CloseVoting').hidden=!this.authenticated||!['theory-vote','envelope-vote','incoming'].includes(i.step);node('ch7CloseVoting').disabled=this.pending||!i.election?.voteCount||i.election?.closed;
  node('ch7HostRetrieve').hidden=!this.authenticated||i.step!=='retriever-fallback';node('ch7HostRetrieve').disabled=this.pending;
  node('ch7EnvelopeReturned').hidden=!this.authenticated||i.step!=='envelope-waiting';node('ch7EnvelopeReturned').disabled=this.pending;
  node('ch7TestFill').hidden=!this.authenticated||!i.testMode||!!i.election||!['complete','envelope-waiting','retriever-fallback'].includes(i.step);node('ch7TestVotes').hidden=!this.authenticated||!i.testMode||!i.election;
  if(!this.authenticated||!i.testMode||!i.election||node('ch7TestPanel').dataset.election!==i.election?.id)node('ch7TestPanel').hidden=true;
  node('ch7Resume').hidden=!this.audio.blocked;node('ch7Resume').textContent=this.audio.message||'ENABLE AUDIO / RESUME';
 }
 fade(elapsed,duration,inward){const amount=smooth(elapsed/duration);return String(inward?amount:1-amount);}
 async testVotes(){
  const panel=this.node('ch7TestPanel'),i=this.state?.chapter7.investigation;if(!this.authenticated||!i?.testMode||!i.election)return;
  try{
   const options=await this.request('/api/host',{action:'investigation-test-options'});
   if(this.state?.chapter7.investigation.election?.id!==i.election.id)return;
   panel.replaceChildren();panel.dataset.election=i.election.id;panel.hidden=false;
   const label=this.document.createElement('p');label.textContent='HOST TEST DATA - REAL PHONE VOTES REMAIN PRIVATE';panel.appendChild(label);
   const inputs=[];for(const p of options.simulated){
    const row=this.document.createElement('label'),select=this.document.createElement('select');row.textContent=p.name+(p.voted?' - RECORDED':'');
    const empty=this.document.createElement('option');empty.value='';empty.textContent='Leave uncast';select.appendChild(empty);
    for(const c of options.candidates){const o=this.document.createElement('option');o.value=c.id;o.textContent=c.name;select.appendChild(o);}select.disabled=p.voted;row.appendChild(select);panel.appendChild(row);inputs.push([p.id,select]);
   }
   const button=this.document.createElement('button');button.textContent='SUBMIT ASSIGNED TEST VOTES';button.onclick=()=>{const votes=Object.fromEntries(inputs.filter(([,s])=>!s.disabled&&s.value).map(([id,s])=>[id,s.value]));this.submit('investigation-test-vote',{election:i.election.key,electionId:i.election.id,votes});panel.hidden=true;};panel.appendChild(button);
  }catch(error){this.node('ch7HostError').textContent=error.message;}
 }
 async submit(action,extra={}){
  if(this.pending||!this.authenticated||!this.state)return;this.pending=true;this.node('ch7HostError').textContent='';const state=this.state,i=state.chapter7.investigation,epoch=this.epoch,sentAt=performance.now();
  try{const result=await this.request('/api/host',{action,generation:state.generation,broadcastId:state.chapter7.id,investigationId:i.id,sequence:i.sequence,...extra});if(this.epoch===epoch&&this.state.chapter7.investigation.sequence===i.sequence)this.onState(result.state,{sentAt,receivedAt:performance.now()});}
  catch(error){if(this.epoch===epoch)this.node('ch7HostError').textContent=error.message;}
  finally{this.pending=false;}
 }
 stop(){this.epoch++;this.audio.stop();this.state=null;this.id=null;this.authenticated=false;this.node('chapter7Investigation').hidden=true;this.node('ch7HostError').textContent='';}
}
