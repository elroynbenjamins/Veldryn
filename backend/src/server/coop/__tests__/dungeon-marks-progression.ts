import {strict as assert} from 'node:assert';
import {EXPEDITIONS} from '../../expeditions/content/launch-content';
import {EXPEDITION} from '../../expeditions/constants';
import {baseMarks,marksForRun} from '../../expeditions/rewards';
import {currentDungeonBaseMarks,frozenRunBaseMarks,LEGACY_DUNGEON_BASE_MARKS} from '../../expeditions/reward-base';
import {listedRegularDungeon,publishedRegularDungeon} from '../dungeon-entry-policy';

const expected:ReadonlyArray<{id:string;name:string;tiers:readonly [number,number,number]}>=[
 {id:'EXP_001',name:'Rootbound Vault',tiers:[50,55,63]},
 {id:'EXP_003',name:'Buried Observatory',tiers:[72,79,90]},
 {id:'EXP_005',name:'Shiverlake Descent',tiers:[84,92,105]},
 {id:'EXP_007',name:'Blackglass Fen',tiers:[88,97,110]},
];
const tierIds=[1,2,3] as const;
let previousBase=0;
for(const {id,name,tiers} of expected){
 const definition=EXPEDITIONS[id];
 assert.equal(definition.name,name);
 assert.ok(definition.baseMarks>previousBase,'Each successive surviving regional dungeon must grant more base Marks');
 previousBase=definition.baseMarks;
 assert.equal(listedRegularDungeon(definition),true,'Surviving dungeon must be represented in the regional catalogue');
 assert.equal(currentDungeonBaseMarks(id),definition.baseMarks);
 for(const [index,tier] of tierIds.entries()){
  assert.equal(baseMarks(definition.baseMarks,tier),tiers[index],name+' tier '+tier);
  assert.equal(marksForRun(definition.baseMarks,tier,{cleared:true,routeProgress:1,reachedFinalBoss:true}),tiers[index]);
  if(index>0)assert.ok(tiers[index]>tiers[index-1],'Higher tiers should always grant more Marks');
 }
}
// The retired dungeons keep their original economy for historical run snapshots
// and remain unlisted/unavailable. Their base rewards are not part of the new curve.
for(const [id,marks] of [['EXP_002',76],['EXP_004',80],['EXP_006',85],['EXP_008',90]] as const){
 assert.equal(EXPEDITIONS[id].baseMarks,marks,'Do not rebalance retired dungeon data');
 assert.equal(listedRegularDungeon(EXPEDITIONS[id]),false,'Do not reopen retired dungeons');
 assert.equal(publishedRegularDungeon(EXPEDITIONS[id]),false,'Retired dungeons must not enter the published queue');
}
assert.deepEqual(EXPEDITION.marksMultiplier,{1:1,2:1.10,3:1.25,4:1.45,5:1.70},'Preserve existing tier reward scaling');
assert.equal(baseMarks(EXPEDITIONS.EXP_001.baseMarks,1),50);
assert.equal(baseMarks(EXPEDITIONS.EXP_005.baseMarks,3),105,'Keep the Frostmarch Tier III reward unchanged');
for(const id of Object.keys(LEGACY_DUNGEON_BASE_MARKS)){
 assert.equal(frozenRunBaseMarks({expeditionId:id}),LEGACY_DUNGEON_BASE_MARKS[id],'Already-started runs retain previous values');
 assert.equal(frozenRunBaseMarks({expeditionId:id,rewardBaseMarks:EXPEDITIONS[id].baseMarks}),EXPEDITIONS[id].baseMarks,'New runs use a frozen catalogue amount');
}
assert.equal(frozenRunBaseMarks({expeditionId:'EXP_001'}),74);
assert.equal(frozenRunBaseMarks({expeditionId:'EXP_001',rewardBaseMarks:50}),50);
assert.throws(()=>frozenRunBaseMarks({expeditionId:'UNRECOGNIZED'}),/unknown_expedition/);
console.log('Dungeon marks: surviving regional reward curve and retired-run protection passed');
