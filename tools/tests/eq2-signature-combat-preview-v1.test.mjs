import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  inspectSignatureLoadout,previewBleedEventStream,previewDirectDamage
} from '../lib/eq2-signature-combat-preview-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const design=JSON.parse(fs.readFileSync(path.join(root,'docs/equipment-2-0/t2-t4-signature-equipment-fishing-dungeon-v1.json'),'utf8'));
const find=id=>design.items.find(x=>x.traitId===id);

test('fishing T4 tank mitigation is exactly 3% on direct non-true enemy hits, not everything',()=>{
  for(const damageKind of ['physical','magical']){
    assert.equal(previewDirectDamage({amount:1000,sourceKind:'enemy_direct',damageKind,hasGlassfinGuard:true}).after,970);
  }
  for(const [sourceKind,damageKind] of [
    ['enemy_direct','true'],['enemy_dot','physical'],['environment','magical']
  ]){
    assert.equal(previewDirectDamage({amount:1000,sourceKind,damageKind,hasGlassfinGuard:true}).after,1000);
  }
  assert.equal(previewDirectDamage({amount:1000,sourceKind:'enemy_direct',damageKind:'physical'}).after,1000);
});
test('untrusted damage/malformed events are rejected, never silently converted to gains',()=>{
  assert.throws(()=>previewDirectDamage({amount:-1,sourceKind:'enemy_direct',damageKind:'physical',hasGlassfinGuard:true}),/bad_damage/);
  assert.throws(()=>previewDirectDamage({amount:100,sourceKind:'unknown',damageKind:'physical'}),/source_kind/);
});
test('at most one offensive + one defensive/support signature trait can be previewed',()=>{
 const offense=find('riftfang_bleed');
 const guard=find('glassfin_guard');
 assert.equal(inspectSignatureLoadout([offense.id,guard.id],design.items).count,2);
 assert.throws(()=>inspectSignatureLoadout([offense.id,find('riverthorn_cut').id],design.items),/signature_family_conflict/);
 assert.throws(()=>inspectSignatureLoadout([guard.id,find('heartwood_retort').id],design.items),/signature_family_conflict/);
 assert.throws(()=>inspectSignatureLoadout([guard.id,guard.id],design.items),/duplicate_equipped_copy/);
 assert.throws(()=>inspectSignatureLoadout(['FORGED_ITEM'],design.items),/untrusted_item/);
});
test('a 10% T4 bleed procs once per eligible ability use, respects cooldown and boss halving',()=>{
 const trait=find('riftfang_bleed').trait;
 const events=[
  {atSeconds:0,actionId:'a1',targetId:'boss',kind:'direct_physical',damage:1000,isBoss:true},
  {atSeconds:0,actionId:'a1',targetId:'other',kind:'direct_physical',damage:1000,isBoss:true},
  {atSeconds:3,actionId:'dot1',targetId:'boss',kind:'dot',damage:1000,isBoss:true},
  {atSeconds:4,actionId:'a2',targetId:'boss',kind:'direct_physical',damage:1000,isBoss:true},
  {atSeconds:5,actionId:'ref1',targetId:'boss',kind:'direct_physical',damage:1000,isProc:true,isBoss:true},
  {atSeconds:10,actionId:'a3',targetId:'boss',kind:'direct_physical',damage:1000,isBoss:true}
 ];
 const a=previewBleedEventStream({events,trait,seed:1});
 assert.deepEqual(a,previewBleedEventStream({events,trait,seed:1}));
 assert.equal(a.procEvents[0].totalPhysicalBleed,120);
 assert.equal(a.procEvents[0].overSeconds,4);
 assert.equal(a.procEvents[0].atSeconds,0);
 assert.equal(a.rolls,2);
 assert.equal(a.procs>=1,true);
});
test('physical bleed never double-scales with rarity/quality and excludes spell/DoT proc events',()=>{
 const trait=find('riverthorn_cut').trait;
 const hits=[
  {atSeconds:0,actionId:'m1',targetId:'mob',kind:'magic',damage:10000},
  {atSeconds:1,actionId:'s1',targetId:'mob',kind:'direct_physical',damage:1000,isProc:true},
  {atSeconds:2,actionId:'p1',targetId:'mob',kind:'direct_physical',damage:1000},
 ];
 const r=previewBleedEventStream({events:hits,trait,seed:1});
 assert.equal(r.rolls,1);
 assert.equal(r.procs,1);
 assert.equal(r.procEvents[0].totalPhysicalBleed,120);
});
test('server-control safety: nonmonotonic time, excessive proc chance and cooldown bypass rejected',()=>{
 const trait=find('riftfang_bleed').trait;
 const bad=[
 {atSeconds:5,actionId:'a',targetId:'mob',kind:'direct_physical',damage:3},
 {atSeconds:4,actionId:'b',targetId:'mob',kind:'direct_physical',damage:3}
 ];
 assert.throws(()=>previewBleedEventStream({events:bad,trait,seed:1}),/malformed_hit/);
 assert.throws(()=>previewBleedEventStream({events:[],trait:{...trait,chance:0.6},seed:1}),/trait_policy/);
 assert.throws(()=>previewBleedEventStream({events:[],trait:{...trait,cooldownSeconds:0},seed:1}),/trait_policy/);
 assert.throws(()=>previewBleedEventStream({events:[],trait,seed:-1}),/rng_seed/);
});
test('the synthetic preview has no actual Combat 2.0 execution or loot authority',()=>{
 assert.equal(design.status,'REVIEW_ONLY_NO_RUNTIME');
 assert.equal(design.release.combatProcsEnabled,false);
 assert.equal(design.release.materialDropsEnabled,false);
 assert.equal(previewDirectDamage({amount:0,sourceKind:'enemy_direct',damageKind:'physical',hasGlassfinGuard:true}).simulationOnly,true);
});
