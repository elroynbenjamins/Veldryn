/**
 * V60 hidden World Boss chest roll -> gathering-gear resolution proposal.
 * This is deliberately NOT a claim endpoint or an owned inventory item.
 * Called only behind a future private account/event transaction which locks:
 * 1) verified V59 source proof, 2) unique chest source key, 3) inventory slots,
 * 4) an immutable first resolution, 5) rewards/Inbox and account erasure fence.
 * A DB retry MUST return its persisted first result without re-rolling, even
 * after key rotation. No wallet, equipment, shop or Sigil write occurs here.
 */
import {createHmac} from 'node:crypto';
import {
 previewVerifiedWorldBossChestsV58,resolveWorldBossChestGearDraftV58,
 WORLD_BOSS_GEAR_SLOTS_V58,
 type WorldBossChestKindV58,type VerifiedWorldBossChestEvidenceV58,
 type WorldBossGearSlotV58,
} from './world-boss-chests-v58';
import {
 previewRollWorldBossGatheringSlotV66,validateWorldBossGatheringRollV65,
 worldBossGatheringSetV64,
 type WorldBossGatheringRolledGearV65,
} from './world-boss-gathering-loot-v64';
import {deriveServerChestRollsV1} from '../loot/event-chest-server-roll-v1';

export const WORLD_BOSS_CHEST_RESOLUTION_V60_LIVE=false as const;
const WORD_RANGE=0x100000000;
export interface WorldBossChestResolutionV60{
 readonly mode:'nonpaying_private_settlement_plan';
 readonly sourceKey:string;
 readonly eventId:string;
 readonly accountId:string;
 readonly kind:WorldBossChestKindV58;
 readonly bossId:string;
 readonly guaranteed:Readonly<{
  gold:number;companionEssence:number;gemDust:number;temperingDust:number;
 }>;
 readonly gearChanceBps:100;
 readonly selectedSlot:WorldBossGearSlotV58|null;
 readonly gear:WorldBossGatheringRolledGearV65|null;
 readonly worldSigilsGranted:0;
 readonly accountWalletCredited:false;
 readonly equipmentInstanceCreated:false;
 readonly inboxReceiptCreated:false;
 readonly requiresFirstResolutionPersistence:true;
}
/** HMAC domain- and draw-separated, unbiased and retry-stable gear RNG. */
function privateGearStream(secret:Uint8Array,key:string):(max:number)=>number{
 let index=0;
 return max=>{
  if(!Number.isSafeInteger(max)||max<1||max>1_000_000||
   index>100)throw Error('world_boss_v60_invalid_draw');
  const label=index++;
  const ceiling=Math.floor(WORD_RANGE/max)*max;
  for(let retry=0;retry<32;retry++){
   const digest=createHmac('sha256',secret)
    .update('veldryn:world-boss:gear:v60\0')
    .update(key).update('\0')
    .update(String(label)).update('\0')
    .update(String(retry)).digest();
   const value=digest.readUInt32BE(0);
   if(value<ceiling)return value%max;
  }
  throw Error('world_boss_v60_entropy_unavailable');
 };
}
/**
 * No client input. The caller supplies a canonical V59 evidence projection,
 * server-owned collection slots and a strong server secret, all inside the
 * future locked DB transaction. This prepares data only; it grants nothing.
 */
export function previewResolveWorldBossChestV60(input:{
 readonly evidence:VerifiedWorldBossChestEvidenceV58;
 readonly kind:WorldBossChestKindV58;
 readonly ownedSlots:readonly WorldBossGearSlotV58[];
 readonly serverSecret:Uint8Array;
}):WorldBossChestResolutionV60{
 if(!input||!['donations_goal','three_attempts',
   'community_damage_goal'].includes(input.kind)||
  !Array.isArray(input.ownedSlots)||
  input.ownedSlots.some(x=>!WORLD_BOSS_GEAR_SLOTS_V58.includes(x))||
  new Set(input.ownedSlots).size!==input.ownedSlots.length)
  throw Error('world_boss_v60_untrusted_gear_context');
 const chest=previewVerifiedWorldBossChestsV58(input.evidence)
  .find(x=>x.kind===input.kind);
 if(!chest)throw Error('world_boss_v60_unearned_source');
 const rolls=deriveServerChestRollsV1({
  secret:input.serverSecret,domain:'world_boss_v58',
  committedChestKey:chest.chestId,
 });
 const draft=resolveWorldBossChestGearDraftV58(chest,{
  hitRoll:rolls.hitRoll,slotRoll:rolls.pieceRoll,
  ownedSlots:input.ownedSlots,
 });
 let gear:WorldBossGatheringRolledGearV65|null=null;
 if(draft.selectedSlot!==null){
  gear=previewRollWorldBossGatheringSlotV66(
   chest.bossId,draft.selectedSlot,
   privateGearStream(input.serverSecret,chest.chestId),
  );
  const set=worldBossGatheringSetV64(chest.bossId);
  if(!validateWorldBossGatheringRollV65(gear)||
   gear.slot!==draft.selectedSlot||gear.skill!==set.skill||
   gear.setId!==set.setId||gear.combatPowerBonus!==0)
   throw Error('world_boss_v60_gathering_catalog_parity_failed');
 }
 return {
  mode:'nonpaying_private_settlement_plan',
  sourceKey:chest.chestId,
  eventId:input.evidence.eventId,accountId:input.evidence.accountId,
  kind:chest.kind,bossId:chest.bossId,
  guaranteed:chest.guaranteed,
  gearChanceBps:100,selectedSlot:draft.selectedSlot,gear,
  worldSigilsGranted:0,
  accountWalletCredited:false,equipmentInstanceCreated:false,
  inboxReceiptCreated:false,requiresFirstResolutionPersistence:true,
 };
}
