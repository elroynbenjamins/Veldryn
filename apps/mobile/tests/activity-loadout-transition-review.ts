import assert from 'node:assert/strict';
import {createCharacter,newGame,claimActivity} from '../src/core/game';
import {unlockCollectible,selectCollectible,collectionBonusBreakdown} from '../src/core/collectibles';
import {updateFaithPreference} from '../src/core/faith';
import {totalXpAtLevel} from '../src/core/progression';
import {captureActivityLoadoutSelections,saveActivityLoadoutReview,applyActivityLoadoutSelectionsReview,reviewActivityLoadoutTransition} from '../src/core/activity-loadout-transition-review';
let state=createCharacter(newGame(1000),'IRONWARDEN','Loadout QA');
state={...state,quests:state.quests.map(q=>q.questId==='QST_003'?{...q,status:'claimed' as const}:q),
 character:{...state.character!,faith:{favoriteBlessingIds:['EMBER_VOW'],hideWeakerBlessings:false,xp:totalXpAtLevel(40)}},
 account:{...state.account,entitlements:{vip:true,vip_plus:true}}};
state=unlockCollectible(unlockCollectible(state,'PET_001'),'PET_018');
state=selectCollectible(state,'pet','PET_001');
state=updateFaithPreference(updateFaithPreference(state,'blessing','EMBER_VOW'),'blessing','VERDANT_WHISPER');
state=saveActivityLoadoutReview(state,0,'Woodcutting',1000);
const first=captureActivityLoadoutSelections(state);
assert.equal(first.petId,'PET_001');assert.equal(first.faithSelections?.combat,'EMBER_VOW');
assert.equal(first.faithSelections?.gathering,'VERDANT_WHISPER');
state=selectCollectible(state,'pet','PET_018');
state=updateFaithPreference(state,'blessing','SUNFIRE_VOW');
state=saveActivityLoadoutReview(state,1,'Combat',1000);
const second=captureActivityLoadoutSelections(state);
assert.equal(state.character?.savedLoadouts?.[0].petId,first.petId);
assert.deepEqual(state.character?.savedLoadouts?.[1].faithSelections,second.faithSelections);
const before=JSON.stringify(state);
const selection=applyActivityLoadoutSelectionsReview(state,first,1000);
assert.equal(selection.character?.selectedCosmeticPetId,'PET_001');
assert.equal(selection.character?.faith?.selectedBlessingIds?.combat,'EMBER_VOW');
assert.equal(selection.character?.faith?.selectedBlessingIds?.gathering,'VERDANT_WHISPER');
assert.deepEqual(selection.character?.faith?.favoriteBlessingIds,['EMBER_VOW']);
assert.equal(selection.character?.faith?.hideWeakerBlessings,false);
assert.equal(selection.character?.faith?.xp,state.character?.faith?.xp);
assert.deepEqual(selection.account.unlockedCosmeticPetIds,state.account.unlockedCosmeticPetIds);
const passive=(s:typeof state)=>collectionBonusBreakdown(s).map(x=>[x.target,x.ownedAppliedBps]).sort();
assert.deepEqual(passive(selection),passive(state));
assert.equal(JSON.stringify(state),before);
assert.equal(applyActivityLoadoutSelectionsReview(state,{},1000).character?.selectedCosmeticPetId,'PET_018');
assert.equal(applyActivityLoadoutSelectionsReview(state,{petId:null,faithSelections:{}},1000).character?.selectedCosmeticPetId,undefined);
assert.throws(()=>applyActivityLoadoutSelectionsReview(state,{petId:'PET_042'},1000));
assert.throws(()=>applyActivityLoadoutSelectionsReview(state,{faithSelections:{gathering:'EMBER_VOW'}},1000));
assert.throws(()=>applyActivityLoadoutSelectionsReview(state,{faithSelections:{combat:'DAWN_COVENANT'}},1000));
const bindings=[{category:'woodcutting' as const,slotIndex:0,presetId:'loadout-1'},
 {category:'combat' as const,slotIndex:1,presetId:'loadout-2'}];
const config={autoSwitch:true,bindings,
 verifyNoFrozenEncounter:()=>true};
const wood=reviewActivityLoadoutTransition({...config,state,nowMs:2000,target:{kind:'gathering',id:'GREENWOOD_TREE'}});
assert.equal(wood.state.activity?.kind,'woodcutting');
assert.equal(wood.state.character?.selectedCosmeticPetId,'PET_001');
assert.equal(wood.state.character?.equippedFoodId,state.character?.equippedFoodId);
assert.equal(wood.persisted,false);
const expected=claimActivity(JSON.parse(JSON.stringify(wood.state)),62000);
const combat=reviewActivityLoadoutTransition({...config,state:wood.state,nowMs:62000,target:{kind:'combat',id:'MOSS_RAT'}});
assert.equal(combat.state.activity?.kind,'combat');
assert.equal(combat.state.character?.selectedCosmeticPetId,'PET_018');
assert.equal(combat.state.character?.faith?.selectedBlessingIds?.combat,'SUNFIRE_VOW');
assert.deepEqual(combat.reward,expected.reward);
assert.equal(combat.state.activity?.startedAtMs,62000);
const snapshot=JSON.stringify(wood.state);
assert.throws(()=>reviewActivityLoadoutTransition({...config,state:wood.state,nowMs:62000,target:{kind:'combat',id:'MOSS_RAT'},verifyNoFrozenEncounter:()=>false}));
const invalidSaved={...wood.state,character:{...wood.state.character!,savedLoadouts:wood.state.character!.savedLoadouts?.map(row=>row.id==='loadout-2'?{...row,petId:'PET_042'}:row)}};
assert.throws(()=>reviewActivityLoadoutTransition({...config,state:invalidSaved,nowMs:62000,target:{kind:'combat',id:'MOSS_RAT'}}));
assert.equal(JSON.stringify(wood.state),snapshot);
assert.throws(()=>reviewActivityLoadoutTransition({...config,state:wood.state,nowMs:62000,target:{kind:'combat',id:'MOSS_RAT'},bindings:[bindings[0]]}));
assert.equal(JSON.stringify(state),before);
console.log('ACTIVITY_LOADOUT_TRANSITION_REVIEW: actual reducers, grouped Faith, pet/passive preservation, prior settlement parity, failed transition leaves input unchanged');

import {enqueueActivity} from '../src/core/activity-queue';
import {reviewActivityLoadoutQueueStart,reviewActivityLoadoutOfflineClaim} from '../src/core/activity-loadout-transition-review';
let queued=enqueueActivity(state,{kind:'gathering',targetId:'GREENWOOD_TREE',goal:{kind:'duration_seconds',value:60}});
queued=enqueueActivity(queued,{kind:'combat',targetId:'MOSS_RAT',goal:{kind:'duration_seconds',value:60}});
const queueInitial=reviewActivityLoadoutQueueStart(queued,2000,config).state;
assert.equal(queueInitial.activity?.kind,'woodcutting');
assert.equal(queueInitial.character?.selectedCosmeticPetId,'PET_001');
const queueSnapshot=JSON.stringify(queueInitial);
const queueBoundary=reviewActivityLoadoutOfflineClaim(queueInitial,62000,config);
assert.equal(queueBoundary.state.activity?.kind,'combat');
assert.equal(queueBoundary.state.activity?.startedAtMs,62000);
assert.equal(queueBoundary.state.character?.selectedCosmeticPetId,'PET_018');
const queueLate=reviewActivityLoadoutOfflineClaim(queueInitial,92000,config);
assert.equal(queueLate.state.activity?.kind,'combat');
assert.equal(queueLate.state.character?.faith?.selectedBlessingIds?.combat,'SUNFIRE_VOW');
assert.equal(queueLate.reward.activityResults?.some(row=>row.activity.kind==='woodcutting'),true);
assert.equal(queueLate.reward.activityResults?.some(row=>row.activity.kind==='combat'),true);
const queueSplit=reviewActivityLoadoutOfflineClaim(queueBoundary.state,92000,config);
assert.deepEqual(queueLate.state.character?.equipment,queueSplit.state.character?.equipment);
assert.equal(queueLate.state.character?.xp,queueSplit.state.character?.xp);
assert.equal(queueLate.state.character?.gold,queueSplit.state.character?.gold);
assert.deepEqual(queueLate.state.inventory,queueSplit.state.inventory);
assert.equal(JSON.stringify(queueInitial),queueSnapshot);
const paused=reviewActivityLoadoutOfflineClaim(queueInitial,62000,{...config,bindings:[bindings[0]]});
assert.equal(paused.state.activity,null);
assert.equal(paused.state.character?.activityQueue?.length,1);
assert.equal(paused.state.character?.activityQueuePausedReason,'loadout_combat_setup_confirmation_required');
assert.equal(paused.state.character?.selectedCosmeticPetId,'PET_001');
assert.throws(()=>reviewActivityLoadoutOfflineClaim(queueInitial,62000,{...config,verifyNoFrozenEncounter:()=>false}));
console.log('ACTIVITY_LOADOUT_QUEUE_REVIEW: actual offline handoffs, split claim parity, missing combat preset pause and reservation fence');

import {reviewSaveInactiveLoadout} from '../src/core/activity-loadout-editor-review';
const beforeEdit=JSON.stringify(wood.state);
const oldCombat=wood.state.character!.savedLoadouts!.find(row=>row.slotIndex===1)!;
const edited=reviewSaveInactiveLoadout(wood.state,1,{name:'Combat alternate',
 equipment:oldCombat.equipment,equipmentInstanceIds:oldCombat.equipmentInstanceIds??{},
 petId:'PET_018',faithSelections:{combat:'SUNFIRE_VOW'}},3000);
assert.equal(edited.preset.name,'Combat alternate');
assert.equal(edited.preset.petId,'PET_018');
assert.deepEqual(edited.state.activity,wood.state.activity);
assert.deepEqual(edited.state.inventory,wood.state.inventory);
assert.deepEqual(edited.state.account,wood.state.account);
assert.deepEqual(edited.state.character?.equipment,wood.state.character?.equipment);
assert.equal(edited.state.character?.selectedCosmeticPetId,'PET_001');
assert.deepEqual(edited.state.character?.faith,wood.state.character?.faith);
assert.equal(edited.applied,false);
assert.equal(JSON.stringify(wood.state),beforeEdit);
assert.throws(()=>reviewSaveInactiveLoadout(wood.state,1,{name:'Bad',equipment:{weapon:'not-an-item'},equipmentInstanceIds:{}},3000));
assert.throws(()=>reviewSaveInactiveLoadout(wood.state,4,{name:'Locked',equipment:{},equipmentInstanceIds:{}},3000));
assert.throws(()=>reviewSaveInactiveLoadout(wood.state,1,{name:'Bad',equipment:{},equipmentInstanceIds:{},petId:'PET_042'},3000));
console.log('ACTIVITY_LOADOUT_EDITOR_REVIEW: inactive save only, current activity/gear/pet/Faith/inventory unchanged, invalid selection rejected');

import {reviewCombatLoadoutReservation,activityLoadoutSnapshotDigest,type LoadoutEncounterKind} from '../../../backend/online/activity-loadout-reservation-review';
const reservationKinds:LoadoutEncounterKind[]=['dungeon','guild_boss','world_boss','party_event','regional_final_boss'];
const reserveState=selection;
const reserveOriginal=JSON.stringify(reserveState);
const sourceDigest=activityLoadoutSnapshotDigest(reserveState);
const scope={accountId:'qa-account',characterId:reserveState.character!.id,sourceRevision:7,reservationId:'qa-reservation',encounterKind:'dungeon' as LoadoutEncounterKind};
const reserveInput={state:reserveState,nowMs:1000,scope,config,
 verifyPersistedState:(s:typeof scope,d:string)=>s.accountId===scope.accountId&&s.sourceRevision===7&&d===sourceDigest,
 verifyReservationCustody:()=>true};
for(const encounterKind of reservationKinds){
 const request={...reserveInput,scope:{...scope,encounterKind}};
 const prepared=reviewCombatLoadoutReservation(request);
 assert.equal(prepared.projection.presetId,'loadout-2');
 assert.equal(prepared.projection.petId,'PET_018');
 assert.equal(prepared.projection.faithSelections.combat,'SUNFIRE_VOW');
 assert.equal(prepared.canReserve,false);
 assert.equal(prepared.canAuthorizeCombat,false);
 assert.equal(prepared.persisted,false);
 assert.equal(prepared.digest,reviewCombatLoadoutReservation(request).digest);
 assert.equal(Boolean(prepared.dungeonRecord),encounterKind==='dungeon');
 assert.equal(JSON.stringify(reserveState),reserveOriginal);
}
assert.throws(()=>reviewCombatLoadoutReservation({...reserveInput,scope:{...scope,sourceRevision:8}}));
assert.throws(()=>reviewCombatLoadoutReservation({...reserveInput,scope:{...scope,accountId:'foreign'}}));
assert.throws(()=>reviewCombatLoadoutReservation({...reserveInput,verifyReservationCustody:()=>false}));
assert.throws(()=>reviewCombatLoadoutReservation({...reserveInput,config:{...config,verifyNoFrozenEncounter:()=>false}}));
assert.throws(()=>reviewCombatLoadoutReservation({...reserveInput,config:{...config,bindings:[bindings[0]]}}));
assert.throws(()=>reviewCombatLoadoutReservation({...reserveInput,state:wood.state}));
console.log('ACTIVITY_LOADOUT_RESERVATION_REVIEW: all five encounter scopes, actual dungeon record, exact copy custody guard, no mutation or authorization');

import {reviewActivityLoadoutUnlocks,type RegionalLoadoutUnlockProof} from '../src/core/activity-loadout-unlocks-review';
const regionalProof:RegionalLoadoutUnlockProof={accountId:'qa-account',characterId:'qa-character',
 region:'sunscar',encounterId:'qa-sunscar-final',settlementId:'qa-victory-1',
 outcome:'victory',encounterKind:'regional_final_boss',status:'committed'};
const frostProof:RegionalLoadoutUnlockProof={...regionalProof,region:'frostmarch',
 encounterId:'qa-frostmarch-final',settlementId:'qa-victory-2',characterId:'qa-other-character'};
const unlockContext={accountId:'qa-account',premiumSlots:0,
 finalBossIds:{sunscar:'qa-sunscar-final',frostmarch:'qa-frostmarch-final'},verifyPersisted:()=>true};
for(let premiumSlots=0;premiumSlots<=2;premiumSlots++)for(const proofs of [[],[regionalProof],[regionalProof,frostProof]]){
 const result=reviewActivityLoadoutUnlocks({...unlockContext,premiumSlots,proofs});
 assert.equal(result.slotCount,1+premiumSlots+proofs.length);
 assert.equal(result.canGrantSlots,false);
}
assert.equal(reviewActivityLoadoutUnlocks({...unlockContext,proofs:[regionalProof,regionalProof,
 {...regionalProof,settlementId:'qa-victory-3'},frostProof]}).slotCount,3);
for(const invalid of [
 {...unlockContext,proofs:[{...regionalProof,accountId:'foreign'}]},
 {...unlockContext,proofs:[{...regionalProof,encounterId:'qa-dungeon-boss'}]},
 {...unlockContext,proofs:[regionalProof],finalBossIds:{sunscar:null,frostmarch:null}},
 {...unlockContext,proofs:[regionalProof],verifyPersisted:()=>false},
 {...unlockContext,proofs:[regionalProof,{...frostProof,settlementId:regionalProof.settlementId}]},
]){
 let rejected=false;try{reviewActivityLoadoutUnlocks(invalid);}catch{rejected=true;}
 assert.equal(rejected,true);
}
console.log('ACTIVITY_LOADOUT_UNLOCK_REVIEW: 9 progression/entitlement cases, repeated victories, foreign and unverified proof rejected; no grants');

import {savedLoadoutProtection} from '../src/core/activity-loadout-protection';
import {canDisposeLegacyEquipment} from '../src/core/equipment-enhancement';
import {normalizeCharacterLoadouts,saveCharacterLoadout,applyCharacterLoadout,deleteCharacterLoadout} from '../src/core/character-loadouts';
const savedCombat=state.character!.savedLoadouts!.find(row=>row.slotIndex===1)!;
const gearId=savedCombat.equipment.weapon!;
assert.ok(gearId);
const downgraded={...state,account:{...state.account,entitlements:{}},
 character:{...state.character!,savedLoadouts:[{...savedCombat,slotIndex:4,id:'loadout-5'}]}};
assert.equal(normalizeCharacterLoadouts(downgraded.character.savedLoadouts,downgraded.character.classId).length,1);
assert.equal(normalizeCharacterLoadouts(downgraded.character.savedLoadouts,downgraded.character.classId,1).length,0);
assert.throws(()=>applyCharacterLoadout(downgraded,'loadout-5'));
const afterSave=saveCharacterLoadout(downgraded,0,'New active preset',3000);
assert.equal(afterSave.character?.savedLoadouts?.length,2);
assert.equal(deleteCharacterLoadout(afterSave,'loadout-5').character?.savedLoadouts?.length,2);
assert.equal(savedLoadoutProtection(downgraded,gearId).protected,true);
const legacyStock={...downgraded,inventory:{...downgraded.inventory,stacks:[{itemId:gearId,quantity:3}]}};
assert.equal(canDisposeLegacyEquipment(legacyStock,gearId,'inventory',1),false);
const exactRef={...downgraded,character:{...downgraded.character,savedLoadouts:[{...savedCombat,equipment:{weapon:gearId},equipmentInstanceIds:{weapon:'copy-qa'}}]}};
assert.equal(savedLoadoutProtection(exactRef,gearId,'copy-qa').protected,true);
assert.equal(savedLoadoutProtection(exactRef,gearId,'copy-other').protected,false);
assert.equal(savedLoadoutProtection(exactRef,gearId).protected,false);
console.log('ACTIVITY_LOADOUT_PROTECTION: locked slots retained, legacy references protected, unrelated exact copies remain independent');

import {reviewGatheringSpeedV2,gatheringSpeedEffectiveRatingV2,reviewGatheringRewardChannelsV2} from '../src/core/gathering-speed-v2-review';
for(const [raw,effective] of [[0,0],[10000,10000],[15000,13750],[20000,17500],[25000,20000]]){
 assert.equal(gatheringSpeedEffectiveRatingV2(raw),effective);
}
for(const toolTimeMultiplier of [1.15,1,.8,.5,.2])for(const existingRateMultiplier of [1,1.1,1.5,2]){
 let previous=Infinity;
 for(let gearRatingBps=0;gearRatingBps<=30000;gearRatingBps+=100){
  const result=reviewGatheringSpeedV2({baseActionSeconds:10,toolTimeMultiplier,existingRateMultiplier,gearRatingBps,setTimeMultiplier:1});
  assert.ok(result.actionSeconds<previous&&result.actionSeconds>0);
  assert.equal(result.releaseReady,false);
  if(gearRatingBps===0)assert.equal(result.actionSeconds,10*toolTimeMultiplier/existingRateMultiplier);
  previous=result.actionSeconds;
 }
}
const gearPace=reviewGatheringSpeedV2({baseActionSeconds:10,toolTimeMultiplier:.2,existingRateMultiplier:1,gearRatingBps:10000,setTimeMultiplier:.96});
assert.equal(gearPace.setRatingBps,417);
assert.ok(gearPace.actionSeconds<1&&gearPace.actionSeconds>0);
assert.throws(()=>gatheringSpeedEffectiveRatingV2(-1));
assert.throws(()=>reviewGatheringSpeedV2({baseActionSeconds:10,toolTimeMultiplier:0,existingRateMultiplier:1,gearRatingBps:0,setTimeMultiplier:1}));
console.log('GATHERING_SPEED_V2_REVIEW: 6020 monotonic pace cases; preserve legacy tool/buff baseline and positive action times');

import {reviewGatheringSettlementV2,type FrozenGatheringRateReview} from '../../../backend/online/gathering-speed-settlement-review';
const frozenGathering:FrozenGatheringRateReview={accountId:'qa-account',characterId:wood.state.character!.id,
 activityId:'qa-activity',skill:'woodcutting',targetId:'GREENWOOD_TREE',startedAtMs:2000,
 gearRatingBps:0,matchingSetPieces:0,exactCopyIds:[],equippedReceiptDigest:'a'.repeat(64)};
const gatherSource=JSON.stringify(wood.state);
let lastActions=-1;
for(const gearRatingBps of [0,5000,10000,15000,20000,25000,30000]){
 const frozen={...frozenGathering,gearRatingBps,matchingSetPieces:gearRatingBps?10:0,
 exactCopyIds:gearRatingBps?Array.from({length:10},(_,i)=>'qa-copy-'+i):[]};
 const stateDigest=activityLoadoutSnapshotDigest(wood.state),frozenDigest=activityLoadoutSnapshotDigest(frozen);
 const input={accountId:'qa-account',state:wood.state,nowMs:602000,sourceRevision:7,frozen,
 verifyPersisted:(account:string,revision:number,stateHash:string,rateHash:string)=>account==='qa-account'&&revision===7&&stateHash===stateDigest&&rateHash===frozenDigest};
 const result=reviewGatheringSettlementV2(input);
 assert.equal(result.preview.kills,result.candidateReward.kills);
 assert.equal(result.preview.xp,result.candidateReward.xp);
 assert.ok(result.candidateReward.kills>lastActions);
 if(!gearRatingBps)assert.deepEqual(result.candidateReward,result.baselineReward);
 else assert.ok(result.candidateReward.kills>result.baselineReward.kills);
 assert.equal(result.persisted,false);assert.equal(result.rewardGranted,false);
 assert.equal(result.candidateReward.elapsedSeconds,result.baselineReward.elapsedSeconds);
 assert.equal(JSON.stringify(wood.state),gatherSource);
 lastActions=result.candidateReward.kills;
 console.log('GATHERING_SETTLEMENT_RATE',JSON.stringify({gearRatingBps,effective:result.pace.effectiveRatingBps,baselineActions:result.baselineReward.kills,reviewActions:result.candidateReward.kills,xp:result.candidateReward.xp}));
 assert.throws(()=>reviewGatheringSettlementV2({...input,frozen:{...frozen,startedAtMs:1000}}));
 assert.throws(()=>reviewGatheringSettlementV2({...input,frozen:{...frozen,gearRatingBps:gearRatingBps+100}}));
 assert.throws(()=>reviewGatheringSettlementV2({...input,verifyPersisted:()=>false}));
}
console.log('GATHERING_SETTLEMENT_REVIEW: actual 10-minute reward engine, unchanged elapsed time, preview/settlement action and XP parity, independent frozen receipt fence');

import {GATHERING,RECIPES} from '../src/content/skills';
import {GATHERING_TOOLS} from '../src/content/gathering-tools';
import {WORLD_ZONES} from '../src/content/world-map';
import {startGathering} from '../src/core/game';
import {gatheringToolEffects} from '../src/core/gathering-tools';
import type {GatheringGearSkillV2} from '../src/core/gathering-speed-v2-review';
// Representative resource bands, NOT final EQ2 equip requirements.
// The existing catalogue has four tool tiers, not five.
const bands=[
 {tier:1,level:3,nodes:['GREENFIELDS_COPPER_OUTCROP','GREENWOOD_TREE','MEADOW_PERCH_POOL'],recipe:'SMELT_COPPER_INGOT'},
 {tier:2,level:10,nodes:['ASTER_IRON_VEIN','IRONWOOD_TREE','ROOTSTREAM_TROUT_POOL'],recipe:'SMELT_ASTER_IRON_INGOT'},
 {tier:3,level:20,nodes:['OATHSTONE_SEAM','CROWNWOOD_TREE','OATHSCALE_POOL'],recipe:'SMELT_OATHSTONE_INGOT'},
 {tier:4,level:35,nodes:['SUNSTONE_OUTCROP','DUNEWOOD_TREE','OASIS_CARP_POOL'],recipe:'SMELT_SUNSTONE_INGOT'},
 {tier:5,level:50,nodes:['FROSTIRON_VEIN','WHITEPINE_TREE','ICEFISH_POOL'],recipe:'SMELT_FROSTIRON_INGOT'},
] as const;
const gearArms=[
 {name:'none',pieces:0,perPiece:0},
 {name:'common_1',pieces:1,perPiece:1000},
 {name:'common_3',pieces:3,perPiece:1000},
 {name:'common_5',pieces:5,perPiece:1000},
 {name:'common_8',pieces:8,perPiece:1000},
 {name:'common_10',pieces:10,perPiece:1000},
 {name:'rare_10',pieces:10,perPiece:1280},
 {name:'epic_10',pieces:10,perPiece:1500},
 {name:'mythic_10',pieces:10,perPiece:2000},
 {name:'mythic_q100_10',pieces:10,perPiece:2500},
] as const;
const matrixRows:{tier:number;skill:string;toolMode:string;arm:string;primaryItem:string;primaryQuantity:number;actions:number;xp:number;rate:number;baselineActions:number}[]=[];
const startMs=Date.UTC(2026,10,27,10);
for(const band of bands)for(const targetId of band.nodes)for(const toolMode of ['none','eligible_tiers'] as const){
 const node=GATHERING.find(x=>x.id===targetId)!;
 assert.ok(node&&node.skillId!=='herbalism');
 const skill=node.skillId as GatheringGearSkillV2;
 let base=createCharacter(newGame(startMs),'IRONWARDEN','Gathering QA');
 const zone=WORLD_ZONES.find(z=>z.id===node.zoneId)!;
 const characterLevel=Math.max(band.level,zone.minLevel);
 const equipped=toolMode==='eligible_tiers'?GATHERING_TOOLS.filter(t=>t.skillId===skill&&t.unlockLevel<=band.level&&t.requiredCharacterLevel<=characterLevel):[];
 base={...base,currentRegionId:node.zoneId,defeatedBossIds:['FALLEN_KNIGHT'],exploredRouteIds:['SCOUT_IRONWOOD','SCOUT_OLD_MINES','SCOUT_KINGS_ROAD','SCOUT_SUNSCAR'],skills:base.skills.map(row=>row.skillId===skill?{...row,level:band.level,xp:totalXpAtLevel(band.level)}:row),
  character:{...base.character!,level:characterLevel,xp:totalXpAtLevel(characterLevel),equippedToolIdsByTier:{[skill]:Object.fromEntries(equipped.map(t=>[t.tier,t.id]))}}};
 const started=startGathering(base,targetId,startMs);
 const source=activityLoadoutSnapshotDigest(started);
 const tool=gatheringToolEffects(started,skill);
 let previous=-1;
 for(const arm of gearArms){
  const frozen:FrozenGatheringRateReview={accountId:'matrix-account',characterId:started.character!.id,
   activityId:'matrix-'+targetId,skill,targetId,startedAtMs:startMs,gearRatingBps:arm.pieces*arm.perPiece,
   matchingSetPieces:arm.pieces,exactCopyIds:Array.from({length:arm.pieces},(_,i)=>'synthetic-'+i),equippedReceiptDigest:'b'.repeat(64)};
  const digest=activityLoadoutSnapshotDigest(frozen);
  const review=reviewGatheringSettlementV2({accountId:'matrix-account',state:started,nowMs:startMs+3600000,sourceRevision:1,frozen,
   verifyPersisted:(a,rev,s,g)=>a==='matrix-account'&&rev===1&&s===source&&g===digest});
  const reward=review.candidateReward;
  assert.equal(review.preview.kills,reward.kills);
  assert.equal(review.preview.xp,reward.xp);
  assert.equal(reward.elapsedSeconds,3600);
  assert.ok(reward.kills>=previous);
  assert.ok(reward.kills>=review.baselineReward.kills);
  assert.equal(activityLoadoutSnapshotDigest(started),source);
  if(!arm.pieces)assert.deepEqual(reward,review.baselineReward);
  if(arm.name==='common_10'||arm.name==='mythic_q100_10'){
   // Matched speed-only vs same-speed full reward channels.
   const rewardChannels=arm.name==='common_10'?{skillXpAffixBps:0,rareChanceAffixBps:0}:{skillXpAffixBps:3300,rareChanceAffixBps:8250};
   const combined={...frozen,rewardChannels};
   const combinedDigest=activityLoadoutSnapshotDigest(combined);
   const full=reviewGatheringSettlementV2({accountId:'matrix-account',state:started,nowMs:startMs+3600000,sourceRevision:1,frozen:combined,
    verifyPersisted:(a,rev,s,g)=>a==='matrix-account'&&rev===1&&s===source&&g===combinedDigest});
   const qty=(r:typeof reward,id:string)=>r.items.filter(row=>row.itemId===id).reduce((sum,row)=>sum+row.quantity,0);
   assert.equal(full.candidateReward.kills,reward.kills);
   assert.equal(full.preview.xp,full.candidateReward.xp);
   assert.equal(full.pace.gearRateMultiplier,review.pace.gearRateMultiplier);
   assert.ok(full.candidateReward.xp>=reward.xp);
   assert.equal(qty(full.candidateReward,node.itemId),qty(reward,node.itemId));
   // Existing ordinary gathering rare-drop consumer is mining essence only.
   for(const item of reward.items.filter(row=>row.itemId!==node.itemId)){
    if(skill==='mining')assert.ok(qty(full.candidateReward,item.itemId)>=item.quantity);
    else assert.equal(qty(full.candidateReward,item.itemId),item.quantity);
   }
   console.log('GATHERING_MATRIX_CHANNELS',JSON.stringify({tier:band.tier,skill,toolMode,arm:arm.name,actions:reward.kills,
    speedOnlyXp:reward.xp,combinedXp:full.candidateReward.xp,primaryBefore:qty(reward,node.itemId),primaryAfter:qty(full.candidateReward,node.itemId),
    channels:full.channels}));
  }
  previous=reward.kills;
  matrixRows.push({tier:band.tier,skill,toolMode,arm:arm.name,primaryItem:node.itemId,
   primaryQuantity:reward.items.filter(row=>row.itemId===node.itemId).reduce((s,row)=>s+row.quantity,0),
   actions:reward.kills,xp:reward.xp,rate:review.pace.gearRateMultiplier,baselineActions:review.baselineReward.kills});
 }
 console.log('GATHERING_MATRIX_PROFILE',JSON.stringify({tier:band.tier,skill,toolMode,toolCount:tool.count,toolTimeMultiplier:tool.timeMultiplier,
  rows:matrixRows.slice(-gearArms.length).map(x=>({arm:x.arm,actions:x.actions,quantity:x.primaryQuantity,xp:x.xp,rate:x.rate}))}));
}
assert.equal(matrixRows.length,300);
// Raw-material opportunity cost for actual existing smelting recipes only;
// excludes crafting duration, gold, rare inputs, gear affixes and set yield/XP.
for(const band of bands)for(const arm of ['none','common_10','mythic_q100_10']){
 const recipe=RECIPES.find(row=>row.id===band.recipe)!;
 assert.ok(recipe);
 const ingredients=recipe.inputs.map(input=>{
  const row=matrixRows.find(x=>x.tier===band.tier&&x.toolMode==='eligible_tiers'&&x.arm===arm&&x.primaryItem===input.itemId);
  assert.ok(row&&row.primaryQuantity>0);
  return {itemId:input.itemId,quantity:input.quantity,minutes:60*input.quantity/row.primaryQuantity};
 });
 console.log('GATHERING_MATRIX_SMELT',JSON.stringify({tier:band.tier,arm,recipe:recipe.id,output:recipe.output,ingredients,rawMinutes:ingredients.reduce((s,x)=>s+x.minutes,0)}));
}
console.log('GATHERING_MATRIX_REVIEW: 300 actual one-hour reward rehearsals; 15 raw-material cost comparisons; no economy or live changes');

for(let pieces=0;pieces<=10;pieces++){
 const x=reviewGatheringRewardChannelsV2({matchingSetPieces:pieces});
 assert.equal(x.setXpBps,(pieces>=2?300:0)+(pieces>=4?400:0)+(pieces>=10?800:0));
 assert.equal(Object.prototype.hasOwnProperty.call(x,'yieldMultiplier'),false);
 assert.equal(x.setRareBps,pieces>=6?1000:0);
}
assert.throws(()=>reviewGatheringRewardChannelsV2({matchingSetPieces:0,skillXpAffixBps:1}));
assert.throws(()=>reviewGatheringRewardChannelsV2({matchingSetPieces:10,rareChanceAffixBps:8251}));
console.log('GATHERING_REWARD_CHANNELS_REVIEW: 60 matched one-hour cases, same actions, independent XP/rare thresholds, identical primary resource yield');

import {buildGatheringBonusDisplayReview} from '../src/core/gathering-bonus-display-review';
for(const skill of ['mining','woodcutting','fishing'] as const)for(let pieces=0;pieces<=10;pieces++){
 const input={skill,matchingSetPieces:pieces,gearRatingBps:pieces*1000};
 const display=buildGatheringBonusDisplayReview(input);
 const pace=reviewGatheringSpeedV2({baseActionSeconds:1,toolTimeMultiplier:1,existingRateMultiplier:1,gearRatingBps:input.gearRatingBps,setTimeMultiplier:pieces>=8?.96:1});
 assert.equal(display.effectiveSpeedPercent,Math.round(pace.effectiveRatingBps)/100);
 assert.equal(display.rareConsumerAvailable,skill==='mining');
 assert.equal(display.unlockedThresholds.length,Math.floor(pieces/2));
 assert.equal(display.releaseReady,false);
}
const fullDisplay=buildGatheringBonusDisplayReview({skill:'mining',matchingSetPieces:10,gearRatingBps:10000});
assert.equal(fullDisplay.rawSpeedPercent,104.17);
assert.equal(fullDisplay.effectiveSpeedPercent,103.13);
assert.equal(fullDisplay.actionTimeReductionPercent,50.77);
assert.equal(fullDisplay.xpPercent,15);
assert.equal(Object.prototype.hasOwnProperty.call(fullDisplay,'yieldPercent'),false);
assert.equal(fullDisplay.rareRelativePercent,10);
assert.throws(()=>buildGatheringBonusDisplayReview({skill:'mining',matchingSetPieces:1,gearRatingBps:3000}));
console.log('GATHERING_BONUS_DISPLAY: 33 skill/set profiles use same review engine; raw/effective duration and rare-consumer clarity');
