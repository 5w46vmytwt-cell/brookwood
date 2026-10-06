import {randomInt} from 'node:crypto';
// Server-only template pool. Never import this module into browser code.
const title='KEEP THIS TO YOURSELF';
export const messageTemplates=Object.freeze([
 ['keep-watch','Something about {name} seems off tonight.\nKeep an eye on them.'],
 ['trust','How well do you really know {name}?\nWould you know if they were lying to you?'],
 ['watch-them',"Watch {name}.\nDon't tell them why."],
 ['arrival-time',"At some point, ask {name} what time they arrived tonight.\nDon't explain why you're asking."],
 ['brookwood','Ask {name}:\n“Have you ever been to Brookwood before?”\nWhatever they answer, just say:\n“Interesting.”'],
 ['something-changed',"{name} seems different tonight.\nSee if anyone else has noticed.\nDon't mention this message."],
 ['about-you','Someone in this room received a message about you.\nAct normal.'],
 ['lie','If {name} asks what your message said...\nLie.'],
 ['first-person',"Don't trust the first person who asks what your message said."],
 ['your-partner','Do not tell {partner} what this message says.\nEven if they ask.'],
 ['ask-partner','Ask {partner} what their message said.\nIf they refuse to tell you...\nremember that.'],
 ['eye-contact',"Look at {name}.\nHold eye contact for a few seconds.\nThen look away.\nDon't explain."],
 ['did-you-hear-that',"At some point, quietly ask {name}:\n“Did you hear that too?”\nIf they ask what you mean...\ndon't answer."],
 ['someone-knows',"Someone here knows why you received this message.\nWe aren't going to tell you who."],
 ['dont-be-last',"For the next few minutes...\ndon't be the last person to enter a room."],
 ['lights-out',"If the lights go out tonight...\nfind {name}.\nDon't ask why."],
 ['wrong-person',"You're fine.\nThis message wasn't meant for you."],
 ['dont-trust-them',"If anyone tells you to trust {name}...\ndon't."],
 ['the-lie',"One of the twelve of you has already lied tonight.\nIt probably wasn't about anything important.\nProbably."],
 ['nothing','No instructions for you.\nEnjoy the party.\nFor now.']
].map(([id,body])=>Object.freeze({id,title,body})));

export function createAssignments(players,choose=randomInt){
  const templates=[...messageTemplates],assignments={};
  for(let i=templates.length-1;i>0;i--){const j=choose(i+1);[templates[i],templates[j]]=[templates[j],templates[i]];}
  for(let i=0;i<players.length;i++){
    const p=players[i],template=templates[i],others=players.filter(q=>q.id!==p.id);
    const partner=players.find(q=>q.id===p.partnerId&&q.partnerId===p.id);
    if(!partner)throw Error('Invalid reciprocal partner');
    const target=others[choose(others.length)];
    assignments[p.id]={templateId:template.id,title:template.title,
      body:template.body.replace(/\{(name|partner)\}/g,(_,key)=>key==='name'?target.name:partner.name),openedAt:null,readAt:null};
  }
  return assignments;
}
