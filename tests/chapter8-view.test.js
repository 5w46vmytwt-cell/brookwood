import test from 'node:test';import assert from 'node:assert/strict';
import {Chapter8View} from '../chapter8.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){
 const nodes=new Map();function element(){return {hidden:true,style:{},dataset:{},listeners:new Map(),classList:{toggle(){}},setAttribute(k,v){this[k]=v;},appendChild(){},addEventListener(n,fn){this.listeners.set(n,fn);}};}
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},createElement:element};document.getElementById('chapterSelectPanel').hidden=true;
 class Player{constructor(){this.media=new Map();this.tracks=[];}stop(){}}
 const calls=[],state={phase:'chapter8',generation:'g',chapter8:{id:'8',startedAt:100000,step:'puzzle',sequence:0,phaseAt:100000,puzzleStartedAt:100000,deadline:null,audioStartedAt:null,revealedClues:[]}};
 const view=new Chapter8View(document,{elapsedNow:()=>1000},{Player,request:(_path,b)=>{if(b.action==='maze-session')return Promise.resolve({});calls.push(b);return new Promise(()=>{});},onState(){}});view.update(state);
 const fire=(id,type,extra={})=>view.buttons.get(id).listeners.get(type)({isPrimary:true,button:0,pointerId:1,clientX:20,clientY:20,...extra});
 return {view,state,calls,document,fire};
}
test('different rapid host clicks survive another clue update and use independent in-flight guards',async()=>{
 const h=harness();await flush();h.view.update(h.state);h.fire(17,'pointerdown');h.fire(17,'pointerup');assert.equal(h.calls.length,1);assert(h.view.revealing.has(17));assert.equal(h.view.pending,false);
 h.fire(1,'pointerdown');h.state.chapter8.sequence++;h.state.chapter8.revealedClues=[17];h.view.update(h.state);h.fire(1,'pointerup');assert.equal(h.calls.length,2);assert.deepEqual(h.calls.map(b=>b.clueId),[17,1]);h.view.reveal(1);assert.equal(h.calls.length,2);
});
test('drag, secondary pointer, navigation modal and read-only views never submit reveals',async()=>{
 const h=harness();await flush();h.view.update(h.state);h.fire(1,'pointerdown');h.fire(1,'pointerup',{clientX:50});assert.equal(h.calls.length,0);h.fire(1,'pointerdown',{isPrimary:false});h.fire(1,'pointerup');assert.equal(h.calls.length,0);
 h.fire(2,'pointerdown');h.document.getElementById('chapterSelectPanel').hidden=false;h.view.update(h.state);h.fire(2,'pointerup');h.view.reveal(2);assert.equal(h.calls.length,0);h.document.getElementById('chapterSelectPanel').hidden=true;h.view.authenticated=false;h.view.update(h.state);h.view.reveal(3);assert.equal(h.calls.length,0);assert([...h.view.buttons.values()].every(b=>b.disabled));
});
test('completed letters stay visible, only host sees Continue, and the original image uses percentage regions',async()=>{
 const h=harness();await flush();h.state.chapter8.revealedClues=Array.from({length:17},(_,n)=>n+1);h.view.update(h.state);assert.equal(h.document.getElementById('chapter8Continue').hidden,false);assert.equal(h.calls.length,0);assert.equal(h.document.getElementById('chapter8Artwork').src,'/assets/chapter8/ch8_puzzle_clues.png');assert([...h.view.buttons.values()].every(b=>b.style.left.endsWith('%')&&b.style.top.endsWith('%')&&b.textContent.length===1));h.view.authenticated=false;h.view.update(h.state);assert(h.document.getElementById('chapter8Continue').hidden);assert.equal(h.state.chapter8.step,'puzzle');
});
