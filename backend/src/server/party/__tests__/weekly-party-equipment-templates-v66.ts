import {
 PARTY_EVENT_TEMPLATES_V66_RELEASED,PARTY_EVENT_TEMPLATES_V66,
 partyEventTemplateV66,assertPartyEventTemplatesV66,
} from '../weekly-party-equipment-templates-v66';
import {
 PARTY_EVENT_GEAR_PIECES_V51,PARTY_EVENT_GEAR_SETS_V51,
 PARTY_EVENT_GEAR_FAMILIES_V51,
} from '../weekly-party-event-gear-v51';
import type {PartyChestTierV51} from '../weekly-party-event-chests-v51';

function ok(value:unknown,what:string):asserts value{
 if(!value)throw Error('party_event_v66_test:'+what);
}
function throws(fn:()=>unknown,fragment:string){
 let failed=false;try{fn()}catch(e){failed=String(e).includes(fragment)}
 ok(failed,'throws_'+fragment);
}
ok(!PARTY_EVENT_TEMPLATES_V66_RELEASED,'default_off');
ok(assertPartyEventTemplatesV66(),'catalog_parity');
ok(PARTY_EVENT_TEMPLATES_V66.length===180,'twenty_times_nine');
const groupCounts=new Map<string,number>();
for(const template of PARTY_EVENT_TEMPLATES_V66){
 groupCounts.set(template.family,(groupCounts.get(template.family)??0)+1);
 ok(template.classRestriction===null&&template.craftingRecipeId===null,
  'universal_event_only');
 ok(!template.pieceId.startsWith('EQ2_')&&template.pieceId.startsWith('PE_'),
  'no_fake_crafting_piece');
 ok(template.numericStats==='pending_eq2_v2_tier_budget_approval'&&
  template.rarityAndQuality==='unified_eq2_server_roll_required'&&
  template.physicalCustody==='pending_same_transaction_inventory_writer',
  'no_invented_eq2_stats_or_fake_custody');
 ok(template.templateKey===template.pieceId+':T'+template.tier,
  'deterministic_stable_instance_key');
 ok(template.profile.split('_').length<=2,'at_most_two_base_stats');
}
for(const family of PARTY_EVENT_GEAR_FAMILIES_V51)
 ok(groupCounts.get(family)===45,'five_pieces_nine_tiers_'+family);
for(const piece of PARTY_EVENT_GEAR_PIECES_V51){
 const set=PARTY_EVENT_GEAR_SETS_V51.find(s=>s.id===piece.setId);
 ok(!!set&&set.family===piece.family&&set.slots.includes(piece.slot),
  'existing_set_identity_unchanged_'+piece.id);
 for(let tier=1;tier<=9;tier++){
  const row=partyEventTemplateV66(piece.id,tier as PartyChestTierV51);
  ok(row.pieceId===piece.id&&row.slot===piece.slot&&row.family===piece.family,
   'canonical_piece_'+piece.id+'_T'+tier);
 }
}
throws(()=>partyEventTemplateV66('EQ2_CRAFT_RECIPE' as string,1),
 'unknown_piece_or_tier');
throws(()=>partyEventTemplateV66(PARTY_EVENT_GEAR_PIECES_V51[0]!.id,
 10 as PartyChestTierV51),'unknown_piece_or_tier');
console.log('PARTY_EVENT_TEMPLATES_V66_OK: 8 immutable sets, 20 pieces, 180 event-only tier templates, 1–2 base stats, no invented rarity/quality/custody');
