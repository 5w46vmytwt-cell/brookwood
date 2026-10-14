import {games,orderedOptions} from './chapter6-timing.js';
export function installMazeControls({document,runtime,acceptState,request}){
 let state=null,pending=false,authenticated=false,selectedAnswer=null,scene=null,authReadyRun=null;
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
 node('chapter6ReadyStart').onclick=()=>submit('maze-start-games','start');
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
  node('chapter6ReadyStart').hidden=c.step!=='ready'||!authenticated;node('chapter6ReadyStart').disabled=pending;
  if(c.step==='ready'&&!authenticated&&authReadyRun!==next.generation+':'+c.startedAt){
   const run=next.generation+':'+c.startedAt;authReadyRun=run;
   Promise.resolve(request('/api/host',{action:'maze-session'})).then(()=>{if(state?.generation+':'+state?.chapter6?.startedAt!==run)return;authenticated=true;update(state);}).catch(()=>{});
  }
  node('chapter6HostCode').hidden=authenticated;node('chapter6HostLogin').hidden=authenticated;
  node('chapter6HostLogin').disabled=pending;choices.hidden=!authenticated;
  choices.replaceChildren();node('chapter6HostStatus').textContent=games[c.game].title+' — '+c.step.toUpperCase();
  const options=c.step==='ready'?[['start','START THE GAMES']]:['answer','expired'].includes(c.step)?[...orderedOptions(c),...(c.controlVersion===1&&c.step==='expired'?[['no-consensus',"THE GROUP COULDN'T AGREE"]]:[])]:c.step==='verdict'?[['pass','PASS'],['fail','FAIL']]:c.step==='waiting'?[['returned','Player Returned With Token']]:c.step==='vote'?[...(c.testMode?[['simulated','TEST: VOTE SIMULATED PLAYERS (BEFORE REAL BALLOTS)']]:[]),['close','CLOSE VOTING']]:[];
  for(const [id,label] of options){const button=document.createElement('button');button.textContent=label;button.disabled=pending||(id==='close'&&!c.voteCount);button.className=selectedAnswer===id?'selected':'';button.onclick=()=>{selectedAnswer=id;return submit(c.step==='ready'?'maze-start-games':['answer','expired'].includes(c.step)?'maze-answer':c.step==='verdict'?'maze-verdict':c.step==='vote'?(id==='close'?'maze-close-voting':'maze-test-vote'):'maze-token-return',id);};choices.appendChild(button);}
 }
 return {update,close};
}
globalThis.BrookwoodMazeControls={install:installMazeControls};
