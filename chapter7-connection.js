import {connectionCue} from './chapter7-story-timing.js';

// AudioBufferSource's sample clock repeats the unchanged decoded file without
// an HTML-media restart gap. The existing TV scheduler reads currentTime; native
// completion uses the investigation's authenticated media acknowledgments.
export class ConnectionPlayback{
 constructor({Context=globalThis.AudioContext,fetchAudio=globalThis.fetch}={}){
  this.Context=Context;this.fetchAudio=(...args)=>fetchAudio(...args);this.listeners=new Map();this.readyState=0;this.duration=connectionCue.durationMs/1000;this.paused=true;this.ended=false;this.failed=false;this.offset=0;this.volume=1;this.muted=false;this.epoch=0;this.prepare();
 }
 addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
 removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
 emit(type){for(const fn of this.listeners.get(type)??[])fn();}
 prepare(){
  if(this.loading||this.readyState>=2)return;
  try{this.context??=new this.Context({sampleRate:44100});}catch{this.failed=true;return;}
  this.failed=false;
  this.loading=Promise.resolve().then(()=>this.fetchAudio(connectionCue.src,{cache:'force-cache'})).then(r=>{if(!r.ok)throw Error('Connection audio unavailable');return r.arrayBuffer();}).then(bytes=>this.context.decodeAudioData(bytes)).then(buffer=>{this.buffer=buffer;this.duration=buffer.duration*2;this.readyState=4;}).catch(()=>{this.failed=true;}).finally(()=>{this.loading=null;});
 }
 get currentTime(){return this.paused?this.offset:Math.min(this.duration,this.offset+Math.max(0,this.context.currentTime-this.startedAt));}
 set currentTime(value){this.offset=Math.max(0,Math.min(this.duration,value));if(this.offset<this.duration)this.ended=false;}
 async play(){
  const epoch=this.epoch;
  if(this.context.state!=='running'){this.emit('pause');await this.context.resume();}
  if(epoch!==this.epoch||!this.paused)return;
  if(!this.buffer)throw Error('Connection audio is not ready');
  const source=this.context.createBufferSource(),gain=this.context.createGain();
  source.buffer=this.buffer;source.loop=true;source.loopStart=0;source.loopEnd=this.buffer.duration;
  gain.gain.value=this.muted?0:this.volume;source.connect(gain);gain.connect(this.context.destination);
  this.source=source;this.gain=gain;this.startedAt=this.context.currentTime;this.paused=false;this.ended=false;
  source.onended=()=>{if(this.source!==source)return;this.source=null;this.offset=this.duration;this.paused=true;this.ended=true;source.disconnect();gain.disconnect();this.emit('ended');};
  source.start(this.startedAt,this.offset%this.buffer.duration);
  source.stop(this.startedAt+Math.max(0,this.duration-this.offset));
  this.emit('playing');
 }
 unlock(){if(this.failed)this.prepare();if(this.context?.state==='suspended')Promise.resolve(this.context.resume()).catch(()=>{});}
 pause(){this.offset=this.currentTime;this.paused=true;this.epoch++;if(this.source){this.source.onended=null;try{this.source.stop();}catch{}this.source.disconnect();this.gain?.disconnect();this.source=null;}}
}
