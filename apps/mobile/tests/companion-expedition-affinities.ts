import {strict as assert} from 'node:assert';
import {COMPANION_SERVER_DEFINITIONS,COMPANION_MISSIONS,companionMission} from '../../../backend/src/server/companions/content';
import {companionMissionRequirementSatisfied,activeCompanionMissions} from '../../../backend/src/server/companions/assignments';
import {COMPANION_AFFINITY_BY_ID,COMPANION_AFFINITY_IDS} from '../../../backend/src/shared/companion-affinity-catalog';
import type {OwnedCompanionSnapshot} from '../../../backend/src/server/companions/domain';

for(const def of COMPANION_SERVER_DEFINITIONS){
 assert.ok(COMPANION_AFFINITY_IDS.includes(def.affinity),def.id+' missing valid affinity');
 assert.equal(def.affinity,COMPANION_AFFINITY_BY_ID[def.id],def.id+' server affinity diverged from shared catalog');
}
assert.equal(Object.keys(COMPANION_AFFINITY_BY_ID).length,COMPANION_SERVER_DEFINITIONS.length,'every existing server companion must have an explicit affinity');

const hard=COMPANION_MISSIONS.flatMap(m=>m.requirements??[]).filter(r=>r.type.startsWith('affinity_'));
const bonus=COMPANION_MISSIONS.flatMap(m=>m.bonusRequirements??[]).filter(r=>r.type.startsWith('affinity_'));
assert.ok(hard.length>=4,'expedition pool should contain several hard affinity requirements');
assert.ok(bonus.length>=8,'expedition pool should contain broad affinity bonus variety');
assert.equal((companionMission('MISSION_SCOUT_2H')?.requirements??[]).some(r=>r.type.startsWith('affinity_')),false,'starter patrol must remain affinity-unrestricted');

const owned=(ids:string[])=>Object.fromEntries(ids.map(id=>[id,{companionId:id,level:30,xp:0,ascensionTier:3 as const,bondLevel:10,bondXp:3000,bondTraitUnlocked:true} satisfies OwnedCompanionSnapshot]));
const trio=['UNIT_001','UNIT_002','UNIT_003']; // Wild / Construct / Arcane
const snapshots=owned(trio);
assert.equal(companionMissionRequirementSatisfied({type:'affinity_unique'},trio,snapshots),true);
assert.equal(companionMissionRequirementSatisfied({type:'affinity_diversity',count:3},trio,snapshots),true);
assert.equal(companionMissionRequirementSatisfied({type:'affinity_count',affinity:'wild',count:1},trio,snapshots),true);
assert.equal(companionMissionRequirementSatisfied({type:'affinity_count',affinity:'radiant',count:1},trio,snapshots),false);

for(const stamp of [Date.UTC(2026,8,7),Date.UTC(2026,8,14),Date.UTC(2026,8,21),Date.UTC(2026,8,28)]){
 const active=activeCompanionMissions(stamp).definitions;
 assert.ok(active.some(m=>m.id==='MISSION_SCOUT_2H'),'every weekly board must retain the unrestricted starter mission');
}
console.log('PASS explicit companion Affinities and rotating Expedition requirements');
