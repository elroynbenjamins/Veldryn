import type {GameState,RewardBundle} from './types';
import {grantProfessionMastery,type ProfessionMasteryRecord} from './profession-mastery-v40';
import {applyWeeklyOrderProgress,claimWeeklyCompletion,claimWeeklyOrder,generateWeeklyOrders,weeklyOrderWindow,type WeeklyOrdersState} from './weekly-orders-v41';
import {weeklyOrderCandidatesFromCurrentContent} from './launch-readiness-v47';
import {applyCrossSkillSnapshot,newCrossSkillState,type CrossSkillState} from './cross-skill-discoveries-v45';
import {applyCollectionSetSnapshot,collectionMemberKey,newCollectionSetState,type CollectionOwnershipSnapshot,type CollectionSetState} from './collection-sets-v45';
import {applyRareDiscoverySettlement,newRareDiscoveryState,type RareDiscoveryState,type RareDiscoverySource} from './rare-idle-discoveries-v46';
import {applyJournalSnapshot,newJournalState,type JournalState} from './adventurers-journal-v42';
import {applyPersonalRecord,type PersonalRecordEvent} from './personal-records-v43';
import {bestiaryProjection} from './bestiary-v40';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {MONSTERS} from '../content/monsters';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {WORLD_ZONES} from '../content/world-map';
import {random01} from './rng';
import {applyLocalBalanceSnapshot} from './balance-telemetry';

export interface TrustedProgressionActivity{kind:'combat'|'gathering'|'crafting'|'boss';contentId:string;units:number;startedAtMs?:number}
export interface TrustedProgressionOptions{accountId:string;eventId:string}
export interface TrustedProgressionResult{
 state:GameState;
 weeklyOrderCompletions:string[];
 journalAchievements:string[];
 journalTitles:string[];
 personalRecordUpdates:string[];
 crossSkillUnlocks:string[];
 collectionSetCompletions:string[];
 rareDiscoveryGrantRefs:string[];
}

function integerUnits(value:number){return Number.isFinite(value)?Math.max(0,Math.floor(value)):0}
function unique<T>(rows:T[]){return [...new Set(rows)]}
function trustedEventRegionId(event:TrustedProgressionActivity){
 if(event.kind==='combat'||event.kind==='boss'){const monster=MONSTERS.find(row=>row.id===event.contentId);return monster?WORLD_ZONES.find(zone=>zone.name===monster.zone)?.id:undefined;}
 if(event.kind==='gathering')return [...GATHERING,...HERB_NODES].find(row=>row.id===event.contentId)?.zoneId;
 return undefined;
}
function ensureWeeklyOrders(state:GameState,accountId:string,nowMs:number):WeeklyOrdersState{
 const window=weeklyOrderWindow(nowMs),existing=state.account.weeklyOrders;
 if(existing?.schemaVersion===41&&existing.accountId===accountId&&existing.weekKey===window.weekKey)return existing;
 return generateWeeklyOrders(accountId,nowMs,weeklyOrderCandidatesFromCurrentContent(state));
}
export function weeklyOrderBoardForState(state:GameState,nowMs=Date.now()){
 const accountId=state.account.longTermAccountScopeId??`local-account:${state.createdAtMs}`;
 return ensureWeeklyOrders(state,accountId,nowMs);
}
function ensureJournal(state:GameState,accountId:string):JournalState{
 const existing=state.account.journalState;
 return existing?.schemaVersion===42&&existing.accountId===accountId?existing:newJournalState(accountId);
}
function ensureCrossSkill(state:GameState,accountId:string):CrossSkillState{
 const existing=state.account.crossSkillState;
 return existing?.schemaVersion===45&&existing.accountId===accountId?existing:newCrossSkillState(accountId);
}
function ensureCollectionSets(state:GameState,accountId:string):CollectionSetState{
 const existing=state.account.collectionSetState;
 return existing?.schemaVersion===45&&existing.accountId===accountId?existing:newCollectionSetState(accountId);
}
function ensureRareDiscoveries(state:GameState,accountId:string):RareDiscoveryState{
 const existing=state.account.rareDiscoveryState;
 return existing?.schemaVersion===46&&existing.accountId===accountId?existing:newRareDiscoveryState(accountId);
}
function itemOwnershipKeys(state:GameState){
 const keys=new Set<string>(),addItem=(id?:string)=>{if(id)keys.add(collectionMemberKey({kind:'item',id}))};
 for(const stack of [...state.inventory.stacks,...state.bank.stacks,...state.overflow.stacks])if(stack.quantity>0)addItem(stack.itemId);
 for(const id of Object.values(state.character?.equipment??{}))addItem(id);
 for(const row of state.otherCharacters??[]){for(const stack of [...row.inventory.stacks,...row.overflow.stacks])if(stack.quantity>0)addItem(stack.itemId);for(const id of Object.values(row.character.equipment??{}))addItem(id)}
 return keys;
}
export function collectionOwnershipSnapshotFromGameState(state:GameState):CollectionOwnershipSnapshot{
 const keys=itemOwnershipKeys(state);
 const add=(kind:'pet'|'companion'|'skin'|'background'|'border'|'bestiary',ids:readonly string[]|undefined)=>{for(const id of ids??[])keys.add(collectionMemberKey({kind,id}))};
 add('pet',unique([...(state.account.unlockedCosmeticPetIds??[]),...(state.character?.ownedPetIds??[]),...(state.otherCharacters??[]).flatMap(row=>row.character.ownedPetIds??[])]));
 add('companion',state.account.unlockedCombatCompanionIds);
 add('skin',unique([...(state.account.unlockedEventSkinIds??[]),...(state.character?.unlockedSkinIds??[]),...(state.otherCharacters??[]).flatMap(row=>row.character.unlockedSkinIds??[])]));
 add('background',state.account.unlockedProfileBackgroundIds);add('border',state.account.unlockedProfileBorderIds);
 add('bestiary',bestiaryProjection(state).entries.filter(row=>row.status!=='unknown').map(row=>row.id));
 return {ownedKeys:Object.fromEntries([...keys].map(key=>[key,true]))};
}
function combinedAccountSkillLevels(state:GameState){
 const active=state.skills.reduce((sum,row)=>sum+row.level,0)+(state.character?.classSkills??[]).reduce((sum,row)=>sum+row.level,0);
 return active+(state.otherCharacters??[]).reduce((sum,row)=>sum+row.skills.reduce((a,b)=>a+b.level,0)+(row.character.classSkills??[]).reduce((a,b)=>a+b.level,0),0);
}
function companionCollectionPercent(state:GameState){const total=COMBAT_COMPANIONS.length,owned=state.account.unlockedCombatCompanionIds?.length??0;return total?Math.min(100,Math.round(owned/total*100)):100}
function journalMetrics(state:GameState){
 const metrics={...(state.account.longTermMetrics??{})};
 metrics['account.combined_skill_levels']=combinedAccountSkillLevels(state);
 metrics['bestiary.completion_percent']=bestiaryProjection(state).completionPercent;
 metrics['companions.collection_percent']=companionCollectionPercent(state);
 return metrics;
}
function updateRecord(journal:JournalState,event:PersonalRecordEvent,changed:string[]){
 const previous=journal.records[event.recordId],result=applyPersonalRecord(previous,event);
 if(result.changed&&result.entry){journal.records[event.recordId]=result.entry;changed.push(event.recordId)}
}
function settlementRecords(journal:JournalState,reward:RewardBundle|undefined,eventId:string,nowMs:number,characterId:string|undefined){
 if(!reward||reward.elapsedSeconds<=0)return [] as string[];const changed:string[]=[],base={eventId,achievedAtMs:nowMs,...(characterId?{characterId}:{})};
 const totalItems=reward.items.reduce((sum,row)=>sum+row.quantity,0),events:PersonalRecordEvent[]=[
  {...base,eventId:`${eventId}:duration`,recordId:'longest_activity_seconds',value:reward.elapsedSeconds},
  {...base,eventId:`${eventId}:actions`,recordId:'most_actions_single_settlement',value:reward.kills},
  {...base,eventId:`${eventId}:xp`,recordId:'most_xp_single_settlement',value:reward.xp},
  {...base,eventId:`${eventId}:gold`,recordId:'most_gold_single_settlement',value:reward.gold},
  {...base,eventId:`${eventId}:items`,recordId:'most_items_single_settlement',value:totalItems},
 ];
 for(const event of events)if(event.value>0)updateRecord(journal,event,changed);return changed;
}
function sourceKind(event:TrustedProgressionActivity):RareDiscoverySource|undefined{
 if(event.kind==='combat'||event.kind==='boss')return 'combat';
 if(event.kind==='gathering'){const id=event.contentId.toUpperCase();if(id.includes('FISH')||id.includes('POOL')||id.includes('RIVER')||id.includes('LAKE'))return 'fishing';if(id.includes('TREE')||id.includes('LOG')||id.includes('WOOD'))return 'woodcutting';if(id.includes('HERB')||id.includes('MINT')||id.includes('LEAF'))return 'herbalism';return 'mining'}return undefined;
}

export function applyTrustedLongTermProgression(input:GameState,events:TrustedProgressionActivity[],reward:RewardBundle|undefined,nowMs:number,options:TrustedProgressionOptions):TrustedProgressionResult{
 let state=input;const account={...state.account},metrics={...(account.longTermMetrics??{})},mastery={...(account.professionMasteryByAction??{})};state={...state,account:{...account,longTermMetrics:metrics,professionMasteryByAction:mastery}};
 const weekly=ensureWeeklyOrders(state,options.accountId,nowMs),weeklyCompleted:string[]=[],pending=[...(state.account.weeklyOrderPendingRewards??[])],pendingKeys=new Set(pending.map(row=>row.claimKey));
 const wasComplete=new Set(weekly.orders.filter(row=>row.progress>=row.target).map(row=>row.id));
 for(const event of events){const units=integerUnits(event.units);if(!units)continue;
  if(event.kind==='combat'||event.kind==='boss')metrics['combat.total_kills']=(metrics['combat.total_kills']??0)+units;
  if(event.kind==='gathering'||event.kind==='crafting'){metrics['profession.actions_completed']=(metrics['profession.actions_completed']??0)+units;mastery[event.contentId]=grantProfessionMastery(mastery[event.contentId] as ProfessionMasteryRecord|undefined,event.contentId,units,nowMs)}
  if(event.kind==='combat')applyWeeklyOrderProgress(weekly,{eventId:`${options.eventId}:${event.kind}:${event.contentId}`,characterId:state.character?.id??'unknown',kind:'hunt',targetId:event.contentId,amount:units,completedAtMs:nowMs});
  if(event.kind==='gathering'||event.kind==='crafting')applyWeeklyOrderProgress(weekly,{eventId:`${options.eventId}:${event.kind}:${event.contentId}`,characterId:state.character?.id??'unknown',kind:'profession',targetId:event.contentId,amount:units,completedAtMs:nowMs});
  const regionId=trustedEventRegionId(event);if(regionId)applyWeeklyOrderProgress(weekly,{eventId:`${options.eventId}:regional:${regionId}:${event.kind}:${event.contentId}`,characterId:state.character?.id??'unknown',kind:'regional',targetId:regionId,amount:units,completedAtMs:nowMs});
 }
 for(const order of weekly.orders){if(order.progress>=order.target&&!wasComplete.has(order.id)){weeklyCompleted.push(order.id);metrics['weekly_orders.completed']=(metrics['weekly_orders.completed']??0)+1}if(order.progress>=order.target&&!order.claimed){const claim=claimWeeklyOrder(weekly,order.id);if(!pendingKeys.has(claim.claimKey)){pending.push({claimKey:claim.claimKey,rewardRef:claim.reward.rewardRef,label:claim.reward.label,weekKey:claim.weekKey,orderId:claim.orderId});pendingKeys.add(claim.claimKey)}}}
 if(weekly.orders.length&&weekly.orders.every(row=>row.progress>=row.target)&&!weekly.completionClaimed){const claim=claimWeeklyCompletion(weekly);if(!pendingKeys.has(claim.claimKey)){pending.push({claimKey:claim.claimKey,rewardRef:claim.reward.rewardRef,label:claim.reward.label,weekKey:claim.weekKey});pendingKeys.add(claim.claimKey)}}
 state={...state,account:{...state.account,weeklyOrders:weekly,weeklyOrderPendingRewards:pending.slice(-100),longTermMetrics:metrics,professionMasteryByAction:mastery}};

 const cross=ensureCrossSkill(state,options.accountId),crossResult=state.character?applyCrossSkillSnapshot(cross,state.character.id,{skillLevels:Object.fromEntries(state.skills.map(row=>[row.skillId,row.level]))},nowMs):{newlyUnlockedDiscoveryIds:[],grants:[]};
 const knowledge=unique([...(state.account.unlockedKnowledgeIds??[]),...crossResult.grants.map(row=>row.reward.ref)]);
 const collections=ensureCollectionSets(state,options.accountId),collectionResult=applyCollectionSetSnapshot(collections,collectionOwnershipSnapshotFromGameState(state),nowMs);
 const collectionRewards=unique([...(state.account.unlockedCollectionRewardIds??[]),...collectionResult.grants.map(row=>row.reward.ref)]);
 let rare=state.account.rareDiscoveryState;
 const rareGrantRefs:string[]=[];
 if(events.length&&state.character){rare=ensureRareDiscoveries(state,options.accountId);const owned=Object.fromEntries([...itemOwnershipKeys(state)].map(key=>[key.replace(/^item:/,''),true as const])) as Record<string,true>;for(const event of events){const kind=sourceKind(event);if(!kind||!event.startedAtMs)continue;const elapsed=Math.max(0,Math.floor((nowMs-event.startedAtMs)/1000));const result=applyRareDiscoverySettlement(rare,{eventId:`${options.eventId}:${event.kind}:${event.contentId}`,accountId:options.accountId,characterId:state.character.id,sourceKind:kind,activityId:event.contentId,settlementKind:'offline',elapsedSeconds:elapsed,actions:integerUnits(event.units),settledAtMs:nowMs},owned,key=>Math.floor(random01(key,0)*10000));rareGrantRefs.push(...result.grants.map(row=>row.reward.ref))}}

 const journal=ensureJournal(state,options.accountId),recordUpdates=settlementRecords(journal,reward,options.eventId,nowMs,state.character?.id),journalResult=applyJournalSnapshot(journal,{metrics:journalMetrics({...state,account:{...state.account,longTermMetrics:metrics}})},nowMs);
 state={...state,account:{...state.account,crossSkillState:cross,collectionSetState:collections,...(rare?{rareDiscoveryState:rare}:{}),journalState:journal,unlockedKnowledgeIds:knowledge,unlockedCollectionRewardIds:collectionRewards}};
 state=applyLocalBalanceSnapshot(state,nowMs);
 return {state,weeklyOrderCompletions:weeklyCompleted,journalAchievements:journalResult.newlyUnlockedAchievementIds,journalTitles:journalResult.newlyUnlockedTitleIds,personalRecordUpdates:recordUpdates,crossSkillUnlocks:crossResult.newlyUnlockedDiscoveryIds,collectionSetCompletions:collectionResult.newlyCompletedSetIds,rareDiscoveryGrantRefs:rareGrantRefs};
}
