// Reuses the authenticated phone poller and the existing private-vote controls.
let current=null,pending=false,selectionKey=null;
export function renderInvestigationPhone(state,{document,auth,request,onState,onInvalid,isCurrent=()=>true}){
 current=state;const i=state.chapter7.investigation,e=i?.election,node=id=>document.getElementById(id),selector=node('mazePhoneTarget'),button=node('mazePhoneVote');
 node('mazePhoneTitle').textContent=e?(e.key==='theory'?'CHOOSE YOUR THEORY':'CHOOSE THE RETRIEVER'):'';
 node('mazePhoneCopy').textContent=i?.step==='envelope-waiting'?(i.hostRetriever?'WAITING FOR THE HOST TO RETURN.':'WAITING FOR '+i.selectedPlayer.name+' TO RETURN.'):e?'Vote privately. Your choice cannot be changed.':i?.step==='complete'?'':'Watch the TV.';
 node('mazePhoneLives').hidden=true;node('mazePhoneError').hidden=false;
 const key=e?.id,canVote=e?.canVote&&!e.voted,old=selectionKey===key?selector.value:'';selectionKey=key;selector.replaceChildren();
 const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=e?.key==='theory'?'Choose your theory':'Choose an eligible retriever';selector.appendChild(placeholder);
 for(const c of e?.candidates??[]){const option=document.createElement('option');option.value=c.id;option.textContent=c.name+(c.description?' — '+c.description:'');selector.appendChild(option);}selector.value=old;
 selector.hidden=!canVote;button.hidden=!canVote;button.disabled=pending;node('mazePhoneCount').hidden=!e;node('mazePhoneCount').textContent=e?(e.voted?'VOTE RECORDED — ':'')+e.voteCount+' / '+e.voterCount+' VOTES RECORDED':'';
 if(e&&!e.canVote&&!e.voted)node('mazePhoneCopy').textContent='Voting is in progress. The host can help if you joined after it opened.';
 button.onclick=async()=>{if(pending||current!==state||!canVote)return;pending=true;button.disabled=true;node('mazePhoneError').textContent='';
  try{await request('/api/player',{...auth,action:'investigation-vote',generation:state.generation,broadcastId:state.chapter7.id,investigationId:i.id,sequence:i.sequence,election:e.key,electionId:e.id,targetId:selector.value});const next=await request('/api/me',auth);if(isCurrent()&&current?.chapter7.id===state.chapter7.id&&next.chapter7?.investigation?.id===i.id)onState(next);}
  catch(error){if(isCurrent()){if(error.status===401)onInvalid();else node('mazePhoneError').textContent=error.message;}}
  finally{pending=false;button.disabled=false;}
 };
}
globalThis.BrookwoodInvestigationPhone={render:renderInvestigationPhone};
