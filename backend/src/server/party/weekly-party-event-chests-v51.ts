/**
 * Hidden V51 Party Event chest and collection-progress policy.
 *
 * PURE server planning only. No client roll, chest entitlement, item instance,
 * currency credit/debit, inventory write, or Day 8 reward grant is implemented.
 * Future settlement must use committed stage ledger + a single account-week
 * locked transaction, deduped independently for each chest and exchange.
 */
import type {WeeklyPartyDifficulty,WeeklyPartyFamily} from './weekly-party-events-v2';
import {
 PARTY_EVENT_GEAR_V51_CATALOG_VERSION,partyEventGearForFamilyV51,
 type PartyGearPieceV51,
} from './weekly-party-event-gear-v51';

export const PARTY_EVENT_CHESTS_V51_RELEASED=false;
export const PARTY_EVENT_CHEST_MAX_V51=3 as const;
export const PARTY_EVENT_PIECE_EXCHANGE_SIGILS_V51=60 as const;
export const PARTY_EVENT_PIECE_EXCHANGES_PER_WEEK_V51=1 as const;
export const PARTY_EVENT_CHEST_ROLL_MODULUS_V51=10000 as const;
export type PartyEventChestKindV51='participation'|'preparation'|'finale';
export interface PartyEventChestDefinitionV51 {
 readonly kind:PartyEventChestKindV51;
 readonly name:string;
 readonly partySigils:number;
 readonly gold:number;
 readonly gemDust:number;
 readonly companionEssence:number;
 readonly baseGearChanceBps:number;
 readonly veteranBonusBps:number;
 readonly heroicBonusBps:number;
}
/** Baseline gold and resources are deliberately modest alongside Day 8 choices. */
export const PARTY_EVENT_CHESTS_V51:readonly PartyEventChestDefinitionV51[]=[
 {kind:'participation',name:'Adventure Chest',partySigils:8,gold:200,
  gemDust:2,companionEssence:4,baseGearChanceBps:1200,
  veteranBonusBps:200,heroicBonusBps:400},
 {kind:'preparation',name:'Preparation Chest',partySigils:10,gold:300,
  gemDust:3,companionEssence:5,baseGearChanceBps:1600,
  veteranBonusBps:200,heroicBonusBps:400},
 {kind:'finale',name:'Victory Chest',partySigils:16,gold:500,
  gemDust:5,companionEssence:8,baseGearChanceBps:2400,
  veteranBonusBps:300,heroicBonusBps:500},
];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type PartyChestTierV51=1|2|3|4|5|6|7|8|9;
export interface VerifiedPartyChestEvidenceV51{
 readonly accountId:string;
 readonly eventStartsAtUtcMs:number;
 readonly family:WeeklyPartyFamily;
 readonly difficulty:WeeklyPartyDifficulty;
 readonly personalPoints:number;
 readonly contributedToPreparation:boolean;
 readonly optionalPreparationGoalCompleted:boolean;
 readonly verifiedFinaleVictory:boolean;
 readonly eligibleGearTier:PartyChestTierV51;
}
export interface PartyChestEntitlementPreviewV51{
 readonly chestId:string;
 readonly kind:PartyEventChestKindV51;
 readonly name:string;
 readonly family:WeeklyPartyFamily;
 readonly difficulty:WeeklyPartyDifficulty;
 readonly eligibleGearTier:PartyChestTierV51;
 readonly guaranteed:Readonly<{
  partySigils:number;gold:number;gemDust:number;companionEssence:number;
 }>;
 readonly gearChanceBps:number;
 readonly itemPoolVersion:typeof PARTY_EVENT_GEAR_V51_CATALOG_VERSION;
 readonly claimable:false;
 readonly granted:false;
}
function checkedEvidence(e:VerifiedPartyChestEvidenceV51):void{
 if(!e||!UUID.test(e.accountId)||
  !Number.isSafeInteger(e.eventStartsAtUtcMs)||
  e.eventStartsAtUtcMs<0||
  new Date(e.eventStartsAtUtcMs).getUTCDay()!==1||
  e.eventStartsAtUtcMs%86400000!==0||
  !['broken_caravan','nightfall_hunt','broken_wards','lost_reliquary'].includes(e.family)||
  !['standard','veteran','heroic'].includes(e.difficulty)||
  !Number.isInteger(e.personalPoints)||e.personalPoints<0||e.personalPoints>60||
  ![1,2,3,4,5,6,7,8,9].includes(e.eligibleGearTier)||
  typeof e.contributedToPreparation!=='boolean'||
  typeof e.optionalPreparationGoalCompleted!=='boolean'||
  typeof e.verifiedFinaleVictory!=='boolean')
  throw Error('party_event_v51_invalid_trusted_evidence');
}
export function partyChestGearChanceV51(
 kind:PartyEventChestKindV51,difficulty:WeeklyPartyDifficulty,
):number{
 const def=PARTY_EVENT_CHESTS_V51.find(x=>x.kind===kind);
 if(!def||!['standard','veteran','heroic'].includes(difficulty))
  throw Error('party_event_v51_invalid_chest_chance');
 return def.baseGearChanceBps+(difficulty==='veteran'?def.veteranBonusBps:
  difficulty==='heroic'?def.heroicBonusBps:0);
}
/** No mutable client claims; this is a view of a future trusted DB snapshot. */
export function previewVerifiedPartyChestsV51(
 e:VerifiedPartyChestEvidenceV51,
):readonly PartyChestEntitlementPreviewV51[]{
 checkedEvidence(e);
 if(e.personalPoints<15)return [];
 const entitled=new Set<PartyEventChestKindV51>(['participation']);
 if(e.contributedToPreparation&&e.optionalPreparationGoalCompleted)
  entitled.add('preparation');
 if(e.verifiedFinaleVictory)entitled.add('finale');
 return PARTY_EVENT_CHESTS_V51.filter(def=>entitled.has(def.kind)).map(def=>({
  chestId:'party-event:'+e.eventStartsAtUtcMs+':'+e.accountId.toLowerCase()+':'+def.kind,
  kind:def.kind,name:def.name,family:e.family,difficulty:e.difficulty,
  eligibleGearTier:e.eligibleGearTier,
  guaranteed:{partySigils:def.partySigils,gold:def.gold,
   gemDust:def.gemDust,companionEssence:def.companionEssence},
  gearChanceBps:partyChestGearChanceV51(def.kind,e.difficulty),
  itemPoolVersion:PARTY_EVENT_GEAR_V51_CATALOG_VERSION,
  claimable:false as const,granted:false as const,
 }));
}
export interface ServerPartyChestRollV51{
 /** Secure value generated and committed by the authoritative server, NOT a client. */
 readonly gearRoll:number;
 /** Separate secure server value used only after a successful gear roll. */
 readonly pieceRoll:number;
 readonly ownedPieceIds:readonly string[];
}
function checkedRoll(n:number){
 if(!Number.isInteger(n)||n<0||n>=PARTY_EVENT_CHEST_ROLL_MODULUS_V51)
  throw Error('party_event_v51_invalid_server_roll');
}
export interface PartyChestGearDraftV51{
 readonly gearDropped:boolean;
 readonly piece:PartyGearPieceV51|null;
 readonly gearTier:PartyChestTierV51;
 readonly qualityAndRarity:'defer_to_equipment_2_0_server_roller';
 readonly affixes:'defer_to_equipment_2_0_server_roller';
}
/**
 * The future private claim worker alone supplies rolls and collection state.
 * Prioritize an uncollected piece ONLY WHEN gear hits; do not reroll a miss.
 * Quality, rarity, affixes, instance ID and inventory capacity belong to 2.0.
 */
export function resolvePartyChestGearDraftV51(
 preview:PartyChestEntitlementPreviewV51,
 random:ServerPartyChestRollV51,
):PartyChestGearDraftV51{
 if(!preview||preview.claimable!==false||preview.granted!==false||
  !partyEventGearForFamilyV51(preview.family).length||
  !Number.isInteger(preview.gearChanceBps)||
  preview.gearChanceBps!==partyChestGearChanceV51(preview.kind,preview.difficulty)||
  preview.itemPoolVersion!==PARTY_EVENT_GEAR_V51_CATALOG_VERSION||
  ![1,2,3,4,5,6,7,8,9].includes(preview.eligibleGearTier)||
  !random||!Array.isArray(random.ownedPieceIds))
  throw Error('party_event_v51_invalid_chest_preview');
 checkedRoll(random.gearRoll);
 checkedRoll(random.pieceRoll);
 const pool=partyEventGearForFamilyV51(preview.family);
 const missing=pool.filter(x=>!random.ownedPieceIds.includes(x.id));
 const candidates=missing.length?missing:pool;
 const piece=random.gearRoll<preview.gearChanceBps
  ?candidates[random.pieceRoll%candidates.length]!:null;
 return {gearDropped:piece!==null,piece,gearTier:preview.eligibleGearTier,
  qualityAndRarity:'defer_to_equipment_2_0_server_roller',
  affixes:'defer_to_equipment_2_0_server_roller'};
}
export interface PartyEventPieceExchangeQuoteV51 {
 readonly piece:PartyGearPieceV51;
 readonly partySigilsCost:typeof PARTY_EVENT_PIECE_EXCHANGE_SIGILS_V51;
 readonly collectionMissing:boolean;
 readonly available:boolean;
 readonly remainingSigils:number;
 readonly buyEnabled:false;
}
/** Quote only — never debit or mint here; enforce one exchange per event week in SQL. */
export function quotePartyGearExchangeV51(input:{
 family:WeeklyPartyFamily;
 requestedPieceId:string;
 trustedBalance:number;
 alreadyExchangedThisEvent:boolean;
 ownedPieceIds:readonly string[];
}):PartyEventPieceExchangeQuoteV51{
 if(!Number.isSafeInteger(input.trustedBalance)||input.trustedBalance<0||
  typeof input.alreadyExchangedThisEvent!=='boolean'||
  !Array.isArray(input.ownedPieceIds))
  throw Error('party_event_v51_invalid_exchange_state');
 const piece=partyEventGearForFamilyV51(input.family)
  .find(x=>x.id===input.requestedPieceId);
 if(!piece)throw Error('party_event_v51_piece_not_in_current_family');
 return {
  piece,partySigilsCost:PARTY_EVENT_PIECE_EXCHANGE_SIGILS_V51,
  collectionMissing:!input.ownedPieceIds.includes(piece.id),
  available:!input.alreadyExchangedThisEvent&&
   input.trustedBalance>=PARTY_EVENT_PIECE_EXCHANGE_SIGILS_V51,
  remainingSigils:Math.max(0,
   input.trustedBalance-PARTY_EVENT_PIECE_EXCHANGE_SIGILS_V51),
  buyEnabled:false,
 };
}
