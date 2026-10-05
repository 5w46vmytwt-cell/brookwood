import {getState,fail,send,publicState} from "./_state.js";
export default async function handler(req,res){try{if(req.method!=="GET")return send(res,405,{error:"Method not allowed"});return send(res,200,{...publicState(await getState()),serverNow:Date.now()})}catch(e){return fail(res,e)}}
