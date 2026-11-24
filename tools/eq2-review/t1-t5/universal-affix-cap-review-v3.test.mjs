import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {previewUniversalRoll,inspectReviewLoadout,capChannel} from './universal-affix-cap-review-v3.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const c=read('../../../docs/2-0/eq2-universal-affix-cap-review-v3.json');
const d=read('../../../docs/2-0/eq2-t1-t5-canonical-membership-reconciliation-v2.json');
const sequence=xs=>{let i=0;return max=>{const x=xs[i++];assert(Number.isSafeInteger(x)&&x>=0&&x<max,'fixture out of bounds');return x;};};
const hi=max=>max===1000000?0:max-1;
const sampleByTier=t=>d.entries.find(x=>x.tier===t).itemId;

test('source parity: original T1-T4 numerical ranges, rarity bands, quality and exact 11 Forge channels; only T5 extrapolated',()=>{
 const source=readFileSync('backend/src/server/equipment/equipment-crafting-v2-rolls.ts','utf8');
 const preview=readFileSync('backend/src/server/equipment/equipment-crafting-v2-universal-affix-preview.ts','utf8');
 const pool=preview.match(/UNIVERSAL_FORGE_BONUS_STAT_POOL_V2:readonly V2Affix\[\]=\[\s*([\s\S]*?)\];/)[1].match(/'\w+'/g).map(x=>x.slice(1,-1));
 assert.deepEqual(c.stats.map(s=>s.id),pool);
 assert.equal(pool.length,11);
 assert(!pool.includes('potency'));
 for(const s of c.stats){
  const m=source.match(new RegExp('^\\s*'+s.id+':(\\[\\[.*?\\]\\]),?$','m'));
  assert(m,s.id);
  const values=JSON.parse(m[1].replace(/(?<!\d)\.(\d)/g,'0.$1'));
  assert.deepEqual(s.rangeCentipercent.slice(0,4),values.map(r=>r.map(x=>Math.round(x*100))));
  assert.deepEqual(s.rangeCentipercent[4],s.rangeCentipercent[3].map(x=>Math.round(x*1.2)));
 }
 const bands=[...source.matchAll(/\{rarity:'(\w+)',buckets:(\d+),low:([\d.]+),high:([\d.]+),affixesLowTier:(\d+),affixesHighTier:(\d+)\}/g)];
 assert.equal(bands.length,6);
 for(let i=0;i<bands.length;i++){
  const m=bands[i],b=c.rarityBands[i];
  assert.equal(b.rarity,m[1]);assert.equal(b.buckets,Number(m[2]));
  assert.equal(b.lowBp,Math.round(Number(m[3])*10000));assert.equal(b.highBp,Math.round(Number(m[4])*10000));
  assert.deepEqual(b.counts,[+m[5],+m[5],+m[6],+m[6],+m[6]]);
 }
 assert.equal(c.releaseActivation,false);assert.equal(c.statContractApproved,false);assert.equal(c.cpApproved,false);
});

test('all 554 exact current item templates use identical stat identity and magnitude at same tier and draw sequence',()=>{
 for(const t of [1,2,3,4,5]){
  const entries=d.entries.filter(x=>x.tier===t);
  for(let i=0;i<11;i++){
   const rng=()=>sequence([999999,500000,i,5000]);
   const expected=previewUniversalRoll(entries[0].itemId,rng());
   assert.equal(expected.affixes[0].id,c.stats[i].id);
   for(const x of entries){
    const r=previewUniversalRoll(x.itemId,rng());
    assert.deepEqual(r.affixes,expected.affixes);
    assert.equal(r.mayMint,false);assert.equal(r.mayEquip,false);assert.equal(r.mayTrade,false);assert.equal(r.releaseApproved,false);
   }
  }
 }
});
test('rarity boundary counts, maximum quality, distinct stats per item, and invalid draws',()=>{
 let start=0;
 for(const band of c.rarityBands){
  for(const tier of [1,2,3,4,5]){
   const count=band.counts[tier-1];
   for(const r of [start,start+band.buckets-1]){
    const roll=previewUniversalRoll(sampleByTier(tier),sequence([r,999999,...Array.from({length:count},()=>[0,10000]).flat()]));
    assert.equal(roll.rarity,band.rarity);assert.equal(roll.quality,100);
    assert.equal(roll.affixes.length,count);assert.equal(new Set(roll.affixes.map(a=>a.id)).size,count);
    assert.equal(inspectReviewLoadout([roll]).slots,1);
   }
  }
  start+=band.buckets;
 }
 assert.equal(start,1000000);
 assert.throws(()=>previewUniversalRoll('EQ2_FAKE',hi),/unknown_item/);
 assert.throws(()=>previewUniversalRoll(sampleByTier(1),m=>m),/invalid_test_draw/);
 assert.throws(()=>previewUniversalRoll(sampleByTier(1),()=>-1),/invalid_test_draw/);
 for(const row of d.retired.items)assert.throws(()=>previewUniversalRoll(row.itemId,hi),/unknown_item/);
});
test('loadout sums same stat across different pieces then caps once, never mutates original roll',()=>{
 const tier5=d.entries.filter(x=>x.tier===5);
 const slots=[...new Set(tier5.map(x=>x.slot))];
 assert.equal(slots.length,10);
 for(let i=0;i<11;i++){
  const rows=slots.map(slot=>{
   const item=tier5.find(x=>x.slot===slot);
   // Mythic, maximum first selected stat, then two other distinct stats.
   return previewUniversalRoll(item.itemId,sequence([0,500000,i,10000,0,0,0,0]));
  });
  const snapshot=JSON.stringify(rows);
  const result=inspectReviewLoadout(rows);
  const s=c.stats[i],channel=result.channels.find(x=>x.channel===s.channel);
  assert.equal(channel.rawCentipercent,s.rangeCentipercent[4][1]*10);
  assert.equal(channel.effectiveCentipercent,capChannel(s.channel,channel.rawCentipercent));
  assert.equal(channel.excessCentipercent,channel.rawCentipercent-channel.effectiveCentipercent);
  assert.equal(result.mayApplyEffects,false);assert.equal(result.combatBalanceApproved,false);
  assert.equal(JSON.stringify(rows),snapshot);
  assert.deepEqual(inspectReviewLoadout(rows.slice().reverse()).channels,result.channels);
 }
});
test('soft-knee, integer half-slope, hard-cap boundaries and unit safety',()=>{
 for(const s of c.stats){
  const k=s.softKneeCentipercent,h=s.hardCapCentipercent;
  assert.equal(capChannel(s.channel,0),0);
  assert.equal(capChannel(s.channel,k-1),k-1);
  assert.equal(capChannel(s.channel,k),k);
  assert.equal(capChannel(s.channel,k+1),k);
  assert.equal(capChannel(s.channel,k+2),k+1);
  assert.equal(capChannel(s.channel,k+2*(h-k)),h);
  assert.equal(capChannel(s.channel,100000),h);
  for(const x of [-1,Infinity,NaN,1.2])assert.throws(()=>capChannel(s.channel,x),/invalid_cap_input/);
 }
 assert.throws(()=>capChannel('potency',1),/invalid_cap_input/);
});
test('reject forged preview permissions, out-of-band values, duplicate identity, wrong units and unapproved innate injection',()=>{
 const original=previewUniversalRoll(sampleByTier(5),hi);
 const copy=()=>structuredClone(original);
 assert.throws(()=>inspectReviewLoadout([original,original]),/duplicate_slot_or_item/);
 for(const change of [
  x=>x.mayMint=true,x=>x.releaseApproved=true,x=>x.tier=1,x=>x.quality=101,x=>x.baseMultiplier=999,
  x=>x.affixes[0].valueCentipercent=999999,x=>x.affixes[0].unit='bad',
  x=>x.affixes[0].grade=101,x=>x.affixes[1]=x.affixes[0],x=>x.affixes[0].id='potency',
  x=>x.innateStats=[{channel:'defense_pct',value:999}]
 ]){
  const x=copy();change(x);assert.throws(()=>inspectReviewLoadout([x]),/eq2_affix_review_/);
 }
});
