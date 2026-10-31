import test from 'node:test';import assert from 'node:assert/strict';
import {installTestFillControls} from '../test-fill-controls.js';
import fs from 'node:fs';import {createHash} from 'node:crypto';
const flush=()=>new Promise(r=>setImmediate(r));
function setup(request){const nodes=new Map(),document={getElementById(id){if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,textContent:''});return nodes.get(id);}};
 const ui=installTestFillControls({document,request,newId:()=> 'test-request-1234',acceptState:s=>ui.update(s,true)});return {ui,node:document.getElementById.bind(document)};
}
const lobby=(n,generation='g')=>({phase:'lobby',generation,roomLocked:false,players:Array.from({length:n},(_,i)=>({id:'p'+i}))});
test('host quantity controls clamp to remaining slots, are additive and suppress double submission',async()=>{
 let release,calls=0,body;const h=setup(async(_,b)=>{calls++;body=b;return new Promise(r=>release=r);});h.ui.update(lobby(2),false);assert(h.node('testFillControls').hidden);h.ui.update(lobby(2),true);assert(!h.node('testFillControls').hidden);
 for(let n=0;n<40;n++)h.node('testFillPlus').onclick();assert.equal(h.node('testFillQuantity').textContent,'23');assert(h.node('testFillPlus').disabled);
 const pending=h.node('testFillAdd').onclick();await h.node('testFillAdd').onclick();assert.equal(calls,1);assert.equal(body.count,23);assert.equal(body.generation,'g');assert(h.node('testFillAdd').disabled);release({state:lobby(25)});await pending;assert.equal(h.node('testFillQuantity').textContent,'0');assert(h.node('testFillAdd').disabled);assert(h.node('testFillStatus').textContent.includes('0 slots'));
 h.ui.update(lobby(0,'new'),true);assert.equal(h.node('testFillQuantity').textContent,'1');for(let n=0;n<4;n++)h.node('testFillPlus').onclick();assert.equal(h.node('testFillQuantity').textContent,'5');h.node('testFillMinus').onclick();assert.equal(h.node('testFillQuantity').textContent,'4');
});
test('ambiguous network failure retries the same request ID; lock and guest state disable additions',async()=>{
 const bodies=[];let fail=true;const h=setup(async(_,b)=>{bodies.push(b);if(fail)throw Error('offline');return {state:lobby(12)};});h.ui.update(lobby(2),true);await h.node('testFillAdd').onclick();assert.equal(h.node('testFillError').textContent,'offline');fail=false;await h.node('testFillAdd').onclick();assert.deepEqual(bodies[0],bodies[1]);assert.equal(bodies.length,2);
 h.ui.update({...lobby(12),roomLocked:true},true);assert(h.node('testFillAdd').disabled);await h.node('testFillAdd').onclick();assert.equal(bodies.length,2);h.ui.update(lobby(12),false);await h.node('testFillAdd').onclick();assert.equal(bodies.length,2);
});
test('R-five-times reset shortcut remains byte-for-byte unchanged',()=>{
 const source=fs.readFileSync('tv.html','utf8'),section=source.slice(source.indexOf('let returnKeys='),source.indexOf('let mazeControls=')).replaceAll('\r\n','\n');
 assert.equal(createHash('sha256').update(section).digest('hex'),'91fccac30159f997d3ac3ed7d1d6db9188dd18f175933879ae9541e90a051844');
});
