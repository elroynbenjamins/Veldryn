import { strict as assert } from 'node:assert';
import { combatantFromVerifiedSnapshot } from '../../combat/snapshot-adapter';
import type { AbilityDefinition } from '../../combat/types';
import { resolveAndFreezeLoadout, type AuthoritativeLoadoutRecord, type LoadoutRepository } from '../loadout-snapshots';
import { deriveRole, evaluateRoleReadiness } from '../role-readiness';

const abilities: AbilityDefinition[] = [{ id:'hit', name:'Hit', cooldownMs:1_000, castTimeMs:0, target:'current_target', priority:1, effects:[{kind:'damage',coeff:9,flat:50_000}] }];
const records = new Map<string, AuthoritativeLoadoutRecord>();
const repository: LoadoutRepository = { getOwnedLoadout: (_accountId, _characterId, loadoutId) => records.get(loadoutId) };
records.set('over', {
  accountId:'a', characterId:'c', classId:'WAYFINDER', loadoutId:'over', revision:7, characterLevel:100,
  dungeonUnlocked:true, legalEquipment:true, capabilities:['damage'], abilities,
  stats:{characterId:'c',classId:'WAYFINDER',level:100,maxHp:20_000,attackPower:9_000,healingPower:500,defense:4_000,accuracy:2_000,evasion:1_000,critChance:.9,haste:2},
});
const over = resolveAndFreezeLoadout({accountId:'a',characterId:'c',loadoutId:'over',expectedRevision:7,minLevel:15,syncLevel:25,repository});
assert.equal(over.normalized.before.attackPower, 9_000);
assert.equal(over.normalized.snapshot.level, 25);
assert.ok(over.normalized.snapshot.attackPower <= 625 * 1.25, 'actual attack input must be capped');
assert.ok((over.normalized.abilities[0].effects[0].coeff ?? 0) <= 3, 'coefficient must be capped');
assert.ok((over.normalized.abilities[0].effects[0].flat ?? 0) < 50_000, 'flat effect must be normalized');
const combatant = combatantFromVerifiedSnapshot(over.normalized.snapshot, over.normalized.abilities);
assert.equal(combatant.stats.attackPower, over.normalized.snapshot.attackPower);

records.set('low', {...records.get('over')!,loadoutId:'low',revision:1,characterLevel:25,stats:{...records.get('over')!.stats,level:25,attackPower:200,maxHp:2_000,defense:500,healingPower:50}});
let lowError=''; try { resolveAndFreezeLoadout({accountId:'a',characterId:'c',loadoutId:'low',expectedRevision:1,minLevel:15,syncLevel:25,repository}); } catch(error) { lowError=error instanceof Error?error.message:String(error); }
assert.ok(lowError.startsWith('role_not_ready:'), 'underprepared gear must not be boosted into readiness');
assert.equal(deriveRole('BASTION'),'tank'); assert.equal(deriveRole('DREADGUARD'),'tank');
assert.equal(evaluateRoleReadiness('DAWNKEEPER',.9,['restore']).ready,true);
assert.equal(evaluateRoleReadiness('STONECALLER',.9,['mitigate','utility']).ready,true);
assert.equal(evaluateRoleReadiness('STONECALLER',.9,['damage']).ready,false);

console.log('coop phase3 normalization OK', JSON.stringify({before:over.normalized.before,after:over.normalized.snapshot}));
