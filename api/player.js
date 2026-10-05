import {updateState,send,fail,LobbyError,confirmPhoto,withinCinematicRun} from "./_state.js";
export default async function handler(req,res){
  if(req.method!=="POST")return send(res,405,{error:"Method not allowed"});
  try{
    const change=s=>{
      const p=s.players.find(x=>x.id===req.body?.id&&x.token===req.body?.token);
      if(!p)throw new LobbyError(401,"Player session not found.");
      if(req.body.action==="photo-confirm")return confirmPhoto(s,[p.id]);
      if(s.phase!=="lobby")throw new LobbyError(409,"The Final Session has already begun.");
      if(req.body.action==="partner"){
        const q=s.players.find(x=>x.id===req.body.partnerId);
        if(!q||q.id===p.id)throw new LobbyError(400,"Choose a valid partner.");
        if(q.partnerId&&q.partnerId!==p.id)throw new LobbyError(409,`${q.name} is already paired.`);
        if(p.partnerId&&p.partnerId!==q.id){const old=s.players.find(x=>x.id===p.partnerId);if(old&&old.partnerId===p.id){old.partnerId=null;old.ready=false;}}
        p.partnerId=q.id;q.partnerId=p.id;p.ready=false;q.ready=false;
      }else if(req.body.action==="ready"){
        if(!p.partnerId)throw new LobbyError(400,"Choose your partner first.");
        p.ready=!!req.body.ready;
      }else throw new LobbyError(400,"Unknown action.");
    };
    await updateState(req.body?.action==="photo-confirm"?withinCinematicRun(change):change);
    return send(res,200,{ok:true});
  }catch(e){return fail(res,e);}
}
