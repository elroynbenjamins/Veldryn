import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {inspectEquipmentIndex,benchmarkEquipmentIndex,summarizeEquipmentIndex} from './equipment-power-review-v5.mjs';
const d=JSON.parse(readFileSync(new URL('../../../docs/2-0/eq2-equipment-power-review-v5.json',import.meta.url),'utf8'));
const read=p=>readFileSync(p,'utf8');
test('source baseline parity, explicit proposed CP weights, and 45 source-resolved legal equipment rosters',()=>{
 const src=read('backend/src/server/equipment/equipment-crafting-v2-instances.ts');
 const budgets=Object.fromEntries([...src.match(/V2_SERVER_SLOT_BUDGET:Readonly<Record<V2Slot,number>>=\{([\s\S]*?)\};/)[1].matchAll(/(\w+):([\d.]+)/g)].map(m=>[m[1],+m[2]]));
 assert.deepEqual(d.basePolicy.slotBudget,budgets);
 assert.match(src,/const HP_PER_POINT=4;/);
 assert.match(src,/const FACTOR=1\.08;/);
 const files=['equipment-crafting-v2-manifest.ts','equipment-crafting-v2-armament-manifest.ts','equipment-crafting-v2-expansion-manifest.ts'];
 const pieces=files.flatMap(f=>JSON.parse(read('backend/src/server/equipment/'+f).match(/const V2_SERVER_\w+_PIECES:readonly V2ServerPiece\[\]\s*=\s*(\[[\s\S]*?\]);/)[1]));
 assert.equal(pieces.length,169);
 assert.equal(d.items.length,233);
 for(const p of pieces){
  const x=d.items.find(x=>x.itemId===p.id);assert(x);
  for(const k of ['tier','slot','role','profile'])assert.equal(x[k],p[k]);
  assert.equal(x.classId,p.classRestriction??null);
  assert.equal(x.hands,p.hands??null);
 }
 assert.equal(d.loadouts.length,45);
 assert.equal(d.loadouts.filter(x=>x.slots===10).length,20);
 assert.equal(d.loadouts.filter(x=>x.slots===9).length,25);
 assert(d.loadouts.every(x=>x.roleFallbackIds.length===0));
 assert.equal(d.cpApproved,false);assert.equal(d.releaseActivation,false);
 assert.equal(d.scorePolicy.innateAndSetEffects,'UNPRICED_NOT_ZERO_VALUE');
});
const rows=benchmarkEquipmentIndex();
test('3240 deterministic candidate comparisons: nine classes x five tiers x six rarities x three qualities x four builds',()=>{
 assert.equal(rows.length,3240);
 assert.equal(new Set(rows.map(x=>[x.classId,x.tier,x.rarity,x.quality,x.mode].join(':'))).size,3240);
 for(const x of rows){
  assert(Number.isFinite(x.equipmentIndex)&&x.equipmentIndex>=x.base&&x.base>0);
  assert.equal(x.slots,x.hands==='one'?10:9);
  assert(x.rawWeightedAffixFraction>=x.effectiveWeightedAffixFraction);
  assert.equal(x.cpApproved,false);assert.equal(x.mayApplyEffects,false);assert.equal(x.mayMint,false);
  assert(x.unpriced.includes('innate')&&x.unpriced.includes('set'));
 }
 const s=summarizeEquipmentIndex(rows);
 assert.equal(s.groups,360);
 assert(s.t5MythicQ50.every(x=>x.oneHandRollCount===30&&x.twoHandRollCount===27));
 assert(Object.values(s.t5MythicQ50).every(x=>x.baseSpread<.1));
 console.log('EQ2_POWER_V5_SUMMARY '+JSON.stringify(s));
});
test('quality changes base only; rarity and tier improve budget at fixed quality; no double scaling',()=>{
 const r=rows.filter(x=>x.classId==='IRONWARDEN'&&x.tier===5&&x.rarity==='mythic'&&x.mode==='focused_crit_damage').sort((a,b)=>a.quality-b.quality);
 assert.equal(r.length,3);
 assert.deepEqual(r[0].channels,r[2].channels);
 assert(Math.abs(r[2].base/r[0].base-1.25/.75)<.001);
 assert(Math.abs(r[2].equipmentIndex/r[0].equipmentIndex-1.25/.75)<.001);
 for(const mode of d.scorePolicy.scenarios)for(const cls of Object.keys(d.classes)){
  const g=rows.filter(x=>x.classId===cls&&x.quality===50&&x.rarity==='common'&&x.mode===mode).sort((a,b)=>a.tier-b.tier);
  for(let i=1;i<g.length;i++){assert(g[i].base>g[i-1].base);assert(g[i].equipmentIndex>g[i-1].equipmentIndex);}
 }
 assert.throws(()=>inspectEquipmentIndex({classId:'FAKE',tier:5,rarity:'mythic',quality:50}),/unknown_class_tier/);
 assert.throws(()=>inspectEquipmentIndex({classId:'IRONWARDEN',tier:6,rarity:'mythic',quality:50}),/unknown_class_tier/);
 assert.throws(()=>inspectEquipmentIndex({classId:'IRONWARDEN',tier:5,rarity:'mythic',quality:101}),/quality/);
});
