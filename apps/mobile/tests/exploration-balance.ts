import {claimActivity,createCharacter,newGame,previewActivityReward,startCombat,startExploration} from '../src/core/game';
import {EXPLORATION_ROUTES} from '../src/content/exploration';
import {skillLevelPace} from '../src/core/balance-projection';
import {totalXpAtLevel} from '../src/core/progression';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

const base=createCharacter(newGame(1),'IRONWARDEN','Explorer');

const combatStart=startCombat(base,'MOSS_RAT',10);
const combatPreview=previewActivityReward(combatStart,10+3600_000);
ok((combatPreview.explorationXp??0)>0,'Normal combat should grant a small amount of passive Exploration XP');
ok((combatPreview.explorationXp??0)<combatPreview.xp,'Passive Exploration XP must remain secondary to character combat XP');
const combatClaim=claimActivity(combatStart,10+3600_000).state;
ok((combatClaim.skills.find(row=>row.skillId==='exploration')?.xp??0)>0,'Passive combat Exploration XP must settle into Exploration');
ok((combatClaim.discoveredRegionIds??[]).length===1&&(combatClaim.discoveredRegionIds??[])[0]==='GREENFIELDS','Combat must never discover the next region route by itself');

const scoutStart=startExploration(base,'SCOUT_GREENFIELDS',20);
const scoutClaim=claimActivity(scoutStart,20+60_000).state;
ok((scoutClaim.discoveredRegionIds??[]).includes('SILVERBROOK'),'Completing Greenfields scouting must discover the Silverbrook route');
ok(scoutClaim.unlockedMonsterIds.includes('FIELD_WISP'),'Completing Greenfields scouting must reveal its authored encounter');

const rate=(id:string)=>{const route=EXPLORATION_ROUTES.find(row=>row.id===id)!;return route.xp*3600/route.seconds};
const green=rate('SCOUT_GREENFIELDS'),oldMines=rate('SCOUT_OLD_MINES'),sunscar=rate('SCOUT_SUNSCAR'),frost=rate('SCOUT_FROSTMARCH'),ash=rate('SCOUT_ASHLANDS');

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

const frostRoute=EXPLORATION_ROUTES.find(row=>row.id==='SCOUT_FROSTMARCH')!,ashRoute=EXPLORATION_ROUTES.find(row=>row.id==='SCOUT_ASHLANDS')!;
ok(frostRoute.seconds===300&&ashRoute.seconds===360,'Exploration acceleration must not increase route completion frequency or pet/discovery roll cadence');

console.log('PASS: Exploration drives world discovery while combat supplies only passive skill XP');
