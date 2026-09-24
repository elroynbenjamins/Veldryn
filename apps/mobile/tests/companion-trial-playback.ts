import {assert} from './test-assert';
import {simulateCombat} from '../../../backend/src/server/combat/engine';
import type {CombatantDefinition} from '../../../backend/src/server/combat/types';
import {companionBattlePlayback} from '../src/core/companion-runtime';

const player:CombatantDefinition={
 id:'UNIT_TEST',name:'Playback Companion',team:'players',role:'damage',level:20,
 stats:{maxHp:400,attackPower:90,healingPower:20,defense:30,accuracy:500,evasion:0,critChance:0,critMultiplier:1.5,haste:0},
 basicAttackMs:900,basicAttackCoeff:.8,
 abilities:[{id:'TEST_STRIKE',name:'Test Strike',cooldownMs:10000,castTimeMs:400,target:'current_target',effects:[{kind:'damage',coeff:1.5}],priority:100}],
};
const enemy:CombatantDefinition={
 id:'TRIAL_TEST_ENEMY',name:'Trial Test Echo',team:'enemies',role:'enemy',level:20,
 stats:{maxHp:160,attackPower:18,healingPower:0,defense:8,accuracy:500,evasion:0,critChance:0,critMultiplier:1.5,haste:0},
 basicAttackMs:1200,basicAttackCoeff:.5,abilities:[],
};
const result=simulateCombat({seed:'companion-playback-test',players:[player],enemies:[enemy],maxDurationMs:5000,tickMs:100,mitigationConstant:100});
const playback=companionBattlePlayback(result);
assert.equal(playback.durationMs,result.durationMs);
assert.equal(playback.units.length,2);
assert.equal(playback.units.find(x=>x.id==='UNIT_TEST')?.maxHp,400);
assert.equal(playback.abilityNames.TEST_STRIKE,'Test Strike');
assert.equal(playback.abilityNames.BASIC,'Basic attack');
assert.equal(playback.events[0]?.type,'combat_start');
assert.equal(playback.events.at(-1)?.type,'combat_end');
assert.ok(playback.events.some(event=>event.type==='cast_start'));
assert.ok(playback.events.some(event=>event.type==='damage'));
assert.equal(playback.events.some(event=>event.type==='gem_state'||event.type==='status_apply'),false);
assert.ok(playback.events.every(event=>event.atMs<=playback.durationMs));
console.log('PASS authoritative Companion Trial playback transcript');
