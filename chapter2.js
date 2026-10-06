import { CHAPTER2_START_MS, CHAPTER2_END_MS, PHOTO_PROMPT_MS } from './cinematic-timeline.js';

export const FROZEN_TIME_OFFSET_MS=76500;
export function formatBrandonTime(startedAt){
  return new Intl.DateTimeFormat('en-US',{timeZone:'America/Winnipeg',hour:'numeric',minute:'2-digit',hour12:true})
    .format(startedAt+FROZEN_TIME_OFFSET_MS);
}
const image=(id,at,end,file,visual={})=>({id,type:'image',at,end,visual:{target:`chapter2-${id}`,src:`/assets/chapter2/${file}.png`,...visual}});
const push=(at,end)=>({from:1,to:1.025,range:[at,end]});
// Absolute server-run elapsed milliseconds. Audio remains defined independently
// against its locked contract; no visual cue dispatches narration or server actions.
export const chapter2Timeline={id:'chapter2',start:CHAPTER2_START_MS,end:CHAPTER2_END_MS,cues:[
  {id:'date2026',type:'text',at:48000,end:50000,visual:{target:'chapter2-date2026',text:'OCTOBER 31 · 2026',fadeIn:[48000,48350],fadeOut:[49500,50000]}},
  image('brandon',50500,55000,'brandon-modern-dusk',{fadeIn:[50500,51100],fadeOut:[54400,55000],scale:push(50500,55000)}),
  image('street',54400,60025,'brookwood-street',{fadeIn:[54400,55000],fadeOut:[59425,60025],scale:push(54400,60025)}),
  image('house',59425,65700,'halloween-house',{fadeIn:[59425,60025],fadeOut:[65100,65700],scale:push(59425,65700)}),
  image('invite',65100,68875,'party-invite',{fadeIn:[65100,65700]}),
  image('costumes',68875,69950,'costumes'),
  image('drinks',69950,70700,'drinks'),
  image('food',70700,71600,'food'),
  image('party',71600,75500,'party-ready',{fadeIn:[71600,71950],darken:{range:[74600,75000],amount:.35},fadeOut:[74600,75500],scale:push(71600,75500)}),
  {id:'brookwood',type:'text',at:75000,end:80500,visual:{target:'chapter2-brookwood',text:'BROOKWOOD',fadeIn:[75000,75500],fadeOut:[80025,80500]}},
  {id:'presentDate',type:'text',at:75700,end:80500,visual:{target:'chapter2-presentDate',text:'OCTOBER 31 · 2026',fadeIn:[75700,76000],fadeOut:[80025,80500]}},
  {id:'presentTime',type:'text',at:FROZEN_TIME_OFFSET_MS,end:80500,visual:{target:'chapter2-presentTime',textFromRun:formatBrandonTime,fadeIn:[76500,76800],fadeOut:[80025,80500]}},
  // Keep the prompt visible while opening awaits an authenticated server phase
  // transition. It is not a client-created checkpoint or fabricated count.
  {id:'onePhoto',type:'text',at:PHOTO_PROMPT_MS,end:Infinity,visual:{target:'chapter2-onePhoto',text:'ONE PHOTO',fadeIn:[86500,86700]}},
  {id:'beforeNight',type:'text',at:87000,end:Infinity,visual:{target:'chapter2-beforeNight',text:'BEFORE THE NIGHT BEGINS',fadeIn:[87000,87200]}},
  {id:'getTogether',type:'text',at:87500,end:Infinity,visual:{target:'chapter2-getTogether',text:'GET EVERYONE TOGETHER',fadeIn:[87500,87700]}}
]};
