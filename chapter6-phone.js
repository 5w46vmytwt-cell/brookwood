// Uses the existing authenticated phone poller; no independent requests/timers.
let current=null,pending=false,selectionRun=null;
export function renderMazePhone(state,{document,auth,request,onState,onInvalid,isCurrent=()=>true}){
 current=state;const c=state.chapter6,node=id=>document.getElementById(id);
 node('mazePhoneTitle').textContent=c.step==='complete'?'THE KILLER’S MAZE':c.step==='vote'?'CHOOSE WHO GOES':'THE KILLER’S MAZE';
 node('mazePhoneCopy').textContent=c.step==='transition'?'Watch the TV. The next scene is about to begin.':c.step==='complete'?'':c.step==='vote'?'Vote privately for the laundry room token retriever.':['selected','waiting'].includes(c.step)?c.selectedPlayer.name+'\nWAITING FOR THE TOKEN':c.step==='return'?'Watch the TV.':c.game===4?'Remain silent. Watch the TV.':'Watch the TV. The host submits the group answer.';
 node('mazePhoneLives').textContent=c.lives+' / 3 SHARED LIVES';
 const canVote=c.canVote&&!c.voted,selector=node('mazePhoneTarget'),old=selectionRun===c.startedAt?selector.value:'';
 selector.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose another eligible player';selector.appendChild(placeholder);
 for(const p of c.candidates??[]){const option=document.createElement('option');option.value=p.id;option.textContent=p.name;selector.appendChild(option);}selector.value=old;selectionRun=c.startedAt;
 selector.hidden=!canVote;const button=node('mazePhoneVote');button.hidden=!canVote;button.disabled=pending;
 node('mazePhoneCount').textContent=c.step==='vote'?(c.voted?'VOTE RECORDED — ':'')+c.voteCount+' / '+c.voterCount+' VOTES RECORDED':'';
 if(c.step==='vote'&&!c.canVote&&!c.voted)node('mazePhoneCopy').textContent='Voting is in progress. You were not in the connected voting group when the first ballot was cast.';
 button.onclick=async()=>{
  if(pending||current!==state||!canVote)return;pending=true;button.disabled=true;node('mazePhoneError').textContent='';
  try{await request('/api/player',{...auth,action:'token-vote',targetId:selector.value,generation:state.generation,chapter6StartedAt:c.startedAt});const next=await request('/api/me',auth);if(isCurrent()&&current?.generation===state.generation)onState(next);}
  catch(error){if(isCurrent()){if(error.status===401)onInvalid();else node('mazePhoneError').textContent=error.message;}}
  finally{pending=false;button.disabled=false;}
 };
}
globalThis.BrookwoodMazePhone={render:renderMazePhone};
