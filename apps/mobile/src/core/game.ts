import {CLASSES} from '../content/classes';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {classSkillsFor} from '../content/class-skills';
import {MONSTERS} from '../content/monsters';
import {itemDef} from '../content/items';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {explorationRoute} from '../content/exploration';
import {QUESTS} from '../content/quests';
import {GameState,ClassId,RewardBundle,ItemStack,GearSlot,BodyPresentation,GatheringSkillId,CombatChallengeId,CombatTacticId} from './types';
import {characterLevelFromXp,levelFromXp,totalXpAtLevel} from './progression';
import {random01} from './rng';
import {characterNameError} from './character-creation';
import {noviceItemId,noviceSetFor} from '../content/novice-sets';
import {classCombatStyle} from './class-combat';
import {captureActivityEnvironment,environmentEffectForActivity,zoneIdForTarget} from './world-weather';
import {SeasonalPeriod,seasonalQuestBoard} from './seasonal-quests';
import {discoverCharacterSkins} from './character-skins';
import {characterPermanentMultipliers} from './permanent-boosts';
import {activityEventDiscoveries,activityEventDrops,applyEventDiscoveries,applyEventDrops,grantEventActivity} from './live-events';
import {DEFAULT_QUICK_NAV_DESTINATIONS} from './quick-navigation';
import {gatheringPacing} from './gathering-tools';
import {gatheringToolDef} from '../content/gathering-tools';
import {currentRegionId} from './combat-region';
import {WORLD_ZONES} from '../content/world-map';
import {enhancedGearStats,equippedGemBonuses,hasEnhancement} from './equipment-enhancement';
import {companionCombatContribution,reconcileCombatCompanionUnlocks,grantCompanionEssence,grantBondstones} from './combat-companions';
import {awardCompanionRematchBondstone,companionRematchBondstoneStatus,recordCompanionActivity} from './companion-runtime';
import {monsterMastery,recordMonsterMastery} from './monster-mastery';
import {awardClassSkillXp,awardCombatClassXp,characterClassEffects,characterClassSkills,normalizeTrainingFocus,settleClassDrills} from './class-skills';
import {settleFaithPractice,cancelFaithPractice,normalizeFaith,selectedFaithBlessing} from './faith';
import {HOLY_WATER_ID} from '../content/faith';
import {previewAlchemyReward,alchemyRefund,startAlchemyBatch,preparationEffects,spendPreparationEncounter} from './alchemy';
import {potionDef} from '../content/alchemy';
import {applyTrustedLongTermProgression} from './long-term-progression-runtime';
import {applyLocalBalanceSnapshot} from './balance-telemetry';
import {applyCorePetActivityDrops,applyCorePetCombatDrops} from './core-pet-drops';
import {evaluateIdleRuleSet,type IdleEvaluationContext,type IdleRuleSet} from './idle-rules-v40';
import {challengeHuntClearKey,challengeHuntCleared,challengeHuntFirstClearReward,challengeHuntStats,challengeHuntUnlocked,challengeRewardMultipliers,rotatingChallengeAffix} from './challenge-hunts';
import {combatTactic,normalizeCombatTactic} from './combat-tactics';
import {huntGoalSnapshot,huntMomentumBonus,normalizeHuntGoalId,type HuntGoalId} from './hunt-goals';
import {CHAMPION_DAMAGE_MULTIPLIER,championBonus,isChampionEncounter} from './hunt-champions';
export const beginAlchemyBatch=startAlchemyBatch;

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

export const BASE_OFFLINE_CAP_HOURS=24;
export const MAX_OFFLINE_CAP_HOURS=36;
/** Base cap retained for content/tests; actual saves use offlineCapSeconds(state). */
export const OFFLINE_CAP_SECONDS=BASE_OFFLINE_CAP_HOURS*60*60;
const COMBAT_SPEED_MIN=.68;
const COMBAT_SPEED_MAX=1.3;
const COMBAT_TIME_SCALE=1.16;
const COMBAT_EXPECTED_SCALE=1.3;
const COMBAT_MONSTER_DAMAGE_SCALE=1.13;
export const GATHER_TIME_SCALE=1.45;

export function offlineCapBreakdown(state:GameState){
  const setComplete=!!state.character&&noviceSetFor(state.character.classId).slots.every(slot=>state.character!.craftedNoviceItemIds?.includes(noviceItemId(state.character!.classId,slot)));
  const questMilestone=state.quests.some(q=>q.questId==='QST_005'&&q.status==='claimed');
  const sources=[
    {id:'class_set',name:'Complete class set',hours:setComplete?2:0,earned:setComplete},
    {id:'quest_milestone',name:'Claim chapter 5',hours:questMilestone?2:0,earned:questMilestone},
    {id:'second_character',name:'Create second character',hours:state.account.createdCharacterCount>=2?2:0,earned:state.account.createdCharacterCount>=2},
    {id:'third_character',name:'Create third character',hours:state.account.createdCharacterCount>=3?2:0,earned:state.account.createdCharacterCount>=3},
    {id:'guild',name:'Join a guild',hours:state.account.guildMember?2:0,earned:state.account.guildMember},
    {id:'first_boss',name:'Defeat first boss',hours:state.defeatedBossIds.length?2:0,earned:state.defeatedBossIds.length>0},
    {id:'bloom_patron',name:'Bloom Patron',hours:state.account.patronTier==='bloom'||state.account.patronTier==='crown'?2:0,earned:state.account.patronTier==='bloom'||state.account.patronTier==='crown'},
    {id:'crown_patron',name:'Crown Patron',hours:state.account.patronTier==='crown'?2:0,earned:state.account.patronTier==='crown'},
  ];
  const earnedHours=sources.reduce((sum,source)=>sum+source.hours,0),hours=Math.min(MAX_OFFLINE_CAP_HOURS,BASE_OFFLINE_CAP_HOURS+earnedHours);
  return {baseHours:BASE_OFFLINE_CAP_HOURS,maxHours:MAX_OFFLINE_CAP_HOURS,hours,sources};
}
export function offlineCapSeconds(state:GameState){return offlineCapBreakdown(state).hours*60*60}

export function newGame(nowMs:number):GameState{return {
  version:6,createdAtMs:nowMs,character:null,inventory:{stacks:[],capacity:30},bank:{stacks:[],capacity:120},overflow:{stacks:[],expiresAtMs:null},activity:null,currentRegionId:'GREENFIELDS',
  quests:QUESTS.map((q,i)=>({questId:q.id,status:i===0?'active':'locked',progress:0 as number})) as any,
  unlockedMonsterIds:['MOSS_RAT'],defeatedBossIds:[],
  skills:['mining','woodcutting','fishing','smithing','cooking','herbalism','alchemy','hunting','exploration','tailoring','enchanting','faith'].map(skillId=>({skillId:skillId as any,xp:0,level:1})),
  account:{createdCharacterCount:1,unlockedCharacterSlots:1,guildMember:false,patronTier:'none',guildBannerId:'world_tree_green',guildProfileFrameId:'classic',guildNameplateId:'classic',guildMotto:'Stronger together.',guildContribution:0,guildProjectProgress:0,guildBossHp:100000,guildProjectClaimed:false,guildJoinPolicy:'open',guildMinimumLevel:10,guildApplicationStatus:'none',seasonalContractClaimIds:[]},
  settings:{language:'en',numberMode:'abbreviated',reduceMotion:false,textScale:1,autoEatThresholdPct:40,stopCombatWhenOutOfFood:true,autoJoinWorldChat:true,defaultWorldChat:1,quickNavDestinations:[...DEFAULT_QUICK_NAV_DESTINATIONS]}
}}

export function createCharacter(state:GameState,classId:ClassId,name='Adventurer',bodyPresentation:BodyPresentation='male'):GameState{
  const c=CLASSES.find(x=>x.id===classId);if(!c)throw new Error('Unknown class');
  if(state.character)throw new Error('A character already exists in this save');
  if(bodyPresentation!=='male'&&bodyPresentation!=='female')throw new Error('Invalid body presentation');
  const nameError=characterNameError(name.trim()||'Adventurer');
  if(nameError)throw new Error(nameError);
  const equipment={weapon:c.starterEquipment.weapon};
  let maxHp=c.hp;
  for(const id of Object.values(equipment) as string[]){const d=itemDef(id);maxHp+=d.hp||0;}
  return {...state,character:{id:'LOCAL_CHAR_1',name:name.trim()||'Adventurer',classId,bodyPresentation,classSkills:classSkillsFor(classId).map(skill=>({skillId:skill.id,xp:0,level:1})),trainingFocus:'balanced',profileTitle:'New Adventurer',profileBackgroundId:'asterfall-night',unlockedEventSkinIds:[],unlockedSkinIds:['starting'],ownedPetIds:[],ownedBoostIds:[],selectedSkinId:'starting',faith:{favoriteBlessingIds:[],hideWeakerBlessings:true},level:1,xp:0,gold:100,hp:c.hp,currentHp:maxHp,attack:c.attack,defense:c.defense,equipment,equippedFoodId:'TRAVEL_RATION'},
    inventory:{...state.inventory,stacks:[{itemId:'TRAVEL_RATION',quantity:20}]}}
}

export function effectiveStats(state:GameState){
  const c=state.character;if(!c)return {hp:0,attack:0,defense:0,power:0};
  let hp=c.hp,attack=c.attack,defense=c.defense;
  for(const id of Object.values(c.equipment)){if(!id)continue;const stats=enhancedGearStats(state,id);hp+=stats.hp;attack+=stats.attack;defense+=stats.defense;}
  const set=noviceSetFor(c.classId),complete=set.slots.every(slot=>c.equipment[slot]===noviceItemId(c.classId,slot));
  if(complete){hp+=set.setBonus.hp;attack+=set.setBonus.attack;defense+=set.setBonus.defense;}
  const gems=equippedGemBonuses(state);hp=Math.ceil(hp*(1+gems.hp));attack=Math.ceil(attack*(1+gems.attack));defense=Math.ceil(defense*(1+gems.defense));
  const mastery=characterClassEffects(c);hp=Math.ceil(hp*mastery.hp);attack=Math.ceil(attack*mastery.attack);defense=Math.ceil(defense*mastery.defense);
  const permanent=characterPermanentMultipliers(state);attack=Math.ceil(attack*permanent.combatPowerMultiplier);
  const prep=c.preparation?preparationEffects(c.preparation):undefined;if(prep)attack=Math.ceil(attack*prep.attack);
  const role=CLASSES.find(def=>def.id===c.classId)?.role;
  return {hp,attack,defense,power:Math.round(attack*1.5+defense*.8+hp*.08+c.level*2.5),critChance:role==='Damage'?.10:.05,critMultiplier:1.5,accuracy:.84,evasion:role==='Damage'?.07:.04,haste:.05}
}

export function startCombat(state:GameState,monsterId:string,nowMs:number,combatChallengeId?:CombatChallengeId,combatTacticId:CombatTacticId='balanced',huntGoalId:HuntGoalId='open'):GameState{
  state=finishClassDrills(state,nowMs);
  if(!state.character)throw new Error('Create a character first');
  const m=MONSTERS.find(x=>x.id===monsterId);if(!m)throw new Error('Unknown monster');
  if(!state.unlockedMonsterIds.includes(monsterId))throw new Error('Monster not unlocked');
  if(m.boss)throw new Error('Bosses use challengeFallenKnight');
  if(zoneIdForTarget(monsterId)!==currentRegionId(state))throw new Error(`Travel to ${m.zone} before fighting ${m.name}`);
  if(combatChallengeId&&!challengeHuntUnlocked(state,monsterId,combatChallengeId))throw new Error('Raise this monster\'s Mastery to unlock that Challenge Hunt.');
  const combatAffixId=combatChallengeId?rotatingChallengeAffix(monsterId,combatChallengeId,nowMs):undefined;
  return {...state,activity:{kind:'combat',targetId:monsterId,...(combatChallengeId?{combatChallengeId,combatAffixId}:{}),combatTacticId:normalizeCombatTactic(combatTacticId),...(huntGoalSnapshot(normalizeHuntGoalId(huntGoalId))?{huntGoal:huntGoalSnapshot(normalizeHuntGoalId(huntGoalId))}:{}),sessionKills:0,sessionChampions:0,startedAtMs:nowMs,lastClaimAtMs:nowMs,classFocus:normalizeTrainingFocus(state.character.trainingFocus),classTrainingSnapshot:{faithBlessingId:selectedFaithBlessing(state)?.id},environment:captureActivityEnvironment(monsterId,nowMs)}}
}

/** Travel is instantaneous for now, but always settles and stops the prior activity. */
export function travelToRegion(state:GameState,regionId:string,nowMs:number){
  const zone=WORLD_ZONES.find(entry=>entry.id===regionId);
  if(!zone)throw new Error('Unknown region');
  if(!state.character||state.character.level<zone.minLevel)throw new Error(`Reach character level ${zone.minLevel} to travel to ${zone.name}`);
  if(currentRegionId(state)===zone.id)return {state,reward:{xp:0,gold:0,items:[],kills:0,elapsedSeconds:0} as RewardBundle};
  const settled=claimActivity(state,nowMs);
  return {state:{...settled.state,currentRegionId:zone.id,activity:null},reward:settled.reward};
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
  const inv=addBounded(state.inventory.stacks,state.inventory.capacity,incoming);
  const bank=addBounded(state.bank.stacks,state.bank.capacity,inv.overflow);
  const overflow=stackItems(state.overflow.stacks,bank.overflow);
  return {
    inventory:{...state.inventory,stacks:inv.stacks},
    bank:{...state.bank,stacks:bank.stacks},
    overflow:{stacks:overflow,expiresAtMs:overflow.length?Math.max(state.overflow.expiresAtMs||0,nowMs+72*60*60*1000):null}
  };
}

function consume(stacks:ItemStack[],itemId:string,quantity:number){const f=stacks.find(s=>s.itemId===itemId);if(!f||f.quantity<quantity)throw new Error('Not enough items');return stacks.map(s=>s.itemId===itemId?{...s,quantity:s.quantity-quantity}:s).filter(s=>s.quantity>0)}
function stackQty(stacks:ItemStack[],itemId?:string){if(!itemId)return 0;return stacks.find(s=>s.itemId===itemId)?.quantity||0;}

function simulateCombat(state:GameState,monsterId:string,elapsed:number){
  const c=state.character!,baseMonster=MONSTERS.find(x=>x.id===monsterId)!,challengeId=state.activity?.kind==='combat'?state.activity.combatChallengeId:undefined,affixId=state.activity?.kind==='combat'?state.activity.combatAffixId:undefined,m=challengeHuntStats(baseMonster,challengeId,affixId),stats=effectiveStats(state);
  const modifiers=characterPermanentMultipliers(state);
  const companion=companionCombatContribution(state);
  const style=classCombatStyle(c.classId),tactic=combatTactic(state.activity?.combatTacticId);
  const environment=state.activity?environmentEffectForActivity(state.activity).effect:undefined;
  const boostedDefense=Math.max(1,Math.round(stats.defense*modifiers.combatPowerMultiplier));
  const boostedPower=Math.max(1,Math.round(stats.power*modifiers.combatPowerMultiplier));
  const expected=(m.attack*1.2+m.defense*.8+m.level*2.2)*COMBAT_EXPECTED_SCALE;
  const speed=Math.max(COMBAT_SPEED_MIN,Math.min(COMBAT_SPEED_MAX,boostedPower/Math.max(1,expected)))*style.speedMultiplier*tactic.speedMultiplier*modifiers.combatSpeedMultiplier*companion.outputMultiplier*(1+monsterMastery(state,monsterId).damageBonus);
  const theoreticalKills=Math.floor(elapsed/(m.secondsPerKill*COMBAT_TIME_SCALE*(environment?.actionTimeMultiplier??1)/speed));
  const foodId=c.equippedFoodId;const food=foodId?itemDef(foodId):undefined;
  let foodLeft=stackQty(state.inventory.stacks,foodId),foodConsumed=0;
  let hp=Math.min(c.currentHp||stats.hp,stats.hp),kills=0,championKills=0,stoppedReason='';
  const threshold=Math.max(10,Math.min(90,state.settings.autoEatThresholdPct))/100;
  for(let i=0;i<theoreticalKills;i++){
    const champion=!challengeId&&isChampionEncounter(c.id,state.activity?.lastClaimAtMs??0,monsterId,i);
    const raw=Math.max(1,Math.round((m.attack*COMBAT_MONSTER_DAMAGE_SCALE)-Math.floor(boostedDefense*.58)));
    const damage=Math.max(1,Math.round((raw*.48 + m.level*.16)*style.damageTakenMultiplier*tactic.damageTakenMultiplier*(champion?CHAMPION_DAMAGE_MULTIPLIER:1)*modifiers.incomingDamageMultiplier*companion.incomingDamageMultiplier*(c.preparation?preparationEffects(c.preparation).damage:1)));
    hp-=damage;
    while(food && food.heal && foodLeft>0 && hp>0 && hp/stats.hp<=threshold){
      hp=Math.min(stats.hp,hp+Math.max(1,Math.ceil(food.heal*modifiers.healingEffectivenessMultiplier)));foodLeft--;foodConsumed++;
    }
    if(hp<=0){
      hp=1;
      stoppedReason=food && state.settings.stopCombatWhenOutOfFood?'Out of food / too injured':'Too injured';
      break;
    }
    kills++;if(champion)championKills++;
    hp=Math.min(stats.hp,hp+Math.max(1,Math.floor(stats.hp*style.recoveryPct*tactic.recoveryMultiplier*companion.recoveryMultiplier)));
  }
  return {kills,championKills,foodConsumed,endHp:hp,stoppedReason};
}

function previewStandardActivityRewardRaw(state:GameState,effectiveNowMs:number):RewardBundle{
  if(!state.activity||!state.character)return {xp:0,gold:0,items:[],kills:0,elapsedSeconds:0};
  const elapsed=Math.min(offlineCapSeconds(state),Math.max(0,Math.floor((effectiveNowMs-state.activity.lastClaimAtMs)/1000)));
  const multipliers=characterPermanentMultipliers(state);
  if(state.activity.kind!=='combat'){
    if(state.activity.kind==='exploration'){
      const route=explorationRoute(state.activity.targetId);if(!route)return {xp:0,gold:0,items:[],kills:0,elapsedSeconds:elapsed};
      const actions=Math.floor(elapsed/route.seconds);return {xp:Math.floor(actions*route.xp*characterPermanentMultipliers(state).skillXpMultiplier),gold:0,items:[],kills:actions,elapsedSeconds:elapsed,explorationDiscoveries:actions&&route.unlockMonsterId?[route.unlockMonsterId]:[]};
    }
    const g=[...GATHERING,...HERB_NODES].find(x=>x.id===state.activity!.targetId);if(!g)return {xp:0,gold:0,items:[],kills:0,elapsedSeconds:elapsed};
    const effect=environmentEffectForActivity(state.activity).effect;
    const pacing=gatheringPacing(state,g);
    const specialtySpeed=g.skillId==='fishing'?multipliers.fishingSpeedMultiplier:g.skillId==='herbalism'?multipliers.herbalismSpeedMultiplier:1;
    const effectiveActionSeconds=g.seconds*GATHER_TIME_SCALE*pacing.timeMultiplier*effect.actionTimeMultiplier/(multipliers.gatheringSpeedMultiplier*specialtySpeed);
    const elapsedMs=Math.min(offlineCapSeconds(state)*1000,Math.max(0,effectiveNowMs-state.activity.lastClaimAtMs));
    const cycleMs=effectiveActionSeconds*1000;
    const totalMs=(state.activity.progressFraction??0)*cycleMs+elapsedMs;
    const actions=Math.floor(totalMs/cycleMs);
    const quantityFloat=actions*g.min*effect.itemMultiplier*multipliers.gatheringYieldMultiplier+(state.rewardRemainders?.[g.itemId]??0);
    const quantity=Math.floor(quantityFloat);
    const skill=state.skills.find(x=>x.skillId===g.skillId);
    const rawXp=Math.floor(actions*g.xp*effect.xpMultiplier*multipliers.skillXpMultiplier);
    const xp=Math.min(Math.max(0,totalXpAtLevel(100)-(skill?.xp??0)),rawXp);
    const reward:RewardBundle={xp,gold:0,items:quantity?[{itemId:g.itemId,quantity}]:[],kills:actions,elapsedSeconds:elapsed,nextProgressFraction:(totalMs%cycleMs)/cycleMs,nextRewardRemainders:{...(state.rewardRemainders??{}),[g.itemId]:Math.max(0,quantityFloat-quantity)}};
    return {...reward,eventDrops:activityEventDrops(state,reward,effectiveNowMs),eventDiscoveries:activityEventDiscoveries(state,'gathering',Math.floor(reward.elapsedSeconds/60),effectiveNowMs)};
  }
  const m=MONSTERS.find(x=>x.id===state.activity!.targetId);if(!m)throw new Error('Unknown monster');
  if(m.boss)return {xp:0,gold:0,items:[],kills:0,elapsedSeconds:elapsed};
  const challengeId=state.activity.combatChallengeId,affixId=state.activity.combatAffixId,challengeReward=challengeRewardMultipliers(challengeId,affixId);
  const sim=simulateCombat(state,m.id,elapsed);const items:ItemStack[]=[];
  const effect=environmentEffectForActivity(state.activity).effect;
  for(const drop of m.drops){let qty=0;const chance=Math.min(1,drop.chance*effect.dropChanceMultiplier*multipliers.dropChanceMultiplier*challengeReward.dropChance);const seed=`${state.character.id}:${state.activity.lastClaimAtMs}:${m.id}:${drop.itemId}`;for(let i=0;i<sim.kills;i++)if(random01(seed,i)<chance)qty+=drop.min+Math.floor(random01(seed,i+50000)*(drop.max-drop.min+1));if(qty>0)items.push({itemId:drop.itemId,quantity:qty});}
  const classGain=awardCombatClassXp(state.character,sim.kills,m.xp*effect.xpMultiplier*multipliers.skillXpMultiplier*challengeReward.xp,state.activity.classFocus);
  const mastery=monsterMastery(state,m.id),materialRemainders={...state.character.masteryMaterialRemainders};
  if(mastery.materialBonus)for(const item of items){if(itemDef(item.itemId).type!=='material')continue;const extra=item.quantity*mastery.materialBonus+(materialRemainders[item.itemId]??0),whole=Math.floor(extra+1e-9);item.quantity+=whole;materialRemainders[item.itemId]=Math.max(0,extra-whole);}
  const firstClear=challengeId&&sim.kills>0&&!challengeHuntCleared(state,m.id,challengeId)?challengeHuntFirstClearReward(m,challengeId):undefined;
  const rewardItems=firstClear?stackItems([],items.concat(firstClear.items)):items,champion=championBonus(Math.floor(m.xp*effect.xpMultiplier*multipliers.characterXpMultiplier),Math.floor(m.gold*effect.goldMultiplier*multipliers.goldMultiplier),sim.championKills);
  const baseXpPerKill=m.xp*effect.xpMultiplier*multipliers.characterXpMultiplier*challengeReward.xp,baseGoldPerKill=m.gold*effect.goldMultiplier*multipliers.goldMultiplier*challengeReward.gold,sessionKills=state.activity.sessionKills??0;
  const momentumXp=huntMomentumBonus(baseXpPerKill,sessionKills,sim.kills),momentumGold=huntMomentumBonus(baseGoldPerKill,sessionKills,sim.kills);
  const reward:RewardBundle={classSkillXp:classGain.awards,xp:Math.floor(sim.kills*baseXpPerKill)+momentumXp+champion.xp,gold:Math.floor(sim.kills*baseGoldPerKill)+momentumGold+(firstClear?.gold??0)+champion.gold,items:rewardItems,kills:sim.kills,elapsedSeconds:elapsed,foodConsumed:sim.foodConsumed,endHp:sim.endHp,stoppedReason:sim.stoppedReason,...(firstClear&&challengeId?{challengeHuntFirstClear:{key:challengeHuntClearKey(m.id,challengeId),monsterId:m.id,challengeId,label:firstClear.label}}:{}),...(sim.championKills>0?{championEncounters:{count:sim.championKills,bonusXp:champion.xp,bonusGold:champion.gold}}:{})};
  return {...reward,masteryMaterialRemainders:materialRemainders,eventDrops:activityEventDrops(state,reward,effectiveNowMs),eventDiscoveries:activityEventDiscoveries(state,'combat',reward.kills,effectiveNowMs)};
}

function activeIdleRuleForState(state:GameState):IdleRuleSet|undefined{
  const character=state.character;if(!character?.activeIdleRuleIdV40)return undefined;
  return character.idleRulesV40?.find(rule=>rule.id===character.activeIdleRuleIdV40);
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
    const threat=order.kind==='threat'&&activity.kind==='combat'&&!!activity.combatChallengeId&&order.targetId===`${activity.targetId}:${activity.combatChallengeId}`;
    if(direct||regional||threat)progress=Math.min(order.target,progress+reward.kills);
    weeklyOrderProgress[order.id]=progress;
  }
  const foodRemaining=Math.max(0,stackQty(state.inventory.stacks,state.character?.equippedFoodId)-(reward.foodConsumed??0));
  const routed=routeRewards(state,reward.items,settleAtMs);
  const beforeOverflow=state.overflow.stacks.reduce((sum,row)=>sum+row.quantity,0),afterOverflow=routed.overflow.stacks.reduce((sum,row)=>sum+row.quantity,0);
  return {
    itemQuantities:projectedStoredQuantities(state,reward),skillLevels,monsterKills,sessionKills:(activity.sessionKills??0)+(activity.kind==='combat'?reward.kills:0),championDefeats:(activity.sessionChampions??0)+(activity.kind==='combat'?(reward.championEncounters?.count??0):0),weeklyOrderProgress,foodRemaining,
    freeStorageSlots:Math.max(0,state.inventory.capacity-usedSlots(routed.inventory.stacks))+Math.max(0,state.bank.capacity-usedSlots(routed.bank.stacks)),
    elapsedSeconds:Math.max(0,Math.floor((settleAtMs-activity.startedAtMs)/1000)),projectedRewardFits:afterOverflow<=beforeOverflow
  };
}
function idleRuleSettlementWindow(state:GameState,nowMs:number){
  const rule=activeIdleRuleForState(state),activity=state.activity;
  if(!activity||!state.character)return {settleAtMs:nowMs,shouldStop:false as const};
  const goalRule=activity.kind==='combat'&&activity.huntGoal?{id:'hunt-goal',characterId:state.character.id,name:'Hunt Goal',conditions:[{id:'hunt-goal-condition',kind:activity.huntGoal.kind,targetId:activity.targetId,value:activity.huntGoal.value,enabled:true}],stopIfOutOfFood:false,stopIfRewardsWouldOverflow:false,finishCurrentCycle:true} as IdleRuleSet:undefined;
  if(!rule&&!goalRule)return {settleAtMs:nowMs,shouldStop:false as const};
  const capAtMs=activity.lastClaimAtMs+offlineCapSeconds(state)*1000,upper=Math.max(activity.lastClaimAtMs,Math.min(nowMs,capAtMs));
  const evaluateAt=(time:number)=>{const reward=previewStandardActivityRewardRaw(state,time),ctx=projectedIdleContext(state,reward,time),saved=rule?evaluateIdleRuleSet(rule,ctx):{shouldStop:false,safety:false},goal=goalRule?evaluateIdleRuleSet(goalRule,ctx):{shouldStop:false,safety:false},evaluation=goal.shouldStop?{...goal,reason:`Hunt goal reached: ${activity.huntGoal?.label??'target'}.`}:saved;return {reward,evaluation}};
  const upperResult=evaluateAt(upper);
  if(!upperResult.evaluation.shouldStop)return {settleAtMs:upper,shouldStop:false as const};
  const atStart=evaluateAt(activity.lastClaimAtMs);
  if(atStart.evaluation.shouldStop)return {settleAtMs:activity.lastClaimAtMs,shouldStop:true as const,reason:atStart.evaluation.reason??'Idle Rule target already reached.'};
  let low=activity.lastClaimAtMs,high=upper;
  while(high-low>1){const mid=low+Math.floor((high-low)/2);if(evaluateAt(mid).evaluation.shouldStop)high=mid;else low=mid;}
  let settleAtMs=high;let final=evaluateAt(settleAtMs);
  if(final.evaluation.safety&&final.evaluation.reason==='Storage cannot safely accept the next reward.'&&settleAtMs>activity.lastClaimAtMs){
    settleAtMs=Math.max(activity.lastClaimAtMs,settleAtMs-1);final=evaluateAt(settleAtMs);
  }
  return {settleAtMs,shouldStop:true as const,reason:upperResult.evaluation.reason??final.evaluation.reason??'Configured Idle Rule target reached.'};
}

export function previewActivityReward(state:GameState,nowMs:number):RewardBundle{
  if(state.character?.classTraining)return settleClassDrills(state,nowMs,offlineCapSeconds(state)).reward;
  if(state.activity?.kind==='faith'){const settled=settleFaithPractice(state,nowMs,offlineCapSeconds(state));return settled.reward;}
  if(state.activity?.kind==='alchemy'){const elapsed=Math.min(offlineCapSeconds(state),Math.max(0,Math.floor((nowMs-state.activity.lastClaimAtMs)/1000)));return previewAlchemyReward(state,elapsed);}
  if(!state.activity||!state.character)return {xp:0,gold:0,items:[],kills:0,elapsedSeconds:0};
  const idleWindow=idleRuleSettlementWindow(state,nowMs),reward=previewStandardActivityRewardRaw(state,idleWindow.settleAtMs);
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

export function claimActivity(state:GameState,nowMs:number){
  if(state.character?.classTraining){const r=settleClassDrills(state,nowMs,offlineCapSeconds(state)),next=reconcileCombatCompanionUnlocks(r.state,nowMs);return {state:next,reward:withCompanionUnlocks(r.reward,state,next)};}
  if(state.activity?.kind==='faith'){
    const settled=settleFaithPractice(state,nowMs,offlineCapSeconds(state));
    const reward=settled.reward;
    const routed=settled.refund?routeRewards(state,[{itemId:HOLY_WATER_ID,quantity:settled.refund}],nowMs):{inventory:state.inventory,bank:state.bank,overflow:state.overflow};
    const faith=normalizeFaith(settled.state.character!.faith);
    const faithXp=Math.min(totalXpAtLevel(100),Math.max(
      settled.state.character!.faith?.xp??0,
      (state.skills.find(x=>x.skillId==='faith')?.xp??0)+(reward.faithXp??0),
    ));
    const skills=state.skills.map(x=>x.skillId==='faith'?{...x,xp:faithXp,level:levelFromXp(faithXp)}:x);
    const next={...settled.state,...routed,skills,activity:faith?.practice?{...state.activity,lastClaimAtMs:nowMs}:null} as GameState;
    const reconciled=reconcileCombatCompanionUnlocks(next,nowMs);
    return {state:reconciled,reward:withCompanionUnlocks(reward,state,reconciled)};
  }
  if(state.activity?.kind==='alchemy'){
    if(nowMs<=state.activity.lastClaimAtMs)return {state,reward:previewActivityReward(state,state.activity.lastClaimAtMs)};
    const reward=previewActivityReward(state,nowMs),brew=state.activity.brew!;
    const routed=routeRewards(state,reward.items,nowMs);
    const skills=state.skills.map(x=>x.skillId==='alchemy'?{...x,xp:Math.min(totalXpAtLevel(100),x.xp+(reward.xp??0)),level:levelFromXp(Math.min(totalXpAtLevel(100),x.xp+(reward.xp??0)))}:x);
    const next={...state,...routed,skills,rewardRemainders:reward.nextRewardRemainders,activity:reward.nextBrewRemaining?{...state.activity,lastClaimAtMs:nowMs,progressFraction:reward.nextProgressFraction,brew:{...brew,remainingBatches:reward.nextBrewRemaining}}:null} as GameState;
    return {state:next,reward};
  }
  const preview=previewActivityReward(state,nowMs);if(!state.character||!state.activity)return {state,reward:preview};
  const idleWindow=idleRuleSettlementWindow(state,nowMs),settledAtMs=idleWindow.settleAtMs;
  const reward:RewardBundle=idleWindow.shouldStop&&!preview.stoppedReason?{...preview,stoppedReason:idleWindow.reason}:preview;
  if(state.activity.kind!=='combat'){
    const skills=state.skills.map(x=>x.skillId===state.activity!.kind?{...x,xp:x.xp+reward.xp,level:levelFromXp(x.xp+reward.xp)}:x);
    const routed=routeRewards(state,reward.items,settledAtMs);
    const next={...state,skills,...routed,rewardRemainders:reward.nextRewardRemainders,unlockedMonsterIds:[...new Set([...state.unlockedMonsterIds,...(reward.explorationDiscoveries??[])])],activity:idleWindow.shouldStop?null:{...state.activity,lastClaimAtMs:settledAtMs,progressFraction:reward.nextProgressFraction}} as GameState;
    const progression=applyTrustedLongTermProgression(next,[{kind:'gathering',contentId:state.activity.targetId,units:reward.kills,startedAtMs:state.activity.lastClaimAtMs}],reward,settledAtMs,{accountId:longTermAccountScope(state),eventId:`activity:${state.character.id}:${state.activity.targetId}:${state.activity.lastClaimAtMs}:${settledAtMs}`}).state;
    const eventApplied=refreshQuests(applyEventDiscoveries(applyEventDrops(progression,reward.eventDrops??[]),reward.eventDiscoveries??[]));
    const petSourceType=state.activity.kind==='exploration'?'exploration':'gathering';
    const petResult=applyCorePetActivityDrops(eventApplied,petSourceType,state.activity.targetId,reward.kills,`${state.character.id}:${state.activity.lastClaimAtMs}:${settledAtMs}`);
    const petReward:RewardBundle=petResult.drops.length?{...reward,petDrops:[...(reward.petDrops??[]),...petResult.drops]}:reward;
    const finalState=recordCompanionActivity(petResult.state,'gathering',state.activity.targetId,reward.kills,settledAtMs);
    return {state:finalState,reward:withCompanionUnlocks(petReward,state,finalState)};
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
  const challengeHuntClearIds=reward.challengeHuntFirstClear?[...new Set([...(state.character.challengeHuntClearIds??[]),reward.challengeHuntFirstClear.key])]:state.character.challengeHuntClearIds;
  const next={...state,...routed,character:{...state.character,xp,level,gold:state.character.gold+reward.gold,currentHp:reward.endHp??state.character.currentHp,challengeHuntClearIds},activity:shouldStop?null:{...state.activity,lastClaimAtMs:settledAtMs,sessionKills:(state.activity.sessionKills??0)+reward.kills,sessionChampions:(state.activity.sessionChampions??0)+(reward.championEncounters?.count??0)},unlockedMonsterIds:[...new Set([...state.unlockedMonsterIds,...unlocked])]} as GameState;
  next.character={...next.character!,classSkills:trained.classSkills,classSkillRemainders:trained.classSkillRemainders,masteryMaterialRemainders:reward.masteryMaterialRemainders};
  if(next.character.preparation&&reward.kills>0){let prep=next.character.preparation;for(let i=0;i<reward.kills;i++)prep=spendPreparationEncounter(prep,prep?.itemId) as typeof prep;next.character={...next.character,preparation:prep};}
  if(next.activity&&reward.kills>0)next.activity.classFocus=normalizeTrainingFocus(next.character.trainingFocus);
  let progressed=recordMonsterMastery(refreshQuests(applyEventDiscoveries(applyEventDrops(next,reward.eventDrops??[]),reward.eventDiscoveries??[]),state.activity.targetId,reward.kills),state.activity.targetId,reward.kills);
  progressed=applyTrustedLongTermProgression(progressed,[{kind:'combat',contentId:state.activity.targetId,units:reward.kills,startedAtMs:state.activity.lastClaimAtMs,challengeId:state.activity.combatChallengeId}],reward,settledAtMs,{accountId:longTermAccountScope(state),eventId:`combat:${state.character.id}:${state.activity.targetId}:${state.activity.lastClaimAtMs}:${settledAtMs}`}).state;
  const petResult=applyCorePetCombatDrops(progressed,state.activity.targetId,reward.kills,`${state.character.id}:${state.activity.lastClaimAtMs}:${settledAtMs}`);
  progressed=petResult.state;
  const petReward:RewardBundle=petResult.drops.length?{...reward,petDrops:petResult.drops}:reward;
  const finalState=recordCompanionActivity(progressed,'combat',state.activity.targetId,reward.kills,settledAtMs);
  return {state:finalState,reward:withCompanionUnlocks(petReward,state,finalState)}
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
 return {...settled,activity:null,character:{...settled.character,classTraining:{lastClaimAtMs:now,progressMs:0,focus:normalizeTrainingFocus(settled.character.trainingFocus),xpPerDrill:8*characterPermanentMultipliers(settled).skillXpMultiplier}}};
}

export function stopActivity(state:GameState):GameState{
  if(state.activity?.kind==='faith'){
    const settled=claimActivity(state,state.activity.lastClaimAtMs).state;
    const cancelled=cancelFaithPractice(settled);
    return {...cancelled.state,...routeRewards(cancelled.state,cancelled.refund?[{itemId:HOLY_WATER_ID,quantity:cancelled.refund}]:[],state.activity.lastClaimAtMs),activity:null};
  }
  if(state.activity?.kind==='alchemy'){
    const brew=state.activity.brew;if(!brew)return {...state,activity:null};
    const refund=alchemyRefund(brew),routed=routeRewards(state,refund.items,state.activity.lastClaimAtMs);
    return {...state,...routed,character:state.character?{...state.character,gold:state.character.gold+refund.gold}:null,activity:null};
  }
  return {...state,activity:null,character:state.character?{...state.character,classTraining:undefined}:null}
}
export function equipItem(state:GameState,itemId:string):GameState{
  if(!state.character)throw new Error('No character');const d=itemDef(itemId);if(d.type!=='gear'||!d.slot)throw new Error('Not gear');
  if(d.classRestriction&&d.classRestriction!==state.character.classId)throw new Error('This gear belongs to another class');
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
export function sellItem(state:GameState,itemId:string,quantity=1):GameState{if(!state.character||quantity<=0)return state;if(itemId===HOLY_WATER_ID)throw new Error('Holy Water cannot be sold.');const discovered=discoverCharacterSkins(state),d=itemDef(itemId);if(d.type==='gear'&&hasEnhancement(discovered,itemId))throw new Error('Enhanced equipment is protected. Extract its gems before disposal; upgraded ranks cannot be recovered.');return {...discovered,inventory:{...discovered.inventory,stacks:consume(discovered.inventory.stacks,itemId,quantity)},character:{...discovered.character!,gold:discovered.character!.gold+d.value*quantity}}}
export function salvageItem(state:GameState,itemId:string):GameState{const discovered=discoverCharacterSkins(state),d=itemDef(itemId);if(d.type!=='gear'||!d.salvage)throw new Error('Cannot salvage');if(hasEnhancement(discovered,itemId))throw new Error('Enhanced equipment is protected. Extract its gems before disposal; upgraded ranks cannot be recovered.');return {...discovered,inventory:{...discovered.inventory,stacks:stackItems(consume(discovered.inventory.stacks,itemId,1),[d.salvage])}}}

export function depositToBank(state:GameState,itemId:string,quantity:number):GameState{
  if(quantity<=0)return state;
  const invQty=stackQty(state.inventory.stacks,itemId);if(invQty<quantity)throw new Error('Not enough items in inventory');
  const removed=consume(state.inventory.stacks,itemId,quantity);
  const added=addBounded(state.bank.stacks,state.bank.capacity,[{itemId,quantity}]);
  if(added.overflow.length)throw new Error('Bank is full');
  return {...state,inventory:{...state.inventory,stacks:removed},bank:{...state.bank,stacks:added.stacks}};
}
export function withdrawFromBank(state:GameState,itemId:string,quantity:number):GameState{
  if(quantity<=0)return state;
  const bankQty=stackQty(state.bank.stacks,itemId);if(bankQty<quantity)throw new Error('Not enough items in Bank');
  const removed=consume(state.bank.stacks,itemId,quantity);
  const added=addBounded(state.inventory.stacks,state.inventory.capacity,[{itemId,quantity}]);
  if(added.overflow.length)throw new Error('Inventory is full');
  return {...state,bank:{...state.bank,stacks:removed},inventory:{...state.inventory,stacks:added.stacks}};
}
export type StorageLocation='inventory'|'bank';
const STORAGE_UPGRADES:Record<StorageLocation,{capacity:number;cost:number}[]>={
  inventory:[{capacity:40,cost:500},{capacity:50,cost:1500},{capacity:60,cost:4000},{capacity:75,cost:10000},{capacity:100,cost:25000}],
  bank:[{capacity:160,cost:1000},{capacity:220,cost:3000},{capacity:300,cost:8000},{capacity:400,cost:20000},{capacity:500,cost:50000}],
};
export function storageUpgradePreview(state:GameState,location:StorageLocation){const current=state[location].capacity;return STORAGE_UPGRADES[location].find(tier=>tier.capacity>current)??null}
export function upgradeStorage(state:GameState,location:StorageLocation):GameState{
  if(!state.character)throw new Error('Create a character first');
  const next=storageUpgradePreview(state,location);if(!next)throw new Error(`${location==='bank'?'Bank':'Inventory'} capacity is already maxed`);
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
  const added=addBounded(state.bank.stacks,state.bank.capacity,state.overflow.stacks);
  return {...state,bank:{...state.bank,stacks:added.stacks},overflow:{stacks:added.overflow,expiresAtMs:added.overflow.length?state.overflow.expiresAtMs:null}};
}

export function startGathering(state:GameState,targetId:string,nowMs:number):GameState{if(HERB_NODES.some(x=>x.id===targetId))return startHerbalism(state,targetId,nowMs);state=finishClassDrills(state,nowMs);const g=GATHERING.find(x=>x.id===targetId);if(!g)throw new Error('Unknown gathering target');const skill=state.skills.find(x=>x.skillId===g.skillId);if(!skill||skill.level<g.unlockLevel)throw new Error('Skill level too low');if(g.zoneId!==currentRegionId(state)){const zone=WORLD_ZONES.find(entry=>entry.id===g.zoneId);throw new Error(`Travel to ${zone?.name??g.zoneId} before gathering ${g.name}`)}return {...state,activity:{kind:g.skillId,targetId,startedAtMs:nowMs,lastClaimAtMs:nowMs,environment:captureActivityEnvironment(targetId,nowMs)}}}
export function startHerbalism(state:GameState,targetId:string,nowMs:number):GameState{state=finishClassDrills(state,nowMs);const g=HERB_NODES.find(x=>x.id===targetId);if(!g)throw new Error('Unknown herbalism node');const skill=state.skills.find(x=>x.skillId==='herbalism');if(!skill||skill.level<g.unlockLevel)throw new Error('Herbalism level too low');if(g.zoneId!==currentRegionId(state))throw new Error(`Travel to ${g.zoneId} before gathering ${g.name}`);if(state.activity)throw new Error('Settle and stop the current activity first');return {...state,activity:{kind:'herbalism',targetId,startedAtMs:nowMs,lastClaimAtMs:nowMs,environment:captureActivityEnvironment(targetId,nowMs)}}}
export function startExploration(state:GameState,routeId:string,nowMs:number):GameState{state=finishClassDrills(state,nowMs);const route=explorationRoute(routeId);if(!route)throw new Error('Unknown exploration route');if(!state.character||state.character.level<route.requiredLevel)throw new Error(`Reach character level ${route.requiredLevel} to explore this route`);if(route.zoneId!==currentRegionId(state))throw new Error(`Travel to ${route.zoneId} before exploring`);if(state.activity)throw new Error('Settle and stop the current activity first');return {...state,activity:{kind:'exploration',targetId:routeId,startedAtMs:nowMs,lastClaimAtMs:nowMs,environment:captureActivityEnvironment(routeId,nowMs)}}}
export function equipGatheringTool(state:GameState,itemId:string):GameState{
  if(!state.character)throw new Error('Create a character first');
  const tool=gatheringToolDef(itemId);if(!tool)throw new Error('Not a gathering tool');
  const skill=state.skills.find(entry=>entry.skillId===tool.skillId);if(!skill||skill.level<tool.unlockLevel)throw new Error(`Requires ${tool.skillId} level ${tool.unlockLevel}`);
  const currentId=state.character.equippedToolIds?.[tool.skillId];if(currentId===itemId)return state;
  let stacks=consume(state.inventory.stacks,itemId,1);
  if(currentId)stacks=stackItems(stacks,[{itemId:currentId,quantity:1}]);
  return {...state,inventory:{...state.inventory,stacks},character:{...state.character,equippedToolIds:{...(state.character.equippedToolIds??{}),[tool.skillId]:itemId}}};
}
export function unequipGatheringTool(state:GameState,skillId:GatheringSkillId):GameState{
  if(!state.character)return state;const currentId=state.character.equippedToolIds?.[skillId];if(!currentId)return state;
  const equippedToolIds={...(state.character.equippedToolIds??{})};delete equippedToolIds[skillId];
  const added=addBounded(state.inventory.stacks,state.inventory.capacity,[{itemId:currentId,quantity:1}]);
  if(added.overflow.length)throw new Error('Free one Inventory slot before unequipping this tool');
  return {...state,inventory:{...state.inventory,stacks:added.stacks},character:{...state.character,equippedToolIds}};
}
export function craftRecipe(state:GameState,recipeId:string,nowMs=Date.now()):GameState{
  if(!state.character)throw new Error('No character');
  if(recipeId.startsWith('BREW_'))throw new Error('Timed alchemy recipes must be started as a batch.');
  const r=RECIPES.find(x=>x.id===recipeId);if(!r)throw new Error('Unknown recipe');
  if(r.classId&&r.classId!==state.character.classId)throw new Error('This recipe belongs to another class');
  if(state.character.level<(r.characterLevel??1))throw new Error(`Requires character level ${r.characterLevel}`);
  if(r.requiresCraftedItemId&&!state.character.craftedNoviceItemIds?.includes(r.requiresCraftedItemId))throw new Error(`Craft ${itemDef(r.requiresCraftedItemId).name} first`);
  const sk=state.skills.find(x=>x.skillId===r.skillId);if(!sk||sk.level<r.level)throw new Error('Skill level too low');
  if(state.character.gold<r.gold)throw new Error('Not enough gold');
  let inv=state.inventory.stacks,bank=state.bank.stacks;
  let temp={...state,inventory:{...state.inventory,stacks:inv},bank:{...state.bank,stacks:bank}} as GameState;
  for(const i of r.inputs){
    const consumed=consumeInventoryThenBank(temp,i.itemId,i.quantity);
    inv=consumed.inventory;bank=consumed.bank;
    temp={...temp,inventory:{...temp.inventory,stacks:inv},bank:{...temp.bank,stacks:bank}};
  }
  const output=addBounded(inv,state.inventory.capacity,[r.output]);
  inv=output.stacks;
  if(output.overflow.length){
    const b=addBounded(bank,state.bank.capacity,output.overflow);bank=b.stacks;
    if(b.overflow.length)throw new Error('Inventory and Bank are full');
  }
  const multipliers=characterPermanentMultipliers(state);
  const xp=sk.xp+Math.floor(r.xp*multipliers.skillXpMultiplier);
  const next={...state,character:{...state.character,gold:state.character.gold-r.gold,...(r.noviceSetId?{craftedNoviceItemIds:[...new Set([...(state.character.craftedNoviceItemIds??[]),r.output.itemId])]}:{})},inventory:{...state.inventory,stacks:inv},bank:{...state.bank,stacks:bank},skills:state.skills.map(x=>x.skillId===r.skillId?{...x,xp,level:levelFromXp(xp)}:x)} as GameState;
  const progressed=applyTrustedLongTermProgression(next,[{kind:'crafting',contentId:r.id,units:1}],undefined,nowMs,{accountId:longTermAccountScope(state),eventId:`craft:${state.character.id}:${r.id}:${nowMs}`}).state;
  return itemDef(r.output.itemId).type==='gear'?recordCompanionActivity(refreshQuests(grantEventActivity(progressed,'crafting',nowMs)),'crafting',r.output.itemId,r.output.quantity,nowMs):refreshQuests(grantEventActivity(progressed,'crafting',nowMs))
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
  const inv=addBounded(next.inventory.stacks,next.inventory.capacity,replaced);
  const bank=addBounded(next.bank.stacks,next.bank.capacity,inv.overflow);
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
export function fallenKnightWinChance(state:GameState){const r=regionalReadiness(state).total;if(r<50)return .10;if(r<60)return .18;if(r<70)return .34;if(r<80)return .48;if(r<90)return .64;if(r<100)return .82;return .90;}
/** One optional rematch attempt per UTC day, without repeating story loot. */
export function challengeFallenKnightRematch(state:GameState,nowMs:number):{state:GameState;won:boolean;message:string}{
  if(!state.character||state.character.level<25||!state.defeatedBossIds.includes('FALLEN_KNIGHT'))throw new Error('Defeat the Fallen Knight in the story first.');
  if(nowMs<(state.account.companionBossRematchReadyAtMs??0))throw new Error('The next rematch unlocks at 00:00 UTC.');
  const readyAt=(Math.floor(nowMs/86400000)+1)*86400000,attemptMetrics={...(state.account.longTermMetrics??{})};
  attemptMetrics['companions.fallen_knight_rematch_attempts']=(attemptMetrics['companions.fallen_knight_rematch_attempts']??0)+1;
  let next:GameState={...state,account:{...state.account,companionBossRematchReadyAtMs:readyAt,longTermMetrics:attemptMetrics}};
  const chance=Math.min(.95,fallenKnightWinChance(state)*companionCombatContribution(state).outputMultiplier);
  const won=random01(`${state.character.id}:COMPANION_FALLEN_KNIGHT:${Math.floor(nowMs/86400000)}`,0)<chance;
  if(!won){next.account.companionLastBattle={title:'Fallen Knight rematch',won:false,durationMs:0,gold:0,essence:0,bondstones:0,atMs:nowMs};return {state:next,won:false,message:'The Fallen Knight won the rematch. Improve your readiness and try again after 00:00 UTC.'};}
  const stone=awardCompanionRematchBondstone(next,nowMs);next=stone.state;
  const winMetrics={...(next.account.longTermMetrics??{})};
  winMetrics['companions.fallen_knight_rematch_wins']=(winMetrics['companions.fallen_knight_rematch_wins']??0)+1;
  winMetrics['companions.fallen_knight_rematch_bondstones']=(winMetrics['companions.fallen_knight_rematch_bondstones']??0)+stone.reward;
  next.account={...next.account,longTermMetrics:winMetrics,companionLastBattle:{title:'Fallen Knight rematch',won:true,durationMs:0,gold:0,essence:40,bondstones:stone.reward,atMs:nowMs}};
  // Count an existing story clear even when upgrading a save predating companion counters.
  next.account.companionBossClears={...next.account.companionBossClears,FALLEN_KNIGHT:Math.max(1,next.account.companionBossClears?.FALLEN_KNIGHT??0)};
  next=recordCompanionActivity(grantBondstones(grantCompanionEssence(next,40),stone.reward),'boss','FALLEN_KNIGHT',1,nowMs);
  next=applyTrustedLongTermProgression(next,[{kind:'boss',contentId:'FALLEN_KNIGHT',units:1}],undefined,nowMs,{accountId:longTermAccountScope(next),eventId:`boss-rematch:${state.character.id}:FALLEN_KNIGHT:${Math.floor(nowMs/86400000)}`}).state;
  const status=companionRematchBondstoneStatus(next,nowMs),stoneText=stone.reward?'+1 Bondstone.':`Weekly Bondstone cap reached (${status.used}/${status.cap}).`;
  return {state:next,won:true,message:`Fallen Knight rematch won: +40 Companion Essence, ${stoneText} Companion boss progression recorded.`};
}
export function challengeFallenKnight(state:GameState,nowMs=Date.now()):{state:GameState;won:boolean;message:string}{
  if(!state.character)throw new Error('No character');
  if(state.character.level<25)return {state,won:false,message:'Reach level 25 first.'};
  if(state.defeatedBossIds.includes('FALLEN_KNIGHT'))return {state,won:true,message:'The Fallen Knight is already defeated.'};
  const q14=state.quests.find(q=>q.questId==='QST_014');if(q14 && q14.status==='locked')return {state,won:false,message:'Advance the Asterfall questline before challenging the Fallen Knight.'};
  const ready=regionalReadiness(state);const chance=fallenKnightWinChance(state);
  const roll=random01(`${state.character.id}:FALLEN_KNIGHT:${nowMs}`,0);const won=roll<chance;
  if(!won)return {state,won:false,message:`Fallen Knight repelled you. Readiness ${ready.total}/100 (gear ${ready.equipment}/35, food ${ready.food}/10, mastery ${ready.mastery}/10). Recommended: 80+.`};
  const xp=state.character.xp+3000;let next={...state,defeatedBossIds:[...state.defeatedBossIds,'FALLEN_KNIGHT'],character:{...state.character,gold:state.character.gold+900,xp,level:characterLevelFromXp(xp),currentHp:effectiveStats(state).hp},inventory:{...state.inventory,stacks:stackItems(state.inventory.stacks,[{itemId:'FALLEN_KNIGHT_SIGIL',quantity:1}])},activity:null} as GameState;
  next.character=awardClassSkillXp(next.character!,3000*characterPermanentMultipliers(state).skillXpMultiplier).character;
  next=recordCompanionActivity(grantBondstones(grantCompanionEssence(refreshQuests(grantEventActivity(next,'boss',nowMs)),40),1),'boss','FALLEN_KNIGHT',1,nowMs);
  next=applyTrustedLongTermProgression(next,[{kind:'boss',contentId:'FALLEN_KNIGHT',units:1}],undefined,nowMs,{accountId:longTermAccountScope(next),eventId:`boss-story:${state.character.id}:FALLEN_KNIGHT`}).state;
  return {state:next,won:true,message:`Fallen Knight defeated at readiness ${ready.total}/100. +40 Companion Essence, +1 Bondstone. The road toward Sunscar is open.`}
}
