/* Chapter 1 definition (approved timing polish). Times are absolute milliseconds from startedAt.
 * Cues can later associate optional narration/sfx/event metadata with a visual.
 * Narration is consumed separately; the visual resolver remains pure.
 */
(() => {
 const chapter1Timeline={id:'chapter1',end:56925,
  scoreMix:{openingVolume:.15,narrationVolume:.08,gapVolume:.12,windows:[{at:39000,end:42000,volume:.07}]},
  sections:[{id:'opening',at:0,end:7000},{id:'historical-sequence',at:7000,end:48925},{id:'welcome',at:48925,end:56925}],
  cues:[
   {id:'narration-01',type:'narration',at:8000,src:'/assets/chapter1/audio/narration-01.wav',durationMs:3775},
   {id:'narration-02',type:'narration',at:12000,src:'/assets/chapter1/audio/narration-02.wav',durationMs:2450},
   {id:'narration-03',type:'narration',at:15000,src:'/assets/chapter1/audio/narration-03.wav',durationMs:3850},
   {id:'narration-04',type:'narration',at:19000,src:'/assets/chapter1/audio/narration-04.wav',durationMs:2775},
   {id:'narration-05',type:'narration',at:22000,src:'/assets/chapter1/audio/narration-05.wav',durationMs:4450},
   {id:'narration-06',type:'narration',at:26500,src:'/assets/chapter1/audio/narration-06.wav',durationMs:1725},
   {id:'narration-07',type:'narration',at:30900,src:'/assets/chapter1/audio/narration-07.wav',durationMs:4050},
   {id:'narration-08',type:'narration',at:34950,src:'/assets/chapter1/audio/narration-08.wav',durationMs:1775},
   {id:'narration-09',type:'narration',at:36725,src:'/assets/chapter1/audio/narration-09.wav',durationMs:2275},
   {id:'narration-10',type:'narration',at:42000,src:'/assets/chapter1/audio/narration-10.wav',durationMs:3925},
   {id:'camera-shutter',type:'sfx',at:39000,src:'/assets/chapter1/audio/sfx-camera-shutter.wav',durationMs:67536/264600*1000,volume:.55},

   {id:'title',type:'scene',at:0,end:7000,visual:{target:'openingTitle',fadeOut:[6400,7000],content:[
    {selector:'.date',text:'OCTOBER 31 · 1996'},{selector:'h1',text:'BROOKWOOD'},
    {selector:'h2',text:'The Final Session'},{selector:'p',text:'Some stories refuse to stay buried.'}
   ]}},
   {id:'date',type:'text',at:9000,end:16000,visual:{target:'chapterDate',content:[{selector:'.chapter-date-value',text:'OCTOBER 31 · 1996'},{selector:'.chapter-location',text:'BRANDON, MANITOBA'}],fadeIn:[9000,10000],fadeOut:[15000,16000],flicker:{at:12000,end:15000,origin:7000,base:.985,amplitude:.015,frequency:23}}},
   {id:'farm',type:'image',at:15000,end:27200,visual:{target:'chapterFarm',src:'/assets/chapter1/brookwood-farm.png',fadeIn:[15000,17000],fadeOut:[26000,27200],scale:{from:1,to:1.055,range:[15000,27200]}}},
   {id:'farmLabel',type:'text',at:19000,end:27000,visual:{target:'chapterFarmLabel',text:'Brookwood Farm - Brandon Manitoba',fadeIn:[19000,20000],fadeOut:[26000,27000]}},
   {id:'poster',type:'image',at:26000,end:32000,visual:{target:'chapterPoster',src:'/assets/chapter1/brookwood-poster.png',fadeIn:[26000,27200],fadeOut:[31000,32000]}},
   {id:'time',type:'text',at:31000,end:39000,visual:{target:'chapterTime',text:'9:30 PM',fadeIn:[31000,32000],fadeOut:[36000,39000]}},
   {id:'friends',type:'text',at:34000,end:39000,visual:{target:'chapterFriends',text:'13 FRIENDS',fadeIn:[34000,35000],fadeOut:[36000,39000]}},
   {id:'flash',type:'flash',at:39000,end:39120,visual:{target:'chapterFlash'}},
   {id:'group',type:'image',at:39120,end:48925,visual:{target:'chapterGroup',src:'/assets/chapter1/brookwood-group.png',darken:{range:[42000,45000],amount:.55},fadeOut:[47925,48925]}},
   {id:'welcome',type:'text',at:48925,end:56925,visual:{target:'chapterWelcome',fadeIn:[48925,49925],fadeOut:[55925,56925],content:[{selector:'.chapter-welcome-title',text:'Welcome to our Halloween Game'}]}},
   {id:'welcomeFun',type:'text',at:52925,end:56925,visual:{target:'chapterWelcomeFun',text:'Have fun!',fadeIn:[52925,53925]}},
   {id:'grain',type:'texture',at:7000,end:48925,visual:{target:'chapterGrain',opacity:.025}}
  ]
 };
 // Compatibility adapter for the existing seconds-based regression test interface.
 function frameAt(elapsedSeconds){
  const resolved=BrookwoodTimeline.resolve(chapter1Timeline,elapsedSeconds*1000);
  const frame={chapterTime:elapsedSeconds-7,done:resolved.done};
  for(const [id,v] of Object.entries(resolved.visuals))frame[id]=v.opacity;
  frame.farmScale=resolved.visuals.farm.scale;return frame;
 }
 class Cinematic extends BrookwoodTimeline.Renderer{constructor(document){super(document,chapter1Timeline)}}
 globalThis.BrookwoodChapter1={chapter1Timeline,frameAt,Cinematic};
})();
