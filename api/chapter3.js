import {updateState,makeChapter3Starter,send,fail} from './_state.js';
// Public, fixed-purpose automatic start. Inputs cannot choose messages or clocks.
export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  try{await updateState(makeChapter3Starter());return send(res,200,{ok:true});}
  catch(error){return fail(res,error);}
}
