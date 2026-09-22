import {strict as assert} from 'node:assert';
import {simulateCombat} from '../engine';
import type {CombatGemEffect,CombatantDefinition} from '../types';

const stats={maxHp:1000,attackPower:100,healingPower:100,defense:0,accuracy:1000,evasion:0,critChance:0,critMultiplier:1.5,haste:0};
function player(effectGems:readonly CombatGemEffect[]=[]):CombatantDefinition{return {id:'P1',classId:'TEST',name:'Tester',team:'players',role:'damage',level:50,stats:{...stats},basicAttackMs:1000,basicAttackCoeff:1,abilities:[],effectGems};}
function boss():CombatantDefinition{return {id:'B1',name:'Gem Target',team:'enemies',role:'enemy',level:50,stats:{...stats,maxHp:100000,attackPower:1,accuracy:1},basicAttackMs:5000,basicAttackCoeff:.01,abilities:[],boss:true,tags:['elite']};}
const baseline=simulateCombat({seed:'gem-runtime',players:[player()],enemies:[boss()],maxDurationMs:5000});
const predator=simulateCombat({seed:'gem-runtime',players:[player([{familyId:'effect_predator',copies:3,resonance:3,totalValue:.048}])],enemies:[boss()],maxDurationMs:5000});
assert.ok(predator.players[0].damageDone>baseline.players[0].damageDone,'Predator must increase authoritative boss damage');

const momentum=simulateCombat({seed:'gem-momentum',players:[player([{familyId:'effect_momentum',copies:3,resonance:3,totalValue:.0108}])],enemies:[boss()],maxDurationMs:7000});
assert.ok(momentum.players[0].modifiers.some(row=>row.tag==='gem:momentum'),'Momentum should build combat-runtime stacks');
assert.ok(momentum.players[0].damageDone>simulateCombat({seed:'gem-momentum',players:[player()],enemies:[boss()],maxDurationMs:7000}).players[0].damageDone,'Momentum stacks should increase sustained damage');

const companionAbility:CombatantDefinition={...player([{familyId:'effect_predator',copies:3,resonance:3,totalValue:.20}]),basicAttackMs:999999,abilities:[{id:'COMPANION_STRIKE',name:'Companion Strike',cooldownMs:100,castTimeMs:0,target:'current_target',priority:10,effects:[{kind:'damage',coeff:1,damageType:'physical'}]}]};
const companionWithGem=simulateCombat({seed:'gem-companion',players:[companionAbility],enemies:[boss()],maxDurationMs:3000});
const companionWithoutGem=simulateCombat({seed:'gem-companion',players:[{...companionAbility,effectGems:[]}],enemies:[boss()],maxDurationMs:3000});
assert.equal(companionWithGem.players[0].damageDone,companionWithoutGem.players[0].damageDone,'Companion-prefixed attacks must not inherit player Effect Gems');

const healer:CombatantDefinition={id:'H1',classId:'DAWNKEEPER',name:'Healer',team:'players',role:'support',level:50,stats:{...stats,attackPower:1},basicAttackMs:999999,basicAttackCoeff:.01,effectGems:[{familyId:'effect_mercy',copies:3,resonance:3,totalValue:.24}],abilities:[{id:'HEAL',name:'Heal',cooldownMs:2000,castTimeMs:0,target:'self',priority:10,effects:[{kind:'heal',coeff:1}]}]};
const mercy=simulateCombat({seed:'gem-mercy',players:[healer],enemies:[boss()],maxDurationMs:2200});
assert.ok(mercy.events.some(event=>event.type==='shield'&&event.abilityId==='GEM_MERCY'),'Mercy overhealing should create an authoritative barrier event');

const statusTester:CombatantDefinition={...player(),basicAttackMs:999999,abilities:[
 {id:'TEST_DEBUFF',name:'Expose Weakness',cooldownMs:999999,castTimeMs:0,target:'current_target',priority:20,effects:[{kind:'debuff',tag:'damage_taken',value:.1,durationMs:3000},{kind:'dot',coeff:.01,damageType:'shadow',durationMs:3000,tickMs:1000}]},
 {id:'TEST_BUFF',name:'Battle Rhythm',cooldownMs:999999,castTimeMs:0,target:'self',priority:10,effects:[{kind:'buff',tag:'damage_done',value:.1,durationMs:2500},{kind:'hot',flat:1,durationMs:2500,tickMs:1000}]},
]};
const statuses=simulateCombat({seed:'status-windows',players:[statusTester],enemies:[boss()],maxDurationMs:500}).events.filter(event=>event.type==='status_apply');
assert.equal(statuses.length,4,'timed buffs, debuffs, DoTs and HoTs should emit authoritative status windows');
assert.deepEqual(new Set(statuses.map(event=>event.statusKind)),new Set(['buff','debuff','dot','hot']));
assert.ok(statuses.every(event=>event.expiresAtMs!==undefined&&event.expiresAtMs>event.atMs&&event.targetId),'status windows must include target and expiry timing');

console.log('PASS: authoritative Effect Gem combat runtime');
