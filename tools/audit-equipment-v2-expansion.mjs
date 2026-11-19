#!/usr/bin/env node
/** Review-only, fail-closed contract audit for hidden EQ2 T1–T4 expansion.
 * Checks *design coverage* against real current hidden client/server catalogs.
 * It does NOT enable new items, recipes, drops, shops, or feature flags.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const DEFAULT_DESIGN='docs/equipment-2-0/t1-t4-expansion-design.json';
const SLOT_ORDER=['helmet','chest','gloves','legs','boots','cape','amulet','ring'];
const ROLES=['tank','damage','support'];
const ALLOWED_TYPES=['coverage','alternative_statline','rare_blueprint'];
const EXPECTED_BUILT_IN={sets:15,setPieces:42,standalones:24,armaments:52};
const REQUIRED_EXCLUSIVE_SOURCES=['dungeon_boss_drop','dungeon_completion_chest','party_event_chest','world_boss_chest'];
const FORBIDDEN_PURCHASE_SOURCES=['npc_shop','guild_shop','dungeon_shop','world_boss_shop','event_shop','shop_exchange','vendor_exchange','currency_exchange','crafted_from_reward_piece','player_market_purchase'];

function parseLiteralArray(src, label) {
 const position=src.indexOf(label);
 if(position<0)throw Error('source_array_absent:'+label);
 const assign=src.indexOf('=',position);
 const start=src.indexOf('[',assign);
 let depth=0,inString=false,escape=false;
 for(let i=start;i<src.length;i++){
  const c=src[i];
  if(c==='"'&&!escape)inString=!inString;
  if(!inString){
   if(c==='[')depth++;
   if(c===']'&&--depth===0)return JSON.parse(src.slice(start,i+1));
  }
  escape=c==='\\'&&!escape;
  if(c!=='\\')escape=false;
 }
 throw Error('source_array_unterminated:'+label);
}
function slotProfiles(src){
 const anchor=src.indexOf('export const EQUIPMENT_V2_PROFILES:');
 if(anchor<0)throw Error('source_profiles_not_found');
 const fragment=src.slice(anchor,src.indexOf('};',anchor));
 const result={};
 for(const [,slot,values] of fragment.matchAll(/\b(helmet|chest|gloves|legs|boots|cape|amulet|ring):\s*\[([^\]]+)\]/g))
   result[slot]=[...values.matchAll(/'([^']+)'/g)].map(x=>x[1]);
 if(Object.keys(result).length!==8)throw Error('source_profiles_incomplete');
 return result;
}
export function readAuthoritativeBaseline(root=ROOT){
 const client=readFileSync(resolve(root,'apps/mobile/src/content/equipment-v2-catalog.ts'),'utf8');
 const armaments=readFileSync(resolve(root,'apps/mobile/src/content/equipment-v2-armaments.ts'),'utf8');
 const foundation=readFileSync(resolve(root,'apps/mobile/src/core/equipment-crafting-v2-foundation.ts'),'utf8');
 const server=readFileSync(resolve(root,'backend/src/server/equipment/equipment-crafting-v2-manifest.ts'),'utf8');
 const sets=parseLiteralArray(client,'export const EQUIPMENT_V2_SETS:');
 const standalones=parseLiteralArray(client,'export const EQUIPMENT_V2_STANDALONE:');
 const serverCore=parseLiteralArray(server,'const V2_SERVER_CORE_PIECES:');
 const core=[...sets.flatMap(set=>set.pieces.map(p=>({...p,tier:set.tier,role:set.role,kind:'set'}))),...standalones.map(x=>({...x,kind:'standalone'}))];
 const armamentCount=parseLiteralArray(armaments,'const V2_CLASS_OFFHAND_DESIGN:')?.length??0;
 // Class armament client array is constructed by 9 specs * 4 tiers, with
 // four applicable optional offhands (Ironwarden, Bastion, Hexweaver, Dawnkeeper).
 const catalogWeaponIds=['IRONWARDEN','BASTION','DREADGUARD','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','DAWNKEEPER','STONECALLER'];
 const builtIn={sets:sets.length,setPieces:sets.reduce((x,y)=>x+y.pieces.length,0),standalones:standalones.length,armaments:52};
 const serverKeys=new Set(serverCore.map(x=>x.id));
 const clientKeys=new Set(core.map(x=>x.id));
 return {core,sets,standalones,serverCore,serverKeys,clientKeys,profiles:slotProfiles(foundation),builtIn,catalogWeaponIds};
}
export function auditExpansion(manifest, baseline){
 const errors=[];
 const add=(condition,code)=>{if(condition)errors.push(code)};
 add(manifest?.documentKind!=='eq2_t1_t4_expansion_review_only','not_review_only');
 add(manifest?.status!=='design_only_hidden_unmounted_no_release','release_status_changed');
 add(JSON.stringify(manifest?.tierScope)!=='[1,2,3,4]','tier_scope_not_t1_t4');
 add(manifest?.postReleaseTierPlan?.tier5!=='after_eq2_launch_only','tier5_not_deferred');
 for(const [key,count] of Object.entries(EXPECTED_BUILT_IN))add(baseline.builtIn[key]!==count,'underlying_catalog_changed:'+key);
 add(baseline.serverKeys.size!==baseline.clientKeys.size||[...baseline.clientKeys].some(id=>!baseline.serverKeys.has(id)), 'client_server_baseline_drift');
 const items=manifest?.items??[];
 const names=new Set(),ids=new Set(),blueprints=new Set();
 const occupied=new Set(baseline.core.map(x=>x.id));
 const counts={coverage:0,alternative_statline:0,rare_blueprint:0};
 const baselineCoverage=new Set(baseline.core.map(x=>x.tier+':'+x.role+':'+x.slot));
 const missing=new Set();
 for(let tier=1;tier<=4;tier++)for(const role of ROLES)for(const slot of SLOT_ORDER){
  const key=tier+':'+role+':'+slot;
  if(!baselineCoverage.has(key))missing.add(key);
 }
 const fills=new Set(),fullCoverage=new Set(baselineCoverage);
 for(const [index,x] of items.entries()){
  const id=x?.id||'missing',label='item['+index+']:'+id;
  add(!ALLOWED_TYPES.includes(x?.kind),label+':bad_kind');
  if(!Object.hasOwn(counts,x?.kind??''))continue;
  counts[x.kind]++;
  add(!Number.isInteger(x.tier)||x.tier<1||x.tier>4,label+':bad_tier');
  add(!ROLES.includes(x.role)||!SLOT_ORDER.includes(x.slot),label+':bad_role_slot');
  add(ids.has(id)||occupied.has(id)||!/^EQ2_(EXP|ALT|RARE)_T[1-4]_[A-Z0-9_]+$/.test(id),label+':id_collision_or_bad_format');
  ids.add(id);
  add(!x.name||names.has(x.name)||!x.artBrief||x.artBrief.length<35,label+':name_or_art_brief_invalid');
  names.add(x.name);
  add(!baseline.profiles[x.slot]?.includes(x.profile),label+':invalid_profile_for_actual_slot');
  add(!['steel','mail','leather','cloth','jewelry'].includes(x.material),label+':invalid_material');
  const key=x.tier+':'+x.role+':'+x.slot;
  if(x.kind==='coverage'){
   add(!missing.has(key)||fills.has(key),label+':not_unique_real_gap');
   add(x.baseBudgetMultiplier!==1||x.craftGate!=='standard_after_eq2_release',label+':regular_craft_policy_changed');
   fills.add(key);fullCoverage.add(key);
  }
  if(x.kind==='alternative_statline'){
   add(x.tier===1||x.baseBudgetMultiplier!==1||x.craftGate!=='standard_after_eq2_release',label+':variant_cost_or_tier_wrong');
   const predecessors=baseline.core.filter(p=>p.tier===x.tier&&p.role===x.role&&p.slot===x.slot);
   add(!predecessors.length,label+':no_real_reference_variant');
   add(predecessors.some(p=>p.profile===x.profile),label+':same_stats_as_existing_item');
   add(!x.distinctSilhouette||x.distinctSilhouette.length<18,label+':no_silhouette_identity');
  }
  if(x.kind==='rare_blueprint'){
   add(x.tier<2||x.craftGate!=='requires_verified_character_blueprint_unlock',label+':rare_recipe_unlock_missing');
   add(!x.blueprintId||blueprints.has(x.blueprintId),label+':blueprint_id_collision');
   blueprints.add(x.blueprintId);
   add(JSON.stringify(x.blueprintDropSources)!=='["eligible_zone_elite","eligible_zone_boss"]',label+':blueprint_not_earned');
   add(x.craftMaterialCostMultiplier<1.3||x.craftMaterialCostMultiplier>1.7,label+':rare_material_cost_out_of_band');
   add(x.baseBudgetMultiplier<1.03||x.baseBudgetMultiplier>1.06,label+':rare_power_out_of_band');
   add(!x.trait?.id||x.trait.implementationStatus!=='design_only_requires_server_owned_proc_and_cooldown_review'||x.trait.maxCopiesEquippedWithTrait!==1,label+':rare_trait_not_draft_gated');
   add(!Number.isInteger(x.proposedDropChanceBps?.eligible_zone_elite)||x.proposedDropChanceBps.eligible_zone_elite<1||x.proposedDropChanceBps.eligible_zone_elite>10,label+':blueprint_elite_rate_unreviewed');
   add(!Number.isInteger(x.proposedDropChanceBps?.eligible_zone_boss)||x.proposedDropChanceBps.eligible_zone_boss<1||x.proposedDropChanceBps.eligible_zone_boss>25,label+':blueprint_boss_rate_unreviewed');
  }
 }
 add(missing.size!==33,'baseline_missing_cells_changed');
 add(counts.coverage!==33||fills.size!==33||[...missing].some(x=>!fills.has(x)),'role_slot_gaps_not_filled_exactly');
 add(counts.alternative_statline!==18,'expected_18_distinct_variants');
 add(counts.rare_blueprint!==6,'expected_6_blueprint_only_items');
 add(items.length!==57,'item_count_not_57');
 for(let tier=1;tier<=4;tier++)for(const role of ROLES)for(const slot of SLOT_ORDER)
  add(!fullCoverage.has(tier+':'+role+':'+slot),'coverage_incomplete:'+tier+':'+role+':'+slot);
 const sums=[1,2,3,4].map(tier=>baseline.core.filter(x=>x.tier===tier).length+items.filter(x=>x.tier===tier).length);
 add(JSON.stringify(sums)!=='[24,32,32,35]','per_tier_count_drift:'+sums.join(','));
 const p=manifest?.rewards?.universalPolicy??{};
 for(const source of REQUIRED_EXCLUSIVE_SOURCES)add(!p.allowedGearAcquisition?.includes(source),'exclusive_reward_source_missing:'+source);
 for(const shop of FORBIDDEN_PURCHASE_SOURCES)add(!p.deny?.includes(shop),'restricted_purchase_source_missing:'+shop);
 add(p.noShopOrExchange!==true||p.neverCraftable!==true||p.playerMarketStatus!=='deny_pending_explicit_future_trade_policy','exclusive_reward_trade_or_shop_gap');
 add(JSON.stringify(p.tierRange)!=='[1,2,3,4]','reward_tier_5_plus_not_deferred');
 add(manifest?.rewards?.worldBoss?.equipmentType!=='gathering_speed_specialization_only','world_gathering_gear_changed_to_combat');
 add(manifest?.rewards?.worldBoss?.existingChanceBps!==100,'world_boss_drop_rate_changed');
 add(manifest?.rewards?.worldBoss?.noSigilExchange!==true,'world_boss_sigil_exchange_not_blocked');
 add(manifest?.rewards?.partyEvent?.uniqueItems!==20||manifest?.rewards?.partyEvent?.sets!==8,'party_event_existing_sets_changed');
 add(manifest?.releaseGates?.client!==false||manifest.releaseGates.server!==false||manifest.releaseGates.shopHardDenyUntilExplicitVerified!==true||manifest.releaseGates.readyForProduction!==false,'hidden_release_fence_changed');
 return {passed:errors.length===0,errors,coverageMissingBefore:missing.size,coverageCompleteAfter:fullCoverage.size===96,totals:{baseline:baseline.core.length+52,additional:items.length,combined:baseline.core.length+52+items.length,byTier:sums,counts}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const file=process.argv[2]||DEFAULT_DESIGN;
 const manifest=JSON.parse(readFileSync(resolve(ROOT,file),'utf8'));
 const result=auditExpansion(manifest,readAuthoritativeBaseline());
 console.log(JSON.stringify(result,null,2));
 if(!result.passed)process.exitCode=1;
}
