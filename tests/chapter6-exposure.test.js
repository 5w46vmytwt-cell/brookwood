import test from 'node:test';
import assert from 'node:assert/strict';
import {MazeExposure} from '../chapter6-exposure.js';
const flush=()=>new Promise(r=>setImmediate(r));
test('image readiness waits for decoding, submits one fenced acknowledgement and never extends an exposure',async()=>{
 let decoded,requests=[],accepted=0;const exposure=new MazeExposure({request:async(_path,b)=>{requests.push(b);return {state:{}};},onState(){accepted++;}}),state={generation:'one',chapter6:{startedAt:1000,sequence:5,step:'prepare-image'}};
 const image={complete:false,naturalWidth:0,decode:()=>new Promise(resolve=>{decoded=resolve;})};exposure.update(state,image);assert.equal(requests.length,0);image.complete=true;image.naturalWidth=1672;exposure.update(state,image);exposure.update(state,image);await flush();assert.equal(requests.length,0);decoded();await flush();assert.equal(requests.length,1);assert.equal(requests[0].action,'maze-image-ready');assert.equal(requests[0].sequence,5);assert.equal(accepted,1);exposure.update({...state,chapter6:{...state.chapter6,sequence:6,step:'exposure'}},image);assert.equal(requests.length,1);
});
test('obsolete image decoding callbacks cannot progress another chapter or maze run',async()=>{
 let done,calls=0;const exposure=new MazeExposure({request(){calls++;}}),state={generation:'one',chapter6:{startedAt:1000,sequence:5,step:'prepare-image'}};exposure.update(state,{complete:true,naturalWidth:10,decode:()=>new Promise(resolve=>{done=resolve;})});await flush();exposure.stop();done();await flush();assert.equal(calls,0);
});
