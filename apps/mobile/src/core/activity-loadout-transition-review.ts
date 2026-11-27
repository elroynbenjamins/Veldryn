/** Hidden 2.0 candidate using real current game reducers. No command/route
 * imports this module. Caller must independently authorize the account,
 * check all combat reservations and persist one atomic state revision.
 */
import type {CharacterLoadoutPreset,GameState,CombatTacticId,ActiveActivity} from './types';
import type {HuntGoalId} from './hunt-goals';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {faithBlessingDef,faithBlessingGroup,FAITH_BLESSING_GROUPS,type FaithBlessingGroup} from '../content/faith';
import {activeFaithPreferences,faithLevel} from './faith';
import {collectibleCatalogForState,selectCollectible} from './collectibles';
import {characterLoadoutSlotCount,normalizeCharacterLoadouts,applyCharacterLoadout,saveCharacterLoadout} from './character-loadouts';
import {claimActivity,stopActivity,startCombat,startGathering,effectiveStats,startNextQueuedActivity,type QueueBoundaryReview} from './game';
import {reviewActivityLoadoutRoute,type ActivityLoadoutBinding} from './activity-loadout-routing-review';
export const ACTIVITY_LOADOUT_TRANSITION_LIVE=false as const;
export type ActivityLoadoutSelections={
 readonly petId?:string|null;
 readonly faithSelections?:Partial<Record<FaithBlessingGroup,string>>;
};
export type ActivityLoadoutPresetV2=CharacterLoadoutPreset&ActivityLoadoutSelections;
const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
export function captureActivityLoadoutSelections(state:GameState):ActivityLoadoutSelections{
 if(!state.character)throw Error('character_required');
 return {petId:state.character.selectedCosmeticPetId??null,
  faithSelections:{...activeFaithPreferences(state).selectedBlessingIds}};
}
export function saveActivityLoadoutReview(state:GameState,slotIndex:number,name:string,nowMs:number):GameState{
 if(!state.character||!Number.isInteger(slotIndex)||!Number.isSafeInteger(nowMs)||nowMs<0)
  throw Error('loadout_invalid_save');
 const selections=captureActivityLoadoutSelections(state);
 const saved=saveCharacterLoadout(copy(state),slotIndex,name,nowMs);
 return {...saved,character:{...saved.character!,savedLoadouts:saved.character!.savedLoadouts?.map(row=>
  row.slotIndex===slotIndex?{...row,...selections}:row)}};
}
export function applyActivityLoadoutSelectionsReview(state:GameState,selections:ActivityLoadoutSelections,nowMs:number):GameState{
 if(!state.character||state.activity||state.character.classTraining)
  throw Error('loadout_requires_settled_idle_boundary');
 if(!selections||typeof selections!=='object'||!Number.isSafeInteger(nowMs)||nowMs<0)
  throw Error('loadout_invalid_selection');
 let next=copy(state);
 if(selections.petId!==undefined){
  const pet=selections.petId;
  if(pet!==null&&(typeof pet!=='string'||!collectibleCatalogForState(next,nowMs).some(row=>row.kind==='pet'&&row.id===pet)))
   throw Error('loadout_unknown_pet');
  if(pet!==null||next.character!.selectedCosmeticPetId!==undefined)
   next=selectCollectible(next,'pet',pet??undefined);
 }
 if(selections.faithSelections!==undefined){
  const raw=selections.faithSelections;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('loadout_invalid_faith');
  const selected:Partial<Record<FaithBlessingGroup,string>>={};
  for(const [group,id] of Object.entries(raw)){
   if(!FAITH_BLESSING_GROUPS.some(row=>row.id===group)||typeof id!=='string')throw Error('loadout_invalid_faith_group');
   const blessing=faithBlessingDef(id);
   if(!blessing||faithBlessingGroup(blessing)!==group||blessing.level>faithLevel(next))
    throw Error('loadout_locked_faith');
   selected[group as FaithBlessingGroup]=id;
  }
  const faith=activeFaithPreferences(next);
  next={...next,character:{...next.character!,faith:{...faith,selectedBlessingIds:selected,selectedBlessingId:Object.values(selected)[0]}}};
 }
 return {...next,character:{...next.character!,currentHp:Math.min(next.character!.currentHp,effectiveStats(next).hp)}};
}
type StartTarget={kind:'combat'|'gathering';id:string;tacticId?:CombatTacticId;goalId?:HuntGoalId};
function categoryForTarget(target:StartTarget){
 if(target.kind==='combat'){
  if(!MONSTERS.some(row=>row.id===target.id&&!row.boss))throw Error('loadout_unknown_hunt_target');
  return 'combat';
 }
 if(target.kind!=='gathering')throw Error('loadout_unknown_activity');
 if(HERB_NODES.some(row=>row.id===target.id))return 'herbalism';
 const node=GATHERING.find(row=>row.id===target.id);
 if(!node)throw Error('loadout_unknown_gathering_target');
 return node.skillId;
}
/** Uses current entitlement source only until regional milestone storage exists.
 * No arbitrary supplied slot count. Extra selections come from the saved
 * preset on this character; no external pet or Faith override at start.
 */
export function reviewActivityLoadoutTransition(input:{
 state:GameState;nowMs:number;target:StartTarget;autoSwitch:boolean;
 bindings:readonly ActivityLoadoutBinding[];
 /** Independent server reservation guard; missing/false rejects. */
 verifyNoFrozenEncounter:(characterId:string)=>boolean;
}){
 const {state,nowMs,target}=input;
 if(!state.character||!Number.isSafeInteger(nowMs)||nowMs<0||
  nowMs<(state.activity?.lastClaimAtMs??0)||typeof input.verifyNoFrozenEncounter!=='function'||
  input.verifyNoFrozenEncounter(state.character.id)!==true)throw Error('loadout_boundary_not_authorized');
 // Queue/offline continuations need their own boundary hook, not a second claim.
 if(state.activity?.queueManaged||state.character.activityQueue?.length||state.character.classTraining)
  throw Error('loadout_queue_or_training_integration_pending');
 const category=categoryForTarget(target);
 const candidate=copy(state);
 const claimed=claimActivity(candidate,nowMs);
 let next=stopActivity(claimed.state,nowMs);
 if(!next.character||next.activity||next.character.classTraining)throw Error('loadout_boundary_not_idle');
 const prepared=prepareSettledActivityLoadoutReview(next,category,nowMs,input,state.activity?.kind);
 next=prepared.state;
 const route=prepared.route;
 const started=target.kind==='combat'?startCombat(next,target.id,nowMs,target.tacticId??'balanced',target.goalId??'open'):
  startGathering(next,target.id,nowMs);
 if(started.activity?.kind!==category||started.activity.targetId!==target.id||started.activity.startedAtMs!==nowMs)
  throw Error('loadout_start_snapshot_mismatch');
 return {state:started,reward:claimed.reward,route,category,persisted:false as const,releaseReady:false as const};
}

type ReviewConfig={
 readonly autoSwitch:boolean;readonly bindings:readonly ActivityLoadoutBinding[];
 readonly verifyNoFrozenEncounter:(characterId:string)=>boolean;
};
function prepareSettledActivityLoadoutReview(state:GameState,category:string,nowMs:number,input:ReviewConfig,previousKind?:ActiveActivity['kind']){
 if(!state.character||state.activity||state.character.classTraining||
  !Number.isSafeInteger(nowMs)||nowMs<0||
  typeof input.verifyNoFrozenEncounter!=='function'||input.verifyNoFrozenEncounter(state.character.id)!==true)
  throw Error('loadout_boundary_not_authorized');
 let next=copy(state);
 const slotCount=characterLoadoutSlotCount(next);
 const presets=normalizeCharacterLoadouts(next.character.savedLoadouts,next.character.classId,slotCount);
 const route=reviewActivityLoadoutRoute({slotCount,autoSwitch:input.autoSwitch,activity:category,
  bindings:input.bindings,availablePresets:presets});
 if(route.decision==='locked'||route.decision==='missing')throw Error('loadout_'+route.decision);
 if(route.decision==='unassigned'&&category==='combat'&&
  ['mining','woodcutting','fishing'].includes(previousKind??''))
  throw Error('loadout_combat_setup_confirmation_required');
 if(route.presetId){
  const preset=presets.find(row=>row.id===route.presetId);
  if(!preset)throw Error('loadout_missing');
  const oldFood=next.character.equippedFoodId,oldCompanion=next.character.equippedCombatCompanionId;
  const settledHp=next.character.currentHp;
  const gathering=category!=='combat';
  const originalPresets=next.character.savedLoadouts;
  if(gathering){
   // Temporarily suppress combat-only choices during actual existing gear
   // reducer, then restore exact saved preset storage and prior selections.
   next={...next,character:{...next.character,savedLoadouts:presets.map(row=>
    row.id===preset.id?{...row,foodId:undefined,companionId:undefined}:row)}};
  }
  next=applyCharacterLoadout(next,preset.id);
  if(gathering)next={...next,character:{...next.character!,savedLoadouts:originalPresets,
   equippedFoodId:oldFood,equippedCombatCompanionId:oldCompanion,currentHp:settledHp}};
  const selections:ActivityLoadoutSelections={petId:preset.petId,faithSelections:preset.faithSelections};
  // Clamp once against final combined equipment, pet and Faith selection.
  next={...next,character:{...next.character!,currentHp:settledHp}};
  next=applyActivityLoadoutSelectionsReview(next,selections,nowMs);
 }

 return {state:next,route};
}
/** A nonpersisted hook, called only after the actual queue settlement ended.
 * No claim/start here: the original queue reducer owns time, travel and goals.
 */
function queueBoundaryReview(config:ReviewConfig):QueueBoundaryReview{
 return (state,entry,nowMs,previousKind)=>{
  if(entry.kind!=='combat'&&entry.kind!=='gathering')return state;
  const category=categoryForTarget({kind:entry.kind,id:entry.targetId});
  return prepareSettledActivityLoadoutReview(state,category,nowMs,config,previousKind).state;
 };
}
export function reviewActivityLoadoutQueueStart(state:GameState,nowMs:number,config:ReviewConfig){
 if(!state.character||state.activity||state.character.classTraining||
 !Number.isSafeInteger(nowMs)||nowMs<0||config.verifyNoFrozenEncounter(state.character.id)!==true)
  throw Error('loadout_queue_start_not_authorized');
 return {state:startNextQueuedActivity(copy(state),nowMs,queueBoundaryReview(config)),persisted:false as const,releaseReady:false as const};
}
export function reviewActivityLoadoutOfflineClaim(state:GameState,nowMs:number,config:ReviewConfig){
 if(!state.character||state.character.classTraining||!Number.isSafeInteger(nowMs)||nowMs<0||
 nowMs<(state.activity?.lastClaimAtMs??0)||config.verifyNoFrozenEncounter(state.character.id)!==true)
  throw Error('loadout_claim_not_authorized');
 const result=claimActivity(copy(state),nowMs,queueBoundaryReview(config));
 return {...result,persisted:false as const,releaseReady:false as const};
}
