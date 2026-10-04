/* Approved Chapter 1 definition. Times are absolute milliseconds from startedAt.
 * Cues can later associate optional narration/sfx/event metadata with a visual.
 * No audio or event playback is implemented by the current visual engine.
 */
(() => {
 const chapter1Timeline={id:'chapter1',end:44000,
  sections:[{id:'opening',at:0,end:4000},{id:'historical-sequence',at:4000,end:44000}],
  cues:[
   {id:'title',type:'scene',at:0,end:4000,visual:{target:'openingTitle',fadeOut:[3400,4000],content:[
    {selector:'.date',text:'OCTOBER 31 · 1996'},{selector:'h1',text:'BROOKWOOD'},
    {selector:'h2',text:'The Final Session'},{selector:'p',text:'Some stories refuse to stay buried.'}
   ]}},
   {id:'date',type:'text',at:6000,end:13000,visual:{target:'chapterDate',text:'OCTOBER 31 · 1996',fadeIn:[6000,7000],fadeOut:[12000,13000],flicker:{at:9000,end:12000,origin:4000,base:.985,amplitude:.015,frequency:23}}},
   {id:'farm',type:'image',at:12000,end:24200,visual:{target:'chapterFarm',src:'/assets/chapter1/brookwood-farm.png',fadeIn:[12000,14000],fadeOut:[23000,24200],scale:{from:1,to:1.055,range:[12000,24200]}}},
   {id:'farmLabel',type:'text',at:16000,end:24000,visual:{target:'chapterFarmLabel',text:'BROOKWOOD FARM',fadeIn:[16000,17000],fadeOut:[23000,24000]}},
   {id:'poster',type:'image',at:23000,end:29000,visual:{target:'chapterPoster',src:'/assets/chapter1/brookwood-poster.png',fadeIn:[23000,24200],fadeOut:[28000,29000]}},
   {id:'time',type:'text',at:28000,end:36000,visual:{target:'chapterTime',text:'9:30 PM',fadeIn:[28000,29000],fadeOut:[33000,36000]}},
   {id:'friends',type:'text',at:31000,end:36000,visual:{target:'chapterFriends',text:'13 FRIENDS',fadeIn:[31000,32000],fadeOut:[33000,36000]}},
   {id:'flash',type:'flash',at:36000,end:36120,visual:{target:'chapterFlash'}},
   {id:'group',type:'image',at:36120,end:44000,visual:{target:'chapterGroup',src:'/assets/chapter1/brookwood-group.png',darken:{range:[39000,42000],amount:.55},fadeOut:[42000,43000]}},
   {id:'final',type:'text',at:42700,end:44000,visual:{target:'chapterFinal',fadeIn:[42700,43200],fadeOut:[43500,44000],content:[{firstText:true,text:'9:30 PM'},{selector:'span',text:'THE FINAL SESSION BEGAN'}]}},
   {id:'grain',type:'texture',at:4000,end:44000,visual:{target:'chapterGrain',opacity:.025}}
  ]
 };
 // Compatibility adapter for the existing seconds-based regression test interface.
 function frameAt(elapsedSeconds){
  const resolved=BrookwoodTimeline.resolve(chapter1Timeline,elapsedSeconds*1000);
  const frame={chapterTime:elapsedSeconds-4,done:resolved.done};
  for(const [id,v] of Object.entries(resolved.visuals))frame[id]=v.opacity;
  frame.farmScale=resolved.visuals.farm.scale;return frame;
 }
 class Cinematic extends BrookwoodTimeline.Renderer{constructor(document){super(document,chapter1Timeline)}}
 globalThis.BrookwoodChapter1={chapter1Timeline,frameAt,Cinematic};
})();
