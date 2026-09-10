import {createCharacter,newGame,startCombat,startGathering,travelToRegion} from '../src/core/game';
import {currentRegionId} from '../src/core/combat-region';

const ok=(condition:unknown,message:string)=>{if(!condition)throw new Error(message)};
const beginner=createCharacter(newGame(0),'IRONWARDEN','Region Test');
ok(currentRegionId(beginner)==='GREENFIELDS','A new character must begin in Greenfields');

let rejected=false;
try{startGathering(beginner,'COPPER_VEIN',1)}catch{rejected=true}
ok(rejected,'Gathering outside the current region must be rejected by core game logic');

const veteran={...beginner,character:{...beginner.character!,level:20}};
const travelled=travelToRegion(veteran,'OLD_MINES',2);
ok(currentRegionId(travelled.state)==='OLD_MINES','Travel must persist the new current region');
ok(startGathering(travelled.state,'COPPER_VEIN',3).activity?.targetId==='COPPER_VEIN','Gathering in the current region must be allowed');

rejected=false;
try{startCombat(travelled.state,'MOSS_RAT',4)}catch{rejected=true}
ok(rejected,'Combat outside the current region must be rejected by core game logic');

const active=startGathering(travelled.state,'COPPER_VEIN',5);
const returned=travelToRegion(active,'GREENFIELDS',60005);
ok(returned.state.currentRegionId==='GREENFIELDS'&&returned.state.activity===null,'Travel must settle and stop an active regional activity');
ok(returned.reward.elapsedSeconds>0,'Travel must preserve rewards earned before departure');

rejected=false;
try{travelToRegion(beginner,'KINGS_ROAD',6)}catch{rejected=true}
ok(rejected,'Locked regions must reject travel');

console.log('PASS: travel persists location and region gates combat and gathering');
