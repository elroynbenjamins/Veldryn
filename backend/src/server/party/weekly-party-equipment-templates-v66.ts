/**
 * V66 — 180 candidate Party Event template keys: 20 original V51 pieces x 9
 * account-earned tiers. UNRELEASED descriptors, NOT a new EQ2 item issuer.
 *
 * Existing Equipment 2.0 craft manifest is EQ2_ recipe-bound, T1–T4.
 * PE_ templates are event-only, no crafting costs, recipes or class locks.
 * Their numeric base stats, RNG, rarity/quality and socket behavior MUST
 * be finalized by the unified server-authoritative EQ2 item system.
 */
import {
 PARTY_EVENT_GEAR_SETS_V51,PARTY_EVENT_GEAR_PIECES_V51,
 partyEventGearPieceV51,type PartyGearPieceV51,
} from './weekly-party-event-gear-v51';
import type {PartyChestTierV51} from './weekly-party-event-chests-v51';

export const PARTY_EVENT_TEMPLATES_V66_RELEASED=false;
export const PARTY_EVENT_TEMPLATES_V66_VERSION='party-event-templates-v66' as const;
export type PartyBaseProfileV66='attack'|'defense'|'health'|
 'attack_defense'|'attack_health'|'defense_health';
export interface PartyEventTemplateV66 {
 readonly templateKey:string;
 readonly pieceId:string;
 readonly tier:PartyChestTierV51;
 readonly name:string;
 readonly slot:PartyGearPieceV51['slot'];
 readonly setId:string;
 readonly family:PartyGearPieceV51['family'];
 readonly profile:PartyBaseProfileV66;
 readonly classRestriction:null;
 readonly craftingRecipeId:null;
 readonly source:'party_event_chest_or_exchange';
 readonly rarityAndQuality:'unified_eq2_server_roll_required';
 readonly numericStats:'pending_eq2_v2_tier_budget_approval';
 readonly statAffixes:'pending_equipment_v2_authoritative_affix_policy';
 readonly physicalCustody:'pending_same_transaction_inventory_writer';
 readonly setBonusCatalog:'party-event-gear-v51';
}
const tierList:readonly PartyChestTierV51[]=[1,2,3,4,5,6,7,8,9];
const profiles:Readonly<Record<PartyGearPieceV51['family'],
 Readonly<Record<PartyGearPieceV51['slot'],PartyBaseProfileV66>>>>={
 broken_caravan:{
  boots:'attack_health',gloves:'attack',cape:'defense_health',
  ring:'attack',amulet:'attack_health',
 },
 nightfall_hunt:{
  boots:'attack_health',gloves:'attack',cape:'attack_defense',
  ring:'attack',amulet:'attack_health',
 },
 broken_wards:{
  boots:'defense_health',gloves:'defense',cape:'health',
  ring:'health',amulet:'defense_health',
 },
 lost_reliquary:{
  boots:'attack_health',gloves:'attack',cape:'attack_health',
  ring:'attack',amulet:'attack_health',
 },
};
const templates:readonly PartyEventTemplateV66[]=
 PARTY_EVENT_GEAR_PIECES_V51.flatMap(piece=>tierList.map(tier=>({
  templateKey:piece.id+':T'+tier,pieceId:piece.id,tier,
  name:piece.name,slot:piece.slot,setId:piece.setId,
  family:piece.family,profile:profiles[piece.family][piece.slot],
  classRestriction:null,craftingRecipeId:null,
  source:'party_event_chest_or_exchange' as const,
  rarityAndQuality:'unified_eq2_server_roll_required' as const,
  numericStats:'pending_eq2_v2_tier_budget_approval' as const,
  statAffixes:'pending_equipment_v2_authoritative_affix_policy' as const,
  physicalCustody:'pending_same_transaction_inventory_writer' as const,
  setBonusCatalog:'party-event-gear-v51' as const,
 })));
export const PARTY_EVENT_TEMPLATES_V66=templates;
export function partyEventTemplateV66(
 pieceId:string,tier:PartyChestTierV51,
):PartyEventTemplateV66{
 const piece=partyEventGearPieceV51(pieceId);
 if(!piece||!tierList.includes(tier))
  throw Error('party_event_v66_unknown_piece_or_tier');
 const result=templates.find(item=>item.pieceId===piece.id&&item.tier===tier);
 if(!result)throw Error('party_event_v66_missing_frozen_template');
 return result;
}
export function assertPartyEventTemplatesV66():true{
 if(PARTY_EVENT_TEMPLATES_V66.length!==180||
  PARTY_EVENT_GEAR_SETS_V51.length!==8||
  new Set(PARTY_EVENT_TEMPLATES_V66.map(x=>x.templateKey)).size!==180)
  throw Error('party_event_v66_catalog_parity');
 for(const piece of PARTY_EVENT_GEAR_PIECES_V51){
  const variants=templates.filter(row=>row.pieceId===piece.id);
  if(variants.length!==9||
   new Set(variants.map(row=>row.tier)).size!==9||
   variants.some(row=>row.setId!==piece.setId||row.slot!==piece.slot||
    row.family!==piece.family||row.classRestriction!==null||
    row.craftingRecipeId!==null||row.templateKey!==piece.id+':T'+row.tier||
    !['attack','defense','health','attack_defense','attack_health',
      'defense_health'].includes(row.profile)||
    !['boots','gloves','cape','ring','amulet'].includes(row.slot)))
   throw Error('party_event_v66_invalid_item_variants');
 }
 return true;
}
