// Shares host cookies, state polling and the existing authenticated endpoint.
export function installPhotoControls({document,request,acceptState}){
 const node=id=>document.getElementById(id);let state,run=null,authenticated=false,pending=false,opened=false,epoch=0;
 function render(){
  const active=state?.phase==='photo';
  node('photoHostToggle').hidden=!active||authenticated;
  node('photoHostLogin').hidden=!active||!opened||authenticated;
  node('photoTaken').hidden=!active||!authenticated;
  node('photoTaken').disabled=pending;
  node('photoAuthenticate').disabled=pending;
 }
 async function authenticate(code){
  if(pending)return;const ticket=epoch;pending=true;render();
  try{const result=await request('/api/host',{action:code?'maze-login':'maze-session',...(code?{code}:{})});if(ticket===epoch)authenticated=result.authenticated===true;}
  catch(error){if(ticket===epoch&&(code||error.status!==403))node('photoHostError').textContent=error.message;}
  finally{if(ticket===epoch){pending=false;if(authenticated)node('photoHostCode').value='';render();}}
 }
 node('photoHostToggle').onclick=()=>{opened=!opened;render();if(opened)node('photoHostCode').focus();};
 node('photoAuthenticate').onclick=()=>authenticate(node('photoHostCode').value);
 node('photoHostCode').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void authenticate(node('photoHostCode').value);}});
 node('photoTaken').onclick=async()=>{
  if(pending||!authenticated||state?.phase!=='photo')return;
  const snapshot=state,ticket=epoch;pending=true;render();node('photoHostError').textContent='';
  try{const sentAt=performance.now(),result=await request('/api/host',{action:'photo-taken',generation:snapshot.generation,startedAt:snapshot.startedAt});if(ticket===epoch&&result.state)acceptState(result.state,{sentAt,receivedAt:performance.now()});}
  catch(error){if(ticket===epoch){if(error.status===403)authenticated=false;node('photoHostError').textContent=error.message;}}
  finally{if(ticket===epoch){pending=false;render();}}
 };
 return {update(next){
  const key=next?.phase==='photo'?next.generation+':'+next.startedAt:null;
  state=next;
  if(key!==run){run=key;++epoch;authenticated=false;pending=false;opened=false;node('photoHostCode').value='';node('photoHostError').textContent='';render();if(key)void authenticate();}
  render();
 }};
}
globalThis.BrookwoodPhotoControls={install:installPhotoControls};
