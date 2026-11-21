#!/usr/bin/env node
/**
 * Offline, read-only EQ2 source identity and acquisition audit.
 *
 * Node: node tools/audit-eq2-material-sources-v1.mjs
 * Reports inspected mobile source declarations ONLY, not live database availability.
 * It does not import the game, activate items, run SQL or mutate outputs.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  authoredChanceForFinal,catalogIds,effectiveNormalMaterialChance,
  existingSmelting,gatherNodes,monsterSources
} from './lib/eq2-source-introspection-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const cfg=JSON.parse(read('docs/equipment-2-0/t1-t4-economy-review-v1.json'));
const draft=JSON.parse(read('docs/equipment-2-0/t1-t4-economy-generated-recipes-v1.json'));
const check=(ok,message)=>{if(!ok)throw Error('Source audit fail-closed: '+message);};
check(cfg.status==='REVIEW_ONLY_NO_RUNTIME'&&draft.status==='REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME',
  'input not review-only');
check(cfg.expected.ordinaryPieces===169&&draft.recipes.length===338,'unexpected EQ2 proposal count');
const base='apps/mobile/src/content/';
const categories={
  'items.ts':read(base+'items.ts'),
  'herbalism.ts':read(base+'herbalism.ts'),
  'guild-components.ts':read(base+'guild-components.ts'),
  'cross-profession-components.ts':read(base+'cross-profession-components.ts')
};
const itemIds=catalogIds(categories);
const nodes=[...gatherNodes(read(base+'skills.ts'),'gathering'),
  ...gatherNodes(categories['herbalism.ts'],'herbalism')];
const monsters=monsterSources(read(base+'monsters.ts'));
const smelts=existingSmelting(read(base+'skills.ts'));
const exact=(a,b)=>JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());
const toMap=ingredients=>Object.fromEntries(ingredients.map(x=>[x.itemId,x.quantity]));
const claimed=new Set();
const allTiers=cfg.tierSpecs.map(tier=>{
  const nameById=new Map(Object.entries(tier.items).map(([type,id])=>[id,type]));
  const materialIds=new Set(Object.values(tier.items));
  tier.processing.forEach(step=>{
    materialIds.add(step.output);
    Object.keys(step.inputs).forEach(id=>materialIds.add(id));
  });
  const materialRows=[...materialIds].sort().map(id=>{
    const kind=nameById.get(id)||'processingRaw';
    const matchingNodes=nodes.filter(n=>n.itemId===id);
    const matchingMonsters=monsters.filter(m=>m.itemId===id);
    const existingRecipe=smelts.find(r=>r.outputId===id);
    const proposedRecipe=tier.processing.find(r=>r.output===id);
    const existingMaterials=itemIds.get(id)||[];
    if(kind==='common'||kind==='rare'){
      // No proposed combat material is declared live until explicitly wired.
      // Existing drop ID matches are evidence of mobile definition only.
      check(!!id,'no combat id');
    }
    if(!matchingNodes.length&&!matchingMonsters.length&&!existingRecipe&&!proposedRecipe&&!existingMaterials.length)
      claimed.add(id);
    const collision=existingRecipe&&proposedRecipe
      ?(!exact(toMap(existingRecipe.inputs),proposedRecipe.inputs)
          ||existingRecipe.outputQuantity!==proposedRecipe.quantity
          ||existingRecipe.xp!==proposedRecipe.xp
          ||existingRecipe.seconds!==proposedRecipe.seconds)
      :false;
    return {
      itemId:id, role:kind, catalogDeclarations:existingMaterials,
      knownGatherNodes:matchingNodes, knownMonsterDrops:matchingMonsters,
      existingProcessing:existingRecipe||null,
      proposedProcessing:proposedRecipe||null,
      sameOutputDifferentRecipe:collision,
      sourceReviewNeeded:!(matchingNodes.length||matchingMonsters.length||existingRecipe||proposedRecipe)
    };
  });
  const commonId=tier.items.common,rareId=tier.items.rare;
  const f=tier.drops;
  return {
    tier:tier.tier,name:tier.name,
    materials:materialRows,
    normalKillDropReview:{
      proposedFinalCommon:f.commonKill,proposedFinalScarce:f.scarceKill,
      finalIfThoseNumbersAreAuthoredBeforeLegacyNormalizing:{
        common:effectiveNormalMaterialChance(f.commonKill),
        scarce:effectiveNormalMaterialChance(f.scarceKill)
      },
      authoredChanceToMeetProposedFinalUnderCurrentClientNormalizer:{
        common:authoredChanceForFinal(f.commonKill),
        scarce:authoredChanceForFinal(f.scarceKill)
      },
      note:'Legacy mobile normal-material drops are multiplied by .5 and (if chance < 1) .95. Authored vs effective drop odds must be explicitly pinned once on the server; no new monster source/drop was changed.'
    },
    combatSourceCount:{
      common:monsters.filter(m=>m.itemId===commonId).length,
      rare:monsters.filter(m=>m.itemId===rareId).length
    }
  };
});
const coverage=allTiers.flatMap(t=>t.materials).reduce((acc,row)=>{
  acc.references++;
  if(row.catalogDeclarations.length)acc.registered++;
  if(row.knownGatherNodes.length)acc.gathered++;
  if(row.knownMonsterDrops.length)acc.monsterDrops++;
  if(row.existingProcessing)acc.existingProcessing++;
  if(row.proposedProcessing)acc.proposedProcessing++;
  if(row.sameOutputDifferentRecipe)acc.conflictingExistingRecipeIds.push(row.itemId);
  return acc;
},{references:0,registered:0,gathered:0,monsterDrops:0,existingProcessing:0,proposedProcessing:0,conflictingExistingRecipeIds:[]});
check(coverage.proposedProcessing===16,'processing source coverage');
check(coverage.conflictingExistingRecipeIds.includes('SUNSTONE_INGOT'),
  'existing Sunstone Ingot conflict no longer present; review this audit');
console.log(JSON.stringify({
  status:'REVIEW_ONLY_NO_RUNTIME',
  scope:'Inspected mobile catalog, gather, herbalism and MONSTERS_RAW only. Neither production nor authenticated server drop commits audited.',
  coverage,
  notObservedWithAnyDefinitionOrSourceInInspectedMobileFiles:[...claimed].sort(),
  observedGatherNodes:nodes.length,
  observedAuthoredMonsterDrops:monsters.length,
  existingSmeltingRecipesReviewed:smelts.length,
  cautions:[
    'An existing-looking ID may be in another imported catalog; this is a conservative source finding.',
    'No combat loot eligibility, PvE anti-abuse, server version, global drop caps or elite rates verified.',
    'The intended EQ2 per-kill probabilities are not necessarily the authored values in the existing normal-material scale pipeline.',
    'Existing Sunstone Ingot output must NOT silently receive two different processing costs.',
    'No user-facing UI or gameplay edits are performed by this audit.'
  ],
  tiers:allTiers
},null,2));
