import {createCharacter,newGame} from '../src/core/game';
import {EXPLORATION_COMBAT_XP_SHARE,EXPLORATION_REGION_GATES,EXPLORATION_ROUTES,explorationCombatXpForKills} from '../src/content/exploration';
import {skillLevelPace} from '../src/core/balance-projection';
import {totalXpAtLevel} from '../src/core/progression';
import {WORLD_ZONES} from '../src/content/world-map';
import {regionTravelAvailability} from '../src/core/world-navigation';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

const base=createCharacter(newGame(1),'IRONWARDEN','Explorer');
const rate=(id:string)=>{const route=EXPLORATION_ROUTES.find(row=>row.id===id)!;return route.xp*3600/route.seconds};
const green=rate('SCOUT_GREENFIELDS'),oldMines=rate('SCOUT_OLD_MINES'),sunscar=rate('SCOUT_SUNSCAR'),frost=rate('SCOUT_FROSTMARCH'),ash=rate('SCOUT_ASHLANDS');

ok(green===1440,'Starter Exploration pace should remain unchanged');
ok(oldMines>green&&sunscar>oldMines&&frost>sunscar&&ash>frost,'Exploration XP/hour should rise with later routes');
ok(EXPLORATION_ROUTES.map(row=>row.requiredLevel).join(',')==='1,3,5,10,15,22,35,50','Exploration route gates should remain softer than character-region level gates');

const at=(level:number,xpPerHour:number)=>{
 const state={...base,skills:base.skills.map(row=>row.skillId==='exploration'?{...row,level,xp:totalXpAtLevel(level)}:row)};
 return skillLevelPace(state,'exploration',xpPerHour);
};
ok((at(15,rate('SCOUT_KINGS_ROAD')).etaSeconds??Infinity)<=4*3600,'King\'s Road Exploration should remain session-scale');
ok((at(35,frost).etaSeconds??Infinity)<=7.5*3600,'Frostmarch Exploration should stay under roughly 7.5 baseline hours per level');
ok((at(50,ash).etaSeconds??Infinity)<=10*3600,'Ashlands Exploration should stay under roughly 10 baseline hours per level');

ok(EXPLORATION_COMBAT_XP_SHARE===.10,'Combat should grant a modest 10% passive Exploration XP share');
ok(explorationCombatXpForKills(10,100)===100,'Ten 100-XP kills should grant 100 passive Exploration XP');

const silverbrook=WORLD_ZONES.find(row=>row.id==='SILVERBROOK')!;
let gateState={...base,character:{...base.character!,level:5}};
ok(regionTravelAvailability(gateState,silverbrook)==='locked','Silverbrook should require the Greenfields scout route even after the level requirement');
gateState={...gateState,unlockedMonsterIds:[...gateState.unlockedMonsterIds,'FIELD_WISP']};
ok(EXPLORATION_REGION_GATES.SILVERBROOK==='SCOUT_GREENFIELDS'&&EXPLORATION_REGION_GATES.IRONWOOD==='SCOUT_GREENFIELDS','The first Greenfields scout should reveal both early roads');
ok(regionTravelAvailability(gateState,silverbrook)==='available','Completing the prior scout route should reveal Silverbrook');

const frostRoute=EXPLORATION_ROUTES.find(row=>row.id==='SCOUT_FROSTMARCH')!,ashRoute=EXPLORATION_ROUTES.find(row=>row.id==='SCOUT_ASHLANDS')!;
ok(frostRoute.seconds===300&&ashRoute.seconds===360,'Exploration acceleration must not increase route completion frequency or pet/discovery roll cadence');

console.log('PASS: Exploration gates world discovery, reveals encounters and gains modest passive combat XP');
