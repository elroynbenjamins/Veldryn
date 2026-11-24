import {strict as assert} from 'node:assert';
import {dungeonDepthMultipliers,dungeonEncounterDepthMultipliers,dungeonBossTimeLimitMs,DUNGEON_BOSS_ENDURANCE_VERSION} from '../dungeon-depth-scaling';
import {availableDungeonCombatMarks,projectedDungeonCombatMarks} from '../dungeon-combat-marks-cap';
import {REGIONAL_DUNGEON_BALANCE_VERSION} from '../regional-power-balance';
import {launchPlayer} from '../../combat/content/launch-combat';
import {QModeService,MemoryQModeRunRepository} from '../qmode';
import type {FrozenLoadoutSnapshot} from '../loadout-snapshots';
import {createQModeNpcAllies} from '../qmode-npc-allies';

assert.deepEqual(dungeonDepthMultipliers(1,true),{hp:1,attack:1,defense:1});
for(const depth of [7,14,21,28,35,43]){
 const previous=dungeonDepthMultipliers(depth-1,true);
 const now=dungeonDepthMultipliers(depth,true);
 assert.ok(now.hp>previous.hp&&now.attack>previous.attack&&now.defense>previous.defense);
}
assert.deepEqual(dungeonDepthMultipliers(43,false),{hp:1,attack:1,defense:1},'Legacy runs retain prior balance');
assert.throws(()=>dungeonDepthMultipliers(44,true));
const bossV=DUNGEON_BOSS_ENDURANCE_VERSION;
const bossAt=(depth:number)=>dungeonEncounterDepthMultipliers(depth,true,true,bossV);
assert.deepEqual(bossAt(1),dungeonDepthMultipliers(1,true));
for(let depth=1;depth<=43;depth++){
 const original=dungeonDepthMultipliers(depth,true),boss=bossAt(depth);
 assert.deepEqual(dungeonEncounterDepthMultipliers(depth,true,false,bossV),original,'ordinary rooms unchanged');
 assert.deepEqual(dungeonEncounterDepthMultipliers(depth,true,true),original,'saved runs retain frozen curve');
 assert.deepEqual(dungeonEncounterDepthMultipliers(depth,false,true,bossV),{hp:1,attack:1,defense:1});
 assert.equal(boss.attack,original.attack);
 if(depth>1){assert.ok(boss.hp>bossAt(depth-1).hp&&boss.defense>bossAt(depth-1).defense);assert.ok(boss.hp<original.hp&&boss.defense<original.defense);}
}
assert.ok(bossAt(36).hp<2.15&&bossAt(36).defense<1.24,'final boss durability bounded');
assert.throws(()=>bossAt(44));
const checkpoints=[8,15,22,29,36,43];
assert.deepEqual(checkpoints.map(depth=>dungeonBossTimeLimitMs(depth,true,true,bossV)),[180_000,210_000,240_000,280_000,320_000,360_000]);
for(let depth=1;depth<=43;depth++){
 assert.equal(dungeonBossTimeLimitMs(depth,true,false,bossV),undefined,'regular rooms keep default limit');
 assert.equal(dungeonBossTimeLimitMs(depth,true,true),undefined,'saved runs keep default limit');
 assert.equal(dungeonBossTimeLimitMs(depth,false,true,bossV),undefined,'non-Endurance keeps default limit');
 if(!checkpoints.includes(depth))assert.equal(dungeonBossTimeLimitMs(depth,true,true,bossV),undefined);
}


assert.equal(projectedDungeonCombatMarks(['elite','elite','elite','elite','elite','elite']),25);
assert.equal(projectedDungeonCombatMarks(['battle','battle','battle','battle','battle','battle','battle','battle','battle']),25);
assert.equal(availableDungeonCombatMarks(24,'battle'),1);
assert.equal(availableDungeonCombatMarks(24,'elite'),1);
assert.equal(availableDungeonCombatMarks(25,'elite'),0);
assert.equal(availableDungeonCombatMarks(0,'boss'),0);

function frozen(accountId:string,classId:string,characterId:string):FrozenLoadoutSnapshot{
 const player=launchPlayer(classId,25),role=player.role as 'tank'|'damage'|'support';
 const snapshot={characterId,classId,role,level:25,...player.stats};
 return {accountId,characterId,classId,loadoutId:`load-${characterId}`,revision:1,characterLevel:25,combatPower:0,
  normalized:{snapshot,abilities:player.abilities,effectiveLevel:25,normalizationVersion:'test',before:{level:25,maxHp:snapshot.maxHp,attackPower:snapshot.attackPower,healingPower:snapshot.healingPower,defense:snapshot.defense}},
  readiness:{ready:true,role,normalizedScore:1,failures:[]},snapshotHash:`hash-${characterId}`};
}
const controller=frozen('controller','Dawnkeeper','controller-char');
const npc=createQModeNpcAllies({minimumLevel:10,syncLevel:25,controllerLevel:25});
const solo=new QModeService(new MemoryQModeRunRepository(),'endurance-test').create({
 requestId:'endurance-start',runId:'endurance-solo',controllerAccountId:'controller',controllerSnapshot:controller,
 expeditionId:'EXP_001',tier:1,contentVersion:'v1',balanceVersion:REGIONAL_DUNGEON_BALANCE_VERSION,
 nowMs:10_000,profiles:[],npcSnapshots:npc,
});
assert.equal(solo.enduranceRouteVersion,1);
assert.equal(solo.bossEnduranceVersion,bossV);
assert.equal(solo.graph.preBossNodeCount,42);
assert.equal(solo.graph.nodes.filter(node=>node.kind==='boss').length,6);
const checkpoint=solo.graph.nodes.filter(node=>node.depth===8);
assert.equal(checkpoint.filter(node=>node.kind==='boss').length,1);
assert.equal(checkpoint.filter(node=>node.kind!=='boss').length,2);
assert.equal(new Set(solo.players.filter(player=>player.role==='damage').map(player=>player.classId)).size,2);
console.log('PASS: dungeon endurance scaling, shared checkpoint structure, level-only Solo and 25 room Marks cap');
