import {ITEMS} from '../src/content/items';
import {GATHERING,RECIPES} from '../src/content/skills';
import {HERB_NODES} from '../src/content/herbalism';
import {MONSTERS} from '../src/content/monsters';
import {GUILD_CONSTRUCTION_BLUEPRINTS} from '../src/content/guild-construction-blueprints';
import {GEM_COMBINE_COSTS_V1,GEM_REFINE_COSTS_V1,gemRefineRecipeIdV1,gemRefineRecipeV1} from '../src/core/gem-progression-v1';
import {companionMaterialUseLabels} from '../src/core/resource-codex';

// Audit the actual resolved runtime registries, including imported and generated items.
// This is a report, not an allowlist. A missing consumer here does not prove disuse.
const materials=ITEMS.filter(item=>item.type==='material');
const initialIds=new Set('ASTERFALL_MINERAL_ESSENCE TEMPERING_CORE SAFFRON_REED MIRAGE_BLOOM CHARBARK ROYAL_CHITIN TYRANT_SEAL BELLFIN_SCALE WYRMSCALE FROZEN_HEART ECHO_TOUCHED_PELT LANTERNSTEEL_SHARD BANNER_ASH REGENT_SIGIL OATHGLASS_FRAGMENT GLOAM_DUST EVENT_BONDBLOOM RUNEBOUND_CORE ECHO_BAT_WING'.split(' '));
const rows=materials.map(item=>{
 const recipes=RECIPES.filter(recipe=>recipe.inputs.some(input=>input.itemId===item.id));
 const outputs=RECIPES.filter(recipe=>recipe.output.itemId===item.id);
 const monsters=MONSTERS.filter(monster=>monster.drops.some(drop=>drop.itemId===item.id));
 const gathering=[...GATHERING,...HERB_NODES].filter(node=>node.itemId===item.id);
 const companionUses=companionMaterialUseLabels(item.id);
 const specialUses:string[]=[];
 if(item.rawGemFamilyId&&item.rawGemGrade){
  const refinement=gemRefineRecipeV1(gemRefineRecipeIdV1(item.rawGemFamilyId,item.rawGemGrade));
  if(refinement?.inputs.some(input=>input.itemId===item.id))specialUses.push('Gem refinement · Enchanting Lv '+refinement.level);
 }
 for(const [grade,cost] of Object.entries(GEM_REFINE_COSTS_V1))if(cost.reagents.some(input=>input.itemId===item.id))specialUses.push('G'+grade+' gem refinement · Enchanting Lv '+cost.level);
 for(const [grade,cost] of Object.entries(GEM_COMBINE_COSTS_V1))if(cost.catalystId===item.id)specialUses.push('G'+grade+' to G'+cost.to+' gem combining · Enchanting Lv '+cost.level);
 // Explicit code-backed sink: equipment-enhancement.ts consumes TEMPERING_CORE when quote.cores > 0.
 if(item.id==='TEMPERING_CORE')specialUses.push('Equipment enhancement · upgrade quote');
 // These are draft definitions; their existence protects the resource but is not evidence of live availability.
 const plannedGuildUses=GUILD_CONSTRUCTION_BLUEPRINTS.filter(row=>row.materials.some(material=>material.itemId===item.id)).map(row=>row.id);
 return {id:item.id,name:item.name,value:item.value,specialUses,plannedGuildUses,recipeConsumers:recipes.length,recipeExamples:recipes.slice(0,3).map(recipe=>recipe.id),recipeProducers:outputs.length,monsterSources:monsters.map(monster=>monster.id),gatheringSources:gathering.length,companionUses};
});
const retiredNoSource=rows.filter(row=>row.id==='ECHO_BAT_WING');
if(retiredNoSource.length!==1)throw Error('Retired Echo Bat Wing catalog identity missing');
const retiredWing=retiredNoSource[0];
if(retiredWing.recipeConsumers!==0||retiredWing.recipeProducers!==0||retiredWing.monsterSources.length!==0||retiredWing.gatheringSources!==0||retiredWing.companionUses.length!==0||retiredWing.specialUses.length!==0||retiredWing.plannedGuildUses.length!==0)throw Error('Retired Echo Bat Wing still has a resolved producer or consumer');
if(retiredWing.value!==80)throw Error('Echo Bat Wing authored sell value changed; re-price compensation before release');
const candidates=rows.filter(row=>row.recipeConsumers===0&&row.companionUses.length===0&&(row.monsterSources.length>0||row.gatheringSources>0||row.recipeProducers>0));
const protectedSpecial=candidates.filter(row=>row.specialUses.length>0||row.plannedGuildUses.length>0);
const unresolved=candidates.filter(row=>row.specialUses.length===0&&row.plannedGuildUses.length===0);
if(!protectedSpecial.some(row=>row.id==='RADIANT_CATALYST'&&row.specialUses.length>=2))throw Error('Radiant Catalyst gem costs missing');
if(!protectedSpecial.some(row=>row.id==='TEMPERING_CORE'&&row.specialUses.length>0))throw Error('Tempering Core enhancement sink missing');
if(!protectedSpecial.some(row=>row.id==='GUILD_REINFORCED_TIMBER'&&row.plannedGuildUses.length>0))throw Error('Guild blueprint evidence missing');
if(!protectedSpecial.some(row=>row.id.startsWith('raw_gem:')&&row.specialUses.length>0))throw Error('Raw gem refinement evidence missing');
const core=rows.find(row=>row.id==='RUNEBOUND_CORE');
if(!core?.companionUses.some(use=>use.includes('Runebound Sentry'))||!core.companionUses.some(use=>use.includes('Expedition Pens')))throw Error('Protected core consumer evidence missing');
console.log(JSON.stringify({resolvedMaterials:rows.length,initialFlags:rows.filter(row=>initialIds.has(row.id)),otherScreeningCandidates:candidates.filter(row=>!initialIds.has(row.id)),screeningCandidateCount:candidates.length,protectedSpecialCount:protectedSpecial.length,unresolvedCount:unresolved.length,unresolved,retiredNoSource},null,2));
console.log('REVIEW ONLY: enhancement, quests, guild, events, shop, storage, aliases, release gates and hidden 2.0 require independent checks. No retirement approved.');
