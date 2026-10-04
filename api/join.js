import crypto from "node:crypto";
import {updateState,send,fail,LobbyError} from "./_state.js";
export default async function handler(req,res){
  if(req.method!=="POST")return send(res,405,{error:"Method not allowed"});
  const name=String(req.body?.name||"").trim().replace(/\s+/g," ").slice(0,24);
  if(!name)return send(res,400,{error:"Enter your name."});
  const p={id:crypto.randomUUID(),token:crypto.randomBytes(24).toString("hex"),name,partnerId:null,ready:false,alive:true,hearts:3,inventory:[]};
  try{
    const result=await updateState(s=>{
      if(s.phase!=="lobby")throw new LobbyError(409,"The Final Session has already begun.");
      if(s.players.length>=12)throw new LobbyError(409,"The cast is full.");
      if(s.players.some(x=>x.name.toLowerCase()===name.toLowerCase()))throw new LobbyError(409,"That name is already in the cast.");
      s.players.push(p);
      return {player:{id:p.id,token:p.token,name:p.name}};
    });
    return send(res,200,result);
  }catch(e){return fail(res,e);}
}
