/**
 * Combat 2.0 build persistence planner: server-side pure transition contract.
 *
 * NO DB WRITES OR LIVE ROUTING. This produces a proposed immutable state for a
 * future authenticated SERIALIZABLE transaction. The caller must acquire a
 * character-scoped lock, re-read owned item instances, and commit with a
 * compare-and-swap revision guard before sending success to the client.
 */
import {
 BUILD_CONTRACT_VERSION_V2,validateBuildV2,
 type BuildSelectionV2,type VerifiedCharacterV2,type BuildCatalogV2,
 type BuildIssueV2,
} from './build-contract';

export type BuildSlotV2=0|1;
export interface BuildPresetV2 {
 readonly name:string;
 readonly selected:BuildSelectionV2;
 readonly savedAtRevision:number;
}
export interface CharacterBuildStateV2 {
 readonly characterId:string;
 readonly schemaVersion:number;
 readonly revision:number;
 readonly selectedSlot:BuildSlotV2|null;
 readonly presets:readonly [BuildPresetV2|null,BuildPresetV2|null];
}
export interface AuthorizedBuildContextV2 {
 readonly authenticatedCharacterId:string;
 readonly verified:VerifiedCharacterV2;
 readonly catalog:BuildCatalogV2;
 readonly busyReason?:'combat'|'dungeon'|'world_boss'|'party_event'|'guild_pve'|'equipment_transfer';
}
export type BuildMutationV2=
 | {readonly action:'save';readonly slot:BuildSlotV2;readonly expectedRevision:number;
    readonly name:string;readonly selected:BuildSelectionV2}
 | {readonly action:'activate';readonly slot:BuildSlotV2;readonly expectedRevision:number}
 | {readonly action:'delete';readonly slot:BuildSlotV2;readonly expectedRevision:number};

export interface BuildMutationResultV2 {
 readonly ok:boolean;
 readonly next:CharacterBuildStateV2;
 readonly issues:readonly BuildIssueV2[];
}
const failure=(current:CharacterBuildStateV2,code:string,at:string):BuildMutationResultV2=>({
 ok:false,next:current,issues:[{code,at}],
});
const cloneSelection=(x:BuildSelectionV2):BuildSelectionV2=>({
 specializationId:x.specializationId,
 equipment:{...x.equipment},
 activeSkills:x.activeSkills.map(s=>({...s})),
 talentRanks:{...x.talentRanks},
 signaturePassiveIds:[...x.signaturePassiveIds],
 capstoneId:x.capstoneId,
});
const validName=(raw:string)=>typeof raw==='string'&&raw.trim().length>=1&&raw.trim().length<=28&&
 !/[\x00-\x1f\x7f]/.test(raw);
export const emptyCharacterBuildStateV2=(characterId:string):CharacterBuildStateV2=>({
 characterId,schemaVersion:BUILD_CONTRACT_VERSION_V2,revision:0,selectedSlot:null,presets:[null,null],
});

/**
 * Returns a proposed write model; does not equip gear or mutate a character.
 * All callers must supply AUTHENTICATED server state, never client snapshots.
 */
export function planBuildMutationV2(
 current:CharacterBuildStateV2,ctx:AuthorizedBuildContextV2,request:BuildMutationV2,
):BuildMutationResultV2{
 if(!ctx.authenticatedCharacterId||
  current.characterId!==ctx.authenticatedCharacterId)
   return failure(current,'character_mismatch','characterId');
 if(current.schemaVersion!==BUILD_CONTRACT_VERSION_V2)
   return failure(current,'build_schema_unsupported','schemaVersion');
 if(ctx.busyReason)
   return failure(current,'build_switch_blocked_'+ctx.busyReason,'activity');
 if(!Number.isSafeInteger(current.revision)||current.revision<0||
   !Number.isSafeInteger(request.expectedRevision)||
   current.revision!==request.expectedRevision)
   return failure(current,'stale_build_revision','expectedRevision');
 if(request.slot!==0&&request.slot!==1)
   return failure(current,'invalid_build_slot','slot');

 const preset=current.presets[request.slot];
 if(request.action==='save'){
   if(!validName(request.name))return failure(current,'invalid_build_name','name');
   const tested=validateBuildV2(ctx.verified,request.selected,ctx.catalog);
   if(!tested.valid)return {ok:false,next:current,issues:tested.issues};
   const replacement:BuildPresetV2={
     name:request.name.trim(),selected:cloneSelection(request.selected),
     savedAtRevision:current.revision+1,
   };
   const next:[BuildPresetV2|null,BuildPresetV2|null]=
    [current.presets[0],current.presets[1]];
   next[request.slot]=replacement;
   return {ok:true,issues:[],next:{...current,revision:current.revision+1,presets:next}};
 }
 if(request.action==='activate'){
   if(!preset)return failure(current,'empty_build_slot','slot');
   // Revalidate CURRENT inventory, class, level and unlocks after each bank,
   // salvage, market, trade, or character change; stored snapshots can be stale.
   const tested=validateBuildV2(ctx.verified,preset.selected,ctx.catalog);
   if(!tested.valid)return {ok:false,next:current,issues:tested.issues};
   return {ok:true,issues:[],next:{...current,revision:current.revision+1,
     selectedSlot:request.slot,presets:[current.presets[0],current.presets[1]]}};
 }
 if(request.action==='delete'){
   if(!preset)return failure(current,'empty_build_slot','slot');
   const next:[BuildPresetV2|null,BuildPresetV2|null]=
    [current.presets[0],current.presets[1]];
   next[request.slot]=null;
   return {ok:true,issues:[],next:{...current,revision:current.revision+1,
     selectedSlot:current.selectedSlot===request.slot?null:current.selectedSlot,
     presets:next}};
 }
 return failure(current,'invalid_build_action','action');
}
