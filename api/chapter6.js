import {updateState,send,fail,withinCinematicRun} from './_state.js';
import {makeMazeStarter,withinMazeRun} from './_chapter6.js';
// Same fixed-purpose public capability as Chapter 3; inputs choose no clocks,
// identities, lives, or outcomes. Only completed Chapter 5 can start the maze.
export default async function handler(req,res){
 if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
 try{await updateState(withinCinematicRun(withinMazeRun(makeMazeStarter())));return send(res,200,{ok:true});}
 catch(error){return fail(res,error);}
}
