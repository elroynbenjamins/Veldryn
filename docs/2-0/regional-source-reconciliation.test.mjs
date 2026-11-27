import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Read source declarations, not generated builds or live drop receipts. Source format changes fail the count checks.
function audit(read){
 const mobile='apps/mobile/src/content/', equip='backend/src/server/equipment/';
 const raw=read(mobile+'monsters.ts');
 const block=raw.split('const MONSTERS_RAW:MonsterDef[]=[')[1].split('];')[0];
 const reb=raw.split('const REGIONAL_25_LEVEL_REBALANCE:')[1].split('};')[0];
 const field=(s,k)=>s.match(new RegExp('\\b'+k+':\\s*(?:\\\'([^\\\']*)\\\'|"([^"]*)"|([0-9.]+))'))?.slice(1).find(x=>x!==undefined);
 const monsters=block.split('\n').filter(l=>/^\s*\{id:/.test(l)).map(l=>{
  const id=field(l,'id'),zone=field(l,'zone'),override=reb.split('\n').find(x=>x.trim().startsWith(id+':'));
  const regional=zone==='Sunscar'||zone==='Frostmarch';
  return {id,zone,boss:l.includes('boss:true'),level:Number(field(override||l,'level')),unlock:Number(field(override||l,'unlockLevel')),
   levelBasis:regional?'rebased_authored':'legacy_requires_rebase',drops:[...l.matchAll(/\{itemId:'([^']+)',chance:([.0-9]+),min:(\d+),max:(\d+)\}/g)].map(m=>({itemId:m[1],rawChance:Number(m[2]),min:Number(m[3]),max:Number(m[4])}))};
 });
 const recipeLines=['skills.ts','cross-profession-components.ts','alchemy.ts'].flatMap(file=>read(mobile+file).split('\n').filter(l=>l.includes("inputs:[")&&l.includes("output:{itemId:")).map(l=>({file,line:l})));
 const recipes=recipeLines.map(({file,line:l})=>({file,id:field(l,'id'),skill:field(l,'skillId'),level:Number(field(l,'level')),output:l.match(/output:\{itemId:'([^']+)',quantity:(\d+)/)?.[1],inputs:[...l.split('inputs:[')[1].split('],output:')[0].matchAll(/\{itemId:'([^']+)',quantity:(\d+)\}/g)].map(m=>({itemId:m[1],quantity:Number(m[2])}))})).filter(x=>x.output&&x.inputs.length);
 const nodes=['skills.ts','herbalism.ts'].flatMap(file=>read(mobile+file).split('\n').filter(l=>/^\s*\{id:/.test(l)&&l.includes("zoneId:")&&l.includes("itemId:")&&!l.includes('inputs:')).map(l=>({id:field(l,'id'),itemId:field(l,'itemId'),zone:field(l,'zoneId'),skillLevel:Number(field(l,'unlockLevel')),skill:file==='herbalism.ts'?'herbalism':field(l,'skillId')})));
 const pinned=['manifest','expansion-manifest','armament-manifest'].flatMap(n=>[...read(equip+'equipment-crafting-v2-'+n+'.ts').matchAll(/(?:CORE|EXPANSION|ARMAMENT)_RECIPES:readonly V2ServerRecipe\[\]=(\[.*?\]);/gs)].flatMap(m=>JSON.parse(m[1])));
 const ids=[...new Set(pinned.flatMap(r=>r.inputs.map(x=>x.itemId)))].sort();
 const herbalEssences=[...read(mobile+'herbalism.ts').matchAll(/([A-Z_]+):\{itemId:'([^']+)',baseChance:([.0-9]+)\}/g)].map(m=>({zone:m[1],itemId:m[2],baseChance:Number(m[3])}));
 const direct=id=>({rareGathering:herbalEssences.filter(x=>x.itemId===id),drops:monsters.filter(m=>m.drops.some(d=>d.itemId===id)&&!m.boss&&m.zone!=='Ashlands').map(m=>({id:m.id,zone:m.zone,unlock:m.unlock,levelBasis:m.levelBasis})),nodes:nodes.filter(n=>n.itemId===id),recipes:recipes.filter(r=>r.output===id)});
 const graph=new Map();
 function traverse(id,path=[]){if(path.includes(id))throw Error('cycle '+[...path,id]);if(graph.has(id))return;const x=direct(id);graph.set(id,x);for(const r of x.recipes)for(const i of r.inputs)traverse(i.itemId,[...path,id]);}
 ids.forEach(id=>traverse(id));
 const roots=ids.map(id=>({id,tiers:[...new Set(pinned.filter(r=>r.inputs.some(i=>i.itemId===id)).map(r=>r.tier))],...graph.get(id)}));
 const t5=JSON.parse(read('docs/2-0/eq2-t1-t5-canonical-membership-reconciliation-v2.json'));
 const five=t5.entries.filter(x=>x.tier===5),sourceCounts={};for(const e of five)sourceCounts[e.reconciliation.sourceStatus]=(sourceCounts[e.reconciliation.sourceStatus]||0)+1;
 const t5Production=JSON.parse(read('docs/2-0/eq2-t5-material-production-review-v11.json'));
 const familyText=read(mobile+'enemy-families.ts').split('export const ENEMY_FAMILIES=')[1].split('] as const;')[0]+']';
 const families=JSON.parse(familyText);
 const candidates={NATURE:'root_guard_or_bleed',VERMIN:'poison_or_burst',BEAST:'direct_burst',CONSTRUCT:'barrier_or_sunder',HUMAN:'telegraphed_strike',UNDEAD:'shadow_or_vulnerability',ELEMENTAL:'elemental_burst',SPIRIT:'spell_or_hex',GIANT:'heavy_strike'};
 const mapped=monsters.filter(m=>!m.boss&&m.zone!=='Ashlands').map(m=>{
  const family=families.find(f=>f.monsterIds.includes(m.id));
  const region=m.zone==='Sunscar'?'sunscar':m.zone==='Frostmarch'?'frostmarch':'asterfall';
  return {id:m.id,region,level:m.level,unlock:m.unlock,levelBasis:m.levelBasis,family:family?.id??null,
   candidate:candidates[family?.id]??'NEEDS_AUTHORING',enabled:false};
 });
 const boss=read('apps/mobile/src/core/regional-combat-catalog-v1.ts');
 const sand=boss.split('\n').find(x=>x.includes("kind:'regional_boss'")&&x.includes("contentId:'BOSS_002'"));
 return {pinnedRecipeCount:pinned.length,roots,graph:[...graph].map(([id,x])=>({id,...x})),monsters:mapped,t5:{count:five.length,sourceCounts,closed:five.every(e=>!e.mayMint&&!e.mayEquip&&!e.mayTrade&&!e.mayDrop),raw:t5Production.existingRaw,processing:t5Production.processing.length,productionClosed:t5Production.releaseActivation===false&&t5Production.mayMint===false},gateEvidence:{asterfall:monsters.find(x=>x.id==='FALLEN_KNIGHT'),sunscar:sand||null,frostmarch:null}};
}
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('canonical source declarations, preparation requirements and closed T5 design',()=>{
 const a=audit(read);
 assert.equal(a.pinnedRecipeCount,338);assert.equal(a.roots.length,22);
 assert.equal(a.t5.count,125);assert.ok(a.t5.closed&&a.t5.productionClosed);
 assert.ok(a.roots.find(x=>x.id==='THORN_SAP').drops.some(x=>x.id==='VENOM_WEAVER'));
 assert.ok(a.roots.find(x=>x.id==='ASTRAL_SCRIPT').drops.some(x=>x.id==='DUNE_ORACLE'&&x.unlock===32));
 assert.ok(a.roots.find(x=>x.id==='GLASSBOUND_BINDER').recipes.some(x=>x.id==='BREW_GLASSBOUND_BINDER'));
 assert.ok(a.graph.find(x=>x.id==='ASTERFALL_BOTANICAL_ESSENCE').rareGathering.some(x=>x.zone==='GREENFIELDS'&&x.baseChance===.02));
 assert.equal(a.roots.filter(x=>!x.drops.length&&!x.nodes.length&&!x.recipes.length&&!x.rareGathering.length).length,0);
 assert.equal(a.monsters.length,46);assert.equal(new Set(a.monsters.map(x=>x.id)).size,46);
 assert.ok(a.monsters.every(x=>x.enabled===false));
 assert.ok(a.monsters.some(x=>x.id==='FROSTWOLF'&&x.region==='frostmarch'&&x.level===51));
 assert.ok(a.gateEvidence.asterfall?.boss);assert.ok(a.gateEvidence.sunscar);assert.equal(a.gateEvidence.frostmarch,null);
 console.log('REGIONAL_SOURCE_DECLARATION_REVIEW '+JSON.stringify({...a,sourceGrantVerified:false,releaseEnabled:false}));
});
