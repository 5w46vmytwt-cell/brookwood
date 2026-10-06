import {updateState,withinCinematicRun,UNCHANGED,LobbyError,send,fail} from './_state.js';
import {PHOTO_CHECKPOINT_MS} from '../cinematic-timeline.js';

// Public capability limited to one server-time-gated transition. Request body
// intentionally unused: neither clocks, identity, nor target phase are trusted.
export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  try{
    let outcome;
    await updateState(withinCinematicRun(s=>{
      outcome={ok:true,eligible:false,phase:s.phase};
      if(['photo','photo-complete'].includes(s.phase)){
        outcome.eligible=true;return UNCHANGED;
      }
      if(s.phase!=='opening')return UNCHANGED;
      if(!Number.isFinite(s.startedAt)||s.startedAt<=0)return UNCHANGED;
      const now=Date.now();
      if(now-s.startedAt<PHOTO_CHECKPOINT_MS)return UNCHANGED;
      const cast=new Map(s.players.map(p=>[p.id,p]));
      if(s.players.length!==12||cast.size!==12||s.players.some(p=>
        typeof p.id!=='string'||!p.id||typeof p.token!=='string'||!p.token||!p.ready||
        !p.partnerId||p.partnerId===p.id||cast.get(p.partnerId)?.partnerId!==p.id))
        throw new LobbyError(409,'The current cast is not valid for the photo checkpoint.');
      s.photo={promptedAt:now,confirmedPlayerIds:[],confirmedAt:null};
      s.phase='photo';outcome={ok:true,eligible:true,phase:'photo'};
    }));
    return send(res,200,outcome);
  }catch(error){return fail(res,error);}
}
