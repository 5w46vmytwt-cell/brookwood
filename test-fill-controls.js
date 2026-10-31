import {MAX_PLAYERS,MIN_START_PLAYERS} from './participant-limits.js';
export function installTestFillControls({document,request,acceptState,newId=()=>crypto.randomUUID()}){
 const node=id=>document.getElementById(id);let state,authenticated=false,quantity=10,pending=false,operation=null;
 function render(){
  const remaining=Math.max(0,MAX_PLAYERS-(state?.players.length??0));quantity=Math.min(quantity,remaining);if(remaining&&quantity<1)quantity=1;
  node('testFillControls').hidden=!authenticated||state?.phase!=='lobby';
  node('testFillQuantity').textContent=String(quantity);
  node('testFillStatus').textContent=(state?.players.length??0)+' participants · '+remaining+' slots available'+((state?.players.length??0)<MIN_START_PLAYERS?' ? '+MIN_START_PLAYERS+' needed to start':'');
  node('testFillMinus').disabled=pending||quantity<=1||state?.roomLocked;
  node('testFillPlus').disabled=pending||quantity>=remaining||state?.roomLocked;
  node('testFillAdd').disabled=pending||!remaining||state?.roomLocked;
 }
 for(const [id,delta] of [['testFillMinus',-1],['testFillPlus',1]])node(id).onclick=()=>{if(pending||node(id).disabled)return;quantity+=delta;operation=null;render();};
 node('testFillAdd').onclick=async()=>{
  if(pending||!authenticated||state?.phase!=='lobby'||state.roomLocked||quantity<1)return;
  const snapshot=state;
  operation??={action:'test-fill',count:quantity,generation:snapshot.generation,requestId:newId()};
  const body=operation;pending=true;render();node('testFillError').textContent='';
  try{const sentAt=performance.now(),result=await request('/api/host',body);if(state?.generation===snapshot.generation&&state.phase==='lobby'&&result.state)acceptState(result.state,{sentAt,receivedAt:performance.now()});if(operation===body)operation=null;}
  catch(error){if(state?.generation===snapshot.generation){if(error.status===403)authenticated=false;node('testFillError').textContent=error.message;if(error.status&&error.status<500)operation=null;}}
  finally{pending=false;render();}
 };
 return {update(next,host){if(next?.generation!==state?.generation)operation=null;state=next;authenticated=host;render();}};
}
globalThis.BrookwoodTestFillControls={install:installTestFillControls};
