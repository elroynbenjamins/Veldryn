import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../content/launch-combat';
import {simulateCombat} from '../../engine';
import type {CombatantDefinition,CombatV2EquipmentEffects,AbilityDefinition} from '../../types';
import {RESOURCE_BY_CLASS_V2} from '../resource-runtime';

const zero:CombatV2EquipmentEffects={
 accuracyPp:0,evasionPp:0,penetrationPp:0,wardPp:0,
 shieldStrengthPct:0,hexPotencyPct:0,
};
const encounter=(actor:CombatantDefinition,enemy:CombatantDefinition,seed:string)=>({
 seed,players:[actor],enemies:[enemy],maxDurationMs:12000,
});
const profile=(mods:Partial<CombatV2EquipmentEffects>,skill:AbilityDefinition):CombatantDefinition=>{
 const p=launchPlayer('Hexweaver',25);
 return {...p,abilities:[skill],basicAttackMs:999999,
  combatV2:{version:2,resource:RESOURCE_BY_CLASS_V2.HEXWEAVER,
    specializationId:'synthetic-spec',equipmentEffects:{...zero,...mods}},
  tags:['combat-v2'],stats:{...p.stats,maxHp:100000,accuracy:700,
    defense:400,critChance:0,haste:0},
 };
};
const enemy=(skill?:AbilityDefinition):CombatantDefinition=>({
 id:'ENEMY_TRAINING',name:'Synthetic enemy',team:'enemies',role:'enemy',level:25,
 stats:{maxHp:1e8,attackPower:160,healingPower:0,defense:1700,
   accuracy:900,evasion:620,critChance:0,critMultiplier:1.5,haste:0},
 basicAttackMs:skill?999999:2700,basicAttackCoeff:.7,
 abilities:skill?[skill]:[],
});
const hit:AbilityDefinition={id:'TEST_HIT',name:'Test strike',cooldownMs:1600,
 castTimeMs:0,target:'current_target',priority:100,
 effects:[{kind:'damage',coeff:1,damageType:'physical'}]};
const hitZero=simulateCombat(encounter(profile({},hit),enemy(),'hit-probe'));
const hitGear=simulateCombat(encounter(profile({accuracyPp:.50,penetrationPp:.30},hit),enemy(),'hit-probe'));
assert.ok(hitGear.players[0].damageDone>hitZero.players[0].damageDone,
 'Accuracy and penetration must improve dealt damage on the same seed');
const penetrationOnly=simulateCombat(encounter(profile({penetrationPp:.30},hit),enemy(),'hit-probe'));
assert.ok(penetrationOnly.players[0].damageDone>hitZero.players[0].damageDone,
 'Penetration must reduce physical defense mitigation');
const evasionBase=simulateCombat(encounter(profile({},hit),enemy(),'evasion-probe'));
const evasionGear=simulateCombat(encounter(profile({evasionPp:.80},hit),enemy(),'evasion-probe'));
assert.ok(evasionGear.players[0].damageTaken<=evasionBase.players[0].damageTaken,
 'Evasion must not increase incoming direct hit damage');
const enemySpell:AbilityDefinition={id:'TEST_SHADOW',name:'Shadow pulse',
 cooldownMs:1500,castTimeMs:0,target:'current_target',priority:100,
 effects:[{kind:'damage',coeff:1,damageType:'shadow'}]};
const magicalBase=simulateCombat(encounter(profile({},hit),enemy(enemySpell),'ward-probe'));
const ward=simulateCombat(encounter(profile({wardPp:.40},hit),enemy(enemySpell),'ward-probe'));
assert.ok(ward.players[0].damageTaken<magicalBase.players[0].damageTaken,
 'Ward must mitigate nonphysical damage');
const physicalEnemy=enemy({...enemySpell,effects:[{kind:'damage',coeff:1,damageType:'physical'}]});
const physicalBase=simulateCombat(encounter(profile({},hit),physicalEnemy,'physical-ward'));
const physicalWard=simulateCombat(encounter(profile({wardPp:.40},hit),physicalEnemy,'physical-ward'));
assert.deepEqual(physicalWard,physicalBase,
 'Ward must have no effect against physical attacks');
const shield:AbilityDefinition={id:'TEST_SHIELD',name:'Protect',
 cooldownMs:2500,castTimeMs:0,target:'self',priority:100,
 effects:[{kind:'shield',coeff:1}]};
const shieldBase=simulateCombat(encounter(profile({},shield),enemy(),'shield-probe'));
const shieldBuff=simulateCombat(encounter(profile({shieldStrengthPct:.20},shield),enemy(),'shield-probe'));
const shieldAmount=(r:ReturnType<typeof simulateCombat>)=>
 r.events.filter(e=>e.type==='shield').reduce((x,e)=>x+(e.amount??0),0);
assert.ok(shieldAmount(shieldBuff)>shieldAmount(shieldBase),
 'Shield strength must increase actual generated shield amount');
const hex:AbilityDefinition={id:'TEST_HEX',name:'Shadow curse',cooldownMs:2500,
 castTimeMs:0,target:'current_target',priority:100,
 effects:[{kind:'dot',coeff:.4,damageType:'shadow',durationMs:6000,tickMs:1000}]};
const curseBase=simulateCombat(encounter(profile({},hex),enemy(),'hex-probe'));
const curseBuff=simulateCombat(encounter(profile({hexPotencyPct:.20},hex),enemy(),'hex-probe'));
assert.ok(curseBuff.players[0].damageDone>curseBase.players[0].damageDone,
 'Hex potency must increase own shadow DoT damage');
const physicalDoT={...hex,effects:[{kind:'dot' as const,coeff:.4,
 damageType:'physical' as const,durationMs:6000,tickMs:1000}]};
const physicalDotBase=simulateCombat(encounter(profile({},physicalDoT),enemy(),'physical-dot'));
const physicalDotHex=simulateCombat(encounter(profile({hexPotencyPct:.20},physicalDoT),enemy(),'physical-dot'));
assert.deepEqual(physicalDotHex,physicalDotBase,
 'Hex potency must not buff arbitrary physical DoTs');
const legacy=launchPlayer('Hexweaver',25);
const legacyCombat=simulateCombat(encounter(legacy,enemy(),'legacy-parity'));
assert.deepEqual(simulateCombat(encounter(legacy,enemy(),'legacy-parity')),legacyCombat,
 'Legacy class replay must remain deterministic');
console.log('PASS: hit/evasion, penetration, ward, shields and hex DoT effect channels; physical and legacy isolation');
