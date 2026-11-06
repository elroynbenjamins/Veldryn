import {strict as assert} from 'node:assert';
import {CLASSES} from '../../../apps/mobile/src/content/classes';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {V33_EQUIPMENT_RECIPES} from '../../../apps/mobile/src/content/equipment-recipes-v33';
import {itemDef} from '../../../apps/mobile/src/content/items';
import {combatantFromVerifiedSnapshot} from '../../src/server/combat/snapshot-adapter';
import {simulateCombat} from '../../src/server/combat/engine';
import type {CraftedGearInstance} from '../../../apps/mobile/src/core/types';
import {deriveOnlineCoopLoadout,onlineCoopLoadoutHash} from '../coop-loadout';
import {resolveAndFreezeLoadout} from '../../src/server/coop/loadout-snapshots';
for(const definition of CLASSES){
 const state=createCharacter(newGame(0),definition.id,'Coop Test');state.character!.level=25;
 const before=JSON.stringify(state),weak=deriveOnlineCoopLoadout('owner',state,1);
 assert.equal(JSON.stringify(state),before,'publication never grants or changes gear');
 state.character!.equipment=Object.fromEntries(noviceSetFor(definition.id).slots.map(slot=>[slot,noviceItemId(definition.id,slot)]));
 const full=deriveOnlineCoopLoadout('owner',state,2);
 assert.ok(full.stats.maxHp>=weak.stats.maxHp);assert.ok(full.stats.attackPower>=weak.stats.attackPower);assert.ok(full.stats.defense>=weak.stats.defense);
 const frozen=resolveAndFreezeLoadout({accountId:'owner',characterId:full.characterId,loadoutId:'current',expectedRevision:2,minLevel:15,syncLevel:25,repository:{getOwnedLoadout:()=>full}});
 assert.equal(frozen.readiness.ready,true);assert.equal(full.legalEquipment,true);
 state.character!.level=100;
 const veteran=deriveOnlineCoopLoadout('owner',state,3);
 const earlyDungeonEcho=resolveAndFreezeLoadout({accountId:'owner',characterId:veteran.characterId,loadoutId:'current',expectedRevision:3,minLevel:15,syncLevel:25,repository:{getOwnedLoadout:()=>veteran}});
 assert.equal(earlyDungeonEcho.normalized.before.level,100,'the published Echo may qualify for every dungeon');
 assert.equal(earlyDungeonEcho.normalized.effectiveLevel,25,'early dungeons down-sync a level-100 Echo');
 assert.equal(earlyDungeonEcho.normalized.snapshot.level,25,'combat receives the dungeon sync level');
 if(definition.role==='Tank')assert.equal(frozen.normalized.abilities[0].effects[0].value,500,'threat amounts are not percentage buffs');
 assert.ok(onlineCoopLoadoutHash(full)!==onlineCoopLoadoutHash(weak));
 const reordered={...Object.fromEntries(Object.entries(full).reverse()),stats:Object.fromEntries(Object.entries(full.stats).reverse())} as typeof full;
 assert.equal(onlineCoopLoadoutHash(full),onlineCoopLoadoutHash(reordered),'jsonb key ordering cannot invalidate a published snapshot');
 state.character!.equipment.weapon=noviceItemId(definition.id,'boots');
 assert.equal(deriveOnlineCoopLoadout('owner',state,3).legalEquipment,false,'wrong-slot gear cannot publish an eligible loadout');
}

/** Online Loadout -> frozen snapshot -> actual combat engine, using a real
 * forged gear instance instead of an invented client-side Effect Gem payload.
 * This test catches a missing socket-to-combat bridge even when isolated
 * gem-effects-v1 engine tests pass. */
const equipped=createCharacter(newGame(0),'IRONWARDEN','Dungeon Gem Parity');
equipped.character!.level=25;
const ringId=V33_EQUIPMENT_RECIPES.find(row=>row.classId==='IRONWARDEN'&&row.v33EquipmentTier==='T1'&&itemDef(row.output.itemId).slot==='ring')!.output.itemId;
const instanceId='gear:dungeon-gem-parity:ring';
const baseInstance:CraftedGearInstance={
 id:instanceId,itemId:ringId,ownerCharacterId:equipped.character!.id,
 rarity:'rare',quality:80,acquireSource:'craft',sourceReceiptKey:'dungeon-gem-parity',createdAtMs:1,
 enhancement:{rank:0,failures:0,gemIds:[]},
};
equipped.character!.equipment.ring=ringId;
equipped.character!.equipmentInstanceIds={ring:instanceId};
equipped.account.craftedGearInstances=[baseInstance];
const plain=deriveOnlineCoopLoadout('owner',equipped,8);
const gemmedInstance:CraftedGearInstance={...baseInstance,enhancement:{
 rank:0,failures:0,statGemId:'gem:stat_precision:g5',effectGemId:'gem:effect_predator:g5',
 gemIds:['gem:stat_precision:g5','gem:effect_predator:g5'],
}};
equipped.account.craftedGearInstances=[gemmedInstance];
const gemmed=deriveOnlineCoopLoadout('owner',equipped,8);
assert.ok(gemmed.stats.accuracy>plain.stats.accuracy,'Equipped forged Precision gem must increase authoritative dungeon Accuracy');
assert.equal(gemmed.stats.effectGems?.length,1,'Equipped forged Effect Gem must enter the authoritative dungeon snapshot');
assert.equal(gemmed.stats.effectGems?.[0]?.familyId,'effect_predator');
assert.equal(gemmed.stats.effectGems?.[0]?.resonance,1);
assert.ok((gemmed.stats.effectGems?.[0]?.totalValue??0)>0);
assert.notEqual(onlineCoopLoadoutHash(gemmed),onlineCoopLoadoutHash(plain),'Publication hash must change when a forged gem changes');
const frozenGems=resolveAndFreezeLoadout({
 accountId:'owner',characterId:gemmed.characterId,loadoutId:'current',expectedRevision:8,
 minLevel:15,syncLevel:25,repository:{getOwnedLoadout:()=>gemmed},
});
assert.deepEqual(frozenGems.normalized.snapshot.effectGems,gemmed.stats.effectGems,
 'Freeze/normalization must preserve canonical Effect Gem values and Resonance');
const combatant=combatantFromVerifiedSnapshot(frozenGems.normalized.snapshot,frozenGems.normalized.abilities);
assert.deepEqual(combatant.effectGems,gemmed.stats.effectGems,
 'Live/Q-Mode combatant creation must retain frozen Effect Gems');
const dummy={
 id:'DUNGEON_GEM_TARGET',name:'Elite dungeon target',team:'enemies' as const,role:'enemy' as const,
 level:25,stats:{maxHp:100000,attackPower:1,healingPower:0,defense:0,accuracy:1,evasion:0,critChance:0,critMultiplier:1.5,haste:0},
 basicAttackMs:999999,basicAttackCoeff:.01,abilities:[],boss:true,tags:['elite'],
};
const withPredator=simulateCombat({seed:'dungeon-gem-parity',players:[combatant],enemies:[dummy],maxDurationMs:15000});
const withoutPredator=simulateCombat({seed:'dungeon-gem-parity',players:[{...combatant,effectGems:[]}],enemies:[dummy],maxDurationMs:15000});
assert.ok(withPredator.players[0].damageDone>withoutPredator.players[0].damageDone,
 'A real forged Predator gem must affect actual dungeon combat damage, not just its inspection popup');
const savageInstance:CraftedGearInstance={...baseInstance,enhancement:{
 rank:0,failures:0,statGemId:'gem:stat_savage:g5',gemIds:['gem:stat_savage:g5'],
}};
equipped.account.craftedGearInstances=[savageInstance];
const savage=deriveOnlineCoopLoadout('owner',equipped,9);
assert.ok((savage.stats.critMultiplier??1.5)>1.5,'Savage must increase the frozen Crit Damage multiplier');
const frozenSavage=resolveAndFreezeLoadout({
 accountId:'owner',characterId:savage.characterId,loadoutId:'current',expectedRevision:9,
 minLevel:15,syncLevel:25,repository:{getOwnedLoadout:()=>savage},
});
assert.ok(combatantFromVerifiedSnapshot(frozenSavage.normalized.snapshot,frozenSavage.normalized.abilities).stats.critMultiplier>1.5,
 'Authoritative dungeon engine must receive Savage Critical Damage rather than its default multiplier');
equipped.account.craftedGearInstances=[{...gemmedInstance,ownerCharacterId:'another-character'}];
assert.equal(deriveOnlineCoopLoadout('owner',equipped,10).stats.effectGems?.length??0,0,
 'Forged gems owned by another character must never be credited to the equipped character');

console.log('online co-op loadout derivation PASS: nine distinct kits, owned equipment, early-dungeon Echo down-sync, no grants, revision hashes, slot validation');
console.log('PASS: real equipped forged Stat/Effect Gems survive dungeon freeze and change combat');
