import type {GameState,ItemStack,SkillState,CharacterState} from './types';
import {ITEMS} from '../content/items';
import {equipmentV2LegacyPreservationAudit} from './equipment-crafting-v2-legacy-audit';
import type {V2DraftSnapshot,V2DraftCharacter} from '../../../../backend/src/server/equipment/equipment-crafting-v2-transaction';

/** READ ONLY: design for adapting the ACTUAL GameState persisted by online
 * gameplay.ts (load_online_game_server_v1 + commit_online_game_guild_pve_v1).
 *
 * This module is not a writable API, not an independent production ledger,
 * and never substitutes this projection for the live wallet or game commit.
 * A future server adapter MUST use the authenticated loaded game and its
 * authoritative walletGold/characterId/version values, not client input.
 */
export type V2AuthorityBlocker=
 |'no_active_character'|'active_character_mismatch'|'invalid_account'
 |'invalid_online_version'|'missing_authoritative_wallet'
 |'duplicate_character_id'|'invalid_character_wallet'
 |'invalid_material_stack'|'legacy_forge_jobs_present'
 |'legacy_custody_conflict'|'reserved_v2_item_ids_present';

export interface V2AuthoritativeReadinessInput{
 state:GameState;accountId:string;onlineVersion:number;
 /** Supabase load_online_game_server_v1 authenticated active character id. */
 onlineCharacterId:string|null;
 /** Current authoritative character_wallets.gold, may be null if not loaded. */
 authoritativeWalletGold:number|null;
}
export interface V2AuthoritativeReadiness{
 blocked:boolean;blockers:readonly V2AuthorityBlocker[];
 legacyCraftJobs:number;legacyExactCopies:number;preservedLegacySockets:number;
 characterCount:number;materialTypes:number;
 /** Informational projection only. This MUST NEVER be passed into a write RPC. */
 projection:V2DraftSnapshot|null;
}
const MATERIAL_IDS=new Set(ITEMS.filter(item=>item.type==='material').map(item=>item.id));
const safe=(n:number)=>Number.isSafeInteger(n)&&n>=0;
function projectStacks(stacks:readonly ItemStack[]){
 const materials:Record<string,number>={};
 let invalid=false;
 for(const stack of stacks){
  if(!stack||typeof stack.itemId!=='string'||!safe(stack.quantity)||stack.quantity<1){invalid=true;continue;}
  if(stack.itemId.startsWith('EQ2_')){invalid=true;continue;}
  if(!MATERIAL_IDS.has(stack.itemId))continue;
  if(stack.instanceId!==undefined){invalid=true;continue;}
  const next=(materials[stack.itemId]??0)+stack.quantity;
  if(!safe(next)){invalid=true;continue;}
  materials[stack.itemId]=next;
 }
 return {materials,invalid};
}
function projectSkillLevel(skills:readonly SkillState[],id:'smithing'|'tailoring'){
 const current=skills.find(row=>row.skillId===id);
 return current&&safe(current.level)?current.level:0;
}
function toCharacter(character:CharacterState,skills:readonly SkillState[],inventory:readonly ItemStack[],wallet:number){
 const stacks=projectStacks(inventory);
 const result:V2DraftCharacter={
  level:character.level,
  professionLevels:{smithing:projectSkillLevel(skills,'smithing'),tailoring:projectSkillLevel(skills,'tailoring')},
  gold:wallet,inventory:stacks.materials,
 };
 return {result,invalid:stacks.invalid||!safe(character.level)||!safe(wallet)};
}
/** Audit a real online gameplay snapshot before authorizing ANY future V2
 * command. It deliberately refuses to fold the existing Forge queue into
 * another ledger: both must ultimately settle in one authority.
 */
export function equipmentV2AuthoritativeReadiness(input:V2AuthoritativeReadinessInput):V2AuthoritativeReadiness{
 const {state,accountId,onlineVersion,onlineCharacterId,authoritativeWalletGold}=input;
 const blockers=new Set<V2AuthorityBlocker>();
 if(!accountId||typeof accountId!=='string')blockers.add('invalid_account');
 if(!safe(onlineVersion))blockers.add('invalid_online_version');
 if(!state.character||!onlineCharacterId)blockers.add('no_active_character');
 if(state.character?.id!==onlineCharacterId)blockers.add('active_character_mismatch');
 if(authoritativeWalletGold===null||!safe(authoritativeWalletGold))blockers.add('missing_authoritative_wallet');
 const bank=projectStacks(state.bank.stacks);
 if(bank.invalid)blockers.add('invalid_material_stack');
 const owned=new Map<string,V2DraftCharacter>();
 if(state.character){
  const active=toCharacter(state.character,state.skills,state.inventory.stacks,
   authoritativeWalletGold??NaN);
  if(active.invalid)blockers.add('invalid_character_wallet');
  owned.set(state.character.id,active.result);
 }
 for(const row of state.otherCharacters??[]){
  if(owned.has(row.character.id))blockers.add('duplicate_character_id');
  const other=toCharacter(row.character,row.skills,row.inventory.stacks,row.character.gold);
  if(other.invalid)blockers.add('invalid_character_wallet');
  owned.set(row.character.id,other.result);
 }
 const legacyCraftJobs=state.account.equipmentCraftingQueue?.length??0;
 if(legacyCraftJobs)blockers.add('legacy_forge_jobs_present');
 const legacy=equipmentV2LegacyPreservationAudit(state);
 if(legacy.reservedNamespaceCopies)blockers.add('reserved_v2_item_ids_present');
 if(legacy.unresolvedEquippedReferences||legacy.missingRecordForInstanceStacks||legacy.duplicatePhysicalLocations)
  blockers.add('legacy_custody_conflict');
 const blocked=blockers.size>0;
 /** A projection is returned only for fully validated read-only diagnostics.
  * No in-flight jobs, receipts or historical legacy copies may be silently
  * converted to new EQ2 records.
  */
 const projection:V2DraftSnapshot|null=blocked?null:{
  accountId,activeCharacterId:state.character!.id,version:onlineVersion,
  characters:Object.fromEntries(owned),
  bank:bank.materials,jobs:[],equipment:[],skillAwards:[],receipts:[],
 };
 return {
  blocked,blockers:[...blockers],legacyCraftJobs,
  legacyExactCopies:legacy.legacyCraftedCopies,preservedLegacySockets:legacy.legacySocketedCopies,
  characterCount:owned.size,
  materialTypes:new Set([...Object.keys(bank.materials),...[...owned.values()].flatMap(c=>Object.keys(c.inventory))]).size,
  projection,
 };
}
