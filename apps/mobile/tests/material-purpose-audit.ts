import {ITEMS} from '../src/content/items';
import {GATHERING,RECIPES} from '../src/content/skills';
import {HERB_NODES} from '../src/content/herbalism';
import {MONSTERS} from '../src/content/monsters';
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
 return {id:item.id,name:item.name,value:item.value,recipeConsumers:recipes.length,recipeExamples:recipes.slice(0,3).map(recipe=>recipe.id),recipeProducers:outputs.length,monsterSources:monsters.map(monster=>monster.id),gatheringSources:gathering.length,companionUses};
});
const candidates=rows.filter(row=>row.recipeConsumers===0&&row.companionUses.length===0&&(row.monsterSources.length>0||row.gatheringSources>0||row.recipeProducers>0));
const core=rows.find(row=>row.id==='RUNEBOUND_CORE');
if(!core?.companionUses.some(use=>use.includes('Runebound Sentry'))||!core.companionUses.some(use=>use.includes('Expedition Pens')))throw Error('Protected core consumer evidence missing');
console.log(JSON.stringify({resolvedMaterials:rows.length,initialFlags:rows.filter(row=>initialIds.has(row.id)),otherScreeningCandidates:candidates.filter(row=>!initialIds.has(row.id)),screeningCandidateCount:candidates.length},null,2));
console.log('REVIEW ONLY: enhancement, quests, guild, events, shop, storage, aliases, release gates and hidden 2.0 require independent checks. No retirement approved.');
