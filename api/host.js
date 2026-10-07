import crypto from "node:crypto";
import {isChapter4,withinChapter4Run,makeDoorVoter} from './_state.js';
import {updateState,resetState,send,fail,LobbyError,UNCHANGED,confirmPhoto,withinCinematicRun,withinChapter3Run,privateMessageAction,isChapter3,startSession,makeTestChapterSelector} from "./_state.js";
export default async function handler(req,res){
  if(req.method!=="POST")return send(res,405,{error:"Method not allowed"});
  if(String(req.body?.code||"")!==String(process.env.HOST_KEY||"1031"))return send(res,403,{error:"Wrong host code."});
  try{
    if(req.body.action==="reset"){await resetState();return send(res,200,{ok:true});}
    if(req.body.action==='test-vote-simulated'){
      const vote=makeDoorVoter(),targets=new Map();
      await updateState(withinChapter4Run(s=>{
        if(!isChapter4(s))throw new LobbyError(409,'Chapter 4 voting is not active.');
        if(req.body.chapter4StartedAt!==s.chapter4.startedAt)throw new LobbyError(409,'Chapter 4 changed.');
        const simulated=s.players.filter(p=>p.simulated===true);
        if(!simulated.length)throw new LobbyError(409,'No simulated players to vote.');
        const entries=simulated.map(p=>{if(!targets.has(p.id)){const others=s.players.filter(q=>q.id!==p.id);targets.set(p.id,others[crypto.randomInt(others.length)].id);}return [p.id,targets.get(p.id)];});
        return vote(s,entries);
      }));return send(res,200,{ok:true});
    }
    if(req.body.action==='chapter-select'){
      await updateState(makeTestChapterSelector(req.body.checkpoint));
      return send(res,200,{ok:true});
    }
    if(req.body.action==='test-read-simulated'){
      await updateState(withinChapter3Run(s=>{
        if(!isChapter3(s)||s.phase==='chapter3-opening')throw new LobbyError(409,'Private messages must be active before test reads.');
        const ids=s.players.filter(p=>p.simulated===true).map(p=>p.id);
        if(!ids.length)throw new LobbyError(409,'There are no simulated players to acknowledge.');
        return privateMessageAction(s,ids,'simulated-read');
      }));
      return send(res,200,{ok:true});
    }
    if(req.body.action==="begin-photo"){
      await updateState(withinCinematicRun(s=>{
        if(["photo","photo-complete"].includes(s.phase))return UNCHANGED;
        if(s.phase!=="opening")throw new LobbyError(409,"The photo checkpoint requires an opening session.");
        s.photo={promptedAt:Date.now(),confirmedPlayerIds:[],confirmedAt:null};s.phase="photo";
      }));
      return send(res,200,{ok:true});
    }
    if(req.body.action==="test-confirm-simulated"){
      await updateState(withinCinematicRun(s=>{
        if(s.phase!=="photo")throw new LobbyError(409,"Test photo confirmation is only available during the photo checkpoint.");
        const ids=s.players.filter(p=>p.simulated===true).map(p=>p.id);
        if(!ids.length)throw new LobbyError(409,"There are no simulated players to confirm.");
        return confirmPhoto(s,ids);
      }));
      return send(res,200,{ok:true});
    }
    if(req.body.action==="return-lobby"){
      await updateState(s=>{
        if(!(["opening","photo","photo-complete"].includes(s.phase)||isChapter3(s)||isChapter4(s))||!Number.isFinite(s.startedAt)||s.startedAt<=0||Date.now()-s.startedAt<44000)
          throw new LobbyError(409,"Chapter 1 must finish before returning to the lobby.");
        s.phase="lobby";s.startedAt=null;delete s.chapter3;delete s.chapter4;
      });
      return send(res,200,{ok:true});
    }
    if(req.body.action==="test-fill"){
      await updateState(s=>{
        if(s.phase!=="lobby")throw new LobbyError(409,"Test fill is only available during the lobby.");
        if(s.players.length!==2||s.players.some(p=>p.simulated))throw new LobbyError(409,"Test fill requires exactly 2 real players.");
        const names=Array.from({length:5},(_,i)=>[`Test ${i+1}A`,`Test ${i+1}B`]).flat();
        if(s.players.some(p=>names.some(n=>n.toLowerCase()===p.name.toLowerCase())))throw new LobbyError(409,"A real player is using a reserved test name.");
        for(let i=0;i<5;i++){
          const couple=['A','B'].map(suffix=>({id:crypto.randomUUID(),token:crypto.randomBytes(24).toString("hex"),name:`Test ${i+1}${suffix}`,partnerId:null,ready:true,alive:true,hearts:3,inventory:[],simulated:true}));
          couple[0].partnerId=couple[1].id;couple[1].partnerId=couple[0].id;
          s.players.push(...couple);
        }
      });
      return send(res,200,{ok:true});
    }
    if(req.body.action!=="start")return send(res,400,{error:"Unknown action."});
    await updateState(s=>startSession(s));
    return send(res,200,{ok:true});
  }catch(e){return fail(res,e);}
}
