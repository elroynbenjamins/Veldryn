import {strict as assert} from 'node:assert';
import type {ClassIdV2} from '../build-contract';
import {projectPartySynchronizationCatalogueV2,projectPartySynchronizationLobbyV2,
 previewPartySynchronizationCandidateV2} from '../party-synchronization-projection';

const p=(characterId:string,classId:ClassIdV2)=>({characterId,classId});
const radiant=projectPartySynchronizationLobbyV2('dungeon',[
 p('b','BASTION'),p('d','DAWNKEEPER'),
]);
assert.equal(radiant.activeCount,1);
assert.equal(radiant.scalePercent,100);
assert.equal(radiant.links[0].id,'radiant_covenant');
assert.equal(radiant.links[0].nameKey,'party_sync.radiant_covenant.name');
assert.equal(radiant.personalCpDelta,0);
assert.equal(radiant.requiresProgression,false);
assert.equal(radiant.canGateEntry,false);
assert.equal(radiant.canFilterRecruitment,false);
assert.ok(radiant.totals.some(x=>x.stat==='damage_reduction_pct'&&x.bps===300));
assert.deepEqual(radiant.cappedStats,[]);

const before=[
 p('iron','IRONWARDEN'),p('way','WAYFINDER'),p('stone','STONECALLER'),
];
const preview=previewPartySynchronizationCandidateV2('dungeon',before,p('hex','HEXWEAVER'));
assert.equal(preview.beforeActiveCount,2);
assert.equal(preview.afterActiveCount,3);
assert.equal(preview.beforeScalePercent,100);
assert.equal(preview.afterScalePercent,80);
assert.equal(preview.scaleDeltaPercent,-20);
assert.deepEqual(preview.newlyActivatedLinkIds,['marked_for_death']);
assert.equal(preview.queueEligibilityIndependentOfSynchronization,true);
assert.equal(preview.canGateEntry,false);
assert.equal(preview.canFilterRecruitment,false);
assert.equal(preview.visibleOnRecruitmentBoard,false);
assert.equal(preview.canRankCandidates,false);
assert.equal(preview.personalCpDelta,0);

const random=projectPartySynchronizationLobbyV2('party_event',[
 p('r1','DREADGUARD'),p('r2','HEXWEAVER'),
]);
const established=projectPartySynchronizationLobbyV2('party_event',[
 p('friend_1','DREADGUARD'),p('friend_2','HEXWEAVER'),
]);
assert.deepEqual(
 {...random,links:random.links.map(x=>({...x}))},
 {...established,links:established.links.map(x=>({...x}))},
 'relationship history must not affect projected Synchronization',
);

const capped=projectPartySynchronizationLobbyV2('party_event',[
 p('b','BASTION'),p('d','DAWNKEEPER'),p('x','DREADGUARD'),p('i','IRONWARDEN'),
]);
assert.deepEqual(capped.cappedStats,[{
 stat:'healing_received_pct',statKey:'party_sync.stat.healing_received_pct',
 rawBps:1040,effectiveBps:1000,discardedBps:40,
}]);
const catalogue=projectPartySynchronizationCatalogueV2();
assert.equal(catalogue.length,18);
assert.equal(new Set(catalogue.map(x=>x.id)).size,18);
assert.ok(catalogue.every(x=>x.canFilterRecruitment===false&&
 x.visibleOnRecruitmentBoard===false&&x.canRankCandidates===false&&
 x.requiresProgression===false));
assert.throws(()=>previewPartySynchronizationCandidateV2('dungeon',[
 p('1','BASTION'),p('2','DAWNKEEPER'),p('3','WAYFINDER'),p('4','HEXWEAVER'),
],p('5','RAVAGER')),/party_full/);
assert.throws(()=>previewPartySynchronizationCandidateV2('dungeon',
 [p('same','BASTION')],p('same','DAWNKEEPER')),/duplicate_character/);

console.log('PASS: informational Synchronization lobby/recruitment projection; no gating, CP or progression');
