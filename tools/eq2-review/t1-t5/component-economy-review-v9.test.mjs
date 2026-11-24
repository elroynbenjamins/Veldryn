import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceRoutes,proposeComponentEconomy,summarizeComponentEconomy} from './component-economy-review-v9.mjs';
test('all current 746 T1-T4 and 182 T5 draft routes, no boss-only or retired recipes',()=>{
 const source=sourceRoutes(),rows=proposeComponentEconomy(),s=summarizeComponentEconomy();
 assert.equal(rows.length,928);assert.equal(s.items,469);
 assert.equal(rows.filter(x=>x.tier<5).length,746);
 assert.equal(rows.filter(x=>x.tier===5).length,182);
 assert.equal(new Set(rows.map(x=>x.sourceId)).size,rows.length);
 for(let i=0;i<rows.length;i++){
  const r=rows[i],o=source[i];
  assert.equal(r.seconds,o.seconds);assert.equal(r.xp,o.xp??null);
  assert.equal(r.candidateGold,Math.min(r.previousGold,Math.max(100,Math.round(r.previousGold*.7/100)*100)));
  assert.equal(r.inputs.length,o.inputs.length);
  assert(r.inputs.every(x=>x.candidate>=x.previous));
  for(const x of r.inputs){
   if(x.kind==='preserved_source'||x.kind==='preserved_other')assert.equal(x.candidate,x.previous);
   if(x.kind==='refined')assert.equal(x.candidate,Math.ceil(x.previous*1.2));
   if(x.kind==='advanced')assert.equal(x.candidate,Math.ceil(x.previous*1.25));
   if(x.kind==='binder')assert.equal(x.candidate,x.previous+(r.tier>=2?1:0));
  }
  assert.equal(r.mayCraft,false);assert.equal(r.mayMint,false);assert.equal(r.mayTrade,false);
 }
 console.log('EQ2_COMPONENT_V9 '+JSON.stringify(s));
});
test('alternate routes retain combat drop and binder parity and cannot reduce the fee',()=>{
 const rows=proposeComponentEconomy();
 for(const group of Object.values(Object.groupBy(rows,x=>x.itemId))){
  if(group.length===1)continue;
  assert.equal(group.length,2);
  const [a,b]=group;
  const preserved=r=>r.inputs.filter(x=>x.kind==='preserved_source'||x.kind==='binder').map(x=>[x.itemId,x.candidate]).sort((a,b)=>a[0].localeCompare(b[0]));
  assert.deepEqual(preserved(a),preserved(b),a.itemId);
  assert.equal(a.candidateGold,b.candidateGold);
 }
});

test('source-specific regressions: T4 combat plate, optional T5 wood, inherited rare identity and raw accessory alternatives',()=>{
 const rows=proposeComponentEconomy();
 const ravager=rows.find(r=>r.sourceId==='EQ2_WEAPON_T4_RAVAGER_FOUNDATION');
 assert.equal(ravager.candidateGold,9500);
 const expected={EQ2_GLASSBOUND_ALLOY_BAR:74,EQ2_REINFORCED_DUNEWOOD:27,EQ2_HARDENED_SUNSCAR_LEATHER:15,EQ2_GLASSBOUND_PLATE:18,EQ2_GLASSHEART_FRAGMENT:2,GLASSBOUND_BINDER:2};
 assert.deepEqual(Object.fromEntries(ravager.inputs.map(x=>[x.itemId,x.candidate])),expected);
 assert.equal(ravager.inputs.find(x=>x.itemId==='EQ2_GLASSBOUND_PLATE').kind,'preserved_source');
 assert(rows.filter(x=>x.route==='inherited').length===10);
 assert(rows.some(x=>x.itemId==='EQ2_RARE_T5_CITADEL_HELMET'));
 for(const r of rows.filter(x=>x.itemId==='EQ2_LAUNCH_T5_RIMEWATCH_RING'))assert(!r.inputs.some(x=>x.itemId==='frostwoodPlanks'));
 const raw=rows.filter(x=>x.itemId==='EQ2_SOLO_FIELDBORN_GUARD_SIGNET').map(r=>r.inputs.find(x=>x.itemId==='EQ2_RIVERSTONE'));
 assert.deepEqual(raw.map(x=>x.candidate).sort(),[2,3]);assert(raw.every(x=>x.kind==='preserved_other'));
});
