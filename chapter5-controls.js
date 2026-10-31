// Existing host session + progression endpoint, with no independent poller.
export function installCastControls({document,request,acceptState,unlock=()=>{},now=()=>performance.now()}){
 const node=id=>document.getElementById(id);let state=null,authenticated=false,pending=false,opened=false,checked=null,probed=false,epoch=0;
 const render=()=>{
  const waiting=state?.phase==='chapter5-waiting',voting=!!state?.chapter5?.round.votingActive,available=waiting||voting;
  node('chapter5HostToggle').hidden=!available;
  node('chapter5Host').hidden=!available||(waiting?(!opened&&!authenticated):!opened);
  node('chapter5ReadyButton').hidden=!waiting||!authenticated;
  node('chapter5ReadyButton').disabled=pending;
  node('chapter5HostCode').hidden=waiting&&authenticated;
  node('chapter5HostLogin').hidden=authenticated;
  node('chapter5HostLogin').disabled=pending;
  node('chapter5SimulatedButton').hidden=!voting||!authenticated;
 };
 async function authenticate(code){
  if(pending)return;pending=true;render();const ticket=epoch;
  try{const result=await request('/api/host',{action:code?'maze-login':'maze-session',...(code?{code}:{})});if(ticket===epoch)authenticated=result.authenticated===true;}
  catch(error){if(ticket===epoch){authenticated=false;if(code||error.status!==403)node('chapter5HostError').textContent=error.message;}}
  finally{if(ticket===epoch){pending=false;if(authenticated)node('chapter5HostCode').value='';render();}}
 }
 node('chapter5HostToggle').onclick=()=>{opened=!opened;render();if(opened&&!authenticated)node('chapter5HostCode').focus();};
 node('chapter5HostLogin').onclick=()=>authenticate(node('chapter5HostCode').value);
 node('chapter5HostCode').addEventListener('keydown',event=>{if(event.key==='Enter'&&!authenticated){event.preventDefault();node('chapter5HostLogin').click();}});
 async function ready(){
  if(pending||!authenticated||state?.phase!=='chapter5-waiting')return;
  const snapshot=state,run=state.chapter5.startedAt,ticket=epoch;pending=true;render();unlock();node('chapter5HostError').textContent='';
  try{const sentAt=now(),result=await request('/api/host',{action:'casting-ready',chapter5StartedAt:run});
   if(ticket===epoch&&state?.chapter5?.startedAt===run&&result.state)acceptState(result.state,{sentAt,receivedAt:now()});
  }catch(error){if(ticket===epoch){if(error.status===403)authenticated=false;node('chapter5HostError').textContent=error.message;}}
  finally{if(ticket===epoch){pending=false;render();}}
 }
 return {ready,update(next){const key=next?.chapter5?`${next.generation??''}:${next.chapter5.startedAt}`:null;
  if(key!==checked){++epoch;checked=key;probed=false;authenticated=false;pending=false;opened=false;node('chapter5HostCode').value='';node('chapter5HostError').textContent='';}
  if(next.phase!==state?.phase)opened=false;
  state=next;render();if(key&&['chapter5-waiting','chapter5-casting'].includes(next.phase)&&!probed){probed=true;void authenticate();}
 }};
}
globalThis.BrookwoodCastControls={install:installCastControls};
