/**
 * Isolated Node contract check. Run from repository root:
 * node tools/test-eq2-physical-subtype-catalogue-review-v1.mjs
 * Source text parsed only for SOURCE COMPARISON, never code generation or gameplay use.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const catalogue=JSON.parse(read('docs/equipment-2-0/eq2-physical-subtype-catalogue-review-v1.json'));
const expansion=JSON.parse(read('docs/equipment-2-0/eq2-expanded-48-set-member-authoring-v1.json')).members;
const t5=JSON.parse(read('docs/equipment-2-0/t5-rare-set-catalogue-review-v1.json'));
function pieces(path,name){
 const s=read(path),anchor=name+':readonly V2ServerPiece[]=';
 const start=s.indexOf(anchor);
 assert.ok(start>=0,name+' missing');
 const a=start+anchor.length,b=s.indexOf('];',a);
 assert.ok(a>=0&&b>a);
 return JSON.parse(s.slice(a,b+1));
}
const path='backend/src/server/equipment/';
const core=pieces(path+'equipment-crafting-v2-manifest.ts','V2_SERVER_CORE_PIECES');
const exp=pieces(path+'equipment-crafting-v2-expansion-manifest.ts','V2_SERVER_EXPANSION_PIECES');
const arm=pieces(path+'equipment-crafting-v2-armament-manifest.ts','V2_SERVER_ARMAMENT_PIECES');
const pinned=[...core,...exp,...arm], rare=t5.sets.flatMap(s=>s.members);
assert.equal(pinned.length,169);assert.equal(expansion.length,204);assert.equal(rare.length,10);
assert.equal(catalogue.status,'HIDDEN_REVIEW_ONLY_NOT_RUNTIME_COMBAT_OR_MINT_AUTHORITY');assert.equal(catalogue.activation,false);
assert.equal(catalogue.entries.length,383);assert.equal(new Set(catalogue.entries.map(x=>x.itemId)).size,383);
const sorted=a=>a.slice().sort();
const forSource=s=>catalogue.entries.filter(x=>x.source===s);
assert.deepEqual(sorted(forSource('pinned_forge_169').map(x=>x.itemId)),sorted(pinned.map(x=>x.id)));
assert.deepEqual(sorted(forSource('expanded_48_set_204').map(x=>x.itemId)),sorted(expansion.map(x=>x.id)));
assert.deepEqual(sorted(forSource('rare_t5_10').map(x=>x.itemId)),sorted(rare.map(x=>x.id)));
const byId=new Map(catalogue.entries.map(x=>[x.itemId,x]));
for(const p of pinned){
 const row=byId.get(p.id);assert.equal(row.tier,p.tier);assert.equal(row.slot,p.slot);assert.equal(row.name,p.name);
 assert.equal(row.material,p.material);
 if(p.slot==='weapon')assert.ok(row.attack);
 else assert.equal(row.attack,null);
}
for(const p of expansion){const row=byId.get(p.id);assert.equal(row.setId,p.setId);assert.equal(row.material,p.material);assert.equal(row.attack,null);if(['eq2_t4_citadel','eq2_t4_bloodsteel'].includes(p.setId))assert.equal(row.status,'retired_superseded_never_register_mint_or_craft');}
for(const p of rare){const row=byId.get(p.id);assert.equal(row.preserveExistingInnateStat,p.innate.stat);assert.equal(row.attack,null);}
const wp=catalogue.entries.filter(x=>x.attack), shields=catalogue.entries.filter(x=>x.shieldBash);
assert.equal(wp.length,36);assert.equal(shields.length,12);assert.equal(wp.filter(x=>x.attack.mode==='spell_source').length,4);
for(const p of wp){
 assert.equal(p.tier>=1&&p.tier<=4,true);
 if(p.attack.mode==='spell_source')assert.equal(p.attack.weights.length,0);
 else assert.equal(p.attack.weights.reduce((n,w)=>n+w.basisPoints,0),10000);
 for(const w of p.attack.weights){assert.ok(['slashing','piercing','blunt'].includes(w.type));assert.ok(w.basisPoints>0);}
}
for(const e of catalogue.entries){
 assert.equal(e.automaticSubtypeResistance,0);assert.equal(e.automaticSubtypeDamageBonus,0);
 assert.ok(!('price' in e));assert.ok(!('rarity' in e));assert.ok(!('mint' in e));
 if(e.shieldBash){assert.equal(e.slot,'offhand');assert.equal(e.shieldBash.automatic,false);}
}
const review=read(path+'equipment-crafting-v2-physical-types-review.ts');
assert.match(review,/V2_PHYSICAL_SUBTYPE_REVIEW_ACTIVATED=false/);
assert.match(review,/v2ServerPiece\(pieceId\)/);
console.log('PASS EQ2 physical subtype review: 169 pinned + 204 planned + 10 rare T5 = 383, 36 weapons, 12 shield bash candidates, no granted stats/rolls.');
