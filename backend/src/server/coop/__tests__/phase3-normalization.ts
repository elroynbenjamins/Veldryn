import { strict as assert } from 'node:assert';
import { combatantFromVerifiedSnapshot } from '../../combat/snapshot-adapter';
import type { AbilityDefinition } from '../../combat/types';
import { resolveAndFreezeLoadout, type AuthoritativeLoadoutRecord, type LoadoutRepository } from '../loadout-snapshots';
import { deriveRole, evaluateRoleReadiness } from '../role-readiness';

const abilities: AbilityDefinition[] = [{ id:'hit', name:'Hit', cooldownMs:1_000, castTimeMs:0, target:'current_target', priority:1, effects:[{kind:'damage',coeff:9,flat:50_000}] }];
function rejects(action:()=>unknown,pattern:RegExp,message?:string){let error='';try{action()}catch(reason){error=String(reason)}assert.ok(pattern.test(error),message??`Expected ${pattern}, received ${error}`);}
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
assert.equal(combatant.classId,'WAYFINDER','class-specific co-op effects must survive snapshot conversion');

records.set('low', {...records.get('over')!,loadoutId:'low',revision:1,characterLevel:25,stats:{...records.get('over')!.stats,level:25,attackPower:200,maxHp:2_000,defense:500,healingPower:50}});
let lowError=''; try { resolveAndFreezeLoadout({accountId:'a',characterId:'c',loadoutId:'low',expectedRevision:1,minLevel:15,syncLevel:25,repository}); } catch(error) { lowError=error instanceof Error?error.message:String(error); }
assert.ok(lowError.startsWith('role_not_ready:'), 'underprepared gear must not be boosted into readiness');
assert.equal(deriveRole('BASTION'),'tank'); assert.equal(deriveRole('DREADGUARD'),'tank');
assert.equal(deriveRole('Knife Dancer'),'damage');
assert.equal(evaluateRoleReadiness('WAYFINDER',NaN,['damage']).ready,false);
assert.equal(evaluateRoleReadiness('WAYFINDER',Infinity,['damage']).ready,false);
for(const value of [NaN,Infinity,-1]){
 records.set('invalid',{...records.get('low')!,loadoutId:'invalid',stats:{...records.get('low')!.stats,attackPower:value}});
 rejects(()=>resolveAndFreezeLoadout({accountId:'a',characterId:'c',loadoutId:'invalid',expectedRevision:1,minLevel:15,syncLevel:25,repository}),/invalid_snapshot_stats/);
 rejects(()=>combatantFromVerifiedSnapshot({...over.normalized.snapshot,attackPower:value},[]),/invalid_snapshot_stats/);
}
records.set('regional',{...records.get('low')!,loadoutId:'regional',characterLevel:45,stats:{...records.get('low')!.stats,level:45,attackPower:625}});
rejects(()=>resolveAndFreezeLoadout({accountId:'a',characterId:'c',loadoutId:'regional',expectedRevision:1,minLevel:45,syncLevel:45,repository}),/role_not_ready/,'Asterfall attack must not count as ready for Sunscar');
records.set('regional',{...records.get('regional')!,stats:{...records.get('regional')!.stats,attackPower:625*45/25}});
assert.equal(resolveAndFreezeLoadout({accountId:'a',characterId:'c',loadoutId:'regional',expectedRevision:1,minLevel:45,syncLevel:45,repository}).readiness.ready,true);
assert.equal(evaluateRoleReadiness('DAWNKEEPER',.9,['restore']).ready,true);
assert.equal(evaluateRoleReadiness('STONECALLER',.9,['mitigate','utility']).ready,true);
assert.equal(evaluateRoleReadiness('STONECALLER',.9,['damage']).ready,false);

console.log('coop phase3 normalization OK', JSON.stringify({before:over.normalized.before,after:over.normalized.snapshot}));

// Q-Mode: host keeps visible level even when internal legacy calibration differs.
const hostRecord = {...records.get('over')!, characterLevel:40, combatScalingLevel:80};
const hostFreeze = (record:AuthoritativeLoadoutRecord, syncLevel:number) => resolveAndFreezeLoadout({
 accountId:record.accountId, characterId:record.characterId, loadoutId:record.loadoutId,
 expectedRevision:record.revision, minLevel:10, syncLevel, hostLevelSync:true,
 repository:{getOwnedLoadout:()=>record},
});
const host=hostFreeze(hostRecord,40);
assert.equal(host.normalized.effectiveLevel,40);
assert.equal(host.normalized.snapshot.level,40);
assert.equal(host.normalized.normalizationVersion,'coop-host-level-v1');
const high=hostFreeze({...hostRecord,characterLevel:55},40);
const low=hostFreeze({...hostRecord,characterLevel:30},40);
assert.equal(high.normalized.snapshot.level,40);
assert.equal(low.normalized.snapshot.level,30);
const stronger=hostFreeze({...hostRecord,stats:{...hostRecord.stats,attackPower:hostRecord.stats.attackPower*2}},40);
assert.ok(stronger.normalized.snapshot.attackPower>host.normalized.snapshot.attackPower,'Strong equipment must improve actual output past the old hard cap');
assert.equal(stronger.normalized.snapshot.critChance,hostRecord.stats.critChance);
assert.ok(stronger.normalized.snapshot.attackPower < 625*40/25*1.75,'Diminishing gear tail remains bounded');
assert.equal(hostRecord.characterLevel,40,'Frozen policy never edits source progression');
console.log('PASS host-level Q-Mode, lower/higher donors, visible/legacy units and gear differences');
