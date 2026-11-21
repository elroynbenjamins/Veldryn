import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {previewHeartwoodRetort,previewOasisAfterglow} from '../lib/eq2-signature-tank-support-preview-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const cfg=JSON.parse(readFileSync(path.join(root,'docs/equipment-2-0/t2-t4-signature-equipment-fishing-dungeon-v1.json'),'utf8'));
const trait=id=>cfg.items.find(item=>item.traitId===id)?.trait;
const heal=(atSeconds,extra={})=>({
 atSeconds,abilityUseId:'heal-'+atSeconds,sourceId:'healer',
 targetId:'tank',targetMaxHp:5000,creditedEffectiveAmount:500,
 isDirect:true,isAlly:true,kind:'heal',...extra
});
const damage=(atSeconds,creditedHpDamage,extra={})=>({
 atSeconds,creditedHpDamage,sourceKind:'enemy_direct',damageKind:'physical',...extra
});
test('after a real ally heal, 2% target max-HP shield is created once; cooldown is source-wide',()=>{
 const r=previewOasisAfterglow({trait:trait('oasis_afterglow'),events:[
  heal(0),heal(0,{abilityUseId:'heal-0',targetId:'ally2'}),
  heal(5,{targetId:'ally2'}),heal(18,{targetId:'ally2'}),
 ]});
 assert.equal(r.procs,2);
 assert.equal(r.totalPotentialShield,200);
 assert.deepEqual(r.shields.map(x=>x.atSeconds),[0,18]);
});
test('no extra shield from overheal, self-heal, pet/gem procs or hot ticks',()=>{
 const r=previewOasisAfterglow({trait:trait('oasis_afterglow'),events:[
  heal(0,{creditedEffectiveAmount:0}),
  heal(1,{sourceId:'tank'}),
  heal(2,{isAlly:false}),
  heal(3,{kind:'hot_tick',isDirect:false}),
  heal(4,{kind:'gem'}),
  heal(5,{kind:'proc'}),
  heal(6,{kind:'shield',creditedEffectiveAmount:80,isDirect:true}),
 ]});
 assert.equal(r.procs,1);
 assert.equal(r.shields[0].amount,100);
 assert.equal(r.shields[0].triggeredBy,'heal-6');
});
test('zero-cooldown recursive shield reapplication fails closed',()=>{
 assert.throws(()=>previewOasisAfterglow({trait:{...trait('oasis_afterglow'),cooldownSeconds:0},events:[heal(0),heal(3),heal(7)]}),/trait/);
});
test('Retort starts after 15%-max-HP hit, never retroactively protects triggering hit',()=>{
 const r=previewHeartwoodRetort({trait:trait('heartwood_retort'),maxHp:1000,events:[
  damage(0,149),damage(1,150),damage(2,100),damage(5,100),damage(6,100),damage(19,150)
 ]});
 assert.equal(r.activationCount,2);
 assert.deepEqual(r.activations.map(x=>x.atSeconds),[1,19]);
 assert.equal(r.outcomes[1].prevented,0);
 assert.equal(r.outcomes[2].prevented,2);
 assert.equal(r.outcomes[3].prevented,2);
 assert.equal(r.outcomes[4].prevented,0);
 assert.equal(r.totalDamagePrevented,4);
});
test('true damage, periodic ticks and environment do not activate or benefit from Retort',()=>{
 const r=previewHeartwoodRetort({trait:trait('heartwood_retort'),maxHp:1000,events:[
  damage(0,200,{damageKind:'true'}),damage(1,200,{sourceKind:'enemy_dot'}),
  damage(2,250,{sourceKind:'environment'}),damage(3,200),damage(4,100,{damageKind:'true'}),
  damage(5,100,{sourceKind:'enemy_dot'}),damage(6,100,{damageKind:'magical'}),
 ]});
 assert.equal(r.activationCount,1);
 assert.equal(r.outcomes[4].prevented,0);
 assert.equal(r.outcomes[5].prevented,0);
 assert.equal(r.outcomes[6].prevented,2);
});
test('malformed buff event, time rollback, forged oversized trait and negative credits fail closed',()=>{
 assert.throws(()=>previewHeartwoodRetort({trait:{...trait('heartwood_retort'),damageReductionFraction:.2},maxHp:1000,events:[]}),/trait/);
 assert.throws(()=>previewHeartwoodRetort({trait:trait('heartwood_retort'),maxHp:0,events:[]}),/max_hp/);
 assert.throws(()=>previewHeartwoodRetort({trait:trait('heartwood_retort'),maxHp:1000,events:[damage(3,100),damage(2,100)]}),/timeline/);
 assert.throws(()=>previewOasisAfterglow({trait:trait('oasis_afterglow'),events:[heal(2,{creditedEffectiveAmount:-1})]}),/event_fields/);
 assert.throws(()=>previewOasisAfterglow({trait:{...trait('oasis_afterglow'),shieldFractionOfTargetMaxHp:.10},events:[]}),/trait/);
});
