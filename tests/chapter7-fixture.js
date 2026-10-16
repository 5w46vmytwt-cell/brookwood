import {fresh} from '../api/_state.js';
import {makeMazeTestSelector,validateChapter6} from '../api/_chapter6.js';
import {games,resultRecording,gate} from '../chapter6-timing.js';

// Local/test fixture at Recording 31, without rehearsing earlier gameplay.
export function finalNarrationFixture(now=Date.now()){
 const s=fresh();s.players=Array.from({length:12},(_,i)=>({id:'p'+i,token:'t'+i,name:'Guest '+i,partnerId:'p'+(i%2?i-1:i+1),ready:true,alive:true,hearts:3,inventory:[]}));
 makeMazeTestSelector()(s);
 Object.assign(s.chapter6,{step:'return',game:4,audioIndex:1,phaseAt:now,deadline:now+gate(31),results:games.map((g,i)=>({game:i,answer:i===4?'pass':g.correct,correct:true,resolvedAt:now,recording:resultRecording(i,i===4?'pass':g.correct,true)})),electorateLocked:true,voterIds:['p0'],votes:{p0:'p1'},selectedPlayerId:'p1',tokenReturnedAt:now});
 validateChapter6(s);return s;
}
