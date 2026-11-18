/**
 * Supabase service-role ONLY Combat 2.0 build storage adapter.
 *
 * Inject a server-held service role client from a trusted backend route.
 * NEVER instantiate this in React Native or accept user-supplied account IDs.
 *
 * DB migration: 20261118124500_combat_v2_build_persistence_hidden_v1.sql
 */
import {
 type AtomicBuildCommitV2,type BuildStoragePortV2,
 type PersistedGearInstanceV2,type TrustedBuildSnapshotV2,
} from './build-server-service';
import {CLASS_ROLES_V2,type ClassIdV2,type BuildSelectionV2} from './build-contract';
import type {CharacterBuildStateV2,BuildPresetV2} from './build-mutations';

export interface V2ServiceRpcClient{
  rpc<T=unknown>(name:string,args:Record<string,unknown>):Promise<{
    data:T|null;error:{message:string;code?:string}|null
  }>;
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isObj=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&
  typeof v==='object'&&!Array.isArray(v);
const nat=(v:unknown):v is number=>Number.isSafeInteger(v)&&(v as number)>=0;
function id(value:string):string{
  if(typeof value!=='string'||!UUID.test(value))throw Error('combat_v2_invalid_uuid');
  return value.toLowerCase();
}
function readSelection(raw:unknown):BuildSelectionV2{
  if(!isObj(raw))throw Error('combat_v2_corrupt_selection');
  const equipment=isObj(raw.equipment)?raw.equipment:{};
  const talentRanks=isObj(raw.talentRanks)?raw.talentRanks:{};
  const active=raw.activeSkills;
  const signatures=raw.signaturePassiveIds;
  if(!Array.isArray(active)||active.length>3||!Array.isArray(signatures)||signatures.length>2||
    !Object.values(equipment).every(x=>typeof x==='string')||
    !Object.values(talentRanks).every(x=>Number.isSafeInteger(x)&&(x as number)>0&&(x as number)<=3)||
    !active.every(x=>isObj(x)&&typeof x.skillId==='string'&&typeof x.variantId==='string')||
    !signatures.every(x=>typeof x==='string')||
    (raw.specializationId!==null&&typeof raw.specializationId!=='string')||
    (raw.capstoneId!==null&&typeof raw.capstoneId!=='string'))
    throw Error('combat_v2_corrupt_selection');
  return {
    specializationId:raw.specializationId as string|null,
    equipment:equipment as BuildSelectionV2['equipment'],
    activeSkills:active.map(x=>({skillId:x.skillId as string,variantId:x.variantId as string})),
    talentRanks:talentRanks as Record<string,number>,
    signaturePassiveIds:[...signatures] as string[],capstoneId:raw.capstoneId as string|null,
  };
}
function readState(raw:unknown,characterId:string):CharacterBuildStateV2|null{
  if(raw===null||raw===undefined)return null;
  if(!isObj(raw)||raw.characterId!==characterId||raw.schemaVersion!==1||
     !nat(raw.revision)||!Array.isArray(raw.presets)||raw.presets.length!==2||
     !(raw.selectedSlot===null||raw.selectedSlot===0||raw.selectedSlot===1))
    throw Error('combat_v2_corrupt_saved_build');
  const presets=raw.presets.map((p):BuildPresetV2|null=>{
    if(p===null)return null;
    if(!isObj(p)||typeof p.name!=='string'||!p.name.trim()||
       p.name.length>28||!nat(p.savedAtRevision))throw Error('combat_v2_corrupt_preset');
    return {name:p.name,selected:readSelection(p.selected),savedAtRevision:p.savedAtRevision};
  });
  return {
    characterId,schemaVersion:1,revision:raw.revision as number,
    selectedSlot:raw.selectedSlot as 0|1|null,
    presets:presets as [BuildPresetV2|null,BuildPresetV2|null],
  };
}
function readSnapshot(raw:unknown,accountId:string,characterId:string):TrustedBuildSnapshotV2{
  if(!isObj(raw)||raw.accountId!==accountId||raw.characterId!==characterId||
     (typeof raw.characterClass!=='string'||
      !Object.prototype.hasOwnProperty.call(CLASS_ROLES_V2,raw.characterClass))||
     !Number.isSafeInteger(raw.characterLevel)||(raw.characterLevel as number)<1||
     !nat(raw.gameRevision)||typeof raw.characterFingerprint!=='string'||
     !/^[0-9a-f]{32}$/i.test(raw.characterFingerprint)||
     !Array.isArray(raw.craftedGearInstances))throw Error('combat_v2_corrupt_trusted_snapshot');
  const crafted:PersistedGearInstanceV2[]=[];
  for(const entry of raw.craftedGearInstances){
    if(!isObj(entry)||typeof entry.id!=='string'||typeof entry.itemId!=='string'||
      typeof entry.ownerCharacterId!=='string')throw Error('combat_v2_corrupt_gear_instance');
    crafted.push({
      id:entry.id,itemId:entry.itemId,ownerCharacterId:entry.ownerCharacterId,
    });
  }
  // Busy reasons require an authoritative coop / solo encounter service.
  // Do not infer safety from arbitrary JSON supplied by the device.
  return {
    accountId,characterId,characterClass:raw.characterClass as ClassIdV2,
    characterLevel:raw.characterLevel as number,gameRevision:raw.gameRevision as number,
    characterFingerprint:raw.characterFingerprint as string,
    craftedGearInstances:crafted,
    builds:readState(raw.builds,characterId),
  };
}
export class SupabaseV2BuildStorage implements BuildStoragePortV2 {
  constructor(private readonly client:V2ServiceRpcClient){}
  private async call<T>(name:string,args:Record<string,unknown>):Promise<T>{
    const response=await this.client.rpc<T>(name,args);
    if(response.error)throw Error(response.error.message);
    if(response.data===null)throw Error('combat_v2_empty_server_response');
    return response.data;
  }
  async load(trustedAccountId:string,characterId:string):Promise<TrustedBuildSnapshotV2>{
    const account=id(trustedAccountId),character=id(characterId);
    const data=await this.call<unknown>('combat_v2_build_read_server_v1',{
      p_account_id:account,p_character_id:character,
    });
    return readSnapshot(data,account,character);
  }
  async compareAndSwap(trustedAccountId:string,characterId:string,
    commit:AtomicBuildCommitV2):Promise<CharacterBuildStateV2>{
    const account=id(trustedAccountId),character=id(characterId);
    if(commit.next.characterId!==character||!nat(commit.expectedGameRevision)||
      !nat(commit.expectedBuildRevision)||typeof commit.expectedCharacterFingerprint!=='string'||
      !/^[0-9a-f]{32}$/i.test(commit.expectedCharacterFingerprint)||
      commit.next.revision!==commit.expectedBuildRevision+1)
      throw Error('combat_v2_invalid_commit_request');
    const data=await this.call<unknown>('combat_v2_build_cas_server_v1',{
      p_account_id:account,p_character_id:character,
      p_expected_build_revision:commit.expectedBuildRevision,
      p_expected_game_revision:commit.expectedGameRevision,
      p_expected_character_fingerprint:commit.expectedCharacterFingerprint,
      p_next_state:commit.next,
    });
    const state=readState(data,character);
    if(!state)throw Error('combat_v2_invalid_commit_readback');
    return state;
  }
}
