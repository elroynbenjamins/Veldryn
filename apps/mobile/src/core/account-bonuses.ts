import type {GameState} from './types';
import {characterPermanentMultipliers} from './permanent-boosts';
import {collectionBonusBreakdown} from './collectibles';
import {COLLECTIBLE_TARGET_LABELS} from '../content/collectibles';
import {BUYABLE_PERMANENT_BOOSTS} from '../content/permanent-boosts';
import {selectedFaithBlessing} from './faith';
import {DAILY_SUPPLY_BONUS,dailySupplyBoostLabel,normalizeActiveDailySupplyBoost} from './daily-supplies';

export interface AccountBonusModifierRow{
 id:string;
 label:string;
 percent:number;
 direction:'increase'|'reduction';
}
export interface AccountBonusSourceRow{
 id:string;
 label:string;
 detail:string;
 scope:'account'|'character'|'temporary';
}
export interface AccountBonusOverview{
 modifiers:AccountBonusModifierRow[];
 sources:AccountBonusSourceRow[];
 temporary?:{label:string;percent:number;remainingSeconds:number};
}

const multiplierLabels:ReadonlyArray<[keyof ReturnType<typeof characterPermanentMultipliers>,string,'increase'|'reduction']>=[
 ['combatPowerMultiplier','Combat power','increase'],
 ['combatSpeedMultiplier','Combat speed','increase'],
 ['incomingDamageMultiplier','Damage taken','reduction'],
 ['gatheringSpeedMultiplier','Gathering speed','increase'],
 ['gatheringYieldMultiplier','Gathering yield','increase'],
 ['fishingSpeedMultiplier','Fishing speed','increase'],
 ['herbalismSpeedMultiplier','Herbalism speed','increase'],
 ['cookingSpeedMultiplier','Cooking speed','increase'],
 ['craftingSpeedMultiplier','Crafting speed','increase'],
 ['materialPreservationMultiplier','Material preservation','increase'],
 ['healingEffectivenessMultiplier','Healing effectiveness','increase'],
 ['dungeonRewardMultiplier','Dungeon rewards','increase'],
 ['guildContributionMultiplier','Guild contribution','increase'],
 ['skillXpMultiplier','Skill XP','increase'],
 ['characterXpMultiplier','Character XP','increase'],
 ['goldMultiplier','Gold','increase'],
 ['dropChanceMultiplier','Drop chance','increase'],
];

function percentFor(value:number,direction:'increase'|'reduction'){
 const raw=direction==='reduction'?(1-value)*100:(value-1)*100;
 return Math.abs(raw)<0.005?0:Math.max(0,raw);
}
const pct=(bps:number)=>(bps/100).toFixed(2)+'%';

export function accountBonusOverview(state:GameState):AccountBonusOverview{
 const multipliers=characterPermanentMultipliers(state);
 const modifiers=multiplierLabels.flatMap(([key,label,direction])=>{
  const percent=percentFor(Number(multipliers[key]),direction);
  return percent>0?[{id:String(key),label,percent,direction}]:[];
 });

 const sources:AccountBonusSourceRow[]=[];
 for(const row of collectionBonusBreakdown(state)){
  sources.push({
   id:'collection:'+row.target,
   label:'Collection · '+COLLECTIBLE_TARGET_LABELS[row.target],
   detail:pct(row.ownedAppliedBps)+' passive'+(row.activeAppliedBps?' · '+pct(row.activeAppliedBps)+' active':''),
   scope:'account',
  });
 }
 const blessing=selectedFaithBlessing(state);
 if(blessing)sources.push({
  id:'faith:'+blessing.id,
  label:'Faith · '+blessing.name,
  detail:'+'+(blessing.bonus*100).toFixed(1)+'% '+blessing.family,
  scope:'character',
 });
 for(const id of new Set(state.character?.ownedBoostIds??[])){
  const boost=BUYABLE_PERMANENT_BOOSTS[id];
  if(boost)sources.push({id:'boost:'+id,label:boost.name,detail:'Permanent character boost',scope:'character'});
 }

 const active=normalizeActiveDailySupplyBoost(state.character?.activeDailySupplyBoost);
 const temporary=active?{label:dailySupplyBoostLabel(active.type),percent:DAILY_SUPPLY_BONUS*100,remainingSeconds:active.remainingSeconds}:undefined;
 if(temporary)sources.push({id:'daily-supplies',label:'Daily Supplies · '+temporary.label,detail:'+'+temporary.percent.toFixed(0)+'% while qualifying activity time remains',scope:'temporary'});

 return {modifiers,sources,...(temporary?{temporary}:{})};
}
