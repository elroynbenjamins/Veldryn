import {claimActivity,createCharacter,newGame,startCombat,startExploration,travelToRegion} from '../src/core/game';
import {EXPLORATION_ROUTES} from '../src/content/exploration';
import {skillLevelPace} from '../src/core/balance-projection';
import {totalXpAtLevel} from '../src/core/progression';
import {COMBAT_EXPLORATION_XP_SHARE} from '../src/core/exploration-progression';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

const T=Date.UTC(2026,8,25,8);
const base=createCharacter(newGame(T),'IRONWARDEN','Explorer');
const rate=(id:string)=>{const route=EXPLORATION_ROUTES.find(row=>row.id===id)!;return route.xp*3600/route.seconds};
const green=rate('SCOUT_GREENFIELDS'),oldMines=rate('SCOUT_OLD_MINES'),sunscar=rate('SCOUT_SUNSCAR'),frost=rate('SCOUT_FROSTMARCH'),ash=rate('SCOUT_ASHLANDS');

ok(COMBAT_EXPLORATION_XP_SHARE===.05,'Combat should contribute a small five-percent Exploration XP share');
ok(green===1440,'Starter Exploration pace should remain unchanged');
ok(oldMines>green&&sunscar>oldMines&&frost>sunscar&&ash>frost,'Exploration XP/hour should rise with later routes');

const at=(level:number,xpPerHour:number)=>{
 const state={...base,skills:base.skills.map(row=>row.skillId==='exploration'?{...row,level,xp:totalXpAtLevel(level)}:row)};
 return skillLevelPace(state,'exploration',xpPerHour);
};
const level20=at(20,rate('SCOUT_KINGS_ROAD')),level46=at(46,frost),level71=at(71,ash);
ok((level20.etaSeconds??Infinity)<=4*3600,'King\'s Road Exploration should remain session-scale around level 20');
ok((level46.etaSeconds??Infinity)<=7.5*3600,'Frostmarch Exploration should stay under roughly 7.5 baseline hours per level');
ok((level71.etaSeconds??Infinity)<=10*3600,'Ashlands Exploration should stay under roughly 10 baseline hours per level');

const combat=startCombat(base,'MOSS_RAT',T);
const combatClaim=claimActivity(combat,T+120_000);
ok((combatClaim.reward.explorationXp??0)>0,'Normal combat must grant passive Exploration XP');
ok((combatClaim.state.skills.find(row=>row.skillId==='exploration')?.xp??0)>0,'Passive combat Exploration XP must settle into the Exploration skill');

const scout=startExploration(base,'SCOUT_GREENFIELDS',T);
const scouted=claimActivity(scout,T+60_000).state;
ok(scouted.character?.completedExplorationRouteIds?.includes('SCOUT_GREENFIELDS'),'First scouting completion must persist on the character');
ok(scouted.unlockedMonsterIds.includes('FIELD_WISP'),'First scouting completion must reveal its authored encounter');

const levelFive={...scouted,character:{...scouted.character!,level:5}};
ok(travelToRegion(levelFive,'SILVERBROOK',T+60_001).state.currentRegionId==='SILVERBROOK','Greenfields scouting plus the character-level gate must unlock Silverbrook travel');

const frostRoute=EXPLORATION_ROUTES.find(row=>row.id==='SCOUT_FROSTMARCH')!,ashRoute=EXPLORATION_ROUTES.find(row=>row.id==='SCOUT_ASHLANDS')!;
ok(frostRoute.seconds===300&&ashRoute.seconds===360,'Exploration acceleration must not increase route completion frequency or pet/discovery roll cadence');
ok(EXPLORATION_ROUTES.every((route,index)=>index===0||route.requiredExplorationLevel>=EXPLORATION_ROUTES[index-1].requiredExplorationLevel),'Exploration route requirements must progress monotonically');

console.log('PASS: Exploration controls discoveries and roads while combat provides a smaller passive XP lane');
