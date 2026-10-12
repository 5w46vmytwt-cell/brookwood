import test from 'node:test';
import assert from 'node:assert/strict';
import {Chapter6View} from '../chapter6.js';
import {gate} from '../chapter6-timing.js';
function harness(){
 const nodes=new Map(),created=[];
 const make=()=>({hidden:false,style:{},classList:{toggle(){}},children:[],getAttribute(key){return this[key];},replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);}});
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,make());return nodes.get(id);},createElement(){const node=make();created.push(node);return node;}};
 class Player{constructor(){this.media=new Map();}stop(){}update(){} }
 let elapsed=0;const view=new Chapter6View(document,Player,{elapsedNow:()=>elapsed});
 const c={startedAt:1000,phaseAt:1000,sequence:0,game:2,step:'intro',lives:3,results:[],screamer:{name:'Actual Guest'}};
 const paint=t=>{elapsed=t;view.update({chapter6:c});};
 return {document,created,c,paint};
}
test('TV reconstructs exact memory exposure and hides it permanently during question/result',()=>{
 const {document,created,c,paint}=harness(),image=document.getElementById('chapter6Image');
 paint(gate(14)-1);assert(image.hidden);
 assert.equal(created.filter(n=>n.src?.endsWith('.png')).length,11);
 paint(gate(14));assert(!image.hidden);assert(image.src.endsWith('morgue_memory.png'));
 paint(gate(14)+14999);assert(!image.hidden);
 paint(gate(14)+15000);assert(image.hidden);
 c.step='answer';c.sequence++;c.deadline=200000;paint(gate(14)+15001);assert(image.hidden);
 c.step='result';c.sequence++;c.results[2]={answer:'C',correct:true,recording:16};paint(100000);assert(image.hidden);
});
test('TV shows dynamic SCREAMER, awaits verdict and finishes on black without fake victory',()=>{
 const {document,c,paint}=harness();c.game=4;c.step='verdict';paint(0);
 assert.equal(document.getElementById('chapter6Screamer').textContent,'THE SCREAMER: Actual Guest');
 assert.equal(document.getElementById('chapter6Question').textContent,'SILENCE COMPLETE — AWAITING VERDICT');
 c.step='complete';c.sequence++;paint(10);
 for(const id of ['chapter6Content','chapter6HUD','chapter6Audio','chapter6HostToggle','chapter6Image'])assert(document.getElementById(id).hidden);
});
