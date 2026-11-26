import {MONSTERS} from '../src/content/monsters';
import {claimActivity,createCharacter,newGame,startCombat} from '../src/core/game';
import {totalXpAtLevel} from '../src/core/progression';

function check(condition:unknown,message:string):asserts condition{if(!condition)throw Error(message);}
const monster=MONSTERS.find(row=>row.id==='ECHO_BAT');
check(monster,'Echo Bat must remain available');
check(!MONSTERS.some(row=>row.drops.some(d=>d.itemId==='ECHO_BAT_WING')),'Retired Echo Bat Wing must not remain in the monster drop catalogue');
check(monster.drops.some(d=>d.itemId==='WISP_DUST'),'Echo Bat must retain Wisp Dust');
check(monster.drops.some(d=>d.itemId==='OATHGLASS_SHARD'),'Echo Bat must retain Oathglass Shard');
// Saved offline hunt, created before the closure, resumes against the current
// canonical server-shared catalogue. The monster remains valid; only the retired
// material is unavailable.
const t=Date.UTC(2026,10,24);
let s=createCharacter(newGame(t),'WAYFINDER','RetireTester');
s={...s,character:{...s.character!,level:75,xp:totalXpAtLevel(75),hp:100000,currentHp:100000,attack:100000,defense:100000}};
s=startCombat(s,'MOSS_RAT',t);
s={...s,activity:{...s.activity!,targetId:'ECHO_BAT'}};
const result=claimActivity(s,t+60*60*1000);
check(result.reward.kills>0,'Offline test must actually settle Echo Bat kills');
check(result.reward.gold>0,'Normal Echo Bat Gold must still be awarded');
check(!result.reward.items.some(item=>item.itemId==='ECHO_BAT_WING'),'Offline reward reissued retired item');
for(const storage of [result.state.inventory,result.state.bank,result.state.overflow])check(!storage.stacks.some(item=>item.itemId==='ECHO_BAT_WING'),'Offline settlement inserted retired stock');
console.log('PASS: saved Echo Bat offline claim settles normally without retired wing drops');
