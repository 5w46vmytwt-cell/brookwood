// Readiness is reported only after the exact TV image is decoded while hidden.
// The server schedules one immutable, shared 30-second display window.
export class MazeExposure{
 constructor({request=globalThis.lobbyRequest,onState=()=>{}}={}){this.request=request;this.onState=onState;this.epoch=0;this.key=null;this.message='';}
 update(state,image){
  const c=state.chapter6,current=state.generation+':'+c.startedAt+':'+c.sequence;if(this.current!==current){this.current=current;this.message='';}if(c.step!=='prepare-image'||!image.complete||!(image.naturalWidth>0))return;
  const key=state.generation+':'+c.startedAt+':'+c.sequence;if(this.key===key)return;this.key=key;const epoch=this.epoch;
  Promise.resolve(image.decode?.()).then(()=>{if(epoch!==this.epoch||this.current!==key)return;const sentAt=performance.now();return Promise.resolve(this.request('/api/host',{action:'maze-image-ready',generation:state.generation,chapter6StartedAt:c.startedAt,sequence:c.sequence})).then(result=>{if(epoch===this.epoch&&this.current===key){this.message='';this.onState(result.state,{sentAt,receivedAt:performance.now()});}});}).catch(error=>{if(epoch===this.epoch&&this.current===key)this.message=error.status===403?'AUTHENTICATE HOST CONTROLS, THEN ENABLE AUDIO':'MEMORY IMAGE NOT READY — ENABLE AUDIO TO RETRY';});
 }
 retry(){this.key=null;this.message='';}
 stop(){this.epoch++;this.key=null;this.message='';}
}
