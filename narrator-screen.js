// Chapter 7's complete hierarchy and original stylesheet are the single source
// of truth. Shadow scope preserves its exact IDs/selectors without duplicating
// document IDs or inheriting unrelated Chapter 8 rules.
export class NarratorScreen{
 constructor(document,{root=null,theme='chapter7'}={}){
  this.theme=theme;
  if(root){this.root=root;this.panel=root;this.part=id=>document.getElementById(id);}
  else{
   const source=document.getElementById('chapter7Investigation'),parent=document.getElementById('chapter7TV');
   if(!source?.cloneNode||!parent?.cloneNode)throw Error('The complete Chapter 7 narrator presentation is unavailable.');
   this.root=document.createElement('div');this.root.className='ch8-wife';this.shadow=this.root.attachShadow({mode:'open'});
   const dependency=document.createElement('link');dependency.rel='stylesheet';dependency.href='/chapter7.css';this.shadow.appendChild(dependency);
   const sizing=document.createElement('style');sizing.textContent='*,*::before,*::after{box-sizing:border-box}';this.shadow.appendChild(sizing);
   this.surface=parent.cloneNode(false);this.surface.hidden=false;this.panel=source.cloneNode(true);this.surface.appendChild(this.panel);this.shadow.appendChild(this.surface);
   this.part=id=>this.panel.querySelector('#'+id);
   // Complete parent hierarchy retained; non-narrator scenes/controls stay inert.
   for(const child of this.panel.children)child.hidden=child!==this.part('ch7Scene');
   this.part('ch7PodcastLogo').hidden=true;this.part('ch7Options').replaceChildren();this.part('ch7Progress').textContent='';
   this.background=Array.from(document.styleSheets??[]).flatMap(sheet=>Array.from(sheet.cssRules)).find(rule=>rule.selectorText==='#ch7Scene')?.style.backgroundImage;
  }
  this.scene=this.part('ch7Scene');this.wave=this.part('ch7Waveform');this.title=this.part('ch7Title');this.microphone=this.wave;
 }
 update({visible=true,mood='warm',title,eyebrow,subtitle,speaking=false,opacity=1,titleOpacity=1,scene='narrator'}){
  this.root.hidden=!visible;this.panel.hidden=!visible;this.scene.hidden=false;this.scene.style.opacity=String(opacity);
  this.panel.dataset.scene=scene;this.panel.dataset.voice='narrator';
  this.part('ch7Eyebrow').textContent=eyebrow;this.title.textContent=title;this.title.style.opacity=String(titleOpacity);this.part('ch7Subtitle').textContent=subtitle;this.part('ch7Subtitle').style.opacity='1';this.part('ch7Subtitle').style.transform='';
  this.wave.hidden=false;this.wave.classList.toggle('speaking',!!speaking);
  if(this.theme==='wife'&&this.mood!==mood){this.mood=mood;this.root.dataset.mood=mood;
   const colors=mood==='warm'?['#4b405d','#252537','#10101d','#d4bfdc','#ece5f1','#d2c9dc','#ceb5da']:['#252536','#111522','#050812','#a1a7c0','#ced0df','#aab1c9','#909ab8'];
   let color=0;if(this.background)this.scene.style.backgroundImage=this.background.replace(/rgb\([^)]*\)/g,()=>colors[color++]);
   this.part('ch7Eyebrow').style.color=colors[3];this.panel.style.color=colors[4];this.part('ch7Subtitle').style.color=colors[5];
   for(const bar of this.wave.children)bar.style.backgroundColor=colors[6];
  }
 }
}
