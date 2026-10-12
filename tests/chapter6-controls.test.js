import test from 'node:test';
import assert from 'node:assert/strict';
import {installMazeControls} from '../chapter6-interface.js';
import {renderMazePhone} from '../chapter6-phone.js';
function harness(){
 const nodes=new Map();const make=()=>({hidden:false,value:'',textContent:'',children:[],focus(){},addEventListener(){},replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);}});
 const document={addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,make());return nodes.get(id);},createElement:make};
 return {document,node:id=>document.getElementById(id)};
}
const state=()=>({generation:'run',chapter6:{startedAt:1000,step:'answer',game:0,sequence:1,lives:3}});
test('maze controls reuse server authentication, submit no PIN, and request reauthentication only after 403',async()=>{
 const {document,node}=harness(),requests=[];let authorized=false,expired=false;
 const current=state();const request=async(path,body)=>{
  requests.push(body);
  if(body.action==='maze-login'){assert.equal(body.code,'entered-once');authorized=true;return {ok:true};}
  if(!authorized||expired)throw Object.assign(Error('Host authentication required'),{status:403});
  return body.action==='maze-session'?{authenticated:true}:{state:current};
 };
 const controls=installMazeControls({document,runtime:{unlockChapter6(){}},acceptState(){},request});controls.update(current);
 await node('chapter6HostToggle').onclick();assert(!node('chapter6HostCode').hidden);assert(node('chapter6HostAnswers').hidden);
 node('chapter6HostCode').value='entered-once';await node('chapter6HostLogin').onclick();assert(node('chapter6HostCode').hidden);assert.equal(node('chapter6HostCode').value,'');
 await node('chapter6HostAnswers').children[0].onclick();assert(!Object.hasOwn(requests.at(-1),'code'));
 await node('chapter6HostToggle').onclick();assert(node('chapter6HostCode').hidden);
 expired=true;await node('chapter6HostAnswers').children[0].onclick();assert(!node('chapter6HostCode').hidden);assert(node('chapter6HostAnswers').hidden);
});
test('refreshed host controls recover the session without a PIN and transition closes answer controls',async()=>{
 const {document,node}=harness();const controls=installMazeControls({document,runtime:{unlockChapter6(){}},acceptState(){},request:async(_path,body)=>{assert.equal(body.action,'maze-session');return {authenticated:true};}});
 const current=state();controls.update(current);await node('chapter6HostToggle').onclick();assert(node('chapter6HostCode').hidden);
 controls.update({...current,chapter6:{...current.chapter6,step:'transition'}});assert(node('chapter6Host').hidden);assert.equal(node('chapter6HostAnswers').children.length,0);
});
test('phones render the persisted transition phase with no vote or active silence instruction',()=>{
 const {document,node}=harness();const current=state();current.chapter6={...current.chapter6,game:4,step:'transition'};
 renderMazePhone(current,{document,auth:{},request(){throw Error('Rendering must not send requests');}});
 assert.equal(node('mazePhoneCopy').textContent,'Watch the TV. The next scene is about to begin.');
 assert(node('mazePhoneVote').hidden);assert(node('mazePhoneTarget').hidden);
});
test('a pending maze answer response is discarded after chapter navigation',async()=>{
 const {document,node}=harness();let resolveAnswer,accepted=0;
 const current=state(),controls=installMazeControls({document,runtime:{unlockChapter6(){}},acceptState(){accepted++;},request:async(_path,body)=>body.action==='maze-session'?{authenticated:true}:new Promise(resolve=>{resolveAnswer=resolve;})});
 controls.update(current);await node('chapter6HostToggle').onclick();const pending=node('chapter6HostAnswers').children[0].onclick();
 controls.update({phase:'opening'});resolveAnswer({state:current});await pending;assert.equal(accepted,0);assert(node('chapter6Host').hidden);
});

test('host answer cards follow door order and close voting uses the authenticated fenced action',async()=>{
 const {document,node}=harness(),requests=[];const current=state();current.chapter6.doorOrder=['black','green','red','blue'];
 const controls=installMazeControls({document,runtime:{unlockChapter6(){}},acceptState(){},request:async(_path,body)=>{requests.push(body);return body.action==='maze-session'?{authenticated:true}:{state:current};}});controls.update(current);await node('chapter6HostToggle').onclick();assert.equal(node('chapter6HostAnswers').children[0].textContent,'Black — IX');
 current.chapter6={...current.chapter6,step:'vote',game:4,voteCount:0,testMode:false};controls.update(current);assert(node('chapter6HostAnswers').children[0].disabled);current.chapter6.voteCount=1;controls.update(current);assert(!node('chapter6HostAnswers').children[0].disabled);await node('chapter6HostAnswers').children[0].onclick();assert.equal(requests.at(-1).action,'maze-close-voting');assert.equal(requests.at(-1).generation,current.generation);assert(!Object.hasOwn(requests.at(-1),'code'));
});
