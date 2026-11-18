/**
 * Hidden World Boss V58 chest/exchange extension.
 *
 * PRESERVES the proposed existing gathering equipment design:
 * 10 pieces per boss, one gathering-speed specialization per boss, the
 * original 1% chance per chest, and the existing Equipment 2.0 tier /
 * quality / rarity / gathering-only affix roller (no replacement items).
 *
 * This adds entitlement PREVIEWS, missing-slot prioritization on a 1% hit,
 * and a future World Sigil exchange QUOTE; it creates no item, source claim,
 * shop purchase, world currency, calendar or public route.
 */
import type {WorldBossRotatingIdV50} from './world-boss-weekend-v22';

export const WORLD_BOSS_CHESTS_V58_RELEASED=false;
export const WORLD_BOSS_CHESTS_PER_ACCOUNT_EVENT_V58=3 as const;
export const WORLD_BOSS_CHEST_GEAR_CHANCE_BPS_V58=100 as const;
export const WORLD_BOSS_CHEST_ROLL_MODULUS_V58=10000 as const;
export const WORLD_BOSS_GEAR_PIECES_PER_BOSS_V58=10 as const;
export const WORLD_BOSS_GEAR_CHOICE_COST_SIGILS_V58=80 as const;
export const WORLD_BOSS_GEAR_CHOICES_PER_EVENT_V58=1 as const;
export type WorldBossGatheringSkillV58='woodcutting'|'mining'|'fishing';
export type WorldBossGearSlotV58=
 'helmet'|'chest'|'gloves'|'legs'|'boots'|
 'weapon'|'offhand'|'cape'|'amulet'|'ring';
export const WORLD_BOSS_GEAR_SLOTS_V58:readonly WorldBossGearSlotV58[]=[
 'helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring',
];
export const WORLD_BOSS_GATHERING_SET_POLICY_V58:Readonly<
 Record<WorldBossRotatingIdV50,{
  readonly skill:WorldBossGatheringSkillV58;
  readonly equipmentPieces:typeof WORLD_BOSS_GEAR_PIECES_PER_BOSS_V58;
  readonly onlyStat:'gathering_speed';
  readonly onlyAffixFamily:'same_gathering_skill';
  readonly rarityQualityTierPolicy:'use_existing_world_boss_equipment_roller';
 }>
>={
 hollowroot:{skill:'woodcutting',equipmentPieces:10,onlyStat:'gathering_speed',
  onlyAffixFamily:'same_gathering_skill',rarityQualityTierPolicy:'use_existing_world_boss_equipment_roller'},
 sunscar:{skill:'mining',equipmentPieces:10,onlyStat:'gathering_speed',
  onlyAffixFamily:'same_gathering_skill',rarityQualityTierPolicy:'use_existing_world_boss_equipment_roller'},
 frostmarch:{skill:'fishing',equipmentPieces:10,onlyStat:'gathering_speed',
  onlyAffixFamily:'same_gathering_skill',rarityQualityTierPolicy:'use_existing_world_boss_equipment_roller'},
};
export type WorldBossChestKindV58=
 'donations_goal'|'three_attempts'|'community_damage_goal';
export interface VerifiedWorldBossChestEvidenceV58{
 readonly eventId:string;
 readonly accountId:string;
 readonly bossId:WorldBossRotatingIdV50;
 readonly preparationGoalCompleted:boolean;
 readonly personalCommittedDonations:number;
 readonly committedAttempts:number;
 readonly communityDamageGoalCompleted:boolean;
 readonly personalProvenAttacks:number;
}
export interface WorldBossChestPreviewV58{
 readonly chestId:string;
 readonly bossId:WorldBossRotatingIdV50;
 readonly kind:WorldBossChestKindV58;
 readonly name:string;
 readonly guaranteed:Readonly<{
  gold:number;companionEssence:number;gemDust:number;temperingDust:number;
 }>;
 readonly gearChanceBps:typeof WORLD_BOSS_CHEST_GEAR_CHANCE_BPS_V58;
 readonly gearSetSkill:WorldBossGatheringSkillV58;
 readonly gearPiecesInSet:typeof WORLD_BOSS_GEAR_PIECES_PER_BOSS_V58;
 readonly worldSigilsGrantedByThisChest:0;
 readonly claimable:false;
 readonly granted:false;
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const definitions:readonly {
 kind:WorldBossChestKindV58;name:string;
 gold:number;companionEssence:number;gemDust:number;temperingDust:number;
}[]=[
 {kind:'donations_goal',name:'War Camp Chest',gold:450,
  companionEssence:6,gemDust:2,temperingDust:2},
 {kind:'three_attempts',name:'Warrior Chest',gold:650,
  companionEssence:8,gemDust:3,temperingDust:3},
 {kind:'community_damage_goal',name:'Realm Victory Chest',gold:900,
  companionEssence:10,gemDust:4,temperingDust:4},
];
function checked(e:VerifiedWorldBossChestEvidenceV58):void{
 if(!e||!UUID.test(e.eventId)||!UUID.test(e.accountId)||
  !Object.prototype.hasOwnProperty.call(WORLD_BOSS_GATHERING_SET_POLICY_V58,e.bossId)||
  !Number.isInteger(e.personalCommittedDonations)||e.personalCommittedDonations<0||
  e.personalCommittedDonations>2||
  !Number.isInteger(e.committedAttempts)||e.committedAttempts<0||
  e.committedAttempts>3||
  !Number.isInteger(e.personalProvenAttacks)||e.personalProvenAttacks<0||
  e.personalProvenAttacks>e.committedAttempts||
  typeof e.preparationGoalCompleted!=='boolean'||
  typeof e.communityDamageGoalCompleted!=='boolean')
  throw Error('world_boss_v58_invalid_canonical_evidence');
}
/**
 * Rewards are per account per 14-day EVENT, across all account characters.
 * Donation-only never qualifies for the community-damage chest. Attempts
 * must be fully committed, not reserved, voided or simulated.
 */
export function previewVerifiedWorldBossChestsV58(
 e:VerifiedWorldBossChestEvidenceV58,
):readonly WorldBossChestPreviewV58[]{
 checked(e);
 const earned=new Set<WorldBossChestKindV58>();
 if(e.preparationGoalCompleted&&e.personalCommittedDonations>=1)
  earned.add('donations_goal');
 if(e.committedAttempts===3)
  earned.add('three_attempts');
 if(e.communityDamageGoalCompleted&&e.personalProvenAttacks>=1)
  earned.add('community_damage_goal');
 const policy=WORLD_BOSS_GATHERING_SET_POLICY_V58[e.bossId];
 return definitions.filter(d=>earned.has(d.kind)).map(d=>({
  chestId:'world-boss:'+e.eventId.toLowerCase()+':'+e.accountId.toLowerCase()+':'+d.kind,
  bossId:e.bossId,kind:d.kind,name:d.name,
  guaranteed:{gold:d.gold,companionEssence:d.companionEssence,
   gemDust:d.gemDust,temperingDust:d.temperingDust},
  gearChanceBps:WORLD_BOSS_CHEST_GEAR_CHANCE_BPS_V58,
  gearSetSkill:policy.skill,
  gearPiecesInSet:WORLD_BOSS_GEAR_PIECES_PER_BOSS_V58,
  worldSigilsGrantedByThisChest:0 as const,
  claimable:false as const,granted:false as const,
 }));
}
export interface WorldBossChestSecureRollV58{
 /** Both rolls come only from committed server-side entropy. */
 readonly hitRoll:number;
 readonly slotRoll:number;
 /** Server-owned collection state. Never trust mobile inventory claims. */
 readonly ownedSlots:readonly WorldBossGearSlotV58[];
}
export interface WorldBossChestGearDraftV58{
 readonly gearDropped:boolean;
 readonly selectedSlot:WorldBossGearSlotV58|null;
 readonly bossId:WorldBossRotatingIdV50;
 readonly skill:WorldBossGatheringSkillV58;
 readonly gearGeneration:'keep_existing_world_boss_equipment_stats_tier_rarity_quality_and_rolls';
}
const roll=(n:number)=>Number.isInteger(n)&&n>=0&&
 n<WORLD_BOSS_CHEST_ROLL_MODULUS_V58;
function knownSlot(s:unknown):s is WorldBossGearSlotV58{
 return typeof s==='string'&&WORLD_BOSS_GEAR_SLOTS_V58.includes(s as WorldBossGearSlotV58);
}
export function resolveWorldBossChestGearDraftV58(
 preview:WorldBossChestPreviewV58,random:WorldBossChestSecureRollV58,
):WorldBossChestGearDraftV58{
 if(!preview||!Object.prototype.hasOwnProperty.call(
  WORLD_BOSS_GATHERING_SET_POLICY_V58,preview.bossId)||
  preview.gearChanceBps!==100||preview.gearPiecesInSet!==10||
  preview.claimable!==false||preview.granted!==false||
  preview.gearSetSkill!==WORLD_BOSS_GATHERING_SET_POLICY_V58[preview.bossId].skill||
  !random||!roll(random.hitRoll)||!roll(random.slotRoll)||
  !Array.isArray(random.ownedSlots)||random.ownedSlots.some(x=>!knownSlot(x)))
  throw Error('world_boss_v58_invalid_server_roll');
 const unseen=WORLD_BOSS_GEAR_SLOTS_V58.filter(s=>!random.ownedSlots.includes(s));
 const pool=unseen.length?unseen:WORLD_BOSS_GEAR_SLOTS_V58;
 const selectedSlot=random.hitRoll<WORLD_BOSS_CHEST_GEAR_CHANCE_BPS_V58
  ?pool[random.slotRoll%pool.length]!:null;
 return {
  gearDropped:selectedSlot!==null,selectedSlot,bossId:preview.bossId,
  skill:preview.gearSetSkill,
  gearGeneration:'keep_existing_world_boss_equipment_stats_tier_rarity_quality_and_rolls',
 };
}
export interface WorldBossGearExchangeQuoteV58{
 readonly bossId:WorldBossRotatingIdV50;
 readonly slot:WorldBossGearSlotV58;
 readonly usesExistingWorldSigils:true;
 readonly cost:typeof WORLD_BOSS_GEAR_CHOICE_COST_SIGILS_V58;
 readonly collectionMissing:boolean;
 readonly affordable:boolean;
 readonly exchangeAvailable:boolean;
 readonly purchaseEnabled:false;
}
/** Quote only. Future SQL must lock cumulative V28 wallet and event receipt. */
export function quoteWorldBossGearExchangeV58(input:{
 bossId:WorldBossRotatingIdV50;
 slot:WorldBossGearSlotV58;
 worldSigilBalance:number;
 alreadyExchangedForEvent:boolean;
 ownedSlots:readonly WorldBossGearSlotV58[];
}):WorldBossGearExchangeQuoteV58{
 if(!Object.prototype.hasOwnProperty.call(WORLD_BOSS_GATHERING_SET_POLICY_V58,input.bossId)||
  !knownSlot(input.slot)||!Number.isSafeInteger(input.worldSigilBalance)||
  input.worldSigilBalance<0||typeof input.alreadyExchangedForEvent!=='boolean'||
  !Array.isArray(input.ownedSlots)||input.ownedSlots.some(x=>!knownSlot(x)))
  throw Error('world_boss_v58_invalid_exchange_quote');
 const affordable=input.worldSigilBalance>=WORLD_BOSS_GEAR_CHOICE_COST_SIGILS_V58;
 return {
  bossId:input.bossId,slot:input.slot,usesExistingWorldSigils:true,
  cost:WORLD_BOSS_GEAR_CHOICE_COST_SIGILS_V58,
  collectionMissing:!input.ownedSlots.includes(input.slot),
  affordable,exchangeAvailable:affordable&&!input.alreadyExchangedForEvent,
  purchaseEnabled:false,
 };
}
