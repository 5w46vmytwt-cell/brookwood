// Keyed presentation only: polling preserves nodes and never replays arrivals.
const initialized=new WeakSet();
export function renderLobbyPlayers(grid,players){
 const columns=players.length<=2?Math.max(1,players.length):players.length<=6?3:players.length<=12?4:5;
 grid.style.setProperty('--columns',columns);
 const existing=new Map([...grid.children].map(node=>[node.dataset.playerId,node]));
 const ids=new Set(players.map(player=>player.id));
 for(const node of [...grid.children])if(!ids.has(node.dataset.playerId))node.remove();
 for(const [index,player] of players.entries()){
  let card=existing.get(player.id);
  if(!card){card=grid.ownerDocument.createElement('div');card.className='card';card.dataset.playerId=player.id;const name=grid.ownerDocument.createElement('div');name.className='name';card.appendChild(name);if(initialized.has(grid))card.classList.add('lobby-arrival');}
  if(card.firstChild.textContent!==player.name)card.firstChild.textContent=player.name;
  card.title=player.name;
  if(grid.children[index]!==card)grid.insertBefore(card,grid.children[index]??null);
 }
 initialized.add(grid);
}

globalThis.BrookwoodLobby={renderPlayers:renderLobbyPlayers};
