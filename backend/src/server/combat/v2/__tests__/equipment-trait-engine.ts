import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import {EquipmentTraitRuntimeV2} from '../equipment-trait-engine-runtime';
import type {CombatInput,CombatantDefinition,CombatV2Resource} from '../../types';
import {
 issueEquipmentV2TraitAuthority,authorizeEquipmentV2TraitEngine,
 EQUIPMENT_V2_TRAIT_ENGINE_POLICY,
 type VerifiedV2EquipmentEffectSource,type ExecutableEquipmentTraitV2
} from '../equipment-trait-engine-authority';

const stats=(hp=4000,atk=180,heal=180)=>({
 maxHp:hp,attackPower:atk,healingPower:heal,defense:60,
 accuracy:100000,evasion:0,critChance:0,critMultiplier:1.5,haste:0,
});
const player=(id:string,resource:CombatV2Resource='focus'):CombatantDefinition=>({
 id,name:id,team:'players',role:resource==='radiance'?'support':resource==='guard'?'tank':'damage',
 classId:resource==='radiance'?'DAWNKEEPER':resource==='guard'?'IRONWARDEN':'WAYFINDER',
 level:40,stats:stats(),basicAttackMs:1800,basicAttackCoeff:1,abilities:[],
 tags:['combat-v2','combat-v2-gear-base-resolved'],
 combatV2:{version:2,resource,specializationId:'QA_TEST_SPEC'},
});
const foe=(options:Partial<CombatantDefinition>={}):CombatantDefinition=>({
 id:'BOSS_EXP_ROOT',name:'QA Rootbound Heart',team:'enemies',role:'enemy',level:40,
 stats:stats(1000000,140,0),basicAttackMs:2600,basicAttackCoeff:1,abilities:[],
 tags:['pve:archetype:guardian'],...options,
});
const source=(actor:CombatantDefinition,options:{
 basic?:number;ability?:number;reflect?:number;traits?:readonly ExecutableEquipmentTraitV2[];
 index?:number;
}={}):VerifiedV2EquipmentEffectSource=>({
 source:'server-persisted-equipment-v2',policy:EQUIPMENT_V2_TRAIT_ENGINE_POLICY,
 revision:1,accountId:'ACCOUNT_'+actor.id,characterId:'CHAR_'+actor.id,actorId:actor.id,
 ownedEquippedInstanceIds:['INSTANCE_A_'+actor.id,'INSTANCE_B_'+actor.id],
 equipmentReceiptDigest:'a'.repeat(64), // mock pinned ledger digest; never an actual DB proof
 basicAttackDamagePct:options.basic??0,abilityDamagePct:options.ability??0,
 reflectDamagePct:options.reflect??0,
 traits:(options.traits??[]).map((id,i)=>({traitId:id,instanceId:'INSTANCE_'+(i===0?'A':'B')+'_'+actor.id})),
});
const run=(input:CombatInput,sources:readonly VerifiedV2EquipmentEffectSource[])=>{
 const token=issueEquipmentV2TraitAuthority(input,sources,()=>true); // test-only fake persisted ledger
 return simulateCombat(input,undefined,token);
};
const sum=(input:ReturnType<typeof simulateCombat>,actorId:string,ability:string)=>
 input.events.filter(e=>e.type==='damage'&&e.actorId===actorId&&e.abilityId===ability)
 .reduce((n,e)=>n+(e.amount??0),0);
const triggers=(input:ReturnType<typeof simulateCombat>,type:string)=>
 input.events.filter(e=>e.type==='equipment_trait_trigger'&&e.abilityId==='V2_EQUIPMENT_TRAIT:'+type);

{
 const p=player('P'),enemy=foe({basicAttackCoeff:0});
 const input:CombatInput={seed:'EQ2_RUNTIME_ATTACK',players:[p],enemies:[enemy],maxDurationMs:5700};
 const base=simulateCombat(input),again=simulateCombat(input,undefined,undefined);
 assert.deepEqual(base,again,'No authority must preserve exact historical event snapshots');
 const enabled=run(input,[source(p,{basic:12,traits:['sword_dance']})]);
 const replay=run(input,[source(p,{basic:12,traits:['sword_dance']})]);
 assert.deepEqual(enabled,replay,'Hidden trait runtime must be deterministic');
 assert.ok(sum(enabled,'P','BASIC')>sum(base,'P','BASIC'));
 assert.ok(triggers(enabled,'sword_dance').length>=1,'Third original basic hit triggers Sword Dance');
 assert.equal(base.events.filter(e=>e.type==='equipment_trait_trigger').length,0);
 assert.deepEqual(input.players[0],p,'Actor input must not be mutated');
}
{
 const skill={id:'QA_DAMAGE_SKILL',name:'QA Direct Skill',cooldownMs:7000,
  castTimeMs:0,target:'current_target' as const,priority:100,
  effects:[{kind:'damage' as const,coeff:2,damageType:'physical' as const}]};
 const p={...player('SKILL'),abilities:[skill]},enemy=foe({basicAttackCoeff:0});
 const input:CombatInput={seed:'EQ2_RUNTIME_SKILL',players:[p],enemies:[enemy],maxDurationMs:8500};
 const baseline=simulateCombat(input);
 const withTraits=run(input,[source(p,{basic:10,ability:12,traits:['echoing_strike']})]);
 assert.ok(sum(withTraits,'SKILL','QA_DAMAGE_SKILL')>sum(baseline,'SKILL','QA_DAMAGE_SKILL'),
  'Class skill bonus should work on real actual AbilityDefinition');
 assert.ok(triggers(withTraits,'echoing_strike').length>=1);
 assert.ok(withTraits.events.every(e=>!e.abilityId?.startsWith('V2_EQUIPMENT_TRAIT:echoing_strike')||
  e.type==='equipment_trait_trigger'),'Echo must never go through ordinary hit pipeline');
}
{
 const p=player('TANK','guard'),enemy=foe({boss:true});
 const input:CombatInput={seed:'EQ2_RUNTIME_BOSS',players:[p],enemies:[enemy],maxDurationMs:12000};
 const baseline=simulateCombat(input);
 const guarded=run(input,[source(p,{reflect:7,traits:['thornbound_riposte']})]);
 const reflected=guarded.events.filter(e=>e.type==='equipment_trait_trigger'&&
  (e.abilityId==='V2_EQUIPMENT_TRAIT:thornbound_riposte'||
   e.abilityId==='V2_EQUIPMENT_TRAIT:reflect_damage_affix'));
 assert.ok(reflected.length>0,'Authentic original direct enemy damage should reflect');
 assert.equal(baseline.events.filter(e=>e.type==='equipment_trait_trigger').length,0);
 const byWindow=reflected.filter(e=>e.atMs<5000).reduce((n,e)=>n+(e.amount??0),0);
 assert.ok(byWindow<=enemy.stats.maxHp*.001+.01,
  'Regional boss reflect window must stay below 0.1% target HP');
 assert.ok(reflected.every(e=>e.detail==='retaliation_no_recursive_trigger'));
}
{
 const p=player('AUTH');
 const input:CombatInput={seed:'EQ2_RUNTIME_AUTH',players:[p],enemies:[foe()],maxDurationMs:3000};
 const verified=source(p,{basic:5,traits:['sword_dance']});
 assert.throws(()=>issueEquipmentV2TraitAuthority(input,[verified],()=>false),/persisted_ledger_not_verified/);
 assert.throws(()=>issueEquipmentV2TraitAuthority(input,[{...verified,
  traits:[{instanceId:'OTHER',traitId:'sword_dance'}]}],()=>true),/trait_not_owned_selected_or_supported/);
 assert.throws(()=>issueEquipmentV2TraitAuthority(input,[{...verified,reflectDamagePct:1000}],()=>true),/invalid_persisted_source/);
 // Deliberately model the divergent Forge branch's fractional channel.
 const originalForgeEffects={accuracyPp:0,evasionPp:0,penetrationPp:0,
  wardPp:0,shieldStrengthPct:0,hexPotencyPct:0,abilityDamagePct:.05};
 const overlapping={...input,players:[{...p,combatV2:{...p.combatV2!,
  equipmentEffects:originalForgeEffects}}]};
 assert.throws(()=>issueEquipmentV2TraitAuthority(overlapping,
  [{...verified,abilityDamagePct:5}],()=>true),/unreconciled_ability_damage_channels/);
 assert.doesNotThrow(()=>issueEquipmentV2TraitAuthority(overlapping,[verified],()=>true),
  'A zero sidecar ability bonus does not duplicate the Forge channel');
 const zeroForge={...input,players:[{...p,combatV2:{...p.combatV2!,
  equipmentEffects:{...originalForgeEffects,abilityDamagePct:0}}}]};
 assert.doesNotThrow(()=>issueEquipmentV2TraitAuthority(zeroForge,
  [{...verified,abilityDamagePct:5}],()=>true));
 // The approved receipt must be the same immutable receipt that reaches combat.
 const mutable={...verified};
 assert.throws(()=>issueEquipmentV2TraitAuthority(input,[mutable],()=>{
  mutable.basicAttackDamagePct=999;return true;
 }),/persisted_ledger_not_verified/);
 const nested={...verified,traits:verified.traits.map(trait=>({...trait}))};
 assert.throws(()=>issueEquipmentV2TraitAuthority(input,[nested],()=>{
  nested.traits[0].traitId='mending_echo';return true;
 }),/persisted_ledger_not_verified/);
 const changedInput=structuredClone(input);
 assert.throws(()=>issueEquipmentV2TraitAuthority(changedInput,[verified],()=>{
  changedInput.seed='CHANGED';return true;
 }),/persisted_ledger_not_verified/);
 const token=issueEquipmentV2TraitAuthority(input,[verified],rows=>
  Object.isFrozen(rows)&&Object.isFrozen(rows[0])&&
  Object.isFrozen(rows[0].ownedEquippedInstanceIds)&&Object.isFrozen(rows[0].traits)&&
  Object.isFrozen(rows[0].traits[0]));
 assert.equal(authorizeEquipmentV2TraitEngine(input,token).size,1);
 assert.throws(()=>simulateCombat({...input,seed:'TAMPER'},undefined,token),/not_matching_compiled_encounter/);
 assert.throws(()=>simulateCombat(input,undefined,{} as typeof token),/not_server_issued/);
 const legacy={...input,players:[{...p,combatV2:undefined}]};
 assert.throws(()=>issueEquipmentV2TraitAuthority(legacy,[verified],()=>true),/no_legacy_or_inflight_encounter/);
 assert.equal(JSON.stringify(verified).includes('INSTANCE_A_AUTH'),true);
}
{
 // Real engine effective-heal hook needs two injured ALLIES other than the
 // healer. A genuine enemy Area attack injures multiple heroes first.
 const healer={...player('HEALER','radiance'),
  abilities:[{id:'QA_DIRECT_HEAL',name:'QA Dawn Mend',cooldownMs:1000,castTimeMs:0,
   target:'lowest_hp_ally' as const,priority:100,
   effects:[{kind:'heal' as const,coeff:1.25}]}]};
 const allyA=player('ALLY_A','guard'),allyB=player('ALLY_B','focus');
 const caster=foe({boss:false,basicAttackCoeff:0,abilities:[{
  id:'QA_AREA',name:'QA Area',cooldownMs:1300,castTimeMs:0,priority:100,
  target:'all_enemies',effects:[{kind:'damage',coeff:1.2,damageType:'physical'}]
 }]});
 const input:CombatInput={seed:'EQ2_RUNTIME_HEAL',players:[healer,allyA,allyB],
  enemies:[caster],maxDurationMs:8700};
 const withTraits=run(input,[
  source(healer,{traits:['mending_echo','restorative_bloom']}),
  source(allyA),source(allyB),
 ]);
 assert.ok(triggers(withTraits,'mending_echo').length>0,'Secondary heal must be tied to actual ally heal');
 assert.ok(triggers(withTraits,'restorative_bloom').length>0,'Regeneration needs true effective ally healing');
 assert.ok(withTraits.events.some(e=>e.type==='hot_tick'&&
  e.abilityId==='V2_EQUIPMENT_TRAIT:restorative_bloom'));
 assert.ok(withTraits.events.filter(e=>e.abilityId?.startsWith('V2_EQUIPMENT_TRAIT:')).length<100,
  'No recursive trait healing storm');
}
{
 // One shared 5-second boss retaliation window across TWO different tanks.
 const a=player('TANK_A','guard'),b=player('TANK_B','guard');
 const runtime=new EquipmentTraitRuntimeV2(new Map([
  [a.id,source(a,{reflect:8,traits:['thornbound_riposte']})],
  [b.id,source(b,{reflect:8,traits:['thornbound_riposte']})],
 ]));
 const first=runtime.retaliation(1000,a.id,'BOSS',200,1000,10000,true);
 const second=runtime.retaliation(1500,b.id,'BOSS',200,1000,10000,true);
 assert.ok(first&&first.amount<=10);
 assert.equal(second,undefined,'Two tanks must not each get a full boss damage window');
}
{
 // A separate actor-global 1s cooldown prevents simultaneous proc storms,
 // while the second selected support trait remains eligible on later heals.
 const p=player('SUPPORT_2','radiance');
 const runtime=new EquipmentTraitRuntimeV2(new Map([
  [p.id,source(p,{traits:['mending_echo','restorative_bloom']})],
 ]));
 assert.equal(runtime.afterDirectAllyHeal(1000,p.id,'A','B',100,100).length,1);
 assert.equal(runtime.afterDirectAllyHeal(1500,p.id,'A','B',100,100).length,0);
 const later=runtime.afterDirectAllyHeal(2000,p.id,'A','B',100,100);
 assert.equal(later.length,1);
 assert.equal(later[0].traitId,'restorative_bloom');
}
{
 // Boss skill casts are excluded until an authenticated combat-avoidable tag
 // contract exists. Basic attacks can still be reflected.
 const p=player('TANK_CAST','guard'),boss=foe({
  boss:true,basicAttackCoeff:0,basicAttackMs:100000,
  abilities:[{id:'QA_BOSS_CAST',name:'Boss area telegraph',priority:100,
   cooldownMs:1200,castTimeMs:200,target:'all_enemies',
   effects:[{kind:'damage',coeff:1,damageType:'physical'}]}],
 });
 const input:CombatInput={seed:'QA_BOSS_CAST_UNREFLECTABLE',players:[p],
  enemies:[boss],maxDurationMs:4000};
 const result=run(input,[source(p,{reflect:8,traits:['thornbound_riposte']})]);
 assert.ok(result.events.some(e=>e.abilityId==='QA_BOSS_CAST'&&e.type==='damage'));
 assert.ok(result.events.filter(e=>e.type==='equipment_trait_trigger').length<=1,
  'Only the one opening boss BASIC hit can reflect; later boss casts cannot');
}

console.log('PASS: real Combat 2.0 engine hidden trait authority, basic/skill/reflect and support source hooks');
