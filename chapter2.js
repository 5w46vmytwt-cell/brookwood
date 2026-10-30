import { CHAPTER2_START_MS, CHAPTER2_END_MS, PHOTO_PROMPT_MS } from './cinematic-timeline.js';

export const FROZEN_TIME_OFFSET_MS=79425;
export function formatBrandonTime(startedAt){
  return new Intl.DateTimeFormat('en-US',{timeZone:'America/Winnipeg',hour:'numeric',minute:'2-digit',hour12:true})
    .format(startedAt+FROZEN_TIME_OFFSET_MS);
}
const image=(id,at,end,file,visual={})=>({id,type:'image',at,end,visual:{target:`chapter2-${id}`,src:`/assets/chapter2/${file}.png`,...visual}});
const push=(at,end)=>({from:1,to:1.025,range:[at,end]});
// Absolute server-run elapsed milliseconds. Audio remains defined independently
// against its locked contract; no visual cue dispatches narration or server actions.
export const chapter2Timeline={id:'chapter2',start:CHAPTER2_START_MS,end:CHAPTER2_END_MS,cues:[
  {id:'date2026',type:'text',at:48925,end:52925,visual:{target:'chapter2-date2026',text:'OCTOBER 31 · 2026',fadeIn:[48925,49275],fadeOut:[52425,52925]}},
  image('brandon',53425,57925,'brandon-modern-dusk',{fadeIn:[53425,54025],fadeOut:[57325,57925],scale:push(53425,57925)}),
  image('street',57325,62950,'brookwood-street',{fadeIn:[57325,57925],fadeOut:[62350,62950],scale:push(57325,62950)}),
  image('house',62350,68625,'halloween-house',{fadeIn:[62350,62950],fadeOut:[68025,68625],scale:push(62350,68625)}),
  image('invite',68025,71800,'party-invite',{fadeIn:[68025,68625]}),
  image('costumes',71800,72875,'costumes'),
  image('drinks',72875,73625,'drinks'),
  image('food',73625,74525,'food'),
  image('party',74525,78425,'party-ready',{fadeIn:[74525,74875],darken:{range:[77525,77925],amount:.35},fadeOut:[77525,78425],scale:push(74525,78425)}),
  {id:'brookwood',type:'text',at:77925,end:83425,visual:{target:'chapter2-brookwood',text:'BROOKWOOD',fadeIn:[77925,78425],fadeOut:[82950,83425]}},
  {id:'presentDate',type:'text',at:78625,end:83425,visual:{target:'chapter2-presentDate',text:'OCTOBER 31 · 2026',fadeIn:[78625,78925],fadeOut:[82950,83425]}},
  {id:'presentTime',type:'text',at:FROZEN_TIME_OFFSET_MS,end:83425,visual:{target:'chapter2-presentTime',textFromRun:formatBrandonTime,fadeIn:[79425,79725],fadeOut:[82950,83425]}},
  // Keep the prompt visible while opening awaits an authenticated server phase
  // transition. It is not a client-created checkpoint or fabricated count.
  {id:'onePhoto',type:'text',at:PHOTO_PROMPT_MS,end:Infinity,visual:{target:'chapter2-onePhoto',text:'ONE PHOTO',fadeIn:[89425,89625]}},
  {id:'beforeNight',type:'text',at:89925,end:Infinity,visual:{target:'chapter2-beforeNight',text:'BEFORE THE NIGHT BEGINS',fadeIn:[89925,90125]}},
  {id:'getTogether',type:'text',at:90425,end:Infinity,visual:{target:'chapter2-getTogether',text:'GET EVERYONE TOGETHER',fadeIn:[90425,90625]}}
]};
