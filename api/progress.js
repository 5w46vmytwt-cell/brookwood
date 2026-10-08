import {updateState,withinCinematicRun,withinChapter3Run,isChapter3,activatePrivateMessages,UNCHANGED,LobbyError,send,fail,isChapter4,withinChapter4Run,activateDoorVoting,makeChapter4Starter,publicState} from './_state.js';
import {PHOTO_CHECKPOINT_MS} from '../cinematic-timeline.js';
import {isChapter5,withinCastingRun,advanceCasting} from './_chapter5.js';

// Public capability limited to one server-time-gated transition. Request body
// intentionally unused: neither clocks, identity, nor target phase are trusted.
export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  try{
    let outcome;
    const startChapter4=makeChapter4Starter();
    const castingChange=withinCastingRun(s=>{const result=advanceCasting(s);outcome={ok:true,phase:s.phase,state:publicState(s)};return result;});
    const doorChange=withinChapter4Run(s=>{const result=activateDoorVoting(s);outcome={ok:true,eligible:s.phase!=='chapter4-opening',phase:s.phase};return result;});
    const chapter3Change=withinChapter3Run(s=>{
      const result=activatePrivateMessages(s);
      outcome={ok:true,eligible:s.phase!=='chapter3-opening',phase:s.phase};return result;
    });
    await updateState(withinCinematicRun(s=>{
      if(isChapter5(s))return castingChange(s);
      if(isChapter4(s))return doorChange(s);
      if(s.phase==='private-messages-complete'){const result=startChapter4(s);outcome={ok:true,eligible:isChapter4(s),phase:s.phase};return result;}
      if(isChapter3(s))return chapter3Change(s);
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
    if(outcome.state)outcome.state.serverNow=Date.now();
    return send(res,200,outcome);
  }catch(error){return fail(res,error);}
}
