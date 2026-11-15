import {strict as assert} from 'node:assert';
import {EXPEDITIONS} from '../../expeditions/content/launch-content';
import {EXPEDITION} from '../../expeditions/constants';
import {baseMarks,marksForRun} from '../../expeditions/rewards';
import {currentDungeonBaseMarks,frozenRunBaseMarks,LEGACY_DUNGEON_BASE_MARKS} from '../../expeditions/reward-base';

const expected:ReadonlyArray<{id:string;name:string;tiers:readonly [number,number,number]}>=[
 {id:'EXP_001',name:'Rootbound Vault',tiers:[50,55,63]},
 {id:'EXP_002',name:'Lanternwatch Descent',tiers:[57,63,71]},
 {id:'EXP_004',name:'Mirage Well',tiers:[68,75,85]},
 {id:'EXP_003',name:'Buried Observatory',tiers:[72,79,90]},
 {id:'EXP_005',name:'Shiverlake Descent',tiers:[84,92,105]},
 {id:'EXP_006',name:'Choir Caverns',tiers:[85,94,106]},
];
const tierIds=[1,2,3] as const;
let previousBase=0;
for(const {id,name,tiers} of expected){
 const definition=EXPEDITIONS[id];
 assert.equal(definition.name,name);
 assert.ok(definition.baseMarks>previousBase,'Later dungeons must grant more base marks');
 previousBase=definition.baseMarks;
 assert.equal(currentDungeonBaseMarks(id),definition.baseMarks);
 for(const [index,tier] of tierIds.entries()){
  assert.equal(baseMarks(definition.baseMarks,tier),tiers[index],name+' tier '+tier);
  assert.equal(marksForRun(definition.baseMarks,tier,{cleared:true,routeProgress:1,reachedFinalBoss:true}),tiers[index]);
  if(index>0)assert.ok(tiers[index]>tiers[index-1],'Higher tiers should always give more Marks');
 }
}
assert.deepEqual(EXPEDITION.marksMultiplier,{1:1,2:1.10,3:1.25,4:1.45,5:1.70},'Preserve the preexisting tier scaling');
assert.equal(baseMarks(EXPEDITIONS.EXP_001.baseMarks,1),50);
assert.equal(baseMarks(EXPEDITIONS.EXP_005.baseMarks,3),105,'Keep the currently catalogued Frostmarch endpoint unchanged');
assert.equal(baseMarks(EXPEDITIONS.EXP_006.baseMarks,3),106,'Keep subsequent Frostmarch content unchanged');
for(const id of Object.keys(LEGACY_DUNGEON_BASE_MARKS)){
 assert.equal(frozenRunBaseMarks({expeditionId:id}),LEGACY_DUNGEON_BASE_MARKS[id],'In-progress pre-update runs retain previous values');
 assert.equal(frozenRunBaseMarks({expeditionId:id,rewardBaseMarks:EXPEDITIONS[id].baseMarks}),EXPEDITIONS[id].baseMarks,'New runs use their frozen launch value');
}
assert.equal(frozenRunBaseMarks({expeditionId:'EXP_001',rewardBaseMarks:50}),50);
assert.equal(frozenRunBaseMarks({expeditionId:'EXP_001'}),74);
assert.throws(()=>frozenRunBaseMarks({expeditionId:'UNRECOGNIZED'}),/unknown_expedition/);
console.log('Dungeon marks rewards: balanced 50 to Frostmarch, unchanged tier ratios, pre-update runs protected');
