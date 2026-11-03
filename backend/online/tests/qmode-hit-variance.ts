import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../src/server/combat/engine';
import type {CombatantDefinition} from '../../src/server/combat/types';

const stats=(maxHp:number,attackPower:number)=>({
 maxHp,attackPower,healingPower:0,defense:0,accuracy:1200,evasion:1200,
 critChance:0,critMultiplier:1.5,haste:0,
});
const player:CombatantDefinition={id:'player',name:'Frozen Echo',team:'players',role:'tank',
 level:25,stats:stats(250_000,1),basicAttackMs:1100,basicAttackCoeff:.5,abilities:[]};
const enemy:CombatantDefinition={id:'enemy',name:'Dungeon Bruiser',team:'enemies',role:'enemy',
 level:25,stats:stats(250_000,500),basicAttackMs:1050,basicAttackCoeff:.9,abilities:[]};
const enemyHits=(result:ReturnType<typeof simulateCombat>)=>result.events.filter(
 e=>e.type==='damage'&&e.actorId==='enemy'&&e.targetId==='player');
let oldDamage=0,newDamage=0,oldHits=0,newHits=0,heavies=0;
const profiles=new Set<string>();
for(let seed=0;seed<8;seed++){
 const params={seed:'qmode-pressure-fixture-'+seed,players:[player],enemies:[enemy],maxDurationMs:60_000};
 const legacy=simulateCombat(params);
 const qmode=simulateCombat({...params,enemies:[{...enemy,stats:{...enemy.stats,attackPower:enemy.stats.attackPower*1.005}}],enemyDamageProfile:'qmode-v1'});
 const repeat=simulateCombat({...params,enemies:[{...enemy,stats:{...enemy.stats,attackPower:enemy.stats.attackPower*1.005}}],enemyDamageProfile:'qmode-v1'});
 assert.deepEqual(qmode,repeat,'Each server-owned seed must be replay-stable');
 assert.equal(legacy.events.filter(e=>e.detail==='heavy_hit').length,0,'Legacy combat must never have new burst hits');
 assert.ok(qmode.players[0].hp>0,'Prepared allies must survive this standalone room');
 const before=enemyHits(legacy),after=enemyHits(qmode);
 oldHits+=before.length;newHits+=after.length;
 oldDamage+=before.reduce((sum,e)=>sum+(e.amount??0),0);
 newDamage+=after.reduce((sum,e)=>sum+(e.amount??0),0);
 heavies+=after.filter(e=>e.detail==='heavy_hit').length;
 after.forEach(e=>profiles.add(e.detail==='heavy_hit'?'heavy':'ordinary'));
}
assert.ok(oldHits>=200&&newHits>=200,'Fixture must sample many real enemy attacks');
assert.ok(heavies>=5&&heavies<=newHits*.20,'Heavy hits are intermittent, not every attack');
assert.deepEqual([...profiles].sort(),['heavy','ordinary']);
console.log(JSON.stringify({oldHits,newHits,heavies,oldDamage:Math.round(oldDamage),newDamage:Math.round(newDamage),ratio:+(newDamage/oldDamage).toFixed(3)}));
assert.ok(newDamage/oldDamage>.95&&newDamage/oldDamage<1.12,
 'Q-Mode damage remains close to baseline across finite random samples; use complete-run win rates to calibrate difficulty');
console.log('PASS Q-Mode deterministic damage spread, rare heavy blows, and legacy compatibility');
