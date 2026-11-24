import {MONSTERS} from '../src/content/monsters';
import {claimActivity,createCharacter,newGame,startCombat} from '../src/core/game';
import {totalXpAtLevel} from '../src/core/progression';

function check(condition:unknown,message:string):asserts condition{if(!condition)throw Error(message);}
const monster=MONSTERS.find(row=>row.id==='ECHO_BAT');
check(monster,'Echo Bat must remain available');
const closure=process.env.MATERIAL_RETIREMENT_FIXTURE==='closed';
if(closure)check(!MONSTERS.some(row=>row.drops.some(d=>d.itemId==='ECHO_BAT_WING')),'Closed catalogue still issues wing');
else check(monster.drops.some(d=>d.itemId==='ECHO_BAT_WING'),'Unexpected active catalogue change');
// Saved offline hunt, created before the proposed closure, resumed with the
// current canonical server-shared settlement logic. Synthetic character only.
const t=Date.UTC(2026,10,24);
let s=createCharacter(newGame(t),'WAYFINDER','Retirement Fixture');
s={...s,character:{...s.character!,level:75,xp:totalXpAtLevel(75),hp:100000,currentHp:100000,attack:100000,defense:100000}};
s=startCombat(s,'MOSS_RAT',t);
s={...s,activity:{...s.activity!,targetId:'ECHO_BAT'}};
const before=JSON.stringify(s);
const result=claimActivity(s,t+60*60*1000);
check(result.reward.kills>0,'Offline test must actually settle Echo Bat kills');
check(result.reward.gold>0,'Normal monster gold must still be awarded');
check(JSON.stringify(s)===before,'Claim mutated original fixture');
if(closure){
 check(!result.reward.items.some(item=>item.itemId==='ECHO_BAT_WING'),'Offline reward reissued retired item');
 for(const storage of [result.state.inventory,result.state.bank,result.state.overflow])check(!storage.stacks.some(item=>item.itemId==='ECHO_BAT_WING'),'Offline settlement inserted retired stock');
}
console.log('PASS: saved Echo Bat offline claim, kills='+result.reward.kills+', closure='+closure);
