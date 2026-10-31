import test from 'node:test';
import assert from 'node:assert/strict';
import {renderLobbyPlayers} from '../lobby-tv.js';
class Node{
 constructor(document){this.ownerDocument=document;this.children=[];this.dataset={};this.style={setProperty:(key,value)=>this[key]=value};this.classList={add:value=>this.arrival=value};}
 get firstChild(){return this.children[0];}
 appendChild(node){this.insertBefore(node,null);}
 insertBefore(node,before){node.remove();const i=before?this.children.indexOf(before):this.children.length;this.children.splice(i,0,node);node.parent=this;}
 remove(){if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}}
}
const document={createElement:()=>new Node(document)};
const players=n=>Array.from({length:n},(_,i)=>({id:String(i),name:'Player '+i}));
test('compact lobby uses fixed column counts for one through 25 participants',()=>{
 for(const [n,columns] of [[1,1],[2,2],[6,3],[12,4],[20,5],[25,5]]){const grid=new Node(document);renderLobbyPlayers(grid,players(n));assert.equal(grid.children.length,n);assert.equal(grid['--columns'],columns);assert(grid.children.every(node=>!node.arrival));}
});
test('polling retains cards; only genuinely new joins animate; names are safe text',()=>{
 const grid=new Node(document);renderLobbyPlayers(grid,players(2));const first=grid.children[0];renderLobbyPlayers(grid,players(2));assert.equal(grid.children[0],first);assert(!first.arrival);const next=players(3);next[2].name='<script>long name</script>';renderLobbyPlayers(grid,next);assert.equal(grid.children[2].arrival,'lobby-arrival');assert.equal(grid.children[2].firstChild.textContent,next[2].name);
});
test('departures remove every stale card without leaving placeholders',()=>{
 const grid=new Node(document);renderLobbyPlayers(grid,players(25));renderLobbyPlayers(grid,[{id:'fresh',name:'New player'}]);assert.equal(grid.children.length,1);assert.equal(grid.children[0].dataset.playerId,'fresh');renderLobbyPlayers(grid,[]);assert.equal(grid.children.length,0);
});
