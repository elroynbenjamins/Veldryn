import assert from 'node:assert/strict';
import {simulateCombat} from './engine';
import {EFFECT_GEMS_V34,type EffectGemIdV34,type EffectGemSummaryV34} from '../equipment/gem-system-v34';
import type {CombatantDefinition} from './types';

const effect=(familyId:EffectGemIdV34,copies=3,grade:1|2|3|4|5=5):EffectGemSummaryV34=>{
 const family=EFFECT_GEMS_V34.find(row=>row.id===familyId)!;
 return{familyId,copies,resonance:copies as 1|2|3,totalValue:Number((family.values[grade-1]*copies).toFixed(6)),grades:Array.from({length:copies},()=>grade)};
};
const player=(gems:EffectGemSummaryV34[]=[]):CombatantDefinition=>({
 id:'player',classId:'WAYFINDER',name:'Player',team:'players',role:'damage',level:40,
 stats:{maxHp:5000,attackPower:700,healingPower:150,defense:600,accuracy:1600,evasion:200,critChance:.15,critMultiplier:1.5,haste:0},
 basicAttackMs:1200,basicAttackCoeff:.8,abilities:[],effectGemsV34:gems,
});
const boss:CombatantDefinition={
 id:'boss',name:'Boss',team:'enemies',role:'enemy',level:40,boss:true,
 stats:{maxHp:100000,attackPower:150,healingPower:0,defense:900,accuracy:1200,evasion:100,critChance:0,critMultiplier:1.5,haste:0},
 basicAttackMs:2400,basicAttackCoeff:.4,abilities:[],
};
const baseline=simulateCombat({seed:'gems-v34',players:[player()],enemies:[boss],maxDurationMs:12000});
const predator=simulateCombat({seed:'gems-v34',players:[player([effect('effect_predator')])],enemies:[boss],maxDurationMs:12000});
assert.ok(predator.players[0].damageDone>baseline.players[0].damageDone,'Predator should increase deterministic boss damage');

const momentum=simulateCombat({seed:'momentum-v34',players:[player([effect('effect_momentum')])],enemies:[boss],maxDurationMs:12000});
const momentumBase=simulateCombat({seed:'momentum-v34',players:[player()],enemies:[boss],maxDurationMs:12000});
assert.ok(momentum.players[0].damageDone>momentumBase.players[0].damageDone,'Momentum should build and increase sustained direct damage');
assert.ok((momentum.players[0].gemRuntimeV34?.momentumStacks??0)>0,'Momentum runtime should retain stacks while attacks continue');

const defender:CombatantDefinition={...player([effect('effect_last_stand')]),id:'tank',classId:'IRONWARDEN',role:'tank',stats:{...player().stats,maxHp:1800,defense:100}};
const bruiser:CombatantDefinition={...boss,id:'bruiser',boss:false,stats:{...boss.stats,maxHp:100000,attackPower:1100,accuracy:2000},basicAttackMs:900,basicAttackCoeff:.9};
const pressured=simulateCombat({seed:'last-stand-v34',players:[defender],enemies:[bruiser],maxDurationMs:5000});
assert.equal(pressured.players[0].gemRuntimeV34?.lastStandUsed,true,'Last Stand should trigger after crossing its HP threshold');

const support:CombatantDefinition={
 id:'support',classId:'STONECALLER',name:'Support',team:'players',role:'support',level:40,
 stats:{maxHp:4000,attackPower:200,healingPower:1000,defense:700,accuracy:1400,evasion:100,critChance:0,critMultiplier:1.5,haste:0},
 basicAttackMs:5000,basicAttackCoeff:.1,effectGemsV34:[effect('effect_aegis')],
 abilities:[{id:'WARD',name:'Ward',cooldownMs:4000,castTimeMs:0,target:'self',priority:100,effects:[{kind:'shield',coeff:.5,durationMs:1500}]}],
};
const shielded=simulateCombat({seed:'aegis-v34',players:[support],enemies:[{...boss,stats:{...boss.stats,attackPower:0},basicAttackMs:10000,basicAttackCoeff:0}],maxDurationMs:1000});
const shieldEvent=shielded.events.find(row=>row.type==='shield'&&row.actorId==='support');
assert.ok((shieldEvent?.amount??0)>500,'Aegis should strengthen generated barriers');

console.log('V34 Effect Gem combat runtime OK');
