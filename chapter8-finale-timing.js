import {effects} from './chapter8-sound-design.js';
// Nominal cue windows exclude loading/poll latency. Native media completion,
// not a wall-clock timeout, is authoritative for every recording and the news.
export const wifeDurations=[28682.448979591834,8986.122448979591,6426.122448979592,12434.285714285714,11885.714285714286,16274.285714285714,12120.816326530612,10997.551020408164,12120.816326530612,12512.65306122449,5720.816326530612,4675.918367346939,8672.65306122449,6922.448979591837,5799.183673469388,51644.08163265306];
export const NEWS_SRC='/assets/chapter8/breaking-news.mp4';
export const NEWS_DURATION_MS=62480;
export const SILENCE_MS=3500, SCARE_MS=700, HANDOFF_MS=1600;
export const cameras=Object.freeze({
 grid:'/assets/chapter8/ch8_security_grid.png',
 driveway:'/assets/chapter8/ch8_cam01_driveway.png',
 side:'/assets/chapter8/ch8_cam02_side_passage.png',
 backyard:'/assets/chapter8/ch8_cam03_backyard.png',
 porch:'/assets/chapter8/ch8_cam04_front_porc.png',
 garage:'/assets/chapter8/ch8_cam05_garag.png',
 living:'/assets/chapter8/ch8_cam06_living_room_empty.png',
 scare:'/assets/chapter8/ch8_cam07_living_room_jumpscare.png'
});
const wife=(n,visual)=>({id:'wife-'+String(n).padStart(2,'0'),kind:'narration',src:'/assets/chapter8/audio/wife-'+String(n).padStart(2,'0')+'.mp3',durationMs:wifeDurations[n-1],visual,volume:1});
const hold=(id,visual,durationMs)=>({id,kind:'hold',visual,durationMs});
const bell=id=>({id,kind:'effect',visual:'porch',src:'/assets/chapter4/audio/doorbell.mp3',durationMs:3024,volume:.45});
const effect=(id,visual,spec,extra={})=>({id,kind:'effect',visual,...spec,...extra});
const ordered=[
 hold('handoff','black',HANDOFF_MS),wife(1,'party'),wife(2,'party'),wife(3,'party'),wife(4,'grid'),
 hold('grid-driveway','grid',900),effect('motion-notification','driveway',effects.notification),wife(5,'driveway'),hold('grid-side','grid',900),wife(6,'side'),
 hold('grid-backyard','grid',900),wife(7,'backyard'),hold('grid-porch','grid',900),bell('doorbell-before'),wife(8,'porch'),bell('doorbell-after'),
 hold('grid-garage','grid',900),hold('garage-alarm-lead','garage',1000),effect('garage-announcement','garage',effects.announcement),hold('garage-alarm-release','garage',1000),wife(9,'garage'),wife(10,'garage'),wife(11,'garage'),
 effect('interior-door','garage',effects.door),effect('whistle-approach','garage',effects.whistle,{cameraSwitchMs:3500}),
 // Armed only after the actual empty-room image has decoded on an authorized TV.
 hold('living-silence','living',SILENCE_MS),hold('intruder-reveal','scare',SCARE_MS),hold('signal-break','lost',850),wife(12,'lost'),
 wife(13,'lost'),effect('escape-running','lost',effects.running),effect('escape-slam','lost',effects.slam),hold('escape-settle','living',2500),wife(14,'living'),hold('quiet-after-escape','living',2000),wife(15,'news-intro'),
 hold('news-black','black',1000),{id:'breaking-news',kind:'video',src:NEWS_SRC,durationMs:NEWS_DURATION_MS,visual:'news',volume:1},
 hold('news-out','black',1500),wife(16,'party'),hold('ending','ending',3000)
];
let at=0;
export const finaleCues=Object.freeze(ordered.map(c=>{const cue=Object.freeze({...c,at,end:at+c.durationMs});at=cue.end;return cue;}));
export const finaleDurationMs=at;
export const finaleCue=c=>finaleCues[c?.finale?.index];
export const finaleCheckpoints=['chapter8-finale','chapter8-finale-silence','chapter8-finale-news'];
