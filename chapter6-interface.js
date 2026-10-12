import {games} from './chapter6-timing.js';
export function installMazeControls({document,runtime,acceptState,request}){
 let state=null,pending=false,authenticated=false,selectedAnswer=null,scene=null;
 const node=id=>document.getElementById(id),panel=node('chapter6Host'),choices=node('chapter6HostAnswers');
 function close(){panel.hidden=true;node('chapter6HostCode').value='';node('chapter6HostError').textContent='';}
 node('chapter6HostToggle').onclick=async()=>{
  panel.hidden=false;authenticated=false;pending=true;update(state);
  try{await request('/api/host',{action:'maze-session'});authenticated=true;}
  catch(error){if(error.status!==403)node('chapter6HostError').textContent=error.message;}
  finally{pending=false;update(state);if(!authenticated&&!panel.hidden)node('chapter6HostCode').focus();}
 };
 node('chapter6HostLogin').onclick=async()=>{
  if(pending)return;pending=true;update(state);node('chapter6HostError').textContent='';
  try{await request('/api/host',{action:'maze-login',code:node('chapter6HostCode').value});authenticated=true;}
  catch(error){node('chapter6HostError').textContent=error.message;}
  finally{node('chapter6HostCode').value='';pending=false;update(state);}
 };
 node('chapter6HostCode').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();node('chapter6HostLogin').click();}});
 node('chapter6HostClose').onclick=close;
 node('chapter6Audio').onclick=()=>runtime.unlockChapter6();
 document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
 async function submit(action,answer){
  if(pending||!authenticated||!state?.chapter6)return;runtime.unlockChapter6();pending=true;update(state);
  const snapshot=state,c=snapshot.chapter6;node('chapter6HostError').textContent='';
  try{const sentAt=performance.now();const result=await request('/api/host',{action,answer,generation:snapshot.generation,chapter6StartedAt:c.startedAt,sequence:c.sequence});
   if(state?.generation===snapshot.generation&&state.chapter6?.startedAt===c.startedAt&&result.state){acceptState(result.state,{sentAt,receivedAt:performance.now()});close();}
  }catch(error){if(error.status===403)authenticated=false;node('chapter6HostError').textContent=error.message;}finally{pending=false;update(state);}
 }
 function update(next){
  state=next;if(!next?.chapter6){close();return;}const c=next.chapter6;
  const key=next.generation+':'+c.startedAt+':'+c.sequence;if(scene!==key){scene=key;selectedAnswer=null;}
  if(c.step==='transition')close();
  node('chapter6HostCode').hidden=authenticated;node('chapter6HostLogin').hidden=authenticated;
  node('chapter6HostLogin').disabled=pending;choices.hidden=!authenticated;
  choices.replaceChildren();node('chapter6HostStatus').textContent=games[c.game].title+' — '+c.step.toUpperCase();
  const options=c.step==='answer'?games[c.game].options:c.step==='verdict'?[['pass','PASS'],['fail','FAIL']]:c.step==='waiting'?[['returned','Player Returned With Token']]:c.step==='vote'&&c.testMode?[['simulated','TEST: VOTE SIMULATED PLAYERS (BEFORE REAL BALLOTS)']]:[];
  for(const [id,label] of options){const button=document.createElement('button');button.textContent=label;button.disabled=pending;button.className=selectedAnswer===id?'selected':'';button.onclick=()=>{selectedAnswer=id;return submit(c.step==='answer'?'maze-answer':c.step==='verdict'?'maze-verdict':c.step==='vote'?'maze-test-vote':'maze-token-return',id);};choices.appendChild(button);}
 }
 return {update,close};
}
globalThis.BrookwoodMazeControls={install:installMazeControls};
