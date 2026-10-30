import { CHAPTER2_START_MS, CHAPTER2_END_MS, PHOTO_PROMPT_MS } from './cinematic-timeline.js';

export const FROZEN_TIME_OFFSET_MS=88425;
export function formatBrandonTime(startedAt){
  return new Intl.DateTimeFormat('en-US',{timeZone:'America/Winnipeg',hour:'numeric',minute:'2-digit',hour12:true})
    .format(startedAt+FROZEN_TIME_OFFSET_MS);
}
const image=(id,at,end,file,visual={})=>({id,type:'image',at,end,visual:{target:`chapter2-${id}`,src:`/assets/chapter2/${file}.png`,...visual}});
const push=(at,end)=>({from:1,to:1.025,range:[at,end]});
// Absolute server-run elapsed milliseconds. Audio remains defined independently
// against its locked contract; no visual cue dispatches narration or server actions.
export const chapter2Timeline={id:'chapter2',start:CHAPTER2_START_MS,end:CHAPTER2_END_MS,cues:[
  {id:'date2026',type:'text',at:56925,end:61925,visual:{target:'chapter2-date2026',text:'OCTOBER 31 · 2026',fadeIn:[56925,57275],fadeOut:[61425,61925]}},
  image('brandon',62425,66925,'brandon-modern-dusk',{fadeIn:[62425,63025],fadeOut:[66325,66925],scale:push(62425,66925)}),
  image('street',66325,71950,'brookwood-street',{fadeIn:[66325,66925],fadeOut:[71350,71950],scale:push(66325,71950)}),
  image('house',71350,77625,'halloween-house',{fadeIn:[71350,71950],fadeOut:[77025,77625],scale:push(71350,77625)}),
  image('invite',77025,80800,'party-invite',{fadeIn:[77025,77625]}),
  image('costumes',80800,81875,'costumes'),
  image('drinks',81875,82625,'drinks'),
  image('food',82625,83525,'food'),
  image('party',83525,87425,'party-ready',{fadeIn:[83525,83875],darken:{range:[86525,86925],amount:.35},fadeOut:[86525,87425],scale:push(83525,87425)}),
  {id:'brookwood',type:'text',at:86925,end:92425,visual:{target:'chapter2-brookwood',text:'BROOKWOOD',fadeIn:[86925,87425],fadeOut:[91950,92425]}},
  {id:'presentDate',type:'text',at:87625,end:92425,visual:{target:'chapter2-presentDate',text:'OCTOBER 31 · 2026',fadeIn:[87625,87925],fadeOut:[91950,92425]}},
  {id:'presentTime',type:'text',at:FROZEN_TIME_OFFSET_MS,end:92425,visual:{target:'chapter2-presentTime',textFromRun:formatBrandonTime,fadeIn:[88425,88725],fadeOut:[91950,92425]}},
  // Keep the prompt visible while opening awaits an authenticated server phase
  // transition. It is not a client-created checkpoint or fabricated count.
  {id:'onePhoto',type:'text',at:PHOTO_PROMPT_MS,end:Infinity,visual:{target:'chapter2-onePhoto',text:'ONE PHOTO',fadeIn:[98425,98625]}},
  {id:'beforeNight',type:'text',at:98925,end:Infinity,visual:{target:'chapter2-beforeNight',text:'BEFORE THE NIGHT BEGINS',fadeIn:[98925,99125]}},
  {id:'getTogether',type:'text',at:99425,end:Infinity,visual:{target:'chapter2-getTogether',text:'GET EVERYONE TOGETHER',fadeIn:[99425,99625]}}
]};
