#!/usr/bin/env node
/**
 * Offline, read-only source and rarity preview for six proposed EQ2 signature
 * gear pieces. No live game imports, player state, SQL, receipts or item grant.
 *
 * Run: node tools/preview-eq2-signature-equipment-v1.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gatherNodes} from './lib/eq2-source-introspection-v1.mjs';
import {geometricSuccessQuantiles,validateSignatureReview} from './lib/eq2-signature-contract-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const parse=file=>JSON.parse(read(file));
const fail=reason=>{throw Error('signature_preview_not_ready:'+reason);};
function literalArray(file,token) {
 const src=read(file),start=src.indexOf(token),begin=src.indexOf('=[',start),end=src.indexOf('];',begin);
 if(start<0||begin<0||end<begin)fail('hidden_manifest_missing_'+token);
 return JSON.parse(src.slice(begin+1,end+1));
}
function rareBlueprints(){
 const src=read('backend/src/server/equipment/equipment-crafting-v2-blueprint-policy.mjs');
 const marker='V2_RARE_BLUEPRINT_DRAFTS=Object.freeze(';
 const start=src.indexOf(marker),end=src.indexOf('].map(',start);
 if(start<0||end<start)fail('blueprint_policy_drift');
 return JSON.parse(src.slice(start+marker.length,end+1));
}
const config=parse('docs/equipment-2-0/t2-t4-signature-equipment-fishing-dungeon-v1.json');
const economy=parse('docs/equipment-2-0/t1-t4-economy-review-v1.json');
const ordinaryDraft=parse('docs/equipment-2-0/t1-t4-economy-generated-recipes-v1.json');
if(economy.status!=='REVIEW_ONLY_NO_RUNTIME'||ordinaryDraft.status!=='REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME'
  ||ordinaryDraft.recipes.length!==338)fail('economy_provenance');
const sources=[
 ['backend/src/server/equipment/equipment-crafting-v2-manifest.ts','V2_SERVER_CORE_PIECES'],
 ['backend/src/server/equipment/equipment-crafting-v2-expansion-manifest.ts','V2_SERVER_EXPANSION_PIECES'],
 ['backend/src/server/equipment/equipment-crafting-v2-armament-manifest.ts','V2_SERVER_ARMAMENT_PIECES']
];
const existing=sources.flatMap(([file,name])=>literalArray(file,name));
const locked=rareBlueprints();
const fishNodes=gatherNodes(read('apps/mobile/src/content/skills.ts'),'gathering').filter(x=>x.skillId==='fishing');
const checked=validateSignatureReview(config,{
 tierSpecs:economy.tierSpecs,fishingNodes:fishNodes,
 ordinaryItemIds:existing.map(x=>x.id),rareBlueprintItemIds:locked.map(x=>x.itemId)
});
const projected=config.materials.map(m=>{
 const piece=config.items.find(x=>x.materialId===m.id);
 const q=geometricSuccessQuantiles(m.baseFinalChance);
 const node=m.fishingNodeId?fishNodes.find(x=>x.id===m.fishingNodeId):null;
 return {
  tier:m.tier,signatureItem:piece.name,signatureItemId:piece.id,
  component:m.name,componentId:m.id,source:m.origin,
  sourceDetails:node
   ?{nodeId:node.id,zoneId:node.zoneId,areaId:node.areaId,primaryCatch:node.itemId,baseCycleSeconds:node.seconds*2}
   :{region:m.region,requiredDifficulty:m.dungeonDifficulty,successfulRunOnly:true},
  probabilityPerEligibleSourceEvent:m.baseFinalChance,
  oneUnit:{expectedEvents:q.expected,p50:q.p50,p90:q.p90,p95:q.p95,
   ...(node?{
    expectedBaseFishingHours:Number((q.expected*node.seconds*2/3600).toFixed(2)),
    p50BaseFishingHours:Number((q.p50*node.seconds*2/3600).toFixed(2)),
    p90BaseFishingHours:Number((q.p90*node.seconds*2/3600).toFixed(2)),
    p95BaseFishingHours:Number((q.p95*node.seconds*2/3600).toFixed(2))
   }:{})},
  originalCommonAndScarceTierRequirements:ordinaryDraft.recipes.filter(x=>x.tier===m.tier).length,
  combatTrait:{id:piece.traitId,description:piece.trait.description,family:piece.trait.family},
  marketScope:piece.origin==='dungeon_completion_material'?'account_bound_crafted_item':'market_possible_only_after_escrow_review'
 };
});
console.log(JSON.stringify({
 status:'REVIEW_ONLY_NO_RUNTIME',
 validated:checked,
 warnings:[
  'All percentages and Combat 2.0 procs are DESIGN CANDIDATES, not active drop rules or power values.',
  'Fishing hours use doubled authored base gathering seconds, without tool effects, buffs, combat, queue or gear material time.',
  'Dungeon numbers count independently authenticated, successful eligible run receipts; no claim that runs remain reward-eligible after weekly caps.',
  'Dungeon rare materials cannot be bought with Marks, traded or rewarded for failed runs; only one chance per completed run.',
  'Six existing elite/boss rare blueprint crafts remain unissued and unchanged. Their blueprints do not drop via Fishing/Dungeons.',
  'No player-facing item screen, artwork or theme is approved, so no UI code was changed.'
 ],
 items:projected
},null,2));
