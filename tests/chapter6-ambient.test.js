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
test('maze completion keeps the same score through results, voting, waiting and blackout; broadcast stops it',()=>{
 const {ambient,audio,media,at}=harness();ambient.update({step:'intro'},{ended:false,audio:{paused:false}});at(900);ambient.advance();audio.currentTime=42;
 for(const step of ['finale','vote','selected','waiting','return','complete','broadcast-blackout'])ambient.update({step,pacingVersion:1},null);
 at(1800);ambient.advance();assert.equal(audio.volume,.12);assert(!audio.paused);assert.equal(audio.currentTime,42);assert.equal(audio.plays,1);assert.equal(media.length,1);
 ambient.stop(true);assert.equal(audio.volume,0);assert(audio.paused);
 const runtime=fs.readFileSync('tv-cinematic.js','utf8');assert(runtime.includes("step==='blackout'&&!broadcast.attempted"));assert(runtime.includes('else this.chapter6Visuals.ambient.stop(true)'));

});

test('one maze soundtrack starts with the first cast transition message and survives the chapter boundary',()=>{
 const {ambient,audio,media,at}=harness(),state={chapter5:{startedAt:1000,castStartedAt:2000}};ambient.track.config.fadeMs=2000;ambient.updateCast(state,4599,3600,null);assert(audio.paused);ambient.updateCast(state,4600,3600,null);assert(!audio.paused);at(1000);ambient.advance();assert(Math.abs(audio.volume-.06)<.001);at(2000);ambient.advance();assert.equal(audio.volume,.12);audio.currentTime=42;ambient.update({step:'takeover'},null);ambient.update({step:'intro'},{ended:false,audio:{paused:false}});assert.equal(audio.plays,1);assert.equal(media.length,1);assert.equal(audio.currentTime,42);assert.equal(ambient.track.target,.05);
});

test('refresh during a paced takeover recovers one quiet looping soundtrack without waiting for narration',()=>{
 const {ambient,audio,media}=harness();ambient.update({step:'takeover',pacingVersion:1},null);assert(!audio.paused);ambient.update({step:'ready',pacingVersion:1},null);ambient.update({step:'silence-ready',pacingVersion:1},null);assert.equal(audio.plays,1);assert.equal(media.length,1);assert.equal(ambient.track.target,.12);
});
