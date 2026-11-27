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

import {reviewGatheringSpeedV2,gatheringSpeedEffectiveRatingV2} from '../src/core/gathering-speed-v2-review';
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
