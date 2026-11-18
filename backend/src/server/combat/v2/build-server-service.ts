/**
 * Authoritative Combat 2.0 build application service.
 *
 * This is not a public route. The API/edge layer MUST resolve trustedAccountId
 * from a verified session, never from user-supplied JSON. It delegates reads and
 * compare-and-swap commits to a privileged server-only repository.
 *
 * Stored build choices are NOT applied to combat or equipment by this module.
 */
import {
 CLASS_ROLES_V2, type BuildCatalogV2, type BuildIssueV2,
 type ClassIdV2, type EquipmentInstanceV2, type GearSlotV2,
 type RoleV2, type SetFamilyV2, type VerifiedCharacterV2,
} from './build-contract';
import {
 emptyCharacterBuildStateV2,planBuildMutationV2,
 type AuthorizedBuildContextV2,type BuildMutationV2,type CharacterBuildStateV2,
} from './build-mutations';
import {serverBuildCatalogV2} from './skill-catalog';

export interface ServerEquipmentDefinitionV2 {
  readonly itemId:string;
  readonly slot:GearSlotV2;
  readonly eligibleClasses?:readonly ClassIdV2[];
  readonly eligibleRoles?:readonly RoleV2[];
  readonly requiredLevel:number;
  readonly setFamilyId?:string;
  readonly tier?:string;
}
export interface PersistedGearInstanceV2 {
  readonly id:string;
  readonly itemId:string;
  readonly ownerCharacterId:string|null;
}
export interface TrustedBuildSnapshotV2 {
  readonly characterId:string;
  readonly accountId:string;
  readonly characterClass:ClassIdV2;
  readonly characterLevel:number;
  readonly gameRevision:number;
  readonly characterFingerprint:string;
  readonly craftedGearInstances:readonly PersistedGearInstanceV2[];
  readonly builds:CharacterBuildStateV2|null;
  readonly busyReason?:AuthorizedBuildContextV2['busyReason'];
}
export interface AtomicBuildCommitV2 {
  readonly next:CharacterBuildStateV2;
  readonly expectedBuildRevision:number;
  readonly expectedGameRevision:number;
  readonly expectedCharacterFingerprint:string;
}
export interface BuildStoragePortV2 {
  /** Must check that character belongs to trusted account before returning. */
  load(trustedAccountId:string,characterId:string):Promise<TrustedBuildSnapshotV2>;
  /** Must recheck account/character ownership and game revision under DB lock. */
  compareAndSwap(trustedAccountId:string,characterId:string,commit:AtomicBuildCommitV2):Promise<CharacterBuildStateV2>;
}
export type EquipmentRegistryV2=Readonly<Record<string,ServerEquipmentDefinitionV2>>;
export interface ServerBuildDependenciesV2 {
  readonly storage:BuildStoragePortV2;
  readonly equipment:EquipmentRegistryV2;
  readonly sets:Readonly<Record<string,SetFamilyV2>>;
}
const failure=(code:string,at:string,current:CharacterBuildStateV2|null=null):ServerBuildResponseV2=>({
  ok:false,revision:current?.revision??null,state:current,issues:[{code,at}],
});
export interface ServerBuildResponseV2 {
  readonly ok:boolean;
  readonly revision:number|null;
  readonly state:CharacterBuildStateV2|null;
  readonly issues:readonly BuildIssueV2[];
}

/**
 * No client-provided character levels, account IDs, ownership, affixes, power
 * values, or roll ranges are accepted. Missing item definitions fail closed.
 */
export function trustedBuildContextV2(
  snapshot:TrustedBuildSnapshotV2,equipment:EquipmentRegistryV2,
  sets:Readonly<Record<string,SetFamilyV2>>,
):{verified:VerifiedCharacterV2;catalog:BuildCatalogV2}{
  if(!Object.prototype.hasOwnProperty.call(CLASS_ROLES_V2,snapshot.characterClass)||
    !Number.isSafeInteger(snapshot.characterLevel)||snapshot.characterLevel<1)
    throw Error('combat_v2_corrupt_authoritative_character');
  const owned=new Set<string>();
  const items:Record<string,EquipmentInstanceV2>={};
  for(const entry of snapshot.craftedGearInstances){
    if(!entry||entry.ownerCharacterId!==snapshot.characterId)continue;
    if(typeof entry.id!=='string'||!entry.id||owned.has(entry.id))
      throw Error('combat_v2_duplicate_owned_instance');
    owned.add(entry.id);
    const authored=equipment[entry.itemId];
    if(!authored)continue; // stored build referencing it will fail unknown_item
    if(authored.itemId!==entry.itemId||!Number.isSafeInteger(authored.requiredLevel)||
      authored.requiredLevel<1)throw Error('combat_v2_corrupt_equipment_definition');
    items[entry.id]={
      instanceId:entry.id,slot:authored.slot,
      eligibleClasses:authored.eligibleClasses,eligibleRoles:authored.eligibleRoles,
      requiredLevel:authored.requiredLevel,
      setFamilyId:authored.setFamilyId,tier:authored.tier,
    };
  }
  return {
    verified:{classId:snapshot.characterClass,level:snapshot.characterLevel,ownedInstanceIds:owned},
    catalog:serverBuildCatalogV2(items,sets),
  };
}
export class CharacterBuildServiceV2 {
  constructor(private readonly deps:ServerBuildDependenciesV2){}
  async read(trustedAccountId:string,characterId:string,serverEnabled=false):Promise<ServerBuildResponseV2>{
    if(!serverEnabled)return failure('feature_disabled','feature');
    if(!trustedAccountId||!characterId)return failure('auth_required','account');
    const row=await this.deps.storage.load(trustedAccountId,characterId);
    if(row.accountId!==trustedAccountId||row.characterId!==characterId)
      return failure('character_mismatch','characterId');
    const state=row.builds??emptyCharacterBuildStateV2(characterId);
    return {ok:true,state,revision:state.revision,issues:[]};
  }
  async mutate(
    trustedAccountId:string,characterId:string,request:BuildMutationV2,
    serverEnabled=false,
  ):Promise<ServerBuildResponseV2>{
    if(!serverEnabled)return failure('feature_disabled','feature');
    if(!trustedAccountId||!characterId)return failure('auth_required','account');
    const row=await this.deps.storage.load(trustedAccountId,characterId);
    if(row.accountId!==trustedAccountId||row.characterId!==characterId)
      return failure('character_mismatch','characterId');
    const current=row.builds??emptyCharacterBuildStateV2(characterId);
    const {verified,catalog}=trustedBuildContextV2(row,this.deps.equipment,this.deps.sets);
    const plan=planBuildMutationV2(current,{
      authenticatedCharacterId:characterId,verified,catalog,busyReason:row.busyReason,
    },request);
    if(!plan.ok)return {ok:false,revision:current.revision,state:current,issues:plan.issues};
    try{
      const committed=await this.deps.storage.compareAndSwap(trustedAccountId,characterId,{
        next:plan.next,expectedBuildRevision:current.revision,
        expectedGameRevision:row.gameRevision,
        expectedCharacterFingerprint:row.characterFingerprint,
      });
      if(committed.revision!==plan.next.revision||committed.characterId!==characterId)
        throw Error('combat_v2_invalid_commit_readback');
      return {ok:true,state:committed,revision:committed.revision,issues:[]};
    }catch(error){
      // A bank transfer, equipment sale, another device or another loadout save
      // may have raced with planning. The client must reload and review, never
      // blindly replay a stale build mutation.
      const code=error instanceof Error?error.message:'unknown_persistence_error';
      if(code.includes('combat_v2_stale_game_revision'))
        return failure('stale_game_revision','equipment',current);
      if(code.includes('combat_v2_stale_build_revision'))
        return failure('stale_build_revision','expectedRevision',current);
      if(code.includes('combat_v2_character_mismatch'))
        return failure('character_mismatch','characterId',current);
      throw error;
    }
  }
}
