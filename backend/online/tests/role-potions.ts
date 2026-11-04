import {strict as assert} from 'node:assert';
import {frozenAlchemyPotionCombatant,preparedCoopCombatants} from '../coop-potion-modifiers';
import {launchPlayer,rootboundHeartBoss} from '../../src/server/combat/content/launch-combat';
import {simulateCombat} from '../../src/server/combat/engine';

const base=launchPlayer('Ravager',25);
const vigor=frozenAlchemyPotionCombatant(base,'VIGOR_TONIC');
const greater=frozenAlchemyPotionCombatant(base,'GREATER_VIGOR_TONIC');
const oath=frozenAlchemyPotionCombatant(base,'OATH_VIGOR_TONIC');
assert.deepEqual([vigor.alchemyModifiers?.outgoing,greater.alchemyModifiers?.outgoing,oath.alchemyModifiers?.outgoing],[1.05,1.10,1.15]);
assert.deepEqual([frozenAlchemyPotionCombatant(base,'WARD_TONIC').alchemyModifiers?.incoming,
 frozenAlchemyPotionCombatant(base,'GREATER_WARD_TONIC').alchemyModifiers?.incoming,
 frozenAlchemyPotionCombatant(base,'OATH_WARD_TONIC').alchemyModifiers?.incoming],[.95,.90,.85]);
for(const [id,outgoing,strength] of [
 ['HARMONY_TONIC',1.02,1.05],
 ['GREATER_HARMONY_TONIC',1.04,1.10],
 ['OATH_HARMONY_TONIC',1.06,1.15],
] as const){
 const modifiers=frozenAlchemyPotionCombatant(launchPlayer('Dawnkeeper',25),id).alchemyModifiers!;
 assert.equal(modifiers.outgoing,outgoing,id+' damage');
 assert.equal(modifiers.healing,strength,id+' healing');
 assert.equal(modifiers.shielding,strength,id+' shields');
 assert.equal(modifiers.incoming,1,id+' has no hidden Ward');
}
assert.equal(frozenAlchemyPotionCombatant(base,undefined),base,'no preparation keeps old runs unchanged');
assert.throws(()=>frozenAlchemyPotionCombatant(base,'DEWLEAF_DRAUGHT'),/invalid_alchemy_preparation/);
assert.throws(()=>frozenAlchemyPotionCombatant(base,'UNKNOWN_POTION'),/invalid_alchemy_preparation/);
assert.throws(()=>frozenAlchemyPotionCombatant(rootboundHeartBoss(),'WARD_TONIC'),/alchemy_potion_non_player/);

// The combat engine applies outgoing multipliers to real damage events,
// rather than merely changing the displayed Attack stat.
const players=['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(name=>launchPlayer(name,25));
// Q-Mode and Live replay use the per-actor prepared ID from the server-side run
// snapshot, not a client-supplied multiplier or a global Party-wide buff.
const prepared=preparedCoopCombatants(players,{[players[2].id]:'OATH_VIGOR_TONIC',[players[3].id]:'GREATER_HARMONY_TONIC'});
assert.equal(prepared[2].alchemyModifiers?.outgoing,1.15,'damage tonic stays on its owner');
assert.equal(prepared[3].alchemyModifiers?.healing,1.10,'support tonic stays on its owner');
assert.equal(prepared[0],players[0],'unprepared Tank unchanged');
assert.equal(prepared[1],players[1],'unprepared Wayfinder unchanged');
assert.equal(players[2].alchemyModifiers,undefined,'frozen loadout snapshot not mutated');
assert.deepEqual(preparedCoopCombatants(players,undefined),players,'legacy dungeon run without prepared tonics unchanged');

const simulate=(enhanced:boolean)=>simulateCombat({seed:'VELDRYN_POTION_DAMAGE_PARITY_01',players:players.map((player,index)=>index===2&&enhanced?frozenAlchemyPotionCombatant(player,'OATH_VIGOR_TONIC'):player),enemies:[rootboundHeartBoss()],maxDurationMs:15_000});
const before=simulate(false),after=simulate(true),attacker=players[2].id;
const firstHit=(result:ReturnType<typeof simulateCombat>)=>result.events.find(e=>e.type==='damage'&&e.actorId===attacker&&typeof e.amount==='number'&&e.amount>0);
const hitBefore=firstHit(before),hitAfter=firstHit(after);
assert.ok(hitBefore&&hitAfter,'attacker has a real dungeon strike');
assert.ok((hitAfter.amount??0)>(hitBefore.amount??0),'Vigor raises resolved damage against the same enemy');
console.log('Alchemy role potion combat contract passed');
