import {completedEventRewards} from './live-events';
import {alchemyRefund,previewAlchemyReward,preparationEffects,spendPreparationEncounter} from './alchemy';
import {potionDef} from '../content/alchemy';
import {CLASSES} from '../content/classes';
import {MONSTERS} from '../content/monsters';
import {itemDef} from '../content/items';
import {GATHERING,RECIPES} from '../content/skills';
import {QUESTS,initialQuestState} from '../content/quests';
import {GameState,ClassId,RewardBundle,ItemStack,GearSlot,BodyPresentation,GatheringSkillId} from './types';
import {companionCombatContribution,defaultCompanionSanctuary,grantEquippedCompanionUse} from './combat-companions';
import {characterLevelFromXp,levelFromXp,totalXpAtLevel} from './progression';
import {random01} from './rng';
import {characterNameError} from './character-creation';
import {noviceItemId,noviceSetFor} from '../content/novice-sets';
import {classCombatStyle} from './class-combat';
import {awardClassSkillXp,characterClassEffects,characterClassSkills,normalizeTrainingFocus,normalizeClassSkills,TRAINING_GROUND_TARGET,TRAINING_CYCLE_SECONDS,trainingBaseXp} from './class-skills';
import type {ClassSkillXpAward,ClassTrainingSnapshot} from './class-skill-types';
import {ACCOUNT_SKILL_IDS,recordAccountProgress} from './account-roster';
import {captureActivityEnvironment,environmentEffectForActivity,zoneIdForTarget} from './world-weather';
import {SeasonalPeriod,seasonalQuestBoard} from './seasonal-quests';
import {discoverCharacterSkins} from './character-skins';
import {characterPermanentMultipliers} from './permanent-boosts';
import {activeLiveEvent,activityEventDiscoveries,activityEventDrops,applyEventDiscoveries,applyEventDrops,grantEventActivity} from './live-events';
import {DEFAULT_QUICK_NAV_DESTINATIONS} from './quick-navigation';
import {gatheringPacing} from './gathering-tools';
import {gatheringToolDef} from '../content/gathering-tools';
import {currentRegionId} from './combat-region';
import {WORLD_ZONES} from '../content/world-map';
import {hasEnhancement} from './equipment-enhancement';
import {characterStatBreakdown} from './modifier-pipeline';
import {previewAdventureSkillReward,startAdventureSkill} from './adventure-skills';
import {previewFaithReward,faithPracticeRefund} from './faith';
import {selectedFaithBlessing} from './faith-effects';
import {HOLY_WATER_ID} from '../content/faith';
import {acquiredCount,craftedCount,recordAcquiredItems,recordCraftedItem} from './quest-progress';
import {eventRecipeSlotUnlocked,unlockCompletedEventAppearance} from './event-equipment';

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
  version:13,otherCharacters:[],rewardRemainders:{},createdAtMs:nowMs,character:null,inventory:{stacks:[],capacity:30},bank:{stacks:[],capacity:120},overflow:{stacks:[],expiresAtMs:null},activity:null,currentRegionId:'GREENFIELDS',
  quests:initialQuestState(0),
  unlockedMonsterIds:['MOSS_RAT'],defeatedBossIds:[],
  skills:ACCOUNT_SKILL_IDS.map(skillId=>({skillId,xp:0,level:1})),
  account:{createdCharacterCount:0,unlockedCharacterSlots:1,nextCharacterOrdinal:2,unlockedCombatCompanionIds:[],combatCompanionProgress:{},companionUnlockProgress:{},companionEssence:0,bondstones:0,companionSanctuary:defaultCompanionSanctuary(),companionAssignments:[],companionPhase2Profile:{showcaseCompanionIds:[],showcaseSlotsUnlocked:1,discoveredCompanionIds:[],claimedCodexMilestoneIds:[],codexRewardIds:[]},ownedBoostIds:[],entitlements:{vip:false,vipPlus:false},premiumCurrencyBalance:0,guildMember:false,patronTier:'none',guildContribution:0,guildProjectProgress:0,guildBossHp:100000,guildProjectClaimed:false,guildJoinPolicy:'open',guildMinimumLevel:10,guildApplicationStatus:'none',seasonalContractClaimIds:[]},
  settings:{language:'en',numberMode:'abbreviated',reduceMotion:false,textScale:1,autoEatThresholdPct:40,stopCombatWhenOutOfFood:true,autoJoinWorldChat:false,defaultWorldChat:1,quickNavDestinations:[...DEFAULT_QUICK_NAV_DESTINATIONS]}
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
  return {...state,quests:initialQuestState(1),character:{id:'LOCAL_CHAR_1',name:name.trim()||'Adventurer',classId,bodyPresentation,classSkills:normalizeClassSkills(classId,[]),trainingFocus:'balanced',faith:{favoriteBlessingIds:[],hideWeakerBlessings:true},profileTitle:'New Adventurer',profileBackgroundId:'asterfall-night',unlockedSkinIds:['starting'],unlockedEventSkinIds:[],selectedSkinId:'starting',level:1,xp:0,gold:100,hp:c.hp,currentHp:maxHp,attack:c.attack,defense:c.defense,equipment,equippedFoodId:'TRAVEL_RATION'},
    inventory:{...state.inventory,stacks:[{itemId:'TRAVEL_RATION',quantity:20}]},account:{...state.account,createdCharacterCount:Math.max(1,state.account.createdCharacterCount)}}
}

export function effectiveStats(state:GameState,bonuses=characterPermanentMultipliers(state)){
  return characterStatBreakdown(state,bonuses).final;
}

export function startCombat(state:GameState,monsterId:string,nowMs:number):GameState{
  if(!state.character)throw new Error('Create a character first');
  if(state.activity?.kind==='alchemy'||state.activity?.kind==='faith')throw new Error('Settle and stop the reserved activity before starting a hunt.');
  const m=MONSTERS.find(x=>x.id===monsterId);if(!m)throw new Error('Unknown monster');
  if(!state.unlockedMonsterIds.includes(monsterId))throw new Error('Monster not unlocked');
  if(m.boss)throw new Error('Bosses use challengeFallenKnight');
  if(zoneIdForTarget(monsterId)!==currentRegionId(state))throw new Error(`Travel to ${m.zone} before fighting ${m.name}`);
  const next:GameState={...state,activity:{kind:'combat',targetId:monsterId,startedAtMs:nowMs,lastClaimAtMs:nowMs,bonusSnapshot:characterPermanentMultipliers(state),progressFraction:0,completedActions:0,environment:captureActivityEnvironment(monsterId,nowMs)}};
  return {...next,activity:{...next.activity!,classTrainingSnapshot:captureClassTrainingSnapshot(next)}};
}

/** Travel is instantaneous for now, but always settles and stops the prior activity. */
export function travelToRegion(state:GameState,regionId:string,nowMs:number){
  const zone=WORLD_ZONES.find(entry=>entry.id===regionId);
  if(!zone)throw new Error('Unknown region');
  if(!state.character||state.character.level<zone.minLevel)throw new Error(`Reach character level ${zone.minLevel} to travel to ${zone.name}`);
  if(currentRegionId(state)===zone.id)return {state,reward:{xp:0,gold:0,items:[],kills:0,elapsedSeconds:0} as RewardBundle};
  const settled=claimActivity(state,nowMs);
  return {state:{...stopActivity(settled.state),currentRegionId:zone.id},reward:settled.reward};
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
    while(remaining>0 && usedSlots(next)<capacity && !(cap===1&&next.some(stack=>stack.itemId===inc.itemId))){
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

/** The UI and simulation use this same resolved encounter model. */
export function captureClassTrainingSnapshot(state:GameState):ClassTrainingSnapshot {
  const c=state.character,a=state.activity;
  if(!c||!a||(a.kind!=='combat'&&a.kind!=='training'))throw new Error('No class-training activity.');
  const bonuses=a.bonusSnapshot??characterPermanentMultipliers(state),stats=effectiveStats(state,bonuses);
  const base={version:1 as const,kind:a.kind,targetId:a.targetId,classId:c.classId,focus:normalizeTrainingFocus(c.trainingFocus),faithBlessingId:selectedFaithBlessing(state)?.id};
  if(a.kind==='training')return {...base,cycleSeconds:TRAINING_CYCLE_SECONDS,maxHp:stats.hp,damage:0,recovery:0,
    characterXp:0,classSkillXp:trainingBaseXp(c.level)*bonuses.skillXpMultiplier,gold:0,dropChanceMultiplier:1};
  const monster=MONSTERS.find(entry=>entry.id===a.targetId);
  if(!monster||monster.boss)throw new Error('Invalid ordinary combat target.');
  const style=classCombatStyle(c.classId),mastery=characterClassEffects(c),effect=environmentEffectForActivity(a).effect;
  const defense=Math.max(1,Math.round(stats.defense*bonuses.combatPowerMultiplier));
  const preparation=preparationEffects(c.activePreparation);
  const companion=companionCombatContribution(state);
  const attack=Math.round(stats.attack*preparation.attack);
  const power=Math.max(1,Math.round((stats.power+(attack-stats.attack)*1.5)*bonuses.combatPowerMultiplier));
  const expected=(monster.attack*1.2+monster.defense*(1-mastery.armorPierce)*.8+monster.level*2.2)*COMBAT_EXPECTED_SCALE;
  const speed=Math.max(COMBAT_SPEED_MIN,Math.min(COMBAT_SPEED_MAX,power/Math.max(1,expected)))*style.speedMultiplier*bonuses.combatSpeedMultiplier*(1+mastery.speed)*companion.outputMultiplier;
  const raw=Math.max(1,Math.round(monster.attack*COMBAT_MONSTER_DAMAGE_SCALE-Math.floor(defense*.58)));
  return {...base,preparationItemId:preparation.itemId,cycleSeconds:monster.secondsPerKill*COMBAT_TIME_SCALE*effect.actionTimeMultiplier/speed,maxHp:stats.hp,
    damage:Math.max(1,Math.round((raw*.48+monster.level*.16)*style.damageTakenMultiplier*bonuses.incomingDamageMultiplier*(1-mastery.damageReduction)*preparation.damage*companion.incomingDamageMultiplier)),
    recovery:Math.max(1,Math.floor(stats.hp*(style.recoveryPct+mastery.recovery)*companion.recoveryMultiplier)),
    characterXp:monster.xp*effect.xpMultiplier*bonuses.characterXpMultiplier,
    classSkillXp:monster.xp*effect.xpMultiplier*bonuses.skillXpMultiplier,
    gold:monster.gold*effect.goldMultiplier*bonuses.goldMultiplier,
    dropChanceMultiplier:effect.dropChanceMultiplier*bonuses.dropChanceMultiplier};
}
export function startClassTraining(state:GameState,nowMs:number):GameState {
  if(!state.character)throw new Error('Create a character first.');
  if(state.activity?.kind==='alchemy'||state.activity?.kind==='faith')throw new Error('Settle and stop the reserved activity before class training.');
  if(characterClassSkills(state.character).every(skill=>skill.level>=100))throw new Error('Both class skills are already mastered.');
  const next:GameState={...state,activity:{kind:'training',targetId:TRAINING_GROUND_TARGET,startedAtMs:nowMs,lastClaimAtMs:nowMs,
    bonusSnapshot:characterPermanentMultipliers(state),progressFraction:0,completedActions:0}};
  return {...next,activity:{...next.activity!,classTrainingSnapshot:captureClassTrainingSnapshot(next)}};
}
/** Resolves one encounter at a time. Skill gains affect the NEXT encounter, even offline. */
function simulateClassActivity(state:GameState,elapsed:number):RewardBundle {
  const activity=state.activity!,original=state.character!,training=activity.kind==='training';
  const remainders={...(state.rewardRemainders??{})};
  const round=(key:string,amount:number)=>{const value=amount+(remainders[key]??0),whole=Math.floor(value+1e-9);remainders[key]=Math.max(0,value-whole);return whole;};
  let virtual=state,remaining=elapsed,fraction=activity.progressFraction??0,snapshot=activity.classTrainingSnapshot;
  let hp=original.currentHp,kills=0,drills=0,xp=0,gold=0,foodConsumed=0,stoppedReason='';
  const foodId=original.equippedFoodId,food=foodId?itemDef(foodId):undefined;
  let foodLeft=stackQty(state.inventory.stacks,foodId),completed=activity.completedActions??0;
  const threshold=Math.max(10,Math.min(90,state.settings.autoEatThresholdPct))/100;
  const awards:ClassSkillXpAward[]=characterClassSkills(original).map(skill=>({skillId:skill.skillId,xp:0,cappedXp:0,levelBefore:skill.level,levelAfter:skill.level}));
  const items:ItemStack[]=[];
  const monster=training?undefined:MONSTERS.find(entry=>entry.id===activity.targetId);
  // Smallest authored cycle is several seconds; 36h yields far fewer than 100,000 encounters.
  while(remaining>1e-9){
    if(training&&characterClassSkills(virtual.character!).every(skill=>skill.level>=100)){stoppedReason='Both class skills are mastered';fraction=0;snapshot=undefined;break;}
    if(!snapshot)snapshot=captureClassTrainingSnapshot(virtual);
    const needed=snapshot.cycleSeconds*(1-fraction);
    if(remaining+1e-9<needed){fraction+=remaining/snapshot.cycleSeconds;remaining=0;break;}
    remaining=Math.max(0,remaining-needed);fraction=0;
    if(!training){
      virtual={...virtual,character:{...virtual.character!,activePreparation:spendPreparationEncounter(virtual.character!.activePreparation,snapshot.preparationItemId)}};
      hp=Math.min(hp,snapshot.maxHp)-snapshot.damage;
      while(food?.heal&&foodLeft>0&&hp>0&&hp/snapshot.maxHp<=threshold){hp=Math.min(snapshot.maxHp,hp+food.heal);foodLeft--;foodConsumed++;}
      if(hp<=0){hp=1;stoppedReason=food&&state.settings.stopCombatWhenOutOfFood?'Out of food / too injured':'Too injured';snapshot=undefined;break;}
    }
    const gain=awardClassSkillXp(virtual.character!,snapshot.classSkillXp,snapshot.focus,remainders);
    gain.awards.forEach((award,index)=>{awards[index].xp+=award.xp;awards[index].cappedXp+=award.cappedXp;awards[index].levelAfter=award.levelAfter;});
    const characterXp=round('xp:combat',snapshot.characterXp);xp+=characterXp;gold+=round('gold:combat',snapshot.gold);
    if(!training){
      kills++;hp=Math.min(snapshot.maxHp,hp+snapshot.recovery);
      for(const drop of monster!.drops){
        const seed=`${original.id}:${activity.startedAtMs}:${monster!.id}:${drop.itemId}`;
        if(random01(seed,completed)<Math.min(1,drop.chance*snapshot.dropChanceMultiplier)){
          const quantity=drop.min+Math.floor(random01(seed+':quantity',completed)*(drop.max-drop.min+1));
          const stack=items.find(entry=>entry.itemId===drop.itemId);if(stack)stack.quantity+=quantity;else items.push({itemId:drop.itemId,quantity});
        }
      }
    }else drills++;
    completed++;
    const totalXp=gain.character.xp+characterXp;
    virtual={...virtual,character:{...gain.character,xp:totalXp,level:characterLevelFromXp(totalXp),currentHp:hp}};
    snapshot=undefined;
  }
  if(training&&characterClassSkills(virtual.character!).every(skill=>skill.level>=100)){stoppedReason='Both class skills are mastered';snapshot=undefined;fraction=0;}
  return {xp,gold,items,kills,trainingActions:training?drills:undefined,elapsedSeconds:elapsed,
    classSkillXp:awards,nextPreparation:virtual.character!.activePreparation??null,nextRewardRemainders:remainders,nextProgressFraction:Math.max(0,Math.min(1-Number.EPSILON,fraction)),
    nextClassTrainingSnapshot:snapshot,nextCompletedActions:completed,foodConsumed,endHp:hp,stoppedReason:stoppedReason||undefined};
}

export function previewActivityReward(state:GameState,nowMs:number):RewardBundle{
  if(!state.activity||!state.character)return {xp:0,gold:0,items:[],kills:0,elapsedSeconds:0};
  const elapsed=Math.min(offlineCapSeconds(state),Math.max(0,(nowMs-state.activity.lastClaimAtMs)/1000));
  if(state.activity.kind==='alchemy'){const reward=previewAlchemyReward(state,elapsed);return {...reward,...completedEventRewards(state,'crafting',reward.craftingCompletedAtMs??[])};}
  if(state.activity.kind==='faith')return previewFaithReward(state,elapsed);
  if(state.activity.kind==='hunting'||state.activity.kind==='exploration')return previewAdventureSkillReward(state,elapsed);
  const multipliers=state.activity.bonusSnapshot??characterPermanentMultipliers(state);
  const remainders={...(state.rewardRemainders??{})};
  const rounded=(key:string,amount:number)=>{const raw=amount+(remainders[key]??0),whole=Math.floor(raw+1e-10);remainders[key]=Math.max(0,raw-whole);return whole;};
  if(state.activity.kind!=='combat'&&state.activity.kind!=='training'){
    const g=GATHERING.find(x=>x.id===state.activity!.targetId);if(!g)return {xp:0,gold:0,items:[],kills:0,elapsedSeconds:elapsed};
    const effect=environmentEffectForActivity(state.activity).effect;
    const pacing=gatheringPacing(state,g);
    const effectiveActionSeconds=g.seconds*GATHER_TIME_SCALE*pacing.timeMultiplier*effect.actionTimeMultiplier/multipliers.gatheringSpeedMultiplier;
    const progress=elapsed/effectiveActionSeconds+(state.activity.progressFraction??0);
    const actions=Math.floor(progress+1e-10);
    const quantity=rounded(`gather:${g.itemId}`,actions*g.min*effect.itemMultiplier*multipliers.gatheringYieldMultiplier);
    const event=activeLiveEvent(state,nowMs);
    const eligibleEventSeconds=event?Math.min(elapsed,Math.max(0,(nowMs-Math.max(state.activity.lastClaimAtMs,event.runtime.startsAtMs))/1000)):0;
    const eventGatheringMinutes=event?rounded(`event-minutes:${event.definition.id}`,eligibleEventSeconds/60):0;
    const reward:RewardBundle={eventGatheringMinutes,xp:rounded(`xp:${g.skillId}`,actions*g.xp*effect.xpMultiplier*multipliers.skillXpMultiplier),gold:0,items:quantity?[{itemId:g.itemId,quantity}]:[],kills:actions,elapsedSeconds:elapsed,nextProgressFraction:Math.max(0,progress-actions),nextRewardRemainders:remainders};
    if(g.skillId==='herbalism')reward.xp=Math.max(0,Math.min(reward.xp,totalXpAtLevel(100)-(state.skills.find(skill=>skill.skillId==='herbalism')?.xp??0)));
    return {...reward,eventDrops:activityEventDrops(state,reward,nowMs),eventDiscoveries:activityEventDiscoveries(state,'gathering',reward.eventGatheringMinutes??0,nowMs)};
  }
  const reward=simulateClassActivity(state,elapsed);
  if(state.activity.kind==='training')return reward; // No combat, loot, gold, healing, character XP or event credit.
  return {...reward,eventDrops:activityEventDrops(state,reward,nowMs),eventDiscoveries:activityEventDiscoveries(state,'combat',reward.kills,nowMs)};
}

export function refreshQuests(state:GameState,lastCombatTarget?:string,lastKills=0):GameState{
  let quests=state.quests.map(q=>({...q}));
  if(lastCombatTarget&&lastKills>0){quests=quests.map(q=>{const d=QUESTS.find(x=>x.id===q.questId);return q.status==='active'&&d?.kind==='kills'&&d.targetId===lastCombatTarget?{...q,progress:Math.min(d.required,q.progress+lastKills)}:q})}
  const characterLevel=state.character?.level??0;
  quests=quests.map(q=>{
    const d=QUESTS.find(x=>x.id===q.questId);
    if(!d||q.status!=='locked'||d.category!=='skill'||(d.autoStartLevel??Number.POSITIVE_INFINITY)>characterLevel)return q;
    return {...q,status:'active' as const};
  });
  quests=quests.map(q=>{
    const d=QUESTS.find(x=>x.id===q.questId);if(!d||q.status!=='active')return q;let progress=q.progress;
    if(d.kind==='item')progress=acquiredCount(state.character,d.targetId);
    if(d.kind==='craft')progress=craftedCount(state.character,d.targetId);
    if(d.kind==='equip')progress=Object.values(state.character?.equipment||{}).filter(Boolean).length;
    if(d.kind==='level')progress=state.character?.level||0;
    if(d.kind==='skillLevel')progress=d.skillId?(state.skills.find(x=>x.skillId===d.skillId)?.level??0):0;
    if(d.kind==='boss')progress=state.defeatedBossIds.includes(d.targetId||'')?1:0;
    return {...q,progress:Math.min(d.required,progress),status:progress>=d.required?'complete':'active'};
  });
  return {...state,quests}
}
export function claimQuest(state:GameState,questId:string):GameState{
  const q=state.quests.find(x=>x.questId===questId),d=QUESTS.find(x=>x.id===questId);
  if(!q||!d||q.status!=='complete'||!state.character)throw new Error('Quest not claimable');
  let next={...state,character:{...state.character,gold:state.character.gold+d.rewardGold},inventory:{...state.inventory,stacks:d.rewardItemId?stackItems(state.inventory.stacks,[{itemId:d.rewardItemId,quantity:d.rewardItemQty||1}]):state.inventory.stacks},quests:state.quests.map(x=>x.questId===questId?{...x,status:'claimed' as const}:x)} as GameState;
  if(d.nextQuestId)next={...next,quests:next.quests.map(x=>x.questId===d.nextQuestId&&x.status==='locked'?{...x,status:'active' as const}:x)};
  return refreshQuests(next)
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
  return refreshQuests({...state,...routed,character:{...state.character,xp,level,gold:state.character.gold+contract.rewardGold},account:{...state.account,seasonalContractClaimIds:claimed}} as GameState);
}

export function claimActivity(state:GameState,nowMs:number){
  if(!Number.isFinite(nowMs)||nowMs<0)throw new Error('Invalid settlement time.');
  if(state.activity&&nowMs<=state.activity.lastClaimAtMs)return {state,reward:{xp:0,gold:0,items:[],kills:0,elapsedSeconds:0} as RewardBundle};
  const reward=previewActivityReward(state,nowMs);if(!state.character||!state.activity)return {state,reward};
  if(state.activity.kind==='faith'){
    const practice=state.activity.faithPractice;if(!practice)throw new Error('Cannot settle an invalid Faith reservation.');
    const remaining=reward.nextFaithRemaining??practice.remainingPractices;
    const refund=reward.faithWaterRefund??0;
    const routed=refund?routeRewards(state,[{itemId:HOLY_WATER_ID,quantity:refund}],nowMs):{inventory:state.inventory,bank:state.bank,overflow:state.overflow};
    const skills=state.skills.map(skill=>skill.skillId==='faith'?{...skill,xp:skill.xp+reward.xp,level:levelFromXp(skill.xp+reward.xp)}:skill);
    const next:GameState={...state,...routed,skills,rewardRemainders:reward.nextRewardRemainders??state.rewardRemainders,
      activity:remaining?{...state.activity,lastClaimAtMs:nowMs,progressFraction:reward.nextProgressFraction??0,faithPractice:{...practice,remainingPractices:remaining}}:null};
    return {state:recordAccountProgress(refreshQuests(next)),reward};
  }
  if(state.activity.kind==='alchemy'){
    const remaining=reward.nextBrewRemaining??state.activity.brew!.remainingBatches;
    const routed=routeRewards(state,reward.items,nowMs);
    let earnedCharacter=state.character;
    for(const item of reward.items)earnedCharacter=recordCraftedItem(earnedCharacter,item);
    let next:GameState={...state,...routed,character:earnedCharacter,
      skills:state.skills.map(skill=>skill.skillId==='alchemy'?{...skill,xp:skill.xp+reward.xp,level:levelFromXp(skill.xp+reward.xp)}:skill),
      rewardRemainders:reward.nextRewardRemainders??state.rewardRemainders,
      activity:remaining?{...state.activity,lastClaimAtMs:nowMs,progressFraction:reward.nextProgressFraction??0,
        brew:{...state.activity.brew!,remainingBatches:remaining}}:null};
    // Credit only actual completed brews at their completion times. Starting/cancelling gives none.
    next=applyEventDiscoveries(applyEventDrops(next,reward.eventDrops??[]),reward.eventDiscoveries??[]);
    return {state:recordAccountProgress(refreshQuests(next)),reward};
  }
  if(state.activity.kind!=='combat'&&state.activity.kind!=='training'){
    const skills=state.skills.map(x=>x.skillId===state.activity!.kind?{...x,xp:x.xp+reward.xp,level:levelFromXp(x.xp+reward.xp)}:x);
    const routed=routeRewards(state,reward.items,nowMs);
    const newlyDiscovered=reward.explorationDiscoveries??[];
    let character=recordAcquiredItems(state.character,reward.items);
    if(newlyDiscovered.length)character={...character,explorationDiscoveryIds:[...new Set([...(character.explorationDiscoveryIds??[]),...newlyDiscovered])]};
    const next={...state,character,skills,...routed,activity:{...state.activity,lastClaimAtMs:nowMs,bonusSnapshot:characterPermanentMultipliers(state),progressFraction:reward.nextProgressFraction??0,completedActions:reward.nextCompletedActions??state.activity.completedActions},rewardRemainders:reward.nextRewardRemainders??state.rewardRemainders} as GameState;
    return {state:recordAccountProgress(refreshQuests(applyEventDiscoveries(applyEventDrops(next,reward.eventDrops??[]),reward.eventDiscoveries??[]))),reward};
  }
  const classSkills=characterClassSkills(state.character).map(skill=>{
    const amount=reward.classSkillXp?.find(award=>award.skillId===skill.skillId)?.xp??0;
    return {...skill,xp:skill.xp+amount,level:levelFromXp(skill.xp+amount)};
  });
  const xp=state.character.xp+reward.xp,level=characterLevelFromXp(xp);
  const unlocked=MONSTERS.filter(m=>!m.boss&&m.unlockLevel<=level).map(m=>m.id);
  let baseInventory=state.inventory.stacks;
  if(reward.foodConsumed && state.character.equippedFoodId)baseInventory=consume(baseInventory,state.character.equippedFoodId,reward.foodConsumed);
  const routed=routeRewards({...state,inventory:{...state.inventory,stacks:baseInventory}} as GameState,reward.items,nowMs);
  const shouldStop=!!reward.stoppedReason;
  const earnedCharacter=recordAcquiredItems(state.character,reward.items);
  let next={...state,...routed,character:{...earnedCharacter,classSkills,xp,level,gold:state.character.gold+reward.gold,currentHp:reward.endHp??state.character.currentHp,activePreparation:reward.nextPreparation===undefined?state.character.activePreparation:reward.nextPreparation??undefined},activity:shouldStop?null:{...state.activity,lastClaimAtMs:nowMs,bonusSnapshot:characterPermanentMultipliers(state),progressFraction:reward.nextProgressFraction??0,classTrainingSnapshot:reward.nextClassTrainingSnapshot,completedActions:reward.nextCompletedActions??state.activity.completedActions},rewardRemainders:reward.nextRewardRemainders??state.rewardRemainders,unlockedMonsterIds:[...new Set([...state.unlockedMonsterIds,...unlocked])]} as GameState;
  if(state.activity.kind==='combat'&&reward.kills>0)next=grantEquippedCompanionUse(next,'battle',reward.kills);
  return {state:recordAccountProgress(refreshQuests(applyEventDiscoveries(applyEventDrops(next,reward.eventDrops??[]),reward.eventDiscoveries??[]),state.activity.kind==='combat'?state.activity.targetId:undefined,reward.kills)),reward}
}

export function stopActivity(state:GameState):GameState{
  if(state.activity?.kind==='faith'){
    if(!state.character||!state.activity.faithPractice)throw new Error('Cannot cancel an invalid reserved Faith practice.');
    const quantity=faithPracticeRefund(state.activity.faithPractice);
    return {...state,...routeRewards(state,quantity?[{itemId:HOLY_WATER_ID,quantity}]:[],state.activity.lastClaimAtMs),activity:null};
  }
  if(state.activity?.kind==='alchemy'){
    if(!state.character||!state.activity.brew)throw new Error('Cannot cancel an invalid reserved brew.');
    const refund=alchemyRefund(state.activity.brew);
    return {...state,...routeRewards(state,refund.items,state.activity.lastClaimAtMs),
      character:{...state.character,gold:state.character.gold+refund.gold},activity:null};
  }
  return {...state,activity:null};
}
/** Commands must be invoked through withSettledAccount in the UI. Never auto-drinks from Bank. */
export function usePotion(state:GameState,itemId:string):GameState{
  if(!state.character)throw new Error('Create a character first.');
  const potion=potionDef(itemId);if(!potion)throw new Error('Not a usable potion.');
  if(state.activity?.kind==='combat')throw new Error('Stop your hunt before drinking a potion.');
  if(stackQty(state.inventory.stacks,itemId)<1)throw new Error('Withdraw the potion into this character’s Inventory first.');
  if(potion.effect.kind==='healing'){
    const maxHp=effectiveStats(state).hp;
    if(state.character.currentHp>=maxHp)throw new Error('Health is full; the potion was not consumed.');
    return {...state,inventory:{...state.inventory,stacks:consume(state.inventory.stacks,itemId,1)},
      character:{...state.character,currentHp:Math.min(maxHp,state.character.currentHp+Math.max(1,Math.floor(maxHp*potion.effect.maxHpFraction)))}};
  }
  if(state.character.activePreparation)throw new Error('One tonic may be prepared at a time. Finish or discard the current preparation first.');
  return {...state,inventory:{...state.inventory,stacks:consume(state.inventory.stacks,itemId,1)},
    character:{...state.character,activePreparation:{itemId,remainingEncounters:potion.effect.encounters}}};
}
export function discardPreparation(state:GameState):GameState {
  if(!state.character)return state;
  if(state.activity?.kind==='combat')throw new Error('Stop your hunt before discarding a preparation.');
  return {...state,character:{...state.character,activePreparation:undefined}};
}
export function equipItem(state:GameState,itemId:string):GameState{
  if(!state.character)throw new Error('No character');const d=itemDef(itemId);if(d.type!=='gear'||!d.slot)throw new Error('Not gear');
  if(d.classRestriction&&d.classRestriction!==state.character.classId)throw new Error('This gear belongs to another class');
  let stacks=consume(state.inventory.stacks,itemId,1);const old=state.character.equipment[d.slot];if(old)stacks=stackItems(stacks,[{itemId:old,quantity:1}]);
  const temp={...state,inventory:{...state.inventory,stacks},character:{...state.character,equipment:{...state.character.equipment,[d.slot]:itemId}}} as GameState;
  const maxHp=effectiveStats(temp).hp;temp.character!.currentHp=Math.min(maxHp,temp.character!.currentHp+(d.hp||0));
  return refreshQuests(temp)
}
export function equipFood(state:GameState,itemId:string):GameState{if(!state.character)throw new Error('No character');const d=itemDef(itemId);if(d.type!=='food')throw new Error('Not food');if(stackQty(state.inventory.stacks,itemId)<=0)throw new Error('No food available');return {...state,character:{...state.character,equippedFoodId:itemId}}}
export function eatFood(state:GameState,itemId?:string):GameState{if(!state.character)return state;const id=itemId||state.character.equippedFoodId;if(!id)return state;const d=itemDef(id);if(d.type!=='food'||!d.heal)throw new Error('Not food');const maxHp=effectiveStats(state).hp;return {...state,inventory:{...state.inventory,stacks:consume(state.inventory.stacks,id,1)},character:{...state.character,currentHp:Math.min(maxHp,state.character.currentHp+d.heal)}}}
export function unequipItem(state:GameState,slot:GearSlot):GameState{if(!state.character)return state;const old=state.character.equipment[slot];if(!old)return state;const eq={...state.character.equipment};delete eq[slot];const next={...state,inventory:{...state.inventory,stacks:stackItems(state.inventory.stacks,[{itemId:old,quantity:1}])},character:{...state.character,equipment:eq}} as GameState;next.character!.currentHp=Math.min(effectiveStats(next).hp,next.character!.currentHp);return next}
export function sellItem(state:GameState,itemId:string,quantity=1):GameState{if(!state.character||quantity<=0)return state;const discovered=discoverCharacterSkins(state),d=itemDef(itemId);if(d.value<=0)throw new Error(`${d.name} cannot be sold.`);if(d.type==='gear'&&hasEnhancement(discovered,itemId))throw new Error('Enhanced equipment is protected. Extract its gems before disposal; upgraded ranks cannot be recovered.');return {...discovered,inventory:{...discovered.inventory,stacks:consume(discovered.inventory.stacks,itemId,quantity)},character:{...discovered.character!,gold:discovered.character!.gold+d.value*quantity}}}
export function salvageItem(state:GameState,itemId:string):GameState{const discovered=discoverCharacterSkins(state),d=itemDef(itemId);if(d.type!=='gear'||!d.salvage)throw new Error('Cannot salvage');if(hasEnhancement(discovered,itemId))throw new Error('Enhanced equipment is protected. Extract its gems before disposal; upgraded ranks cannot be recovered.');return {...discovered,inventory:{...discovered.inventory,stacks:stackItems(consume(discovered.inventory.stacks,itemId,1),[d.salvage])}}}

export function depositToBank(state:GameState,itemId:string,quantity:number):GameState{
  state=discoverCharacterSkins(state);
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

export function startGathering(state:GameState,targetId:string,nowMs:number):GameState{if(!state.character)throw new Error('Create a character first');if(state.activity?.kind==='alchemy'||state.activity?.kind==='faith')throw new Error('Settle and stop the reserved activity first');const g=GATHERING.find(x=>x.id===targetId);if(!g)throw new Error('Unknown gathering target');const skill=state.skills.find(x=>x.skillId===g.skillId);if(!skill||skill.level<g.unlockLevel)throw new Error('Skill level too low');if(g.zoneId!==currentRegionId(state)){const zone=WORLD_ZONES.find(entry=>entry.id===g.zoneId);throw new Error(`Travel to ${zone?.name??g.zoneId} before gathering ${g.name}`)}return {...state,activity:{kind:g.skillId,targetId,startedAtMs:nowMs,lastClaimAtMs:nowMs,bonusSnapshot:characterPermanentMultipliers(state),progressFraction:0,environment:captureActivityEnvironment(targetId,nowMs)}}}
export function startHunting(state:GameState,targetId:string,nowMs:number){return startAdventureSkill(state,'hunting',targetId,nowMs)}
export function startExploration(state:GameState,targetId:string,nowMs:number){return startAdventureSkill(state,'exploration',targetId,nowMs)}
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
  if(state.activity?.kind==='alchemy'||state.activity?.kind==='faith')throw new Error('Finish or stop the reserved activity before crafting something else.');
  if(recipeId.startsWith('BREW_'))throw new Error('Alchemy recipes require a timed, reserved brewing batch.');
  const r=RECIPES.find(x=>x.id===recipeId);if(!r)throw new Error('Unknown recipe');
  if(r.classId&&r.classId!==state.character.classId)throw new Error('This recipe belongs to another class');
  if(state.character.level<(r.characterLevel??1))throw new Error(`Requires character level ${r.characterLevel}`);
  if(r.requiresCraftedItemId&&!state.character.craftedNoviceItemIds?.includes(r.requiresCraftedItemId))throw new Error(`Craft ${itemDef(r.requiresCraftedItemId).name} first`);
  if(r.eventRecipeSetId&&r.eventRecipeSlot&&!eventRecipeSlotUnlocked(state,r.eventRecipeSetId,r.eventRecipeSlot))throw new Error(`Unlock the ${r.eventRecipeSlot} event recipe on this account first.`);
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
  const xpKey=`xp:${r.skillId}`,rawXp=r.xp*multipliers.skillXpMultiplier+(state.rewardRemainders?.[xpKey]??0),earnedXp=Math.floor(rawXp+1e-10);
  const xp=sk.xp+earnedXp;
  const craftedCharacter=recordCraftedItem(state.character,r.output);
  let next={...state,rewardRemainders:{...state.rewardRemainders,[xpKey]:Math.max(0,rawXp-earnedXp)},character:{...craftedCharacter,gold:state.character.gold-r.gold,...(r.noviceSetId?{craftedNoviceItemIds:[...new Set([...(state.character.craftedNoviceItemIds??[]),r.output.itemId])]}:{})},inventory:{...state.inventory,stacks:inv},bank:{...state.bank,stacks:bank},skills:state.skills.map(x=>x.skillId===r.skillId?{...x,xp,level:levelFromXp(xp)}:x)} as GameState;
  if(r.eventRecipeSetId)next=unlockCompletedEventAppearance(next,r.eventRecipeSetId);
  return refreshQuests(grantEventActivity(next,'crafting',nowMs))
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
export function fallenKnightWinChance(state:GameState){const r=regionalReadiness(state).total;if(r<50)return .08;if(r<60)return .12;if(r<70)return .22;if(r<80)return .38;if(r<90)return .55;if(r<100)return .63;return .70;}
export function challengeFallenKnight(state:GameState,nowMs=Date.now()):{state:GameState;won:boolean;message:string}{
  if(!state.character)throw new Error('No character');
  if(state.character.level<25)return {state,won:false,message:'Reach level 25 first.'};
  if(state.defeatedBossIds.includes('FALLEN_KNIGHT'))return {state,won:true,message:'The Fallen Knight is already defeated.'};
  const q14=state.quests.find(q=>q.questId==='QST_014');if(q14 && q14.status==='locked')return {state,won:false,message:'Advance the Asterfall questline before challenging the Fallen Knight.'};
  if(state.activity?.kind==='alchemy'||state.activity?.kind==='faith')throw new Error('Settle and stop the reserved activity before challenging a boss.');
  const ready=regionalReadiness(state);const chance=fallenKnightWinChance(state);
  const roll=random01(`${state.character.id}:FALLEN_KNIGHT:${nowMs}`,0);const won=roll<chance;
  if(!won)return {state,won:false,message:`Fallen Knight repelled you. Readiness ${ready.total}/100 (gear ${ready.equipment}/35, food ${ready.food}/10, mastery ${ready.mastery}/10). Recommended: 80+.`};
  const xp=state.character.xp+3000;let next={...state,defeatedBossIds:[...state.defeatedBossIds,'FALLEN_KNIGHT'],character:{...state.character,gold:state.character.gold+900,xp,level:characterLevelFromXp(xp),currentHp:effectiveStats(state).hp},inventory:{...state.inventory,stacks:stackItems(state.inventory.stacks,[{itemId:'FALLEN_KNIGHT_SIGIL',quantity:1}])},activity:null} as GameState;
  const remainders={...(next.rewardRemainders??{})};
  const gain=awardClassSkillXp(next.character!,3000*characterPermanentMultipliers(state).skillXpMultiplier,normalizeTrainingFocus(state.character.trainingFocus),remainders);
  next={...next,character:gain.character,rewardRemainders:remainders};
  next={...next,account:{...next.account,companionEssence:(next.account.companionEssence??0)+40,bondstones:(next.account.bondstones??0)+1}};
  next=grantEquippedCompanionUse(next,'boss',1);
  next=recordAccountProgress(refreshQuests(grantEventActivity(next,'boss',nowMs)));return {state:next,won:true,message:`Fallen Knight defeated at readiness ${ready.total}/100. The road toward Sunscar is open.`}
}
