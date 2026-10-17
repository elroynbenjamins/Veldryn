import { strict as assert } from 'node:assert';
import { dungeonPowerIndex, recommendedDungeonPower } from '../dungeon-power';
import { resolveAndFreezeLoadout, type AuthoritativeLoadoutRecord } from '../loadout-snapshots';

const record=(companion=false):AuthoritativeLoadoutRecord=>({accountId:'a',characterId:'c',classId:'WAYFINDER',loadoutId:'current',revision:1,characterLevel:25,dungeonUnlocked:true,legalEquipment:true,capabilities:['damage'],abilities:[],stats:{characterId:'c',classId:'WAYFINDER',level:25,maxHp:3400,attackPower:625,healingPower:120,defense:750,accuracy:780,evasion:250,critChance:.1,haste:.05,...(companion?{combatCompanion:{companionId:'UNIT_001',level:10,xp:0,ascensionTier:0,bondLevel:1,bondXp:0,bondTraitUnlocked:false}}:{})}});
const base=resolveAndFreezeLoadout({accountId:'a',characterId:'c',loadoutId:'current',expectedRevision:1,minLevel:15,syncLevel:25,repository:{getOwnedLoadout:()=>record(false)}});
const withCompanion=resolveAndFreezeLoadout({accountId:'a',characterId:'c',loadoutId:'current',expectedRevision:1,minLevel:15,syncLevel:25,repository:{getOwnedLoadout:()=>record(true)}});
assert.ok(base.dungeonPower!==undefined&&base.dungeonPower>0);assert.ok(withCompanion.dungeonPower!==undefined&&withCompanion.dungeonPower>base.dungeonPower!,'equipped server-verified companion must increase dungeon power');
assert.equal(base.dungeonPower,dungeonPowerIndex({normalized:base.normalized}),'frozen score must be reproducible');
assert.ok(recommendedDungeonPower(40)>recommendedDungeonPower(15),'later dungeons need more power');
console.log('co-op dungeon power OK');
