import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {MazeAmbient} from '../chapter6-ambient.js';
function harness(){let now=0;const media=[];class Audio{constructor(src){this.src=src;this.paused=true;this.volume=0;this.plays=0;media.push(this);}addEventListener(){}load(){}play(){this.paused=false;this.plays++;return Promise.resolve();}pause(){this.paused=true;}}
 const context=vm.createContext({Audio,Date:{now:()=>now},console,requestAnimationFrame(){return 1;},cancelAnimationFrame(){}});vm.runInContext(fs.readFileSync('cinematic-audio.js','utf8'),context);
 const player=new context.BrookwoodAudio.Player({id:'maze',cues:[]},{externallyDriven:true,soundtrack:{src:'/assets/chapter6/audio/ch6_ambient_maze.mp3',fadeMs:900,duckMs:350,lobbyVolume:.12}});
 return {ambient:new MazeAmbient(player.soundtrack),audio:media[0],media,at:t=>{now=t;}};
}
test('maze score uses one looping shared player element, starts after unlock and smoothly ducks/restores',()=>{
 const {ambient,audio,media,at}=harness();ambient.update({step:'takeover'},null);assert(audio.paused);ambient.update({step:'intro'},null);assert(audio.paused);ambient.unlock();assert(!audio.paused);assert(audio.loop);at(450);ambient.advance();assert(Math.abs(audio.volume-.06)<.001);at(900);ambient.advance();assert.equal(audio.volume,.12);
 ambient.update({step:'intro'},{ended:false,audio:{paused:false}});at(1075);ambient.advance();assert(Math.abs(audio.volume-.085)<.001);at(1250);ambient.advance();assert.equal(audio.volume,.05);
 ambient.update({step:'ready'},null);at(1700);ambient.advance();assert(Math.abs(audio.volume-.085)<.001);at(2150);ambient.advance();assert.equal(audio.volume,.12);
 for(const step of ['answer','expired','transition','silence','verdict'])ambient.update({step},null);assert.equal(audio.plays,1);assert.equal(media.length,1);
});
test('maze completion fades the score to zero and pauses it on the existing scheduler',()=>{
 const {ambient,audio,at}=harness();ambient.update({step:'intro'},{ended:false,audio:{paused:false}});at(900);ambient.advance();ambient.update({step:'complete'},null);at(1075);ambient.advance();assert(audio.volume>0&&audio.volume<.05);assert(!audio.paused);at(1250);ambient.advance();assert.equal(audio.volume,0);assert(audio.paused);
});
