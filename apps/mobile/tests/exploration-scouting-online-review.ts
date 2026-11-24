import assert from 'node:assert/strict';
import {scoutingOnlineView,SCOUTING_ONLINE_VIEW_RELEASED} from '../src/core/exploration-scouting-online-review';
import type {ScoutingSnapshotProjection} from '../../../backend/src/server/exploration/scouting-types';
const snapshot:ScoutingSnapshotProjection={
 account:{accountId:'a',xp:238834,level:30,creditedDiscoveryIds:['SCOUT_GREENFIELDS','SCOUT_SILVERBROOK'],retainedSlots:3},
 character:{characterId:'c',retainedRegionIds:['GREENFIELDS','SILVERBROOK','IRONWOOD'],retainedAreaIds:[],discoveredRouteIds:['SCOUT_GREENFIELDS']},
 assignments:[{assignmentId:'x',characterId:'alt',kind:'practice',status:'active',endsAt:'2026-11-24T13:00:00.000Z',companionIds:[],explorationXp:100}],
 camp:{level:2,capacity:2,active:1},legacyReports:2
};
const view=scoutingOnlineView(snapshot,'c');
assert.equal(SCOUTING_ONLINE_VIEW_RELEASED,false);assert.equal(view.source,'server');assert.equal(view.account.level,30);assert.equal(view.account.xp,238834);assert.equal(view.characterSlotContribution,0);
assert.equal(view.camp.free,1);assert.equal(view.assignments[0].otherCharacter,true);assert.deepEqual(view.character.regions,['GREENFIELDS','SILVERBROOK','IRONWOOD']);
assert.throws(()=>scoutingOnlineView(snapshot,'wrong'),/owner_mismatch/);
console.log('PASS authoritative online Exploration view, retained access and zero slot contribution');
