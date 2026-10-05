/* Approved Chapter 1 definition. Times are absolute milliseconds from startedAt.
 * Cues can later associate optional narration/sfx/event metadata with a visual.
 * Narration is consumed separately; the visual resolver remains pure.
 */
(() => {
 const chapter1Timeline={id:'chapter1',end:44000,
  scoreMix:{openingVolume:.15,narrationVolume:.08,gapVolume:.12,windows:[{at:36000,end:39000,volume:.07}]},
  sections:[{id:'opening',at:0,end:4000},{id:'historical-sequence',at:4000,end:44000}],
  cues:[
   {id:'narration-01',type:'narration',at:5000,src:'/assets/chapter1/audio/narration-01.wav',durationMs:3775},
   {id:'narration-02',type:'narration',at:9000,src:'/assets/chapter1/audio/narration-02.wav',durationMs:2450},
   {id:'narration-03',type:'narration',at:12000,src:'/assets/chapter1/audio/narration-03.wav',durationMs:3850},
   {id:'narration-04',type:'narration',at:16000,src:'/assets/chapter1/audio/narration-04.wav',durationMs:2775},
   {id:'narration-05',type:'narration',at:19000,src:'/assets/chapter1/audio/narration-05.wav',durationMs:4450},
   {id:'narration-06',type:'narration',at:23500,src:'/assets/chapter1/audio/narration-06.wav',durationMs:1725},
   {id:'narration-07',type:'narration',at:27900,src:'/assets/chapter1/audio/narration-07.wav',durationMs:4050},
   {id:'narration-08',type:'narration',at:31950,src:'/assets/chapter1/audio/narration-08.wav',durationMs:1775},
   {id:'narration-09',type:'narration',at:33725,src:'/assets/chapter1/audio/narration-09.wav',durationMs:2275},
   {id:'narration-10',type:'narration',at:39000,src:'/assets/chapter1/audio/narration-10.wav',durationMs:3925},
   {id:'camera-shutter',type:'sfx',at:36000,src:'/assets/chapter1/audio/sfx-camera-shutter.wav',durationMs:67536/264600*1000,volume:.55},

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
