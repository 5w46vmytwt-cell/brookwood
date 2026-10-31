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
 ['your-partner',"You heard {name}'s voice in the hallway.\nThey have not left this room."],
 ['ask-partner','A door clicked shut behind {name}.\nNobody was standing beside it.'],
 ['eye-contact',"Look at {name}.\nHold eye contact for a few seconds.\nThen look away.\nDon't explain."],
 ['did-you-hear-that',"At some point, quietly ask {name}:\n“Did you hear that too?”\nIf they ask what you mean...\ndon't answer."],
 ['someone-knows',"Someone here knows why you received this message.\nWe aren't going to tell you who."],
 ['dont-be-last',"The footsteps in the basement stopped the moment you opened this message."],
 ['lights-out',"The hallway light flickered three times.\nSomething on the other side flickered back."],
 ['wrong-person',"You're fine.\nThis message wasn't meant for you."],
 ['dont-trust-them',"If anyone tells you to trust {name}...\ndon't."],
 ['the-lie',"One of you has already lied tonight.\nIt probably wasn't about anything important.\nProbably."],
 ['familiar-voice','Someone laughed just like someone you remember.\nListen carefully the next time.'],
 ['count-the-shadows','Take a quiet look around the room.\nNotice where the shadows fall.'],
 ['old-memory','Ask {name} if tonight feels familiar.\nKeep their answer to yourself.'],
 ['unanswered-question','Your screen lit up before this message arrived.\nSomeone was already typing your name.'],
 ['quiet-observer','For a moment, listen instead of speaking.\nNotice who breaks the silence.'],
 ['nothing','This message was sent from inside the house.\nThe sender is not in your contacts.']
].map(([id,body])=>Object.freeze({id,title,body})));

export function createAssignments(players,choose=randomInt){
  const templates=players.length===1?messageTemplates.filter(t=>!/[{](name|partner)[}]/.test(t.body)):[...messageTemplates],assignments={};
  for(let i=templates.length-1;i>0;i--){const j=choose(i+1);[templates[i],templates[j]]=[templates[j],templates[i]];}
  for(let i=0;i<players.length;i++){
    const p=players[i],template=templates[i],others=players.filter(q=>q.id!==p.id);
    const partner=players.find(q=>q.id===p.partnerId&&q.partnerId===p.id);

    const target=others.length?others[choose(others.length)]:p;
    assignments[p.id]={templateId:template.id,title:template.title,
      body:template.body.replace(/\{(name|partner)\}/g,(_,key)=>key==='name'?target.name:(partner??target).name),openedAt:null,readAt:null};
  }
  return assignments;
}
