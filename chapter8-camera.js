import {cameraTiles} from './chapter8-finale-timing.js';
import {smooth} from './chapter8-puzzle.js';
export function cameraFrame(cue,elapsed,armed=true,aspect=16/9){
 if(!cue.zoom)return {grid:cue.visual==='grid',feed:cue.visual!=='grid',feedOpacity:1,scale:1,x:0,y:0,origin:'50% 50%'};
 const tile=cameraTiles[cue.zoom.camera],time=armed?smooth(elapsed/cue.durationMs):0,p=cue.zoom.direction==='in'?time:1-time,cx=tile.x+tile.w/2,cy=tile.y+tile.h/2;
 return {grid:true,feed:true,feedOpacity:smooth((p-.65)/.35),scale:1+(Math.min(3,4/Math.min(aspect,2))-1)*p,x:(.5-cx)*p*100,y:(.5-cy)*p*100,origin:cx*100+'% '+cy*100+'%'};
}
