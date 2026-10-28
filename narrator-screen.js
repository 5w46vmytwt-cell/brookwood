// Reuse the husband's actual broadcast DOM and existing .broadcast-* CSS.
// No duplicate microphone drawing, waveform markup, keyframes or animation clock.
export class NarratorScreen{
 constructor(document){
  const source=document.getElementById('chapter5-radio');
  if(!source?.cloneNode)throw Error('The established narrator screen is unavailable.');
  this.root=source.cloneNode(true);this.root.removeAttribute('id');this.root.className='chapter5-layer ch8-wife';this.root.hidden=true;this.root.setAttribute('aria-hidden','false');
  for(const node of this.root.querySelectorAll('[id]')){const id=node.id;node.id='ch8-wife-'+id;for(const part of this.root.querySelectorAll('[fill],[stroke]'))for(const a of ['fill','stroke']){const value=part.getAttribute(a);if(value?.includes('url(#'+id+')'))part.setAttribute(a,value.replace('url(#'+id+')','url(#ch8-wife-'+id+')'));}}
  this.microphone=this.root.querySelector('.broadcast-mic');this.wave=this.root.querySelector('.broadcast-wave');
  const status=document.createElement('div');status.className='chapter5-layer broadcast-status';status.style.opacity='1';this.title=document.createElement('h1');status.appendChild(this.title);this.root.appendChild(status);
 }
 update({visible,mood,title,offset,speaking,opacity=1,titleOpacity=1}){
  this.root.hidden=!visible;this.root.dataset.mood=mood;this.root.style.opacity=String(opacity);this.title.hidden=!title;this.title.textContent=title;this.title.style.opacity=String(titleOpacity);
  if(speaking)this.sample=offset;
  this.root.style.setProperty?.('--handoff-delay',String(-Math.max(0,this.sample??0))+'ms');
  this.microphone.dataset.speaking=String(!!speaking);this.wave.className='broadcast-wave'+(speaking?' speaking':'');
  if(this.mood!==mood){this.mood=mood;const colors=mood==='warm'?['#8d779c','#f1e3ef','#8b9bb9']:['#44475c','#a4acbd','#414a60'];this.root.querySelectorAll('linearGradient stop').forEach((stop,i)=>stop.setAttribute('stop-color',colors[i%3]));}
 }
}
