import crypto from "node:crypto";
import {updateState,resetState,send,fail,LobbyError,UNCHANGED,confirmPhoto,withinCinematicRun,withinChapter3Run,privateMessageAction,isChapter3} from "./_state.js";
export default async function handler(req,res){
  if(req.method!=="POST")return send(res,405,{error:"Method not allowed"});
  if(String(req.body?.code||"")!==String(process.env.HOST_KEY||"1031"))return send(res,403,{error:"Wrong host code."});
  try{
    if(req.body.action==="reset"){await resetState();return send(res,200,{ok:true});}
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
        if(!(["opening","photo","photo-complete"].includes(s.phase)||isChapter3(s))||!Number.isFinite(s.startedAt)||s.startedAt<=0||Date.now()-s.startedAt<44000)
          throw new LobbyError(409,"Chapter 1 must finish before returning to the lobby.");
        s.phase="lobby";s.startedAt=null;delete s.chapter3;
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
    await updateState(s=>{
      if(s.players.length!==12)throw new LobbyError(409,"The cast must contain exactly 12 players.");
      if(s.players.some(p=>!p.partnerId||!p.ready))throw new LobbyError(409,"Every player must have a partner and be ready.");
      const pairs=new Set(s.players.map(p=>[p.id,p.partnerId].sort().join(":")));
      if(pairs.size!==6)throw new LobbyError(409,"The cast must contain six couples.");
      s.phase="opening";s.startedAt=Date.now();
      delete s.photo;
      delete s.chapter3;
    });
    return send(res,200,{ok:true});
  }catch(e){return fail(res,e);}
}
