import {strict as assert} from 'node:assert';
import {CLASSES} from '../../../apps/mobile/src/content/classes';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {socketGem} from '../../../apps/mobile/src/core/equipment-enhancement';
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
 if(definition.role==='Tank')assert.equal(frozen.normalized.abilities[0].effects[0].value,500,'threat amounts are not percentage buffs');
 assert.ok(onlineCoopLoadoutHash(full)!==onlineCoopLoadoutHash(weak));
 const reordered={...Object.fromEntries(Object.entries(full).reverse()),stats:Object.fromEntries(Object.entries(full.stats).reverse())} as typeof full;
 assert.equal(onlineCoopLoadoutHash(full),onlineCoopLoadoutHash(reordered),'jsonb key ordering cannot invalidate a published snapshot');
 state.character!.equipment.weapon=noviceItemId(definition.id,'boots');
 assert.equal(deriveOnlineCoopLoadout('owner',state,3).legalEquipment,false,'wrong-slot gear cannot publish an eligible loadout');
}
let gemState=createCharacter(newGame(0),'IRONWARDEN','Gem Snapshot');gemState.character!.level=45;
gemState={...gemState,inventory:{...gemState.inventory,stacks:[...gemState.inventory.stacks,{itemId:'gem:effect_bulwark:g3',quantity:1}]}};
gemState=socketGem(gemState,'basic_sword','gem:effect_bulwark:g3');
const gemLoadout=deriveOnlineCoopLoadout('owner',gemState,9);
assert.deepEqual(gemLoadout.stats.effectGems,[{familyId:'effect_bulwark',copies:1,resonance:1,totalValue:.009,grades:[3]}],'trusted loadout snapshots must carry canonical Effect Gem runtime summaries');
console.log('online co-op loadout derivation PASS: nine distinct kits, owned equipment, Effect Gem runtime snapshot, no grants, revision hashes, slot validation');
