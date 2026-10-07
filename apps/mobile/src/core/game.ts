import {combatTimeline} from './combat-timing';
import {eventCandyWindow} from './live-events';
import {professionActionPace} from './profession-action-pace';
import {captureSkillAffinity,activeSkillAffinity,affinityXpRemainderKey,settleAffinitySkillXp} from './class-skill-affinities';
import {CLASSES} from '../content/classes';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {classSkillsFor} from '../content/class-skills';
import {MONSTERS} from '../content/monsters';
import {itemDef} from '../content/items';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES,HERBALISM_ESSENCE_BY_ZONE,herbalismInsightMultiplier,herbalismMethod} from '../content/herbalism';
import {explorationRoute} from '../content/exploration';
import {QUESTS} from '../content/quests';
import {GameState,ClassId,RewardBundle,ItemStack,GearSlot,BodyPresentation,GatheringSkillId,CombatTacticId} from './types';
import {activityQueueCapacity,normalizeActivityQueue,activityCanAdvanceCondition,queuedActivityReadiness} from './activity-queue';
import type {ActiveActivity} from './types';
import {combineActivityRewards} from './activity-rewards';
import {characterLevelFromXp,levelFromXp,totalXpAtLevel} from './progression';
import {random01} from './rng';
import {characterNameError,normalizeCharacterName} from './character-creation';
import {noviceItemId,noviceSetFor} from '../content/novice-sets';
import {classCombatStyle} from './class-combat';
import {captureActivityEnvironment,environmentEffectForActivity,zoneIdForTarget} from './world-weather';
import {SeasonalPeriod,seasonalQuestBoard} from './seasonal-quests';
import {characterPermanentMultipliers} from './permanent-boosts';
import {gatheringEventRewards,timedEventRewards,applyEventDiscoveries,applyEventDrops,grantEventActivity,eventCandyUtilityMultiplier} from './live-events';
import {DEFAULT_QUICK_NAV_DESTINATIONS} from './quick-navigation';
import {unlockedCharacterSlots} from './account-roster';
import {accountEntitlementBenefits,entitlementStorageCapacity} from './account-entitlements';
import {gatheringPacing} from './gathering-tools';
import {gatheringToolDef} from '../content/gathering-tools';
import {currentRegionId} from './combat-region';
import {regionTravelAvailability,regionTravelLockReason} from './world-navigation';
import {WORLD_ZONES,worldZoneInDevelopment} from '../content/world-map';
import {enhancedGearStats,equippedEffectGemBonuses,equippedGemBonuses,hasEnhancement} from './equipment-enhancement';
import {activeEquipmentSetRuntime,equipmentSetCombatModifiers} from './equipment-set-runtime';
import {companionCombatContribution,reconcileCombatCompanionUnlocks,grantCompanionEssence,grantBondstones} from './combat-companions';
import {awardCompanionRematchBondstone,companionRematchBondstoneStatus,recordCompanionActivity} from './companion-runtime';
import {monsterMastery,recordMonsterMastery} from './monster-mastery';
import {awardClassSkillXp,awardCombatClassXp,characterClassEffects,characterClassSkills,CLASS_DRILL_BASE_XP,normalizeTrainingFocus,settleClassDrills} from './class-skills';
import {settleFaithPractice,cancelFaithPractice,normalizeFaith,selectedFaithBlessing} from './faith';
import {HOLY_WATER_ID} from '../content/faith';
import {previewAlchemyReward,alchemyRefund,startAlchemyBatch,preparationEffects,spendPreparationEncounter} from './alchemy';
import {previewProcessingReward,processingRefund,startProcessingBatch} from './processing';
import {potionDef} from '../content/alchemy';
import {applyTrustedLongTermProgression,reconcileWeeklyOrderRollover} from './long-term-progression-runtime';
import {applyLocalBalanceSnapshot} from './balance-telemetry';
import {applyCorePetActivityDrops,applyCorePetCombatDrops} from './core-pet-drops';
import {evaluateIdleRuleSet,type IdleEvaluationContext,type IdleRuleSet} from './idle-rules-v40';
import {combatTactic,normalizeCombatTactic} from './combat-tactics';
import {huntGoalSnapshot,huntMomentumBonus,normalizeHuntGoalId,type HuntGoalId} from './hunt-goals';
import {CHAMPION_DAMAGE_MULTIPLIER,championBonus,isChampionEncounter} from './hunt-champions';
import {applyDailySupplyCraft,commitDailySupplyTimedBoost,dailySupplyActivityMode,previewDailySupplyTimedReward} from './daily-supplies';
import {professionMasteryMultipliers} from './profession-mastery-v40';
import {regionalSecondaryExchange} from './regional-enemy-stats';
import {simulateFallenKnightStoryBattle,type FallenKnightBattleResult,type FallenKnightPlayerSnapshot} from './story-boss';
import {FALLEN_KNIGHT_CLEAR_REWARD,FALLEN_KNIGHT_WEEKLY_BOUNTY_REWARD,fallenKnightWeeklyStatus,recordFallenKnightWeeklyVictory} from './weekly-boss';
export function beginAlchemyBatch(state:GameState,recipeId:string,batches:number,nowMs:number){return startAlchemyBatch(finishClassDrills(state,nowMs),recipeId,batches,nowMs);}
export function beginProcessingBatch(state:GameState,recipeId:string,batches:number,nowMs:number){return startProcessingBatch(finishClassDrills(state,nowMs),recipeId,batches,nowMs);}

function longTermAccountScope(state:GameState){return state.account.longTermAccountScopeId??`local-account:${state.createdAtMs}`;}

function companionUnlocksBetween(before:GameState,after:GameState){
  const owned=new Set(before.account.unlockedCombatCompanionIds??[]);
  return (after.account.unlockedCombatCompanionIds??[]).filter(id=>!owned.has(id)).flatMap(id=>{
    const def=COMBAT_COMPANIONS.find(row=>row.id===id);
    return def?[{companionId:id,name:def.name,role:def.role,rarity:def.rarity}]:[];
  });
}
function withCompanionUnlocks(reward:RewardBundle,before:GameState,after:GameState):RewardBundle{
  const companionUnlocks=companionUnlocksBetween(before,after);
  return companionUnlocks.length?{...reward,companionUnlocks}:reward;
}

export const BASE_OFFLINE_CAP_HOURS=8;
export const FREE_OFFLINE_CAP_HOURS=24;
export const MAX_OFFLINE_CAP_HOURS=30;
/** Base cap retained for content/tests; actual saves use offlineCapSeconds(state). */
export const OFFLINE_CAP_SECONDS=BASE_OFFLINE_CAP_HOURS*60*60;
const COMBAT_SPEED_MIN=.68;
const COMBAT_SPEED_MAX=1.3;
export const COMBAT_TIME_SCALE=1.16;
const COMBAT_EXPECTED_SCALE=1.3;
const COMBAT_MONSTER_DAMAGE_SCALE=1.13;
/** Ordinary regional combat should consume some food for a reasonably prepared player. */
export const REGIONAL_COMBAT_PRESSURE:Readonly<Record<string,number>>={Greenfields:1.00,Silverbrook:1.04,'Ironwood Forest':1.08,'Old Mines':1.12,"King's Road":1.16,Sunscar:1.20,Frostmarch:1.25,Ashlands:1.30};
/** Starter hunts resolve much faster than late hunts. These ordinary-hunt
 * factors keep regional food demand within its authored provisioning budget. */
export const REGIONAL_HUNT_DAMAGE_TUNING:Readonly<Record<string,number>>={Greenfields:.36,Silverbrook:.25,'Ironwood Forest':.40,'Old Mines':.55,"King's Road":.75,Ashlands:.40};
export type RegionalMonsterPressureBand='entry'|'standard'|'hard';
export const REGIONAL_MONSTER_PRESSURE_MULTIPLIER:Readonly<Record<RegionalMonsterPressureBand,number>>={entry:.92,standard:1,hard:1.10};
export const REGIONAL_FOOD_SUSTAIN_TARGETS:Readonly<Record<string,{foodPerHourMin:number;foodPerHourMax:number}>>={Greenfields:{foodPerHourMin:2,foodPerHourMax:4},Silverbrook:{foodPerHourMin:3,foodPerHourMax:5},'Ironwood Forest':{foodPerHourMin:2,foodPerHourMax:4},'Old Mines':{foodPerHourMin:2,foodPerHourMax:5},"King's Road":{foodPerHourMin:2,foodPerHourMax:5},Sunscar:{foodPerHourMin:2,foodPerHourMax:5},Frostmarch:{foodPerHourMin:1.75,foodPerHourMax:5},Ashlands:{foodPerHourMin:1.75,foodPerHourMax:4}};
/** Minimum incoming pressure is applied before healing. Even overgeared hunts
 * drain unhealed players; a sufficiently strong healer can sustain easy enemies. */
export const REGIONAL_MIN_ATTRITION_HP_PER_HOUR:Readonly<Record<string,number>>={Greenfields:60,Silverbrook:80,'Ironwood Forest':115,'Old Mines':180,"King's Road":230,Sunscar:330,Frostmarch:520,Ashlands:620};
export const MIN_UNHEALED_HP_FRACTION_PER_HOUR=.08;
/** Slow recovery between activities keeps food valuable while preventing a defeated run from becoming a hard lockout. */
export const OUT_OF_COMBAT_REGEN_FRACTION_PER_MINUTE=.05;
export const GATHER_TIME_SCALE=1.25;

export function offlineCapBreakdown(state:GameState){
  const setComplete=!!state.character&&noviceSetFor(state.character.classId).slots.every(slot=>state.character!.craftedNoviceItemIds?.includes(noviceItemId(state.character!.classId,slot)));
  const questMilestone=state.quests.some(q=>q.questId==='QST_005'&&q.status==='claimed');
  const unlockedSlots=unlockedCharacterSlots(state);
  const secondSlot=unlockedSlots>=2;
  const thirdSlot=unlockedSlots>=3;
  const fourthSlot=unlockedSlots>=4;
  const fifthSlot=unlockedSlots>=5;
  const guildMember=state.account.guildMember;
  const firstBoss=state.defeatedBossIds.length>0;
  const benefits=accountEntitlementBenefits(state),vip=benefits.vip,vipPlus=benefits.vipPlus,supporter=benefits.supporter;
  const sources=[
    {id:'class_set',name:'Complete first class set',category:'progression' as const,hours:setComplete?2:0,earned:setComplete},
    {id:'quest_milestone',name:'Claim chapter 5',category:'progression' as const,hours:questMilestone?2:0,earned:questMilestone},
    {id:'first_boss',name:'Defeat first boss',category:'progression' as const,hours:firstBoss?2:0,earned:firstBoss},
    {id:'character_slot_2',name:'Unlock character slot #2',category:'progression' as const,hours:secondSlot?2:0,earned:secondSlot},
    {id:'guild',name:'Join a guild',category:'progression' as const,hours:guildMember?2:0,earned:guildMember},
    {id:'character_slot_3',name:'Unlock character slot #3',category:'progression' as const,hours:thirdSlot?2:0,earned:thirdSlot},
    {id:'character_slot_4',name:'Unlock character slot #4',category:'progression' as const,hours:fourthSlot?2:0,earned:fourthSlot},
    {id:'character_slot_5',name:'Unlock character slot #5',category:'progression' as const,hours:fifthSlot?2:0,earned:fifthSlot},
    {id:'vip',name:'VIP',category:'paid' as const,hours:vip?2:0,earned:vip},
    {id:'vip_plus',name:'VIP+',category:'paid' as const,hours:vipPlus?2:0,earned:vipPlus},
    {id:'supporter',name:'Supporter',category:'paid' as const,hours:supporter?2:0,earned:supporter},
  ];
  const earnedHours=sources.reduce((sum,source)=>sum+source.hours,0),hours=Math.min(MAX_OFFLINE_CAP_HOURS,BASE_OFFLINE_CAP_HOURS+earnedHours);
  return {baseHours:BASE_OFFLINE_CAP_HOURS,freeMaxHours:FREE_OFFLINE_CAP_HOURS,maxHours:MAX_OFFLINE_CAP_HOURS,hours,sources};
}
export function offlineCapSeconds(state:GameState){return offlineCapBreakdown(state).hours*60*60}

export function newGame(nowMs:number):GameState{return {
  version:6,createdAtMs:nowMs,character:null,inventory:{stacks:[],capacity:30},bank:{stacks:[],capacity:120},overflow:{stacks:[],expiresAtMs:null},activity:null,currentRegionId:'GREENFIELDS',
  quests:QUESTS.map((q,i)=>({questId:q.id,status:i===0?'active':'locked',progress:0 as number})) as any,
  unlockedMonsterIds:['MOSS_RAT'],exploredRouteIds:[],defeatedBossIds:[],
  skills:['mining','woodcutting','fishing','smithing','cooking','herbalism','alchemy','exploration','tailoring','enchanting','faith'].map(skillId=>({skillId:skillId as any,xp:0,level:1})),
  account:{createdCharacterCount:1,unlockedCharacterSlots:1,guildMember:false,patronTier:'none',guildBannerId:'world_tree_green',guildProfileFrameId:'classic',guildNameplateId:'classic',guildMotto:'Stronger together.',guildContribution:0,guildProjectProgress:0,guildBossHp:100000,guildProjectClaimed:false,guildJoinPolicy:'open',guildMinimumLevel:10,guildApplicationStatus:'none',seasonalContractClaimIds:[]},
  settings:{language:'en',uiTheme:'obsidian',numberMode:'abbreviated',reduceMotion:false,textScale:1,autoEatThresholdPct:40,stopCombatWhenOutOfFood:true,autoJoinWorldChat:true,defaultWorldChat:1,chatDockLines:1,chatEmoteTrayIds:[],quickNavDestinations:[...DEFAULT_QUICK_NAV_DESTINATIONS],favoriteItemIds:[],seenItemIds:[]}
}}

export function createCharacter(state:GameState,classId:ClassId,name='Adventurer',bodyPresentation:BodyPresentation='male'):GameState{
  const c=CLASSES.find(x=>x.id===classId);if(!c)throw new Error('Unknown class');
  if(state.character)throw new Error('A character already exists in this save');
  if(bodyPresentation!=='male'&&bodyPresentation!=='female')throw new Error('Invalid body presentation');
  const normalizedName=normalizeCharacterName(name||'Adventurer');
  const nameError=characterNameError(normalizedName||'Adventurer');
  if(nameError)throw new Error(nameError);
  const equipment={weapon:c.starterEquipment.weapon};
  let maxHp=c.hp;
  for(const id of Object.values(equipment) as string[]){const d=itemDef(id);maxHp+=d.hp||0;}
  return {...state,character:{id:'LOCAL_CHAR_1',name:normalizedName||'Adventurer',classId,bodyPresentation,classSkills:classSkillsFor(classId).map(skill=>({skillId:skill.id,xp:0,level:1})),trainingFocus:'balanced',profileTitle:'New Adventurer',profileBackgroundId:'asterfall-night',ownedPetIds:[],ownedBoostIds:[],profileIconId:'class:'+classId,faith:{favoriteBlessingIds:[],hideWeakerBlessings:true},level:1,xp:0,gold:100,hp:c.hp,currentHp:maxHp,attack:c.attack,defense:c.defense,equipment,equippedFoodId:'TRAVEL_RATION'},
    inventory:{...state.inventory,stacks:[{itemId:'TRAVEL_RATION',quantity:8}]},settings:{...state.settings,seenItemIds:[...new Set([...(state.settings.seenItemIds??[]),'TRAVEL_RATION'])]}}
}

export function effectiveStats(state:GameState){
  const c=state.character;if(!c)return {hp:0,attack:0,defense:0,power:0,critChance:0,critMultiplier:1.5,accuracy:.84,evasion:.04,haste:.05,armor:0,ward:0,tenacity:0,potency:0,penetration:0};
  let hp=c.hp,attack=c.attack,defense=c.defense;
  for(const id of Object.values(c.equipment)){if(!id)continue;const stats=enhancedGearStats(state,id);hp+=stats.hp;attack+=stats.attack;defense+=stats.defense;}
  const novice=noviceSetFor(c.classId),noviceComplete=novice.slots.every(slot=>c.equipment[slot]===noviceItemId(c.classId,slot));
  if(noviceComplete){hp+=novice.setBonus.hp;attack+=novice.setBonus.attack;defense+=novice.setBonus.defense;}
  const setRuntime=activeEquipmentSetRuntime(state),setStats=setRuntime.stats;
  hp=Math.ceil(hp*(1+setStats.maxHp));
  defense=Math.ceil(defense*(1+setStats.armor));
  const gems=equippedGemBonuses(state);hp=Math.ceil(hp*(1+gems.hp));attack=Math.ceil(attack*(1+gems.attack));defense=Math.ceil(defense*(1+gems.defense));
  const mastery=characterClassEffects(c);hp=Math.ceil(hp*mastery.hp);attack=Math.ceil(attack*mastery.attack);defense=Math.ceil(defense*mastery.defense);
  const permanent=characterPermanentMultipliers(state);attack=Math.ceil(attack*permanent.combatPowerMultiplier);
  const prep=c.preparation?preparationEffects(c.preparation):undefined;if(prep)attack=Math.ceil(attack*prep.attack);
  const role=CLASSES.find(def=>def.id===c.classId)?.role,baseCritChance=role==='Damage'?.10:.05,baseEvasion=role==='Damage'?.07:.04;
  const basePower=Math.round(attack*1.5+defense*.8+hp*.08+c.level*2.5);
  return {
    hp,attack,defense,power:Math.round(basePower*(1+setStats.power)),
    critChance:Math.min(.75,baseCritChance+setStats.critRate),
    critMultiplier:1.5+setStats.critDamage,
    accuracy:Math.min(.99,.84+setStats.accuracy),
    evasion:Math.min(.50,baseEvasion+setStats.evasion),
    haste:.05+setStats.haste,
    armor:setStats.armor,ward:setStats.ward,tenacity:setStats.tenacity,potency:setStats.potency,penetration:setStats.penetration,
  }
}

export function settleOutOfCombatRecovery(state:GameState,nowMs:number):GameState{
  if(!state.character||state.activity)return state;
  const maxHp=effectiveStats(state).hp,currentHp=Math.max(1,Math.min(maxHp,state.character.currentHp)),effectGems=equippedEffectGemBonuses(state),setCombat=equipmentSetCombatModifiers(state);
  if(currentHp>=maxHp)return state.outOfCombatSinceMs===undefined?state:{...state,outOfCombatSinceMs:undefined};
  const since=state.outOfCombatSinceMs;
  if(!Number.isFinite(since)||since===undefined||nowMs<=since)return state;
  const elapsedSeconds=Math.min(offlineCapSeconds(state),Math.max(0,(nowMs-since)/1000));
  const gained=Math.floor(maxHp*OUT_OF_COMBAT_REGEN_FRACTION_PER_MINUTE*(1+effectGems.recovery)*setCombat.recoveryMultiplier*(elapsedSeconds/60));
  if(gained<=0)return state;
  const nextHp=Math.min(maxHp,currentHp+gained);
  return {...state,character:{...state.character,currentHp:nextHp},outOfCombatSinceMs:nextHp>=maxHp?undefined:since};
}

export function startCombat(state:GameState,monsterId:string,nowMs:number,combatTacticId:CombatTacticId='balanced',huntGoalId:HuntGoalId='open'):GameState{
  state=settleOutOfCombatRecovery(finishClassDrills(state,nowMs),nowMs);
  if(!state.character)throw new Error('Create a character first');
  const m=MONSTERS.find(x=>x.id===monsterId);if(!m)throw new Error('Unknown monster');
  if(!state.unlockedMonsterIds.includes(monsterId))throw new Error('Monster not unlocked');
  if(m.boss)throw new Error('Bosses use challengeFallenKnight');
  if(zoneIdForTarget(monsterId)!==currentRegionId(state))throw new Error(`Travel to ${m.zone} before fighting ${m.name}`);
  return {...state,outOfCombatSinceMs:undefined,character:{...state.character,activityQueuePausedReason:undefined},activity:{kind:'combat',targetId:monsterId,combatTacticId:normalizeCombatTactic(combatTacticId),...(huntGoalSnapshot(normalizeHuntGoalId(huntGoalId))?{huntGoal:huntGoalSnapshot(normalizeHuntGoalId(huntGoalId))}:{}),sessionKills:0,sessionChampions:0,startedAtMs:nowMs,lastClaimAtMs:nowMs,classFocus:normalizeTrainingFocus(state.character.trainingFocus),classTrainingSnapshot:{faithBlessingId:selectedFaithBlessing(state)?.id},environment:captureActivityEnvironment(monsterId,nowMs)}}
}

function tryStartNextQueuedActivity(state:GameState,nowMs:number,throwOnFailure=false,index=0):GameState{
 if(!state.character)throw new Error('Create a character first.');
 if(state.activity)throw new Error('Stop the current activity before starting the queue.');
 const queue=normalizeActivityQueue(state.character.activityQueue,activityQueueCapacity(state)),next=queue[index];
 if(!next)throw new Error('Action queue is empty.');
 try{
  const readiness=queuedActivityReadiness(state,next);
  if(!readiness.ready)throw new Error(readiness.blocker);
  const started=next.kind==='combat'
   ?startCombat(state,next.targetId,nowMs,next.combatTacticId??'balanced',next.huntGoalId??'open')
   :startGathering(state,next.targetId,nowMs);
  if(next.kind==='combat'&&state.character.activityQueueCombatRecovery){
   const firstCycle=combatRuntimeDetails(started,next.targetId).killCycleSeconds;
   if(simulateCombat(started,next.targetId,firstCycle).stoppedReason)throw new Error('Recover more health before resuming queued combat.');
  }
  return {...started,activity:{...started.activity!,queueManaged:true,queueGoal:next.goal},character:{...started.character!,activityQueue:queue.filter((_,i)=>i!==index),activityQueuePausedReason:undefined,activityQueueCombatRecovery:next.kind==='combat'?undefined:state.character.activityQueueCombatRecovery}};
 }catch(error){
  const reason=error instanceof Error?error.message:'Queued action could not start.';
  if(throwOnFailure)throw new Error(reason);
  return {...state,character:{...state.character,activityQueue:queue,activityQueuePausedReason:reason}};
 }
}
export function startNextQueuedActivity(state:GameState,nowMs:number){
 if(state.activity?.queueGoalCompletedAtMs!==undefined&&state.activity.kind!=='combat'&&state.character?.activityQueueCombatRecovery){
  state=claimActivity(state,nowMs).state;
  state={...state,activity:null};
 }
 return tryStartNextQueuedActivity(state,nowMs,true);
}
function continueCompletedQueueActivity(state:GameState,nowMs:number,source:ActiveActivity,reward:RewardBundle){
 return {...state,outOfCombatSinceMs:undefined,activity:{...source,lastClaimAtMs:nowMs,queueGoalCompletedAtMs:source.queueGoalCompletedAtMs??nowMs,progressFraction:reward.nextProgressFraction,sessionKills:(source.sessionKills??0)+(source.kind==='combat'?reward.kills:0),sessionChampions:(source.sessionChampions??0)+(reward.championEncounters?.count??0)}};
}
function autoAdvanceActivityQueue(state:GameState,nowMs:number,source:ActiveActivity,reward:RewardBundle){
 if(!state.character)return state;
 if(!normalizeActivityQueue(state.character.activityQueue,activityQueueCapacity(state)).length){
  if(!source.queueManaged)return state;
  return continueCompletedQueueActivity(state,nowMs,source,reward);
 }
 const next=tryStartNextQueuedActivity(state,nowMs,false);
 if(next.activity||!state.character.activityQueueCombatRecovery)return next;
 const safeIndex=state.character.activityQueue?.findIndex(entry=>entry.kind==='gathering'&&queuedActivityReadiness(state,entry).ready)??-1;
 if(safeIndex>=0)return tryStartNextQueuedActivity(state,nowMs,false,safeIndex);
 return source.kind!=='combat'?continueCompletedQueueActivity(next,nowMs,source,reward):next;
}
function recoverCombatQueue(state:GameState,nowMs:number,reason:string){
 if(!state.character)return state;
 const rule=activeIdleRuleForState(state);
 const minimumFood=Math.max(state.settings.stopCombatWhenOutOfFood||rule?.stopIfOutOfFood?1:0,...(rule?.conditions.filter(row=>row.enabled&&row.kind==='food_below').map(row=>row.value+1)??[]));
 state={...state,character:{...state.character,activityQueueCombatRecovery:{needsHealing:reason.toLowerCase().includes('injured'),minimumFood}}};
 const queue=normalizeActivityQueue(state.character!.activityQueue,activityQueueCapacity(state));
 const safeIndex=queue.findIndex(entry=>entry.kind==='gathering'&&queuedActivityReadiness(state,entry).ready);
 return safeIndex>=0?tryStartNextQueuedActivity(state,nowMs,false,safeIndex):pauseActivityQueue(state,reason);
}
function pauseActivityQueue(state:GameState,reason:string){
 if(!state.character||!normalizeActivityQueue(state.character.activityQueue,activityQueueCapacity(state)).length)return state;
 return {...state,character:{...state.character,activityQueuePausedReason:reason}};
}

/** Travel is instantaneous for now, but always settles and stops the prior activity. */
export function travelToRegion(state:GameState,regionId:string,nowMs:number){
  const zone=WORLD_ZONES.find(entry=>entry.id===regionId);
  if(!zone)throw new Error('Unknown region');
  if(worldZoneInDevelopment(zone))throw new Error(`${zone.name} is still in development`);
  if(!state.character||regionTravelAvailability(state,zone)!=='available')throw new Error(regionTravelLockReason(state,zone)??`Cannot travel to ${zone.name} yet`);
  if(currentRegionId(state)===zone.id)return {state,reward:{xp:0,gold:0,items:[],kills:0,elapsedSeconds:0} as RewardBundle};
  const settled=claimActivity(state,nowMs);
  return {state:{...settled.state,currentRegionId:zone.id,activity:null,outOfCombatSinceMs:nowMs},reward:settled.reward};
}

export function stackItems(existing:ItemStack[],incoming:ItemStack[]):ItemStack[]{const m=new Map<string,number>();for(const s of existing)m.set(s.itemId,(m.get(s.itemId)||0)+s.quantity);for(const s of incoming)m.set(s.itemId,(m.get(s.itemId)||0)+s.quantity);return [...m.entries()].filter(([,q])=>q>0).map(([itemId,quantity])=>({itemId,quantity}));}

export function usedSlots(stacks:ItemStack[]){return stacks.filter(s=>s.quantity>0).length;}
function itemStackCap(itemId:string){const d=itemDef(itemId);return d.type==='gear'||d.type==='tool'?1:9999;}
function addBounded(stacks:ItemStack[],capacity:number,incoming:ItemStack[]){
  let next=stacks.map(s=>({...s}));const overflow:ItemStack[]=[];
  for(const inc of incoming){
    let remaining=inc.quantity;
    const cap=itemStackCap(inc.itemId);
    let existing=next.find(s=>s.itemId===inc.itemId);
    if(existing){
      const room=Math.max(0,cap-existing.quantity);const add=Math.min(room,remaining);existing.quantity+=add;remaining-=add;
    }
    while(remaining>0 && usedSlots(next)<capacity){
      const add=Math.min(cap,remaining);next.push({itemId:inc.itemId,quantity:add});remaining-=add;
      // Current prototype identifies stacks by itemId, so equipment duplicates are routed to overflow rather than pretending they are one stack.
      if(cap===1)break;
    }
    if(remaining>0)overflow.push({itemId:inc.itemId,quantity:remaining});
  }
  return {stacks:next,overflow};
}
function routeRewards(state:GameState,incoming:ItemStack[],nowMs:number){
  const inv=addBounded(state.inventory.stacks,entitlementStorageCapacity(state,'inventory'),incoming);
  const bank=addBounded(state.bank.stacks,entitlementStorageCapacity(state,'bank'),inv.overflow);
  const overflow=stackItems(state.overflow.stacks,bank.overflow);
  return {
    inventory:{...state.inventory,stacks:inv.stacks},
    bank:{...state.bank,stacks:bank.stacks},
    overflow:{stacks:overflow,expiresAtMs:overflow.length?Math.max(state.overflow.expiresAtMs||0,nowMs+72*60*60*1000):null}
  };
}

function consume(stacks:ItemStack[],itemId:string,quantity:number){const f=stacks.find(s=>s.itemId===itemId);if(!f||f.quantity<quantity)throw new Error('Not enough items');return stacks.map(s=>s.itemId===itemId?{...s,quantity:s.quantity-quantity}:s).filter(s=>s.quantity>0)}
function stackQty(stacks:ItemStack[],itemId?:string){if(!itemId)return 0;return stacks.find(s=>s.itemId===itemId)?.quantity||0;}

export function regionalMonsterPressureBand(monsterId:string):RegionalMonsterPressureBand{
 const m=MONSTERS.find(row=>row.id===monsterId);if(!m||m.boss)return 'hard';
 const peers=MONSTERS.filter(row=>!row.boss&&row.zone===m.zone).sort((a,b)=>a.level-b.level||a.attack-b.attack);
 if(peers.length<=1)return 'standard';
 const index=peers.findIndex(row=>row.id===monsterId);
 if(index<=Math.floor((peers.length-1)*.25))return 'entry';
 if(index>=Math.ceil((peers.length-1)*.75))return 'hard';
 return 'standard';
}

function combatRuntimeDetails(state:GameState,monsterId:string,nowMs=Date.now()){
  const c=state.character!,baseMonster=MONSTERS.find(x=>x.id===monsterId)!;
  const m=baseMonster,stats=effectiveStats(state),modifiers=characterPermanentMultipliers(state),companion=companionCombatContribution(state);
  const style=classCombatStyle(c.classId),tactic=combatTactic(state.activity?.kind==='combat'?state.activity.combatTacticId:undefined);
  const environment=state.activity?environmentEffectForActivity(state.activity).effect:undefined;
  const effectGems=equippedEffectGemBonuses(state),baseCritChance=CLASSES.find(def=>def.id===c.classId)?.role==='Damage'?.10:.05,setCombat=equipmentSetCombatModifiers(state,baseCritChance,.84);
  const secondary=regionalSecondaryExchange(stats,m,baseCritChance);
  const boostedDefense=Math.max(1,Math.round(stats.defense*modifiers.combatPowerMultiplier));
  const bossPowerMultiplier=m.boss?1+effectGems.boss_power:1;
  const boostedPower=Math.max(1,Math.round(stats.power*modifiers.combatPowerMultiplier*bossPowerMultiplier));
  const expected=(m.attack*1.2+m.defense*.8+m.level*2.2)*COMBAT_EXPECTED_SCALE;
  const setOutput=secondary.playerOutputMultiplier*setCombat.penetrationMultiplier;
  const combatCandy=eventCandyUtilityMultiplier(state,nowMs,'combat');
  const speed=Math.max(COMBAT_SPEED_MIN,Math.min(COMBAT_SPEED_MAX,boostedPower/Math.max(1,expected)))*style.speedMultiplier*tactic.speedMultiplier*modifiers.combatSpeedMultiplier*companion.outputMultiplier*(1+monsterMastery(state,monsterId).damageBonus)*(1+effectGems.combat_speed)*setOutput*combatCandy;
  const killCycleSeconds=m.secondsPerKill*COMBAT_TIME_SCALE*(environment?.actionTimeMultiplier??1)/speed;
  return {c,m,stats,modifiers,companion,style,tactic,environment,effectGems,setCombat,secondary,boostedDefense,killCycleSeconds};
}

/** Shared ordinary-hunt damage; fractional HP preserves small defensive bonuses. */
function combatEncounterDamage(runtime:ReturnType<typeof combatRuntimeDetails>,champion=false){
 const {m,c,stats,modifiers,companion,style,tactic,effectGems,setCombat,secondary,boostedDefense,killCycleSeconds}=runtime;
 const raw=Math.max(1,Math.round(m.attack*COMBAT_MONSTER_DAMAGE_SCALE)-Math.floor(boostedDefense*.58));
 const regionalPressure=(REGIONAL_COMBAT_PRESSURE[m.zone]??1)*REGIONAL_MONSTER_PRESSURE_MULTIPLIER[regionalMonsterPressureBand(m.id)];
 const damage=Math.max(.1,(raw*.48+m.level*.16)*(REGIONAL_HUNT_DAMAGE_TUNING[m.zone]??1)*regionalPressure*secondary.incomingPressureMultiplier*style.damageTakenMultiplier*tactic.damageTakenMultiplier*(champion?CHAMPION_DAMAGE_MULTIPLIER:1)*modifiers.incomingDamageMultiplier*companion.incomingDamageMultiplier*(1-effectGems.damage_reduction)*Math.max(.5,1-setCombat.stats.ward)*(c.preparation?preparationEffects(c.preparation).damage:1));
 const healing=stats.hp*companion.directHealingPctPerHour*killCycleSeconds/3600;
 const floor=Math.max(REGIONAL_MIN_ATTRITION_HP_PER_HOUR[m.zone]??0,stats.hp*MIN_UNHEALED_HP_FRACTION_PER_HOUR)*killCycleSeconds/3600;
 const incoming=Math.max(floor,damage);
 return {damage:incoming,healing,net:incoming-healing};
}

export function combatSustainProjection(state:GameState,monsterId:string,hours=1){
 if(!state.character)return undefined;
 const runtime=combatRuntimeDetails(state,monsterId),foodId=state.character.equippedFoodId,food=foodId?itemDef(foodId):undefined;
 const exchange=combatEncounterDamage(runtime),damagePerKill=exchange.damage;
 const killsPerHour=3600/Math.max(.1,runtime.killCycleSeconds),companionHealingPerHour=runtime.stats.hp*runtime.companion.directHealingPctPerHour;
 const recoveryPerKill=0,netDamagePerKill=exchange.net;
 const healingPerFood=food?.heal?Math.max(1,Math.ceil(food.heal*runtime.modifiers.healingEffectivenessMultiplier)):0;
 const netHpLossPerHour=netDamagePerKill*killsPerHour;
 const foodPerHour=healingPerFood>0?Math.max(0,netHpLossPerHour)/healingPerFood:netDamagePerKill>0?Infinity:0;
 const target=REGIONAL_FOOD_SUSTAIN_TARGETS[runtime.m.zone];
 return {monsterId,region:runtime.m.zone,killCycleSeconds:runtime.killCycleSeconds,killsPerHour,damagePerKill,recoveryPerKill,companionHealingPerHour,netDamagePerKill,netHpLossPerHour,estimatedUnfedHours:netHpLossPerHour>0?Math.max(0,Math.min(runtime.stats.hp,state.character.currentHp))/netHpLossPerHour:Infinity,foodId,healingPerFood,foodPerHour,projectedFood:foodPerHour*hours,target};
}

export function activeCombatRuntimeProjection(state:GameState){
  if(!state.character||state.activity?.kind!=='combat')return undefined;
  const runtime=combatRuntimeDetails(state,state.activity.targetId);
  const effect=runtime.environment;
  const killsPerHour=3600/Math.max(.1,runtime.killCycleSeconds);
  const xpPerKill=runtime.m.xp*(effect?.xpMultiplier??1)*runtime.modifiers.characterXpMultiplier;
  const goldPerKill=runtime.m.gold*(effect?.goldMultiplier??1)*runtime.modifiers.goldMultiplier;
  return {
    killCycleSeconds:runtime.killCycleSeconds,
    killsPerHour,
    xpPerHour:killsPerHour*xpPerKill,
    goldPerHour:killsPerHour*goldPerKill,
    enemySecondary:runtime.secondary.enemy,
    playerHitChance:runtime.secondary.playerHitChance,
    enemyHitChance:runtime.secondary.enemyHitChance,
    incomingPressureMultiplier:runtime.secondary.incomingPressureMultiplier,
  };
}

function simulateCombat(state:GameState,monsterId:string,elapsed:number,nowMs=Date.now()){
 const c=state.character!,startsAtMs=state.activity?.lastClaimAtMs??nowMs-elapsed*1000;
 const unprepared={...state,character:{...c,preparation:undefined}},plain=combatRuntimeDetails(unprepared,monsterId,startsAtMs),prepared=combatRuntimeDetails(state,monsterId,startsAtMs);
 const startCandy=eventCandyUtilityMultiplier(state,startsAtMs,'combat');
 const timeline=combatTimeline({startsAtMs,elapsedSeconds:elapsed,progressFraction:state.activity?.progressFraction??0,preparationEncounters:c.preparation?.remainingEncounters??0,cycleSeconds:plain.killCycleSeconds*startCandy,preparedCycleSeconds:prepared.killCycleSeconds*startCandy,candy:eventCandyWindow(state,'combat')});
 const food=c.equippedFoodId?itemDef(c.equippedFoodId):undefined,threshold=Math.max(10,Math.min(90,state.settings.autoEatThresholdPct))/100;
 let foodLeft=stackQty(state.inventory.stacks,c.equippedFoodId),foodConsumed=0,hp=Math.min(c.currentHp??prepared.stats.hp,prepared.stats.hp),championKills=0,stoppedReason='',preparationEncounters=0,qualifyingActivitySeconds=elapsed;
 const completed:Array<{atMs:number;candy:boolean}>=[];
 for(const encounter of timeline.encounters){
  const runtime={...(encounter.prepared?prepared:plain),killCycleSeconds:encounter.cycleSeconds};
  const champion=isChampionEncounter(c.id,state.activity?.lastClaimAtMs??0,monsterId,completed.length),exchange=combatEncounterDamage(runtime,champion);
  if(encounter.prepared)preparationEncounters++;
  // A healer can offset incoming pressure, but cannot rescue a lethal hit.
  hp=hp-exchange.damage<=0?0:Math.min(runtime.stats.hp,hp-exchange.net);
  while(food?.heal&&foodLeft>0&&hp>0&&hp/runtime.stats.hp<=threshold){hp=Math.min(runtime.stats.hp,hp+Math.max(1,Math.ceil(food.heal*runtime.modifiers.healingEffectivenessMultiplier)));foodLeft--;foodConsumed++;}
  if(hp<=0){hp=1;stoppedReason=food&&state.settings.stopCombatWhenOutOfFood?'Out of food / too injured':'Too injured';qualifyingActivitySeconds=(encounter.atMs-startsAtMs)/1000;break;}
  completed.push({atMs:encounter.atMs,candy:encounter.candy});if(champion)championKills++;
 }
 return {kills:completed.length,completed,championKills,foodConsumed,endHp:hp,stoppedReason,qualifyingActivitySeconds,nextProgressFraction:stoppedReason?0:timeline.nextProgressFraction,preparationEncounters};
}

function previewStandardActivityRewardRaw(state:GameState,effectiveNowMs:number):RewardBundle{
  if(!state.activity||!state.character)return {xp:0,gold:0,items:[],kills:0,elapsedSeconds:0};
  const elapsed=Math.min(offlineCapSeconds(state),Math.max(0,Math.floor((effectiveNowMs-state.activity.lastClaimAtMs)/1000)));
  const multipliers=characterPermanentMultipliers(state);
  if(state.activity.kind!=='combat'){
    if(state.activity.kind==='exploration'){
      const route=explorationRoute(state.activity.targetId);if(!route)return {xp:0,gold:0,items:[],kills:0,elapsedSeconds:elapsed};
      const actions=Math.floor(elapsed/route.seconds),candy=eventCandyWindow(state,'skill');
      let boostedActions=0;for(let i=1;i<=actions;i++){const at=state.activity.lastClaimAtMs+i*route.seconds*1000;if(candy&&at>candy.startsAtMs&&at<=candy.endsAtMs)boostedActions++;}
      return {xp:Math.floor((actions+.1*boostedActions)*route.xp*characterPermanentMultipliers(state).skillXpMultiplier),gold:0,items:[],kills:actions,elapsedSeconds:elapsed,explorationDiscoveries:actions&&route.unlockMonsterId?[route.unlockMonsterId]:[]};
    }
    const g=[...GATHERING,...HERB_NODES].find(x=>x.id===state.activity!.targetId);if(!g)return {xp:0,gold:0,items:[],kills:0,elapsedSeconds:elapsed};
    const effect=environmentEffectForActivity(state.activity).effect;
    const pacing=gatheringPacing(state,g),mastery=professionMasteryMultipliers(g.id,state.account.professionMasteryByAction?.[g.id]),affinity=activeSkillAffinity(state,g.skillId);
    const herbLevel=state.skills.find(row=>row.skillId==='herbalism')?.level??1,method=g.skillId==='herbalism'?herbalismMethod(state.activity.herbalismMethodId??state.character.herbalismMethodId,herbLevel):undefined;
    const specialtySpeed=g.skillId==='fishing'?multipliers.fishingSpeedMultiplier:g.skillId==='herbalism'?multipliers.herbalismSpeedMultiplier:1;
    const effectiveActionSeconds=g.seconds*GATHER_TIME_SCALE*pacing.timeMultiplier*effect.actionTimeMultiplier*(method?.actionTimeMultiplier??1)/(multipliers.gatheringSpeedMultiplier*specialtySpeed*mastery.speed*affinity.speedMultiplier);
    const elapsedMs=Math.min(offlineCapSeconds(state)*1000,Math.max(0,effectiveNowMs-state.activity.lastClaimAtMs));
    const timeline=combatTimeline({startsAtMs:state.activity.lastClaimAtMs,elapsedSeconds:elapsedMs/1000,progressFraction:state.activity.progressFraction??0,preparationEncounters:0,cycleSeconds:effectiveActionSeconds,preparedCycleSeconds:effectiveActionSeconds,candy:eventCandyWindow(state,'skill')});
    const actions=timeline.encounters.length,candyActions=timeline.encounters.filter(row=>row.candy).length;
    const candyXpMultiplier=actions?1+.1*candyActions/actions:1;
    const seed=`${state.character.id}:${state.activity.lastClaimAtMs}:${g.id}:yield`;
    let baseQuantity=0;
    for(let i=0;i<actions;i++)baseQuantity+=g.min+Math.floor(random01(seed,i)*(g.max-g.min+1));
    const quantityFloat=baseQuantity*effect.itemMultiplier*(method?.yieldMultiplier??1)*multipliers.gatheringYieldMultiplier*mastery.yield+(state.rewardRemainders?.[g.itemId]??0);
    const quantity=Math.floor(quantityFloat);
    const skill=state.skills.find(x=>x.skillId===g.skillId);
    const xpKey=affinityXpRemainderKey(state.character.id,g.skillId);
    const gain=settleAffinitySkillXp(actions*g.xp*effect.xpMultiplier*(method?.xpMultiplier??1)*multipliers.skillXpMultiplier*mastery.xp*affinity.xpMultiplier*candyXpMultiplier,state.rewardRemainders?.[xpKey],totalXpAtLevel(100)-(skill?.xp??0));
    const xp=gain.xp;
    const items:ItemStack[]=quantity?[{itemId:g.itemId,quantity}]:[];
    if(g.skillId==='herbalism'){
      const essence=HERBALISM_ESSENCE_BY_ZONE[g.zoneId];
      if(essence&&actions>0){
        const rareChance=Math.min(1,essence.baseChance*(method?.rareFindMultiplier??1)*herbalismInsightMultiplier(herbLevel)*effect.dropChanceMultiplier*multipliers.dropChanceMultiplier);
        const rareSeed=`${state.character.id}:${state.activity.lastClaimAtMs}:${g.id}:botanical-essence`;
        let rareQuantity=0;for(let i=0;i<actions;i++)if(random01(rareSeed,i)<rareChance)rareQuantity++;
        if(rareQuantity)items.push({itemId:essence.itemId,quantity:rareQuantity});
      }
    }
    const reward:RewardBundle={xp,gold:0,items,kills:actions,elapsedSeconds:elapsed,nextProgressFraction:timeline.nextProgressFraction,nextRewardRemainders:{...(state.rewardRemainders??{}),[xpKey]:gain.remainder,[g.itemId]:Math.max(0,quantityFloat-quantity)}};
    return {...reward,...gatheringEventRewards(state,reward.elapsedSeconds)};
  }
  const m=MONSTERS.find(x=>x.id===state.activity!.targetId);if(!m)throw new Error('Unknown monster');
  if(m.boss)return {xp:0,gold:0,items:[],kills:0,elapsedSeconds:elapsed};
  const combatElapsed=Math.min(offlineCapSeconds(state),Math.max(0,(effectiveNowMs-state.activity.lastClaimAtMs)/1000)),sim=simulateCombat(state,m.id,combatElapsed,effectiveNowMs);const items:ItemStack[]=[];
  const effect=environmentEffectForActivity(state.activity).effect;
  for(const drop of m.drops){const dropDef=itemDef(drop.itemId),blueprintKnowledge=dropDef.knowledgeUnlockId;if(blueprintKnowledge&&((state.account.unlockedKnowledgeIds??[]).includes(blueprintKnowledge)||combinedQty(state,drop.itemId)+(state.overflow.stacks.find(stack=>stack.itemId===drop.itemId)?.quantity??0)>0))continue;let qty=0;const chance=Math.min(1,drop.chance*effect.dropChanceMultiplier*multipliers.dropChanceMultiplier);const seed=`${state.character.id}:${state.activity.lastClaimAtMs}:${m.id}:${drop.itemId}`;for(let i=0;i<sim.kills;i++){if(random01(seed,i)>=chance)continue;qty+=drop.min+Math.floor(random01(seed,i+50000)*(drop.max-drop.min+1));if(blueprintKnowledge){qty=1;break;}}if(qty>0)items.push({itemId:drop.itemId,quantity:qty});}
  const candyKills=sim.completed.filter(row=>row.candy).length,combatCandy=sim.kills?1+.1*candyKills/sim.kills:1;
  const classGain=awardCombatClassXp(state.character,sim.kills,m.xp*effect.xpMultiplier*multipliers.skillXpMultiplier*combatCandy,state.activity.classFocus);
  const mastery=monsterMastery(state,m.id),materialRemainders={...state.character.masteryMaterialRemainders};
  if(mastery.materialBonus)for(const item of items){if(itemDef(item.itemId).type!=='material')continue;const extra=item.quantity*mastery.materialBonus+(materialRemainders[item.itemId]??0),whole=Math.floor(extra+1e-9);item.quantity+=whole;materialRemainders[item.itemId]=Math.max(0,extra-whole);}
  const rewardItems=items,champion=championBonus(Math.floor(m.xp*effect.xpMultiplier*multipliers.characterXpMultiplier),Math.floor(m.gold*effect.goldMultiplier*multipliers.goldMultiplier),sim.championKills);
  const baseXpPerKill=m.xp*effect.xpMultiplier*multipliers.characterXpMultiplier*combatCandy,baseGoldPerKill=m.gold*effect.goldMultiplier*multipliers.goldMultiplier,sessionKills=state.activity.sessionKills??0;
  const explorationSkill=state.skills.find(skill=>skill.skillId==='exploration');
  const explorationRaw=sim.kills*Math.max(1,Math.ceil(m.level/12));
  const explorationXp=Math.min(Math.max(0,totalXpAtLevel(100)-(explorationSkill?.xp??0)),explorationRaw);
  let momentumXp=0;
  for(let start=0;start<sim.completed.length;){let end=start+1;while(end<sim.completed.length&&sim.completed[end].candy===sim.completed[start].candy)end++;momentumXp+=huntMomentumBonus(m.xp*effect.xpMultiplier*multipliers.characterXpMultiplier*(sim.completed[start].candy?1.1:1),sessionKills+start,end-start);start=end;}
  const momentumGold=huntMomentumBonus(baseGoldPerKill,sessionKills,sim.kills);
  const reward:RewardBundle={combatEffort:{startsAtMs:state.activity.lastClaimAtMs,endsAtMs:state.activity.lastClaimAtMs+sim.qualifyingActivitySeconds*1000},classSkillXp:classGain.awards,explorationXp,xp:Math.floor(sim.kills*baseXpPerKill)+momentumXp+champion.xp,gold:Math.floor(sim.kills*baseGoldPerKill)+momentumGold+champion.gold,items:rewardItems,kills:sim.kills,elapsedSeconds:elapsed,qualifyingActivitySeconds:sim.qualifyingActivitySeconds,preparationEncounters:sim.preparationEncounters,foodConsumed:sim.foodConsumed,endHp:sim.endHp,stoppedReason:sim.stoppedReason,nextProgressFraction:sim.nextProgressFraction,...(sim.championKills>0?{championEncounters:{count:sim.championKills,bonusXp:champion.xp,bonusGold:champion.gold}}:{})};
  return {...reward,masteryMaterialRemainders:materialRemainders,...timedEventRewards(state,'combat',sim.completed.map(row=>row.atMs))};
}
function previewStandardActivityRewardWithSupplies(state:GameState,effectiveNowMs:number){
  const base=previewStandardActivityRewardRaw(state,effectiveNowMs),mode=dailySupplyActivityMode(state.activity);
  return mode?previewDailySupplyTimedReward(state,base,mode):{reward:base,consumedSeconds:0,nextRemainders:{}};
}

function activeIdleRuleForState(state:GameState):IdleRuleSet|undefined{
  const character=state.character;if(!character?.activeIdleRuleIdV40)return undefined;
  let rule=character.idleRulesV40?.find(rule=>rule.id===character.activeIdleRuleIdV40);
  if(rule&&state.activity?.queueManaged&&state.activity.kind!=='combat')rule={...rule,stopIfOutOfFood:false,conditions:rule.conditions.filter(row=>row.kind!=='food_below')};
  if(rule&&(state.activity?.queueGoal||state.activity?.queueGoalCompletedAtMs!==undefined))return {...rule,conditions:rule.conditions.filter(row=>row.kind==='food_below'||row.kind==='free_slots_below')};
  if(rule&&state.activity?.queueManaged)return {...rule,conditions:rule.conditions.filter(row=>row.kind==='food_below'||row.kind==='free_slots_below'||activityCanAdvanceCondition(state,row))};
  return rule;
}
function projectedStoredQuantities(state:GameState,reward:RewardBundle){
  const quantities:Record<string,number>={};
  for(const stack of [...state.inventory.stacks,...state.bank.stacks,...state.overflow.stacks])quantities[stack.itemId]=(quantities[stack.itemId]??0)+stack.quantity;
  for(const stack of reward.items)quantities[stack.itemId]=(quantities[stack.itemId]??0)+stack.quantity;
  return quantities;
}
function projectedIdleContext(state:GameState,reward:RewardBundle,settleAtMs:number):IdleEvaluationContext{
  const activity=state.activity!;
  const skillLevels=Object.fromEntries(state.skills.map(row=>[row.skillId,row.level])) as Record<string,number>;
  if(activity.kind!=='combat'&&activity.kind!=='exploration'){
    const gathering=[...GATHERING,...HERB_NODES].find(row=>row.id===activity.targetId);
    const skillId=gathering?.skillId??activity.kind;
    const skill=state.skills.find(row=>row.skillId===skillId);
    if(skill)skillLevels[skillId]=levelFromXp(skill.xp+reward.xp);
  }else if(activity.kind==='exploration'){
    const skill=state.skills.find(row=>row.skillId==='exploration');if(skill)skillLevels.exploration=levelFromXp(skill.xp+reward.xp);
  }
  const monsterKills={...(state.character?.monsterMasteryPoints??{})};
  if(activity.kind==='combat')monsterKills[activity.targetId]=(monsterKills[activity.targetId]??0)+reward.kills;
  const weeklyOrderProgress:Record<string,number>={},activityRegionId=zoneIdForTarget(activity.targetId);
  for(const order of state.account.weeklyOrders?.orders??[]){
    let progress=order.progress;
    const expectedKind=activity.kind==='combat'?'hunt':'profession',direct=order.kind===expectedKind&&order.targetId===activity.targetId;
    const regional=order.kind==='regional'&&order.targetId===activityRegionId&&(activity.kind==='combat'||['mining','woodcutting','fishing','herbalism'].includes(activity.kind));
    if(direct||regional)progress=Math.min(order.target,progress+reward.kills);
    weeklyOrderProgress[order.id]=progress;
  }
  const foodRemaining=Math.max(0,stackQty(state.inventory.stacks,state.character?.equippedFoodId)-(reward.foodConsumed??0));
  const routed=routeRewards(state,reward.items,settleAtMs);
  const beforeOverflow=state.overflow.stacks.reduce((sum,row)=>sum+row.quantity,0),afterOverflow=routed.overflow.stacks.reduce((sum,row)=>sum+row.quantity,0);
  return {
    itemQuantities:projectedStoredQuantities(state,reward),skillLevels,monsterKills,sessionKills:(activity.sessionKills??0)+(activity.kind==='combat'?reward.kills:0),championDefeats:(activity.sessionChampions??0)+(activity.kind==='combat'?(reward.championEncounters?.count??0):0),weeklyOrderProgress,foodRemaining,
    freeStorageSlots:Math.max(0,entitlementStorageCapacity(state,'inventory')-usedSlots(routed.inventory.stacks))+Math.max(0,entitlementStorageCapacity(state,'bank')-usedSlots(routed.bank.stacks)),
    elapsedSeconds:Math.max(0,Math.floor((settleAtMs-activity.startedAtMs)/1000)),projectedRewardFits:afterOverflow<=beforeOverflow
  };
}
function idleRuleSettlementWindow(state:GameState,nowMs:number){
  const rule=activeIdleRuleForState(state),activity=state.activity;
  if(!activity||!state.character)return {settleAtMs:nowMs,shouldStop:false as const,safety:false,combatRecovery:false};
  const node=[...GATHERING,...HERB_NODES].find(row=>row.id===activity.targetId),queueGoal=activity.queueGoal;
  const condition=queueGoal?{id:'queue-goal',kind:queueGoal.kind,targetId:queueGoal.kind==='item_quantity'?node?.itemId:queueGoal.kind==='skill_level'?node?.skillId:undefined,value:queueGoal.value,enabled:true}:activity.kind==='combat'&&activity.huntGoal?{id:'hunt-goal-condition',kind:activity.huntGoal.kind,targetId:activity.targetId,value:activity.huntGoal.value,enabled:true}:undefined;
  const goalRule=condition&&activity.queueGoalCompletedAtMs===undefined?{id:'activity-goal',characterId:state.character.id,name:'Activity goal',conditions:[condition],stopIfOutOfFood:false,stopIfRewardsWouldOverflow:false,finishCurrentCycle:true} as IdleRuleSet:undefined;
  if(!rule&&!goalRule&&!activity.queueManaged&&!state.character.activityQueue?.length)return {settleAtMs:nowMs,shouldStop:false as const,safety:false,combatRecovery:false};
  const capAtMs=activity.lastClaimAtMs+offlineCapSeconds(state)*1000,upper=Math.max(activity.lastClaimAtMs,Math.min(nowMs,capAtMs));
  const evaluateAt=(time:number)=>{
    const reward=previewStandardActivityRewardWithSupplies(state,time).reward,ctx=projectedIdleContext(state,reward,time),saved=rule?evaluateIdleRuleSet(rule,ctx):{shouldStop:false,safety:false},goal=goalRule?evaluateIdleRuleSet(goalRule,ctx):{shouldStop:false,safety:false};
    const evaluation=reward.stoppedReason?{shouldStop:true,safety:true,reason:reward.stoppedReason}:saved.safety?saved:goal.shouldStop?{...goal,reason:queueGoal?'Queue goal reached.':`Hunt goal reached: ${activity.huntGoal?.label??'target'}.`}:saved;
    const combatRecovery=activity.kind==='combat'&&(!!reward.stoppedReason?.toLowerCase().includes('injured')||saved.safety&&(saved.reason==='Food reserve is empty.'||rule?.conditions.some(row=>row.id===saved.conditionId&&row.kind==='food_below')===true));
    return {reward,evaluation,combatRecovery};
  };
  const upperResult=evaluateAt(upper);
  if(!upperResult.evaluation.shouldStop)return {settleAtMs:upper,shouldStop:false as const,safety:false,combatRecovery:false};
  const atStart=evaluateAt(activity.lastClaimAtMs);
  if(atStart.evaluation.shouldStop)return {settleAtMs:activity.lastClaimAtMs,shouldStop:true as const,safety:atStart.evaluation.safety,combatRecovery:atStart.combatRecovery,reason:atStart.evaluation.reason??'Idle Rule target already reached.'};
  let low=activity.lastClaimAtMs,high=upper;
  while(high-low>1){const mid=low+Math.floor((high-low)/2);if(evaluateAt(mid).evaluation.shouldStop)high=mid;else low=mid;}
  let settleAtMs=high;let final=evaluateAt(settleAtMs);
  if(final.evaluation.safety&&final.evaluation.reason==='Storage cannot safely accept the next reward.'&&settleAtMs>activity.lastClaimAtMs){
    settleAtMs=Math.max(activity.lastClaimAtMs,settleAtMs-1);
  }
  return {settleAtMs,shouldStop:true as const,safety:final.evaluation.safety,combatRecovery:final.combatRecovery,reason:final.evaluation.reason??'Configured Idle Rule target reached.'};
}

export function previewActivityReward(state:GameState,nowMs:number):RewardBundle{
  if(state.character?.classTraining)return settleClassDrills(state,nowMs,offlineCapSeconds(state)).reward;
  if(state.activity?.kind==='faith'){
    const settled=settleFaithPractice(state,nowMs,offlineCapSeconds(state));
    return previewDailySupplyTimedReward(state,settled.reward,'skill').reward;
  }
  if(state.activity?.kind==='alchemy'){
    const elapsed=Math.min(offlineCapSeconds(state),Math.max(0,(nowMs-state.activity.lastClaimAtMs)/1000)),raw=previewAlchemyReward(state,elapsed),base={...raw,...timedEventRewards(state,'crafting',raw.craftingCompletedAtMs??[])};
    return previewDailySupplyTimedReward(state,base,'crafting').reward;
  }
  if(state.activity?.kind==='processing'){
    const elapsed=Math.min(offlineCapSeconds(state),Math.max(0,(nowMs-state.activity.lastClaimAtMs)/1000)),raw=previewProcessingReward(state,elapsed),base={...raw,...timedEventRewards(state,'crafting',raw.craftingCompletedAtMs??[])};
    return previewDailySupplyTimedReward(state,base,'crafting').reward;
  }
  if(!state.activity||!state.character)return {xp:0,gold:0,items:[],kills:0,elapsedSeconds:0};
  const idleWindow=idleRuleSettlementWindow(state,nowMs),reward=previewStandardActivityRewardWithSupplies(state,idleWindow.settleAtMs).reward;
  return idleWindow.shouldStop&&!reward.stoppedReason?{...reward,stoppedReason:idleWindow.reason}:reward;
}

export function refreshQuests(state:GameState,lastCombatTarget?:string,lastKills=0):GameState{
  let quests=state.quests.map(q=>({...q}));
  if(lastCombatTarget&&lastKills>0){quests=quests.map(q=>{const d=QUESTS.find(x=>x.id===q.questId);return q.status==='active'&&d?.kind==='kills'&&d.targetId===lastCombatTarget?{...q,progress:Math.min(d.required,q.progress+lastKills)}:q})}
  quests=quests.map(q=>{
    const d=QUESTS.find(x=>x.id===q.questId);if(!d||q.status!=='active')return q;let progress=q.progress;
    if(d.kind==='item')progress=state.inventory.stacks.find(x=>x.itemId===d.targetId)?.quantity||0;
    if(d.kind==='equip')progress=Object.values(state.character?.equipment||{}).filter(Boolean).length;
    if(d.kind==='level')progress=state.character?.level||0;
    if(d.kind==='skillLevel')progress=Math.max(...state.skills.map(x=>x.level));
    if(d.kind==='boss')progress=state.defeatedBossIds.includes(d.targetId||'')?1:0;
    return {...q,progress:Math.min(d.required,progress),status:progress>=d.required?'complete':'active'};
  });
  return {...state,quests}
}
export function claimQuest(state:GameState,questId:string,nowMs=Date.now()):GameState{
  const q=state.quests.find(x=>x.questId===questId),d=QUESTS.find(x=>x.id===questId);
  if(!q||!d||q.status!=='complete'||!state.character)throw new Error('Quest not claimable');
  let next={...state,character:{...state.character,gold:state.character.gold+d.rewardGold},inventory:{...state.inventory,stacks:d.rewardItemId?stackItems(state.inventory.stacks,[{itemId:d.rewardItemId,quantity:d.rewardItemQty||1}]):state.inventory.stacks},quests:state.quests.map(x=>x.questId===questId?{...x,status:'claimed' as const}:x)} as GameState;
  const idx=QUESTS.findIndex(x=>x.id===questId),nextDef=QUESTS[idx+1];if(nextDef)next={...next,quests:next.quests.map(x=>x.questId===nextDef.id&&x.status==='locked'?{...x,status:'active' as const}:x)};
  return applyLocalBalanceSnapshot(reconcileCombatCompanionUnlocks(refreshQuests(next),nowMs),nowMs)
}
/** Offline contract claims are deterministic; online mode can replace this with the same server-authoritative contract ID. */
export function claimSeasonalContract(state:GameState,period:SeasonalPeriod,contractId:string,nowMs=Date.now()):GameState{
  if(!state.character)throw new Error('Create a character first');
  const contract=seasonalQuestBoard(state,period,new Date(nowMs)).find(entry=>entry.id===contractId);
  if(!contract)throw new Error('This contract has expired.');
  if((state.account.seasonalContractClaimIds??[]).includes(contract.id))throw new Error('This contract reward was already claimed.');
  if(contract.progress<contract.required)throw new Error('Complete the contract before claiming its cache.');
  const xp=state.character.xp+contract.rewardXp,level=characterLevelFromXp(xp);
  const routed=routeRewards(state,[{itemId:contract.rewardItemId,quantity:contract.rewardItemQty}],nowMs);
  const claimed=[...(state.account.seasonalContractClaimIds??[]),contract.id].slice(-120);
  return applyLocalBalanceSnapshot(refreshQuests({...state,...routed,character:{...state.character,xp,level,gold:state.character.gold+contract.rewardGold},account:{...state.account,seasonalContractClaimIds:claimed}} as GameState),nowMs);
}

export function claimActivity(state:GameState,nowMs:number):{state:GameState;reward:RewardBundle}{
 const source=state.activity;
 if(!source||(!source.queueManaged&&!state.character?.activityQueue?.length))return claimActivitySegment(state,nowMs);
 // All handoffs share the original offline allowance, even if progression increases it.
 const until=Math.max(source.lastClaimAtMs,Math.min(nowMs,source.lastClaimAtMs+offlineCapSeconds(state)*1000));
 const results:NonNullable<RewardBundle['activityResults']>=[];
 const limit=(state.character?.activityQueue?.length??0)+2;
 for(let index=0;index<limit&&state.activity;index++){
  const activity=state.activity,result=claimActivitySegment(state,until);
  results.push({activity,reward:result.reward,goalReached:!!result.reward.goalReached});
  state=result.state;
  const recoveredToGathering=activity.kind==='combat'&&state.activity&&state.activity.kind!=='combat';
  if(!state.activity||(!result.reward.goalReached&&!recoveredToGathering)||state.activity.lastClaimAtMs>=until)break;
 }
 const reward=combineActivityRewards(results);
 if(state.activity){
  const continuing={kind:state.activity.kind,targetId:state.activity.targetId,queueGoalsCompleted:state.activity.queueGoalCompletedAtMs!==undefined&&!state.character?.activityQueue?.length&&!state.character?.activityQueueCombatRecovery};
  const cappedMs=Math.max(0,nowMs-until);
  // Discard ineligible time so another claim cannot collect a second offline allowance.
  state={...state,activity:{...state.activity,lastClaimAtMs:Math.max(state.activity.lastClaimAtMs,nowMs),startedAtMs:state.activity.startedAtMs+cappedMs}};
  reward.stoppedReason=undefined;
  reward.continuingActivity=continuing;
 }
 reward.offlineCapReached=nowMs>until&&!!state.activity;
 reward.queuePausedReason=state.character?.activityQueuePausedReason;
 reward.pendingQueue=state.character?.activityQueue;
 return {state,reward};
}

function claimActivitySegment(state:GameState,nowMs:number){
  state=reconcileWeeklyOrderRollover(state,nowMs).state;
  if(state.character?.classTraining){const r=settleClassDrills(state,nowMs,offlineCapSeconds(state)),next=reconcileCombatCompanionUnlocks(r.state,nowMs);return {state:next,reward:withCompanionUnlocks(r.reward,state,next)};}
  if(state.activity?.kind==='faith'){
    const settled=settleFaithPractice(state,nowMs,offlineCapSeconds(state)),boost=previewDailySupplyTimedReward(state,settled.reward,'skill'),reward=boost.reward;
    const routed=settled.refund?routeRewards(state,[{itemId:HOLY_WATER_ID,quantity:settled.refund}],nowMs):{inventory:state.inventory,bank:state.bank,overflow:state.overflow};
    const faith=normalizeFaith(settled.state.character!.faith);
    const faithXp=Math.min(totalXpAtLevel(100),Math.max(
      settled.state.character!.faith?.xp??0,
      (state.skills.find(x=>x.skillId==='faith')?.xp??0)+(reward.faithXp??0),
    ));
    const skills=state.skills.map(x=>x.skillId==='faith'?{...x,xp:faithXp,level:levelFromXp(faithXp)}:x);
    const nextBase={...settled.state,...routed,skills,character:{...settled.state.character!,faith:{...faith,xp:faithXp}},activity:faith?.practice?{...state.activity,lastClaimAtMs:nowMs}:null} as GameState;
    const next=commitDailySupplyTimedBoost(nextBase,boost),reconciled=reconcileCombatCompanionUnlocks(next,nowMs);
    return {state:reconciled,reward:withCompanionUnlocks(reward,state,reconciled)};
  }
  if(state.activity?.kind==='alchemy'){
    if(nowMs<=state.activity.lastClaimAtMs)return {state,reward:previewActivityReward(state,state.activity.lastClaimAtMs)};
    const elapsed=Math.min(offlineCapSeconds(state),Math.max(0,(nowMs-state.activity.lastClaimAtMs)/1000)),raw=previewAlchemyReward(state,elapsed),baseReward={...raw,...timedEventRewards(state,'crafting',raw.craftingCompletedAtMs??[])},boost=previewDailySupplyTimedReward(state,baseReward,'crafting'),reward=boost.reward,brew=state.activity.brew!;
    const routed=routeRewards(state,reward.items,nowMs);
    const skills=state.skills.map(x=>x.skillId==='alchemy'?{...x,xp:Math.min(totalXpAtLevel(100),x.xp+(reward.xp??0)),level:levelFromXp(Math.min(totalXpAtLevel(100),x.xp+(reward.xp??0)))}:x);
    const nextBase={...state,...routed,skills,rewardRemainders:reward.nextRewardRemainders,activity:reward.nextBrewRemaining?{...state.activity,lastClaimAtMs:nowMs,progressFraction:reward.nextProgressFraction,brew:{...brew,remainingBatches:reward.nextBrewRemaining}}:null} as GameState;
    const next=commitDailySupplyTimedBoost(nextBase,boost),actions=reward.craftingActions??0;
    const progressed=actions>0?applyTrustedLongTermProgression(next,[{kind:'crafting',contentId:brew.recipeId,units:actions,startedAtMs:state.activity.lastClaimAtMs}],reward,nowMs,{accountId:longTermAccountScope(state),eventId:`alchemy:${state.character?.id??'unknown'}:${brew.recipeId}:${state.activity.lastClaimAtMs}:${nowMs}`}).state:next;
    return {state:applyEventDiscoveries(applyEventDrops(progressed,reward.eventDrops??[]),reward.eventDiscoveries??[]),reward};
  }
  if(state.activity?.kind==='processing'){
    if(nowMs<=state.activity.lastClaimAtMs)return {state,reward:previewActivityReward(state,state.activity.lastClaimAtMs)};
    const elapsed=Math.min(offlineCapSeconds(state),Math.max(0,(nowMs-state.activity.lastClaimAtMs)/1000)),raw=previewProcessingReward(state,elapsed),baseReward={...raw,...timedEventRewards(state,'crafting',raw.craftingCompletedAtMs??[])},boost=previewDailySupplyTimedReward(state,baseReward,'crafting'),reward=boost.reward,processing=state.activity.processing!;
    const routed=routeRewards(state,reward.items,nowMs),nextXp=(state.skills.find(x=>x.skillId===processing.skillId)?.xp??0)+(reward.xp??0);
    const skills=state.skills.map(x=>x.skillId===processing.skillId?{...x,xp:Math.min(totalXpAtLevel(100),nextXp),level:levelFromXp(Math.min(totalXpAtLevel(100),nextXp))}:x);
    const nextBase={...state,...routed,skills,rewardRemainders:reward.nextRewardRemainders,activity:reward.nextProcessingRemaining?{...state.activity,lastClaimAtMs:nowMs,progressFraction:reward.nextProgressFraction,processing:{...processing,remainingBatches:reward.nextProcessingRemaining}}:null} as GameState;
    const next=commitDailySupplyTimedBoost(nextBase,boost),actions=reward.craftingActions??0;
    let progressed=actions>0?applyTrustedLongTermProgression(next,[{kind:'crafting',contentId:processing.recipeId,units:actions,startedAtMs:state.activity.lastClaimAtMs}],reward,nowMs,{accountId:longTermAccountScope(state),eventId:`processing:${state.character?.id??'unknown'}:${processing.recipeId}:${state.activity.lastClaimAtMs}:${nowMs}`}).state:next;
    progressed=applyEventDiscoveries(applyEventDrops(progressed,reward.eventDrops??[]),reward.eventDiscoveries??[]);
    progressed=refreshQuests(progressed);
    const finalState=reconcileCombatCompanionUnlocks(progressed,nowMs);
    return {state:finalState,reward:withCompanionUnlocks(reward,state,finalState)};
  }
  const preview=previewActivityReward(state,nowMs);if(!state.character||!state.activity){const recovered=settleOutOfCombatRecovery(state,nowMs);return {state:recovered,reward:preview};}
  const idleWindow=idleRuleSettlementWindow(state,nowMs),settledAtMs=idleWindow.settleAtMs,idleStopReason=idleWindow.shouldStop?idleWindow.reason:undefined,supply=previewStandardActivityRewardWithSupplies(state,settledAtMs),boosted=supply.reward;
  const reward:RewardBundle=idleWindow.shouldStop&&!boosted.stoppedReason?{...boosted,stoppedReason:idleStopReason,goalReached:!idleWindow.safety}:boosted;
  if(state.activity.kind!=='combat'){
    const skills=state.skills.map(x=>x.skillId===state.activity!.kind?{...x,xp:x.xp+reward.xp,level:levelFromXp(x.xp+reward.xp)}:x);
    const routed=routeRewards(state,reward.items,settledAtMs);
    const exploredRouteIds=state.activity.kind==='exploration'&&reward.kills>0?[...new Set([...(state.exploredRouteIds??[]),state.activity.targetId])]:(state.exploredRouteIds??[]);
    const nextBase={...state,skills,...routed,rewardRemainders:reward.nextRewardRemainders,unlockedMonsterIds:[...new Set([...state.unlockedMonsterIds,...(reward.explorationDiscoveries??[])])],exploredRouteIds,outOfCombatSinceMs:idleWindow.shouldStop?settledAtMs:undefined,activity:idleWindow.shouldStop?null:{...state.activity,lastClaimAtMs:settledAtMs,progressFraction:reward.nextProgressFraction}} as GameState;
    const next=commitDailySupplyTimedBoost(nextBase,supply);
    const progression=applyTrustedLongTermProgression(next,[{kind:'gathering',contentId:state.activity.targetId,units:reward.kills,startedAtMs:state.activity.lastClaimAtMs}],reward,settledAtMs,{accountId:longTermAccountScope(state),eventId:`activity:${state.character.id}:${state.activity.targetId}:${state.activity.lastClaimAtMs}:${settledAtMs}`}).state;
    const eventApplied=refreshQuests(applyEventDiscoveries(applyEventDrops(progression,reward.eventDrops??[]),reward.eventDiscoveries??[]));
    const petSourceType=state.activity.kind==='exploration'?'exploration':'gathering';
    const petResult=applyCorePetActivityDrops(eventApplied,petSourceType,state.activity.targetId,reward.kills,`${state.character.id}:${state.activity.lastClaimAtMs}:${settledAtMs}`);
    const petReward:RewardBundle=petResult.drops.length?{...reward,petDrops:[...(reward.petDrops??[]),...petResult.drops]}:reward;
    const finalState=recordCompanionActivity(petResult.state,'gathering',state.activity.targetId,reward.kills,settledAtMs);
    const queuedState=idleWindow.shouldStop&&!idleWindow.safety?autoAdvanceActivityQueue(finalState,settledAtMs,state.activity,reward):idleWindow.shouldStop?pauseActivityQueue(finalState,reward.stoppedReason??idleStopReason??'Safety stop reached.'):finalState;
    return {state:queuedState,reward:withCompanionUnlocks(petReward,state,queuedState)};
  }
  const xp=state.character.xp+reward.xp,level=characterLevelFromXp(xp);
  const activeRegion=currentRegionId(state);
  const unlocked=MONSTERS.filter(m=>!m.boss&&m.unlockLevel<=level&&zoneIdForTarget(m.id)===activeRegion).map(m=>m.id);
  let baseInventory=state.inventory.stacks;
  if(reward.foodConsumed && state.character.equippedFoodId)baseInventory=consume(baseInventory,state.character.equippedFoodId,reward.foodConsumed);
  const routed=routeRewards({...state,inventory:{...state.inventory,stacks:baseInventory}} as GameState,reward.items,settledAtMs);
  const shouldStop=!!reward.stoppedReason||idleWindow.shouldStop;
  const monster=MONSTERS.find(m=>m.id===state.activity!.targetId)!;
  const trained=awardCombatClassXp(state.character,reward.kills,monster.xp*environmentEffectForActivity(state.activity).effect.xpMultiplier*characterPermanentMultipliers(state).skillXpMultiplier,state.activity.classFocus).character;
  const skills=state.skills.map(skill=>{
    if(skill.skillId!=='exploration'||!(reward.explorationXp??0))return skill;
    const nextXp=Math.min(totalXpAtLevel(100),skill.xp+(reward.explorationXp??0));
    return {...skill,xp:nextXp,level:levelFromXp(nextXp)};
  });
  const nextBase={...state,skills,...routed,outOfCombatSinceMs:shouldStop?settledAtMs:undefined,character:{...state.character,xp,level,gold:state.character.gold+reward.gold,currentHp:reward.endHp??state.character.currentHp},activity:shouldStop?null:{...state.activity,lastClaimAtMs:settledAtMs,progressFraction:reward.nextProgressFraction,sessionKills:(state.activity.sessionKills??0)+reward.kills,sessionChampions:(state.activity.sessionChampions??0)+(reward.championEncounters?.count??0)},unlockedMonsterIds:[...new Set([...state.unlockedMonsterIds,...unlocked])]} as GameState;
  let next=commitDailySupplyTimedBoost(nextBase,supply);
  next.character={...next.character!,classSkills:trained.classSkills,classSkillRemainders:trained.classSkillRemainders,masteryMaterialRemainders:reward.masteryMaterialRemainders};
  if(next.character.preparation&&(reward.preparationEncounters??reward.kills)>0){let prep=next.character.preparation;for(let i=0;i<(reward.preparationEncounters??reward.kills);i++)prep=spendPreparationEncounter(prep,prep?.itemId) as typeof prep;next.character={...next.character,preparation:prep};}
  if(next.activity&&reward.kills>0)next.activity.classFocus=normalizeTrainingFocus(next.character.trainingFocus);
  let progressed=recordMonsterMastery(refreshQuests(applyEventDiscoveries(applyEventDrops(next,reward.eventDrops??[]),reward.eventDiscoveries??[]),state.activity.targetId,reward.kills),state.activity.targetId,reward.kills);
  progressed=applyTrustedLongTermProgression(progressed,[{kind:'combat',contentId:state.activity.targetId,units:reward.kills,startedAtMs:state.activity.lastClaimAtMs}],reward,settledAtMs,{accountId:longTermAccountScope(state),eventId:`combat:${state.character.id}:${state.activity.targetId}:${state.activity.lastClaimAtMs}:${settledAtMs}`}).state;
  const petResult=applyCorePetCombatDrops(progressed,state.activity.targetId,reward.kills,`${state.character.id}:${state.activity.lastClaimAtMs}:${settledAtMs}`);
  progressed=petResult.state;
  const petReward:RewardBundle=petResult.drops.length?{...reward,petDrops:petResult.drops}:reward;
  const finalState=recordCompanionActivity(progressed,'combat',state.activity.targetId,reward.kills,settledAtMs);
  const plannedQueueAdvance=idleWindow.shouldStop&&!idleWindow.safety&&!reward.stoppedReason?.includes('injured')&&!reward.stoppedReason?.includes('Out of food');
  const queuedState=plannedQueueAdvance?autoAdvanceActivityQueue(finalState,settledAtMs,state.activity,reward):shouldStop?(idleWindow.combatRecovery?recoverCombatQueue(finalState,settledAtMs,reward.stoppedReason??idleStopReason??'Combat recovery required.'):pauseActivityQueue(finalState,reward.stoppedReason??idleStopReason??'Safety stop reached.')):finalState;
  return {state:queuedState,reward:withCompanionUnlocks(petReward,state,queuedState)}
}

export function finishClassDrills(state:GameState,now:number):GameState{
 if(!state.character?.classTraining)return state;
 const next=settleClassDrills(state,now,offlineCapSeconds(state)).state;
 return {...next,character:{...next.character!,classTraining:undefined}};
}
export function startClassTraining(state:GameState,now:number):GameState{
 const settled=claimActivity(state,now).state;if(!settled.character)throw new Error('Create a character first.');
 if(characterClassSkills(settled.character).every(s=>s.level===100))throw new Error('Both class skills are at maximum level.');
 if(settled.character.classTraining)return settled;
 return {...settled,activity:null,character:{...settled.character,classTraining:{lastClaimAtMs:now,progressMs:0,focus:normalizeTrainingFocus(settled.character.trainingFocus),xpPerDrill:CLASS_DRILL_BASE_XP*characterPermanentMultipliers(settled).skillXpMultiplier}}};
}

export function stopActivity(state:GameState,nowMs=Date.now()):GameState{
  if(!state.activity&&!state.character?.classTraining)return state;
  if(state.activity?.kind==='faith'){
    const settled=claimActivity(state,state.activity.lastClaimAtMs).state;
    const cancelled=cancelFaithPractice(settled);
    return {...cancelled.state,...routeRewards(cancelled.state,cancelled.refund?[{itemId:HOLY_WATER_ID,quantity:cancelled.refund}]:[],state.activity.lastClaimAtMs),activity:null,outOfCombatSinceMs:nowMs};
  }
  if(state.activity?.kind==='alchemy'){
    const brew=state.activity.brew;if(!brew)return {...state,activity:null,outOfCombatSinceMs:nowMs};
    const refund=alchemyRefund(brew),routed=routeRewards(state,refund.items,state.activity.lastClaimAtMs);
    return {...state,...routed,character:state.character?{...state.character,gold:state.character.gold+refund.gold}:null,activity:null,outOfCombatSinceMs:nowMs};
  }
  if(state.activity?.kind==='processing'){
    const processing=state.activity.processing;if(!processing)return {...state,activity:null,outOfCombatSinceMs:nowMs};
    const refund=processingRefund(processing),routed=routeRewards(state,refund.items,state.activity.lastClaimAtMs);
    return {...state,...routed,character:state.character?{...state.character,gold:state.character.gold+refund.gold}:null,activity:null,outOfCombatSinceMs:nowMs};
  }
  return {...state,activity:null,outOfCombatSinceMs:nowMs,character:state.character?{...state.character,classTraining:undefined}:null}
}
export function equipItem(state:GameState,itemId:string):GameState{
  if(!state.character)throw new Error('No character');const d=itemDef(itemId);if(d.type!=='gear'||!d.slot)throw new Error('Not gear');
  if(d.classRestriction&&d.classRestriction!==state.character.classId)throw new Error('This gear belongs to another class');
  if(state.character.level<(d.requiredLevel??1))throw new Error(`Requires character level ${d.requiredLevel}`);
  let stacks=consume(state.inventory.stacks,itemId,1);const old=state.character.equipment[d.slot];if(old)stacks=stackItems(stacks,[{itemId:old,quantity:1}]);
  const temp={...state,inventory:{...state.inventory,stacks},character:{...state.character,equipment:{...state.character.equipment,[d.slot]:itemId}}} as GameState;
  const maxHp=effectiveStats(temp).hp;temp.character!.currentHp=Math.min(maxHp,temp.character!.currentHp+(d.hp||0));
  return applyLocalBalanceSnapshot(refreshQuests(temp),Date.now())
}
export function equipFood(state:GameState,itemId:string):GameState{if(!state.character)throw new Error('No character');const d=itemDef(itemId);if(d.type!=='food')throw new Error('Not food');if(stackQty(state.inventory.stacks,itemId)<=0)throw new Error('No food available');return {...state,character:{...state.character,equippedFoodId:itemId}}}
export function eatFood(state:GameState,itemId?:string):GameState{if(!state.character)return state;const id=itemId||state.character.equippedFoodId;if(!id)return state;const d=itemDef(id);if(d.type!=='food'||!d.heal)throw new Error('Not food');const maxHp=effectiveStats(state).hp,heal=Math.max(1,Math.ceil(d.heal*characterPermanentMultipliers(state).healingEffectivenessMultiplier));return {...state,inventory:{...state.inventory,stacks:consume(state.inventory.stacks,id,1)},character:{...state.character,currentHp:Math.min(maxHp,state.character.currentHp+heal)}}}
export function usePotion(state:GameState,itemId:string):GameState{if(!state.character)throw new Error('Create a character first.');const potion=potionDef(itemId);if(!potion)throw new Error('Unknown potion.');if(state.activity?.kind==='combat')throw new Error('Potions cannot be used during a hunt.');const stacks=consume(state.inventory.stacks,itemId,1);if(potion.effect.kind==='healing'){const max=effectiveStats(state).hp,healing=characterPermanentMultipliers(state).healingEffectivenessMultiplier;return {...state,inventory:{...state.inventory,stacks},character:{...state.character,currentHp:Math.min(max,state.character.currentHp+Math.ceil(max*potion.effect.maxHpFraction*healing))}};}return {...state,inventory:{...state.inventory,stacks},character:{...state.character,preparation:{itemId,remainingEncounters:potion.effect.encounters}}};}
export function discardPreparation(state:GameState):GameState{return state.character?.preparation?{...state,character:{...state.character,preparation:undefined}}:state;}
export function unequipItem(state:GameState,slot:GearSlot):GameState{if(!state.character)return state;const old=state.character.equipment[slot];if(!old)return state;const eq={...state.character.equipment};delete eq[slot];const next={...state,inventory:{...state.inventory,stacks:stackItems(state.inventory.stacks,[{itemId:old,quantity:1}])},character:{...state.character,equipment:eq}} as GameState;next.character!.currentHp=Math.min(effectiveStats(next).hp,next.character!.currentHp);return next}
export function sellItem(state:GameState,itemId:string,quantity=1):GameState{if(!state.character||quantity<=0)return state;if(itemId===HOLY_WATER_ID)throw new Error('Holy Water cannot be sold.');if(state.settings.favoriteItemIds?.includes(itemId))throw new Error('Favorite item is protected. Remove it from Favorites before selling.');const discovered=state,d=itemDef(itemId);if(d.knowledgeUnlockId)throw new Error('Blueprints cannot be sold. Learn the recipe by crafting its tool.');if(d.type==='gear'&&hasEnhancement(discovered,itemId))throw new Error('Enhanced equipment is protected. Extract its gems before disposal; upgraded ranks cannot be recovered.');return {...discovered,inventory:{...discovered.inventory,stacks:consume(discovered.inventory.stacks,itemId,quantity)},character:{...discovered.character!,gold:discovered.character!.gold+d.value*quantity}}}
export function salvageItem(state:GameState,itemId:string):GameState{if(state.settings.favoriteItemIds?.includes(itemId))throw new Error('Favorite item is protected. Remove it from Favorites before salvaging.');const discovered=state,d=itemDef(itemId);if(d.type!=='gear'||!d.salvage)throw new Error('Cannot salvage');if(hasEnhancement(discovered,itemId))throw new Error('Enhanced equipment is protected. Extract its gems before disposal; upgraded ranks cannot be recovered.');return {...discovered,inventory:{...discovered.inventory,stacks:stackItems(consume(discovered.inventory.stacks,itemId,1),[d.salvage])}}}

export function depositToBank(state:GameState,itemId:string,quantity:number):GameState{
  if(quantity<=0)return state;
  const invQty=stackQty(state.inventory.stacks,itemId);if(invQty<quantity)throw new Error('Not enough items in inventory');
  const removed=consume(state.inventory.stacks,itemId,quantity);
  const added=addBounded(state.bank.stacks,entitlementStorageCapacity(state,'bank'),[{itemId,quantity}]);
  if(added.overflow.length)throw new Error('Bank is full');
  return {...state,inventory:{...state.inventory,stacks:removed},bank:{...state.bank,stacks:added.stacks}};
}
export function withdrawFromBank(state:GameState,itemId:string,quantity:number):GameState{
  if(quantity<=0)return state;
  const bankQty=stackQty(state.bank.stacks,itemId);if(bankQty<quantity)throw new Error('Not enough items in Bank');
  const removed=consume(state.bank.stacks,itemId,quantity);
  const added=addBounded(state.inventory.stacks,entitlementStorageCapacity(state,'inventory'),[{itemId,quantity}]);
  if(added.overflow.length)throw new Error('Inventory is full');
  return {...state,bank:{...state.bank,stacks:removed},inventory:{...state.inventory,stacks:added.stacks}};
}
export type StorageLocation='inventory'|'bank';
const STORAGE_UPGRADES:Record<StorageLocation,{capacity:number;cost:number;level:number}[]>={
  inventory:[{capacity:40,cost:5000,level:10},{capacity:50,cost:15000,level:20},{capacity:60,cost:40000,level:35},{capacity:75,cost:100000,level:50},{capacity:100,cost:250000,level:70}],
  bank:[{capacity:160,cost:10000,level:10},{capacity:220,cost:30000,level:20},{capacity:300,cost:80000,level:35},{capacity:400,cost:200000,level:50},{capacity:500,cost:500000,level:70}],
};
export function storageUpgradePreview(state:GameState,location:StorageLocation){const current=state[location].capacity;return STORAGE_UPGRADES[location].find(tier=>tier.capacity>current)??null}
export function upgradeStorage(state:GameState,location:StorageLocation):GameState{
  if(!state.character)throw new Error('Create a character first');
  const next=storageUpgradePreview(state,location);if(!next)throw new Error(`${location==='bank'?'Bank':'Inventory'} capacity is already maxed`);
  if(state.character.level<next.level)throw new Error(`Requires Level ${next.level}`);
  if(state.character.gold<next.cost)throw new Error(`Requires ${next.cost.toLocaleString()} gold`);
  return {...state,[location]:{...state[location],capacity:next.capacity},character:{...state.character,gold:state.character.gold-next.cost}};
}
/** Moves every material stack that fits. Food, gear and quest items remain carried. */
export function depositAllMaterials(state:GameState):GameState{
  let next=state,moved=0;
  for(const stack of state.inventory.stacks.filter(entry=>itemDef(entry.itemId).type==='material')){
    try{next=depositToBank(next,stack.itemId,stack.quantity);moved+=stack.quantity}catch(error){if(!(error instanceof Error)||error.message!=='Bank is full')throw error}
  }
  if(!moved)throw new Error(state.inventory.stacks.some(entry=>itemDef(entry.itemId).type==='material')?'Bank has no room for these materials':'No carried materials to deposit');
  return next;
}
function combinedQty(state:GameState,itemId:string){return stackQty(state.inventory.stacks,itemId)+stackQty(state.bank.stacks,itemId);}
function consumeInventoryThenBank(state:GameState,itemId:string,quantity:number){
  if(combinedQty(state,itemId)<quantity)throw new Error('Not enough items');
  const fromInv=Math.min(stackQty(state.inventory.stacks,itemId),quantity);
  const inv=fromInv?consume(state.inventory.stacks,itemId,fromInv):state.inventory.stacks;
  const left=quantity-fromInv;
  const bank=left?consume(state.bank.stacks,itemId,left):state.bank.stacks;
  return {inventory:inv,bank};
}
export function claimOverflowToBank(state:GameState):GameState{
  if(!state.overflow.stacks.length)return state;
  const added=addBounded(state.bank.stacks,entitlementStorageCapacity(state,'bank'),state.overflow.stacks);
  return {...state,bank:{...state.bank,stacks:added.stacks},overflow:{stacks:added.overflow,expiresAtMs:added.overflow.length?state.overflow.expiresAtMs:null}};
}

export function startGathering(state:GameState,targetId:string,nowMs:number):GameState{if(HERB_NODES.some(x=>x.id===targetId))return startHerbalism(state,targetId,nowMs);state=finishClassDrills(state,nowMs);const g=GATHERING.find(x=>x.id===targetId);if(!g)throw new Error('Unknown gathering target');const skill=state.skills.find(x=>x.skillId===g.skillId);if(!skill||skill.level<g.unlockLevel)throw new Error('Skill level too low');if(g.zoneId!==currentRegionId(state)){const zone=WORLD_ZONES.find(entry=>entry.id===g.zoneId);throw new Error(`Travel to ${zone?.name??g.zoneId} before gathering ${g.name}`)}return {...state,outOfCombatSinceMs:undefined,character:state.character?{...state.character,activityQueuePausedReason:undefined}:null,activity:{skillAffinity:captureSkillAffinity(state,g.skillId),kind:g.skillId,targetId,startedAtMs:nowMs,lastClaimAtMs:nowMs,environment:captureActivityEnvironment(targetId,nowMs)}}}
export function startHerbalism(state:GameState,targetId:string,nowMs:number):GameState{state=finishClassDrills(state,nowMs);const g=HERB_NODES.find(x=>x.id===targetId);if(!g)throw new Error('Unknown herbalism node');const skill=state.skills.find(x=>x.skillId==='herbalism');if(!skill||skill.level<g.unlockLevel)throw new Error('Herbalism level too low');if(g.zoneId!==currentRegionId(state))throw new Error(`Travel to ${g.zoneId} before gathering ${g.name}`);if(state.activity)throw new Error('Settle and stop the current activity first');const method=herbalismMethod(state.character?.herbalismMethodId,skill.level);return {...state,outOfCombatSinceMs:undefined,character:state.character?{...state.character,activityQueuePausedReason:undefined}:null,activity:{skillAffinity:captureSkillAffinity(state,'herbalism'),kind:'herbalism',targetId,startedAtMs:nowMs,lastClaimAtMs:nowMs,environment:captureActivityEnvironment(targetId,nowMs),herbalismMethodId:method.id}}}
export function startExploration(state:GameState,routeId:string,nowMs:number):GameState{state=finishClassDrills(state,nowMs);const route=explorationRoute(routeId);if(!route)throw new Error('Unknown exploration route');if(!state.character||state.character.level<route.requiredLevel)throw new Error(`Reach character level ${route.requiredLevel} to explore this route`);const exploration=state.skills.find(skill=>skill.skillId==='exploration');if(!exploration||exploration.level<route.requiredExplorationLevel)throw new Error(`Reach Exploration level ${route.requiredExplorationLevel} to scout this route`);if(route.zoneId!==currentRegionId(state))throw new Error(`Travel to ${route.zoneId} before exploring`);if(state.activity)throw new Error('Settle and stop the current activity first');return {...state,outOfCombatSinceMs:undefined,activity:{kind:'exploration',targetId:routeId,startedAtMs:nowMs,lastClaimAtMs:nowMs,environment:captureActivityEnvironment(routeId,nowMs)}}}
export function equipGatheringTool(state:GameState,itemId:string,nowMs=Date.now()):GameState{
  if(!state.character)throw new Error('Create a character first');
  const tool=gatheringToolDef(itemId);if(!tool)throw new Error('Not a gathering tool');
  if(state.character.level<tool.requiredCharacterLevel)throw new Error(`Requires Level ${tool.requiredCharacterLevel}`);
  const skill=state.skills.find(entry=>entry.skillId===tool.skillId);if(!skill||skill.level<tool.unlockLevel)throw new Error(`Requires ${tool.skillId} level ${tool.unlockLevel}`);
  const currentId=state.character.equippedToolIds?.[tool.skillId];if(currentId===itemId)return state;
  const settled=state.activity?.kind===tool.skillId?claimActivity(state,nowMs).state:state;
  let stacks=consume(settled.inventory.stacks,itemId,1);
  if(currentId)stacks=stackItems(stacks,[{itemId:currentId,quantity:1}]);
  return {...settled,inventory:{...settled.inventory,stacks},character:{...settled.character!,equippedToolIds:{...(settled.character!.equippedToolIds??{}),[tool.skillId]:itemId}}};
}
export function unequipGatheringTool(state:GameState,skillId:GatheringSkillId,nowMs=Date.now()):GameState{
  if(!state.character)return state;const currentId=state.character.equippedToolIds?.[skillId];if(!currentId)return state;
  const settled=state.activity?.kind===skillId?claimActivity(state,nowMs).state:state;
  const equippedToolIds={...(settled.character!.equippedToolIds??{})};delete equippedToolIds[skillId];
  const added=addBounded(settled.inventory.stacks,entitlementStorageCapacity(settled,'inventory'),[{itemId:currentId,quantity:1}]);
  if(added.overflow.length)throw new Error('Free one Inventory slot before unequipping this tool');
  return {...settled,inventory:{...settled.inventory,stacks:added.stacks},character:{...settled.character!,equippedToolIds}};
}
export function craftRecipe(state:GameState,recipeId:string,nowMs=Date.now()):GameState{
  if(!state.character)throw new Error('No character');
  if(recipeId.startsWith('BREW_'))throw new Error('Timed alchemy recipes must be started as a batch.');
  const r=RECIPES.find(x=>x.id===recipeId);if(!r)throw new Error('Unknown recipe');
  if(r.classId&&r.classId!==state.character.classId)throw new Error('This recipe belongs to another class');
  if(state.character.level<(r.characterLevel??1))throw new Error(`Requires character level ${r.characterLevel}`);
  if(r.requiresCraftedItemId&&!state.character.craftedNoviceItemIds?.includes(r.requiresCraftedItemId))throw new Error(`Craft ${itemDef(r.requiresCraftedItemId).name} first`);
  const tool=gatheringToolDef(r.output.itemId);
  if(tool){
    if(state.character.level<tool.requiredCharacterLevel)throw new Error(`Requires Level ${tool.requiredCharacterLevel}`);
    const gatheringSkill=state.skills.find(x=>x.skillId===tool.skillId);
    if(!gatheringSkill||gatheringSkill.level<tool.unlockLevel)throw new Error(`Requires ${tool.skillId} level ${tool.unlockLevel}`);
  }
  const knowledgeLearned=!r.requiredKnowledgeId||(state.account.unlockedKnowledgeIds??[]).includes(r.requiredKnowledgeId);
  if(!knowledgeLearned){
    if(!r.knowledgeItemId)throw new Error('Recipe blueprint is missing');
    if(combinedQty(state,r.knowledgeItemId)<1)throw new Error(`Requires ${itemDef(r.knowledgeItemId).name}`);
  }
  const sk=state.skills.find(x=>x.skillId===r.skillId);if(!sk||sk.level<r.level)throw new Error(`Requires ${r.skillId} level ${r.level}`);
  if(state.character.gold<r.gold)throw new Error('Not enough gold');
  const outputDef=itemDef(r.output.itemId),multipliers=characterPermanentMultipliers(state),candyMultiplier=eventCandyUtilityMultiplier(state,nowMs),mastery=professionMasteryMultipliers(r.id,state.account.professionMasteryByAction?.[r.id]),outputEligible=outputDef.type!=='gear'&&outputDef.type!=='tool',affinityXpKey=affinityXpRemainderKey(state.character.id,r.skillId),affinityXpGain=settleAffinitySkillXp(professionActionPace(state,r,'instant').xpPerAction*candyMultiplier,state.rewardRemainders?.[affinityXpKey],totalXpAtLevel(100)-sk.xp),baseXp=affinityXpGain.xp,masteryKey=`mastery:craft:${r.id}:yield`,masteryRaw=r.output.quantity*(outputEligible?mastery.yield:1)+(state.rewardRemainders?.[masteryKey]??0),masteryOutput=outputEligible?Math.floor(masteryRaw):r.output.quantity,masteryRemainder=outputEligible?Math.max(0,masteryRaw-masteryOutput):0;
  const masteryState={...state,rewardRemainders:{...(state.rewardRemainders??{}),[affinityXpKey]:affinityXpGain.remainder,[masteryKey]:masteryRemainder}} as GameState;
  const boosted=applyDailySupplyCraft(masteryState,{seconds:r.seconds,outputQuantity:masteryOutput,xp:baseXp,outputEligible}),boostedState=boosted.state;
  let inv=boostedState.inventory.stacks,bank=boostedState.bank.stacks;
  let unlockedKnowledgeIds=[...(boostedState.account.unlockedKnowledgeIds??[])];
  let temp={...boostedState,inventory:{...boostedState.inventory,stacks:inv},bank:{...boostedState.bank,stacks:bank}} as GameState;
  if(!knowledgeLearned&&r.requiredKnowledgeId&&r.knowledgeItemId){
    const learned=consumeInventoryThenBank(temp,r.knowledgeItemId,1);
    inv=learned.inventory;bank=learned.bank;
    unlockedKnowledgeIds=[...new Set([...unlockedKnowledgeIds,r.requiredKnowledgeId])];
    temp={...temp,inventory:{...temp.inventory,stacks:inv},bank:{...temp.bank,stacks:bank},account:{...temp.account,unlockedKnowledgeIds}};
  }
  for(const i of r.inputs){
    const consumed=consumeInventoryThenBank(temp,i.itemId,i.quantity);
    inv=consumed.inventory;bank=consumed.bank;
    temp={...temp,inventory:{...temp.inventory,stacks:inv},bank:{...temp.bank,stacks:bank}};
  }
  const output=addBounded(inv,entitlementStorageCapacity(boostedState,'inventory'),[{...r.output,quantity:boosted.outputQuantity}]);
  inv=output.stacks;
  if(output.overflow.length){
    const b=addBounded(bank,entitlementStorageCapacity(boostedState,'bank'),output.overflow);bank=b.stacks;
    if(b.overflow.length)throw new Error('Inventory and Bank are full');
  }
  const xp=Math.min(totalXpAtLevel(100),sk.xp+boosted.xp);
  const next={...boostedState,character:{...boostedState.character!,gold:boostedState.character!.gold-r.gold,...(r.noviceSetId?{craftedNoviceItemIds:[...new Set([...(boostedState.character!.craftedNoviceItemIds??[]),r.output.itemId])]}:{})},inventory:{...boostedState.inventory,stacks:inv},bank:{...boostedState.bank,stacks:bank},account:{...boostedState.account,unlockedKnowledgeIds},skills:boostedState.skills.map(x=>x.skillId===r.skillId?{...x,xp,level:levelFromXp(xp)}:x)} as GameState;
  const progressed=applyTrustedLongTermProgression(next,[{kind:'crafting',contentId:r.id,units:1}],undefined,nowMs,{accountId:longTermAccountScope(boostedState),eventId:`craft:${state.character.id}:${r.id}:${nowMs}`}).state;
  return outputDef.type==='gear'?recordCompanionActivity(refreshQuests(grantEventActivity(progressed,'crafting',nowMs)),'crafting',r.output.itemId,r.output.quantity,nowMs):refreshQuests(grantEventActivity(progressed,'crafting',nowMs))
}

/** Equip owned novice pieces atomically. No gear is granted, discarded or taken from overflow. */
export function equipNoviceSet(state:GameState):GameState{
  if(!state.character)throw new Error('No character');
  const set=noviceSetFor(state.character.classId),equipment={...state.character.equipment};
  let next=state;const replaced:ItemStack[]=[];
  for(const slot of set.slots){
    const id=noviceItemId(set.classId,slot);
    if(equipment[slot]===id)continue;
    if(combinedQty(next,id)<1)throw new Error(`Missing ${itemDef(id).name} in Inventory or Bank`);
    const consumed=consumeInventoryThenBank(next,id,1);
    next={...next,inventory:{...next.inventory,stacks:consumed.inventory},bank:{...next.bank,stacks:consumed.bank}};
    if(equipment[slot])replaced.push({itemId:equipment[slot]!,quantity:1});
    equipment[slot]=id;
  }
  // Full-state artwork has no independent cape or unrelated offhand overlay.
  for(const slot of ['cape','offhand'] as GearSlot[]){if(!set.slots.includes(slot)&&equipment[slot]){replaced.push({itemId:equipment[slot]!,quantity:1});delete equipment[slot]}}
  const inv=addBounded(next.inventory.stacks,entitlementStorageCapacity(next,'inventory'),replaced);
  const bank=addBounded(next.bank.stacks,entitlementStorageCapacity(next,'bank'),inv.overflow);
  if(bank.overflow.length)throw new Error('Free Inventory or Bank space for replaced equipment');
  next={...next,inventory:{...next.inventory,stacks:inv.stacks},bank:{...next.bank,stacks:bank.stacks},character:{...state.character,equipment}};
  next.character!.currentHp=Math.min(state.character.currentHp,effectiveStats(next).hp);
  return refreshQuests(next);
}

export function regionalReadiness(state:GameState){
  if(!state.character)return {total:0,level:0,quest:0,equipment:0,food:0,mastery:0,recommended:false};
  const level=Math.min(30,Math.floor(state.character.level/25*30));
  const q14=state.quests.find(q=>q.questId==='QST_014');const quest=q14&&q14.status!=='locked'?15:0;
  let equipment=0;for(const id of Object.values(state.character.equipment)){if(id)equipment+=itemDef(id).readiness||0;}equipment=Math.min(35,equipment);
  const foodDef=state.character.equippedFoodId?itemDef(state.character.equippedFoodId):undefined;const foodQty=stackQty(state.inventory.stacks,state.character.equippedFoodId);
  const food=Math.min(10,(foodDef?.readiness||0)+(foodQty>=10?3:foodQty>=5?2:foodQty>0?1:0));
  const get=(id:string)=>state.skills.find(s=>s.skillId===id as any)?.level||1;
  let mastery=0;if(get('mining')>=15)mastery+=2;if(get('smithing')>=18)mastery+=3;if(get('fishing')>=14)mastery+=2;if(get('cooking')>=16)mastery+=3;
  mastery=Math.min(10,mastery);const total=level+quest+equipment+food+mastery;
  return {total,level,quest,equipment,food,mastery,recommended:total>=80};
}
function fallenKnightPlayerSnapshot(state:GameState):FallenKnightPlayerSnapshot{
  const character=state.character;if(!character)throw new Error('No character');
  const stats=effectiveStats(state),multipliers=characterPermanentMultipliers(state),companion=companionCombatContribution(state),style=classCombatStyle(character.classId);
  const effectGems=equippedEffectGemBonuses(state),baseCritChance=CLASSES.find(def=>def.id===character.classId)?.role==='Damage'?.10:.05,setCombat=equipmentSetCombatModifiers(state,baseCritChance,.84);
  const foodId=character.equippedFoodId,food=foodId?itemDef(foodId):undefined,foodQuantity=stackQty(state.inventory.stacks,foodId);
  const prep=character.preparation?preparationEffects(character.preparation):undefined;
  return {
    name:character.name,classId:character.classId,maxHp:stats.hp,currentHp:Math.max(1,Math.min(stats.hp,character.currentHp||stats.hp)),
    attack:stats.attack,defense:stats.defense,power:stats.power,accuracy:stats.accuracy,evasion:stats.evasion,critChance:stats.critChance,critMultiplier:stats.critMultiplier,haste:stats.haste,
    damageMultiplier:Math.max(.7,(1+effectGems.boss_power)*setCombat.penetrationMultiplier),
    actionSpeedMultiplier:Math.max(.65,style.speedMultiplier*multipliers.combatSpeedMultiplier*companion.outputMultiplier*(1+effectGems.combat_speed)*setCombat.speedMultiplier),
    incomingDamageMultiplier:Math.max(.45,style.damageTakenMultiplier*multipliers.incomingDamageMultiplier*companion.incomingDamageMultiplier*(1-effectGems.damage_reduction)*Math.max(.5,1-setCombat.stats.ward)*(prep?.damage??1)),
    foodHeal:food?.heal??0,foodQuantity,autoEatThresholdPct:state.settings.autoEatThresholdPct,
  };
}

function fallenKnightDropRoll(state:GameState,seed:string,includeStorySigil:boolean):ItemStack[]{
  const boss=MONSTERS.find(row=>row.id==='FALLEN_KNIGHT');if(!boss||!state.character)return [];
  const items:ItemStack[]=[];
  boss.drops.forEach((drop,index)=>{
    if(!includeStorySigil&&drop.itemId==='FALLEN_KNIGHT_SIGIL')return;
    if(random01(seed,index*2)>=Math.min(1,Math.max(0,drop.chance)))return;
    const quantity=drop.min+Math.floor(random01(seed,index*2+1)*(drop.max-drop.min+1));
    if(quantity>0)items.push({itemId:drop.itemId,quantity});
  });
  return stackItems([],items);
}

export function previewFallenKnightBattle(state:GameState,nowMs=Date.now(),mode:'story'|'rematch'='story'):FallenKnightBattleResult{
  if(!state.character)throw new Error('No character');
  return simulateFallenKnightStoryBattle(fallenKnightPlayerSnapshot(state),`${state.character.id}:FALLEN_KNIGHT_${mode.toUpperCase()}:${nowMs}`,mode);
}

export function fallenKnightWinChance(state:GameState){const r=regionalReadiness(state).total;if(r<50)return .10;if(r<60)return .18;if(r<70)return .34;if(r<80)return .48;if(r<90)return .64;if(r<100)return .82;return .90;}
/** Rewarded rematches are capped weekly. Resolution is immediate; only the first story clear uses cinematic playback. */
export function challengeFallenKnightRematch(state:GameState,nowMs:number):{state:GameState;won:boolean;message:string}{
  if(!state.character||state.character.level<25||!state.defeatedBossIds.includes('FALLEN_KNIGHT'))throw new Error('Defeat the Fallen Knight in the story first.');
  state=settleOutOfCombatRecovery(state,nowMs);
  if(!state.character)throw new Error('No character');
  const weekly=fallenKnightWeeklyStatus(state,nowMs);
  if(weekly.remaining<=0)throw new Error('Fallen Knight weekly rematches are complete. Rewards reset with the next UTC week.');
  const battle=previewFallenKnightBattle(state,nowMs,'rematch'),foodId=state.character.equippedFoodId,stats=effectiveStats(state);
  let inventory=state.inventory.stacks;
  if(battle.foodConsumed&&foodId)inventory=consume(inventory,foodId,battle.foodConsumed);
  const postFightCharacter={...state.character,currentHp:Math.max(1,Math.min(stats.hp,battle.finalPlayerHp||1))};
  const attemptMetrics={...(state.account.longTermMetrics??{})};
  attemptMetrics['companions.fallen_knight_rematch_attempts']=(attemptMetrics['companions.fallen_knight_rematch_attempts']??0)+1;
  let next={...state,inventory:{...state.inventory,stacks:inventory},character:postFightCharacter,activity:null,outOfCombatSinceMs:nowMs,account:{...state.account,longTermMetrics:attemptMetrics}} as GameState;
  if(!battle.won){
    next.account.companionLastBattle={title:'Fallen Knight rematch',won:false,durationMs:battle.durationMs,gold:0,essence:0,bondstones:0,atMs:nowMs};
    return {state:next,won:false,message:`Fallen Knight rematch lost after ${Math.max(1,Math.round(battle.durationMs/1000))}s. No weekly clear was consumed.`};
  }

  const weeklyRecorded=recordFallenKnightWeeklyVictory(next,nowMs);next=weeklyRecorded.state;
  const stone=awardCompanionRematchBondstone(next,nowMs);next=stone.state;
  const clearReward=FALLEN_KNIGHT_CLEAR_REWARD,bountyReward=weeklyRecorded.bountyTriggered?FALLEN_KNIGHT_WEEKLY_BOUNTY_REWARD:undefined;
  const bossDrops=fallenKnightDropRoll(next,`${state.character.id}:FALLEN_KNIGHT_REMATCH:${weeklyRecorded.status.weekKey}:${weeklyRecorded.clearNumber}`,false);
  const fixedItems=[...clearReward.items.map(row=>({...row})),...(bountyReward?.items.map(row=>({...row}))??[])];
  const items=stackItems([],bossDrops.concat(fixedItems));
  const rewardGold=clearReward.gold+(bountyReward?.gold??0),rewardXp=clearReward.xp+(bountyReward?.xp??0),rewardEssence=clearReward.essence+(bountyReward?.essence??0);
  const routed=routeRewards(next,items,nowMs),xp=next.character!.xp+rewardXp;
  next={...next,...routed,character:{...next.character!,xp,level:characterLevelFromXp(xp),gold:next.character!.gold+rewardGold}};
  next=grantCompanionEssence(next,rewardEssence);
  if(stone.reward)next=grantBondstones(next,stone.reward);
  const winMetrics={...(next.account.longTermMetrics??{})};
  winMetrics['companions.fallen_knight_rematch_wins']=(winMetrics['companions.fallen_knight_rematch_wins']??0)+1;
  winMetrics['companions.fallen_knight_rematch_bondstones']=(winMetrics['companions.fallen_knight_rematch_bondstones']??0)+stone.reward;
  next.account={...next.account,longTermMetrics:winMetrics,companionLastBattle:{title:'Fallen Knight rematch',won:true,durationMs:battle.durationMs,gold:rewardGold,essence:rewardEssence,bondstones:stone.reward,atMs:nowMs}};
  next=recordCompanionActivity(grantEventActivity(next,'boss',nowMs),'boss','FALLEN_KNIGHT',1,nowMs);
  next=applyTrustedLongTermProgression(next,[{kind:'boss',contentId:'FALLEN_KNIGHT',units:1}],undefined,nowMs,{accountId:longTermAccountScope(next),eventId:`boss-rematch:${state.character.id}:FALLEN_KNIGHT:${weeklyRecorded.status.weekKey}:${weeklyRecorded.clearNumber}`}).state;
  next={...next,defeatedBossIds:[...new Set([...next.defeatedBossIds,'FALLEN_KNIGHT'])]};
  const strikes=battle.events.filter(event=>event.type==='player_hit').length,stoneText=stone.reward?'+1 Bondstone':`Bondstone weekly cap already reached`,dropText=bossDrops.length?bossDrops.map(row=>`${row.quantity}× ${itemDef(row.itemId).name}`).join(', '):'no bonus drop';
  return {state:next,won:true,message:`Fallen Knight weekly clear ${weeklyRecorded.clearNumber}/${weeklyRecorded.status.cap} won${strikes===1?' in one hit':` in ${Math.max(1,Math.round(battle.durationMs/1000))}s`}. +${rewardGold} Gold, +${rewardXp} XP, +${rewardEssence} Essence${weeklyRecorded.bountyTriggered?' · Oathglass Bounty completed: 1 Oathglass Fragment, 1 Tempering Core, 10 Gem Dust, 1 Regional Catalyst':''} · Boss drops: ${dropText} · ${stoneText}.`};
}

export function challengeFallenKnight(state:GameState,nowMs=Date.now()):{state:GameState;won:boolean;message:string;battle?:FallenKnightBattleResult}{
  if(!state.character)throw new Error('No character');
  state=settleOutOfCombatRecovery(state,nowMs);
  if(!state.character)throw new Error('No character');
  if(state.character.level<25)return {state,won:false,message:'Reach level 25 first.'};
  if(state.defeatedBossIds.includes('FALLEN_KNIGHT'))return challengeFallenKnightRematch(state,nowMs);
  const q14=state.quests.find(q=>q.questId==='QST_014');if(q14 && q14.status==='locked')return {state,won:false,message:'Advance the Asterfall questline before challenging the Fallen Knight.'};
  const battle=previewFallenKnightBattle(state,nowMs),foodId=state.character.equippedFoodId;
  let inventory=state.inventory.stacks;
  if(battle.foodConsumed&&foodId)inventory=consume(inventory,foodId,battle.foodConsumed);
  const postFightCharacter={...state.character,currentHp:Math.max(1,Math.min(effectiveStats(state).hp,battle.finalPlayerHp||1))};
  if(!battle.won){
    const next={...state,inventory:{...state.inventory,stacks:inventory},character:postFightCharacter,activity:null,outOfCombatSinceMs:nowMs} as GameState;
    return {state:next,won:false,battle,message:`Fallen Knight repelled you after ${Math.max(1,Math.round(battle.durationMs/1000))}s. ${battle.foodConsumed?battle.foodConsumed+' food used. ':''}Upgrade gear, improve class progression or bring stronger food before the next attempt.`};
  }
  const xp=state.character.xp+3000;
  const storyDrops=fallenKnightDropRoll(state,`${state.character.id}:FALLEN_KNIGHT_STORY_DROP:${nowMs}`,true);
  const rewardRouted=routeRewards({...state,inventory:{...state.inventory,stacks:inventory}} as GameState,storyDrops,nowMs);
  let next={...state,...rewardRouted,defeatedBossIds:[...state.defeatedBossIds,'FALLEN_KNIGHT'],character:{...postFightCharacter,gold:state.character.gold+900,xp,level:characterLevelFromXp(xp)},activity:null,outOfCombatSinceMs:nowMs} as GameState;
  next.character=awardClassSkillXp(next.character!,3000*characterPermanentMultipliers(state).skillXpMultiplier).character;
  next=recordCompanionActivity(grantBondstones(grantCompanionEssence(refreshQuests(grantEventActivity(next,'boss',nowMs)),40),1),'boss','FALLEN_KNIGHT',1,nowMs);
  next=applyTrustedLongTermProgression(next,[{kind:'boss',contentId:'FALLEN_KNIGHT',units:1,weeklyEligible:false}],undefined,nowMs,{accountId:longTermAccountScope(next),eventId:`boss-story:${state.character.id}:FALLEN_KNIGHT`}).state;
  const storyDropText=storyDrops.length?storyDrops.map(row=>`${row.quantity}× ${itemDef(row.itemId).name}`).join(', '):'no item drops';
  return {state:next,won:true,battle,message:`Fallen Knight defeated in ${Math.max(1,Math.round(battle.durationMs/1000))}s. +900 Gold, +3,000 XP, +40 Companion Essence, +1 Bondstone. Boss drops: ${storyDropText}.`};
}
