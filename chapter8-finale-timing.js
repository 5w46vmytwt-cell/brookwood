import {effects} from './chapter8-sound-design.js';
// Nominal cue windows exclude loading/poll latency. Native media completion,
// not a wall-clock timeout, is authoritative for every recording and the news.
export const wifeDurations=[28682.448979591834,8986.122448979591,6426.122448979592,12434.285714285714,11885.714285714286,16274.285714285714,12120.816326530612,10997.551020408164,12120.816326530612,12512.65306122449,5720.816326530612,4675.918367346939,8672.65306122449,6922.448979591837,5799.183673469388,51644.08163265306];
export const NEWS_SRC='/assets/chapter8/breaking-news.mp4';
export const NEWS_DURATION_MS=62480;
export const SILENCE_MS=5000, SCARE_MS=2000, HANDOFF_MS=1600;
export const cameras=Object.freeze({
 grid:'/assets/chapter8/ch8_security_grid.png',
 front:'/assets/chapter8/ch8_cam04_front_porc.png',
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
const legacyOrdered=[
 hold('handoff','black',HANDOFF_MS),wife(1,'party'),wife(2,'party'),wife(3,'party'),wife(4,'grid'),
 hold('grid-driveway','grid',900),effect('motion-notification','driveway',effects.notification),wife(5,'driveway'),hold('grid-side','grid',900),wife(6,'side'),
 hold('grid-backyard','grid',900),wife(7,'backyard'),hold('grid-porch','grid',900),bell('doorbell-before'),wife(8,'porch'),bell('doorbell-after'),
 hold('grid-garage','grid',900),hold('garage-alarm-lead','garage',1000),effect('garage-announcement','garage',effects.announcement),hold('garage-alarm-release','garage',1000),wife(9,'garage'),wife(10,'garage'),wife(11,'garage'),
 effect('interior-door','garage',effects.door),effect('whistle-approach','garage',effects.whistle,{cameraSwitchMs:3500}),
 // Armed only after the actual empty-room image has decoded on an authorized TV.
 hold('living-silence','living',3500),hold('intruder-reveal','scare',700),hold('signal-break','lost',850),wife(12,'lost'),
 wife(13,'lost'),effect('escape-running','lost',effects.running),effect('escape-slam','lost',effects.slam),hold('escape-settle','living',2500),wife(14,'living'),hold('quiet-after-escape','living',2000),wife(15,'news-intro'),
 hold('news-black','black',1000),{id:'breaking-news',kind:'video',src:NEWS_SRC,durationMs:NEWS_DURATION_MS,visual:'news',volume:1},
 hold('news-out','black',1500),wife(16,'party'),hold('ending','ending',3000)
];

export const GAME_TITLE='THE GREAT HALLOWEEN PARTY RESCUE';
export const GAME_TITLE_AT_MS=1460, GAME_TITLE_END_MS=8100, WIFE_RELAX_AT_MS=14800;
const bright=n=>wife(n,'wife-bright'),dark=n=>wife(n,'wife-dark');
const version1Ordered=[
 hold('handoff','wife-bright',HANDOFF_MS),bright(1),bright(2),bright(3),
 effect('notification-first','wife-bright',effects.notification),hold('notification-gap','wife-bright',1200),
 effect('notification-second','wife-bright',effects.notification),hold('notification-reaction','wife-bright',800),bright(4),
 hold('grid-driveway','grid',2500),hold('driveway-observe','driveway',3000),dark(5),hold('driveway-linger','driveway',2000),
 hold('grid-side','grid',1800),effect('motion-notification','wife-dark',effects.notification),hold('motion-reaction','wife-dark',700),dark(6),
 hold('select-side','grid',2000),hold('side-observe','side',3500),hold('grid-backyard','grid',1800),dark(7),hold('backyard-observe','backyard',3500),
 hold('grid-porch','grid',1800),bell('doorbell-before'),hold('doorbell-reaction','wife-dark',600),dark(8),hold('porch-observe','porch',3500),
 hold('porch-return-grid','grid',1800),bell('doorbell-after'),hold('doorbell-second-reaction','wife-dark',600),dark(9),
 hold('grid-garage','grid',2500),hold('garage-alarm-lead','grid',1000),effect('garage-announcement','grid',effects.announcement),hold('garage-alarm-release','grid',1000),
 hold('garage-observe','garage',3000),dark(10),dark(11),hold('garage-interior','garage',1500),
 effect('interior-door','garage',effects.door),effect('whistle-approach','garage',effects.whistle,{cameraSwitchMs:3500}),
 hold('living-silence','living',3500),hold('intruder-reveal','scare',700),hold('signal-break','lost',850),wife(12,'lost'),
 dark(13),effect('escape-running','lost',effects.running),effect('escape-slam','lost',effects.slam),hold('escape-settle','living',2500),dark(14),hold('quiet-after-escape','wife-dark',2000),dark(15),
 hold('news-black','black',2000),{id:'breaking-news',kind:'video',src:NEWS_SRC,durationMs:NEWS_DURATION_MS,visual:'news',volume:1},
 hold('news-out','black',1500),wife(16,'wife-return'),hold('ending','ending',3000)
].map(c=>c.id.startsWith('doorbell-')&&c.kind==='effect'?{...c,visual:'grid'}:c);

export const CAMERA_ZOOM_MS=1400,CAMERA_HOLD_MS=2500,GRID_PAUSE_MS=2500;
export const cameraTiles=Object.freeze({driveway:{x:1/3,y:0,w:1/3,h:.5},front:{x:1/3,y:.5,w:1/3,h:.5},porch:{x:1/3,y:.5,w:1/3,h:.5},side:{x:0,y:0,w:1/3,h:.5},backyard:{x:2/3,y:0,w:1/3,h:.5},garage:{x:2/3,y:.5,w:1/3,h:.5},living:{x:0,y:.5,w:1/3,h:.5}});
const zoom=(id,camera,direction)=>({...hold(id,camera,CAMERA_ZOOM_MS),zoom:{camera,direction},...(direction==='in'?{readyImage:camera}:{})});
const alert=(id)=>effect(id,'grid',effects.notification,{motion:true});
const cameraVisit=(id,visual,n)=>[alert(id+'-motion'),hold(id+'-alert-register','grid',700),zoom(id+'-open',visual,'in'),wife(n,visual),hold(id+'-hold',visual,CAMERA_HOLD_MS),zoom(id+'-close',visual,'out'),hold(id+'-grid-pause','grid',GRID_PAUSE_MS)];
const ordered=[
 hold('handoff','wife-bright',HANDOFF_MS),bright(1),bright(2),bright(3),bright(4),hold('grid-front','grid',GRID_PAUSE_MS),
 ...cameraVisit('front','front',5),...cameraVisit('side','side',6),...cameraVisit('backyard','backyard',7),
 {...bell('doorbell-before'),visual:'grid'},zoom('doorbell-open','front','in'),wife(8,'front'),{...bell('doorbell-after'),visual:'front'},hold('doorbell-hold','front',CAMERA_HOLD_MS),zoom('doorbell-close','front','out'),hold('doorbell-grid-pause','grid',GRID_PAUSE_MS),
 hold('garage-alarm-lead','grid',1000),effect('garage-announcement','grid',effects.announcement),hold('garage-alarm-release','grid',1000),zoom('garage-open','garage','in'),wife(9,'garage'),hold('garage-hold','garage',CAMERA_HOLD_MS),zoom('garage-close','garage','out'),hold('garage-grid-pause','grid',GRID_PAUSE_MS),
 effect('interior-door','grid',effects.door),zoom('living-open','living','in'),wife(10,'living'),wife(11,'living'),effect('whistle-approach','living',effects.whistle),
 hold('living-silence','living',SILENCE_MS),hold('intruder-reveal','scare',SCARE_MS),hold('signal-break','lost',850),wife(12,'lost'),
 dark(13),effect('escape-running','lost',effects.running),effect('escape-slam','lost',effects.slam),hold('escape-settle','living',2500),dark(14),hold('quiet-after-escape','wife-dark',2000),dark(15),
 hold('news-black','black',2000),{id:'breaking-news',kind:'video',src:NEWS_SRC,durationMs:NEWS_DURATION_MS,visual:'news',volume:1},hold('news-out','black',1500),wife(16,'wife-return'),hold('ending','ending',3000)
];
function timed(cues){let at=0;return Object.freeze(cues.map(c=>{const cue=Object.freeze({...c,at,end:at+c.durationMs});at=cue.end;return cue;}));}
export const legacyFinaleCues=timed(legacyOrdered),version1FinaleCues=timed(version1Ordered);
export const version2FinaleCues=timed(ordered.map(c=>c.id==='living-silence'?{...c,durationMs:3500}:c.id==='intruder-reveal'?{...c,durationMs:700}:c));
// Preserve every stored version-2 index; only fresh finales select this cut.
const revised=ordered.filter(c=>c.id!=='wife-12');
revised.splice(revised.findIndex(c=>c.id==='living-silence'),0,wife(12,'living'));
export const version3FinaleCues=timed(revised.map(c=>c.id==='living-silence'?{...c,durationMs:SILENCE_MS}:c.id==='intruder-reveal'?{...c,durationMs:SCARE_MS}:c.visual==='front'&&!c.id.startsWith('doorbell-')&&c.id!=='wife-08'?{...c,visual:'driveway',...(c.zoom?{zoom:{...c.zoom,camera:'driveway'}}:{}),...(c.readyImage?{readyImage:'driveway'}:{})}:c));
// Native warning begins at SIGNAL LOST, with no intervening hold.
const current=version3FinaleCues.filter(c=>!['wife-12','signal-break'].includes(c.id));
current.splice(current.findIndex(c=>c.id==='intruder-reveal')+1,0,{...wife(12,'lost'),syncVisualToAudio:true});
export const version4FinaleCues=timed(current);
const polished=[...current];
polished.splice(polished.findIndex(c=>c.id==='wife-04'),0,effect('camera-question-notification','wife-bright',effects.notification),hold('camera-question-gap','wife-bright',350));
polished.splice(polished.findIndex(c=>c.id==='wife-12')+1,0,hold('signal-lost-pause','lost',3500));
export const finaleCues=timed(polished.map(c=>c.id==='whistle-approach'?{...c,soundVersion:5}:c));
export const allFinaleCues=[...legacyFinaleCues,...version1FinaleCues,...version2FinaleCues,...version3FinaleCues,...version4FinaleCues,...finaleCues];
export const finaleDurationMs=finaleCues.at(-1).end;
export const cuesFor=c=>c?.finale?.polishVersion===5?finaleCues:c?.finale?.polishVersion===4?version4FinaleCues:c?.finale?.polishVersion===3?version3FinaleCues:c?.finale?.polishVersion===2?version2FinaleCues:c?.finale?.polishVersion===1?version1FinaleCues:legacyFinaleCues;
export const finaleCue=c=>cuesFor(c)[c?.finale?.index];
export const finaleCheckpoints=['chapter8-finale','chapter8-finale-silence','chapter8-finale-news'];
