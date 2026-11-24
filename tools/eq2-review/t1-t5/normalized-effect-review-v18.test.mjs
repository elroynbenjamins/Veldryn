import test from 'node:test';
import assert from 'node:assert/strict';
import {audit,conditionalCandidates,eligibleFixture,matches,reviewLedger,stackingPreview,summary} from './normalized-effect-review-v18.mjs';
const deny=r=>{for(const k of ['mayApply','mayMint','mayEquip','mayTrade','releaseApproved'])assert.equal(r[k],false);};
test('source-preserving 195 milestone catalogue and 33 trait proposals',()=>{
 const r=audit();deny(r);assert.equal(r.sets,95);assert.equal(r.milestones,195);
 assert.equal(r.typedPreserved,68);assert.equal(r.permanentPreserved,28);assert.equal(r.conditionalPreserved,40);
 assert.equal(r.signatureTraits,27);assert.equal(r.blueprintTraits,6);
});
test('every candidate accepts a classified positive QA event and rejects unsafe negative events',()=>{
 const rows=conditionalCandidates();assert.equal(rows.length,142);assert.equal(new Set(rows.map(x=>x.id)).size,142);
 for(const c of rows){
  const e=eligibleFixture(c);assert(matches(c,e),c.id);const ledger=reviewLedger();
  const r=ledger.trigger(c,e);assert(r.accepted,c.id);deny(r);
  for(const k of ['recursive','reflected','selfDamage','duplicate','miss','overheal','absorbedOnly'])assert(!matches(c,{...e,[k]:true}),c.id+':'+k);
  assert(!matches(c,{...e,authenticated:false}));assert(!matches(c,{...e,kind:'unrelated'}));
  assert(!ledger.trigger(c,e).accepted);
  assert(!ledger.trigger(c,{...e,id:'new',at:e.at+1}).accepted);
  if(c.consumeOn){
   const kind=c.consumeOn==='direct_ability_hit_or_effective_heal'?'direct_class_ability_hit':c.consumeOn;
   assert(!ledger.consume(c,{...e,kind}).accepted);
   assert(!ledger.consume(c,{...e,id:'expired',at:e.at+c.windowSeconds*1000,kind}).accepted);
   const used=ledger.consume(c,{...e,id:'consumption',at:e.at+1,kind});assert(used.accepted,c.id);deny(used);
   assert(!ledger.consume(c,{...e,id:'second',at:e.at+2,kind}).accepted);
  }
 }
});
test('exact thresholds, crossing, shield provenance and shared weapon family cooldown',()=>{
 const rows=conditionalCandidates(),find=id=>rows.find(x=>x.id===id);
 const bell=find('eq2_dungeon_t5_shiverlake_bellwake:4'),e=eligibleFixture(bell);
 assert(!matches(bell,{...e,actualHpLossPct:6.99}));assert(!matches(bell,{...e,trueDamage:true}));
 const l=reviewLedger();assert(l.trigger(bell,e).accepted);
 assert(!l.consume(bell,{...e,id:'heal',at:2000,kind:'effective_direct_class_heal',effectiveHeal:false}).accepted);
 assert(l.consume(bell,{...e,id:'heal2',at:2001,kind:'effective_direct_class_heal'}).accepted);
 assert(!l.consume(bell,{...e,id:'hit',at:2002,kind:'direct_class_ability_hit'}).accepted);
 const rime=find('eq2_t5_rimewatch:6');assert(!matches(rime,eligibleFixture(rime,{shieldEffect:'OTHER'})));
 const cit=find('eq2_rare_t5_citadel:6');assert(!matches(cit,eligibleFixture(cit,{beforeHpPct:34,afterHpPct:20})));
 const bash=rows.filter(x=>x.sharedTraitFamily==='BASTION');assert.equal(bash.length,3);
 const ledger=reviewLedger();assert(!matches(bash[0],eligibleFixture(bash[0],{equippedShield:false})));
 assert(ledger.trigger(bash[0],eligibleFixture(bash[0])).accepted);assert(!ledger.trigger(bash[1],eligibleFixture(bash[1],{id:'swap',at:2000})).accepted);
});
test('cross-effect caps and equipment-origin shields are review-only',()=>{
 const p=stackingPreview({damage:[18,12],mitigation:[6,10,30],shields:[3,5,4],refunds:[.5,1]});
 deny(p);assert.equal(p.damagePct,20);assert.equal(p.mitigationPct,15);assert.equal(p.equipmentShield,5);assert.equal(p.refundSeconds,.5);
 assert.equal(stackingPreview({mitigation:[15],trueDamage:true}).mitigationPct,0);
 assert.throws(()=>stackingPreview({damage:[-1]}));assert.equal(summary().engineEffectsApplied,0);
 console.log('EQ2_EFFECT_V18 '+JSON.stringify(summary()));
});
