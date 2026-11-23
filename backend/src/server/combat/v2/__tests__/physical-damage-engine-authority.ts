import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import {launchPlayer} from '../../content/launch-combat';
import type {CombatantDefinition,CombatInput} from '../../types';
import {skillIdV2} from '../skill-catalog';
import {
 calculatePhysicalSubtypeV2,issueFrozenForgePhysicalAuthorityV2,
 PHYSICAL_DAMAGE_POLICY_V2,
} from '../physical-damage-engine-authority';

const no={slashing:0,piercing:0,blunt:0};
const mix=[{type:'piercing' as const,basisPoints:6000},
 {type:'slashing' as const,basisPoints:4000}];
const resist={slashing:.10,piercing:-.20,blunt:0};
assert.equal(calculatePhysicalSubtypeV2(100,mix,resist).damage,108);
assert.equal(calculatePhysicalSubtypeV2(100,[{type:'blunt',basisPoints:10000}],no).damage,100);
assert.equal(calculatePhysicalSubtypeV2(100,[{type:'blunt',basisPoints:10000}],
 {slashing:0,piercing:0,blunt:.30}).damage,70);
assert.equal(calculatePhysicalSubtypeV2(100,[{type:'blunt',basisPoints:10000}],
 {slashing:0,piercing:0,blunt:-.20}).damage,120);
assert.equal(calculatePhysicalSubtypeV2(100,[{type:'slashing',basisPoints:10000}],no,
 {slashing:.15,piercing:0,blunt:0}).damage,114.99999999999999);
assert.equal(PHYSICAL_DAMAGE_POLICY_V2.maxOutgoingBonus,.15);
for(const invalid of [
 [{type:'piercing',basisPoints:9999}],
 [{type:'slashing',basisPoints:6000},{type:'slashing',basisPoints:4000}],
 [{type:'blunt',basisPoints:-1}],
 [{type:'fire',basisPoints:10000}],
 []]){
 assert.throws(()=>calculatePhysicalSubtypeV2(100,invalid as any,no),
 /combat_v2_physical_subtype_invalid_damage_or_weights/);
}
for(const invalid of [NaN,-.21,.31,Infinity]){
 assert.throws(()=>calculatePhysicalSubtypeV2(100,[{type:'blunt',basisPoints:10000}],
 {slashing:0,piercing:0,blunt:invalid}),
 /combat_v2_physical_subtype_unapproved_profile_value/);
}
assert.throws(()=>calculatePhysicalSubtypeV2(-1,mix),/invalid_damage_or_weights/);
assert.throws(()=>calculatePhysicalSubtypeV2(Number.POSITIVE_INFINITY,mix),/invalid_damage_or_weights/);

const template=launchPlayer('Ironwarden',35);
const player:CombatantDefinition={...template,id:'P_TYPED',tags:['combat-v2','combat-v2-gear-base-resolved'],
 stats:{...template.stats,maxHp:1e6,accuracy:10000,critChance:0},
 abilities:[],basicAttackMs:1500,
 combatV2:{version:2,resource:'guard',specializationId:'review-only'}};
const foe:CombatantDefinition={id:'ENEMY_TYPED',name:'QA Training Target',team:'enemies',
 role:'enemy',level:35,stats:{maxHp:1e7,attackPower:0,healingPower:0,
 defense:200,accuracy:0,evasion:0,critChance:0,critMultiplier:1.5,haste:0},
 basicAttackMs:999999,basicAttackCoeff:0,abilities:[]};
const input:CombatInput={seed:'physical-types-qa',players:[player],enemies:[foe],
 maxDurationMs:3600,tickMs:100};
const evidence=[{actorId:player.id,receiptDigest:'b'.repeat(64),
 items:[{instanceId:'QA_FROZEN_COPY',pieceId:'EQ2_WEAPON_T1_IRONWARDEN'}]}];
const token=issueFrozenForgePhysicalAuthorityV2(input,evidence);
const v1=simulateCombat(input);
const v1again=simulateCombat(input);
assert.deepEqual(v1.events,v1again.events);
const v2=simulateCombat(input,undefined,undefined,undefined,token);
const direct=v2.events.filter(e=>e.type==='damage'&&e.actorId===player.id);
assert.ok(direct.length>=1);
assert.ok(direct.every(e=>e.physicalSubtypes?.length===1&&
 e.physicalSubtypes[0].type==='slashing'&&e.physicalSubtypes[0].basisPoints===10000));
assert.equal(v2.players[0].damageDone,v1.players[0].damageDone,
 'neutral subtypes cannot change real baseline damage');
assert.ok(v1.events.every(e=>!e.physicalSubtypes));

const bashId=skillIdV2('IRONWARDEN','Rune Bash');
const bash:CombatantDefinition={...player,basicAttackMs:999999,
 abilities:[{id:bashId,name:'QA Rune Bash',target:'current_target',cooldownMs:500,
 priority:100,castTimeMs:0,effects:[{kind:'damage',coeff:1,damageType:'physical'}]}]};
const bashInput={...input,players:[bash]};
const bashEvidence=[{...evidence[0],items:[...evidence[0].items,
 {instanceId:'QA_SHIELD_COPY',pieceId:'EQ2_OFFHAND_T1_IRONWARDEN'}]}];
const bashToken=issueFrozenForgePhysicalAuthorityV2(bashInput,bashEvidence);
const bashCombat=simulateCombat(bashInput,undefined,undefined,undefined,bashToken);
assert.ok(bashCombat.events.some(e=>e.abilityId===bashId&&
 e.physicalSubtypes?.[0]?.type==='blunt'),'authenticated skill + shield is Blunt');
const noShieldToken=issueFrozenForgePhysicalAuthorityV2(bashInput,evidence);
const noShield=simulateCombat(bashInput,undefined,undefined,undefined,noShieldToken);
assert.ok(noShield.events.some(e=>e.abilityId===bashId&&
 e.physicalSubtypes?.[0]?.type==='slashing'),'no shield means weapon Slashing fallback');

const damaged={...input,seed:'altered-after-token'};
assert.throws(()=>simulateCombat(damaged,undefined,undefined,undefined,token),
 /stale_or_forged_encounter/);
assert.throws(()=>issueFrozenForgePhysicalAuthorityV2(input,
 [{...evidence[0],items:[{instanceId:'QA',pieceId:'FORGED_NO_SOURCE'}]}]),
 /not_pinned_forge_piece/);
assert.throws(()=>issueFrozenForgePhysicalAuthorityV2(input,
 [{...evidence[0],receiptDigest:'not-signed'}]),/bad_frozen_evidence/);
console.log('PASS: hidden source-bound physical subtype direct-hit resolver, mixed splits, limits, Rune Bash shield requirement, replay and V1 isolation (QA synthetic evidence only)');
