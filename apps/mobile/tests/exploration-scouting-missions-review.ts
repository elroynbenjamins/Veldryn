import assert from 'node:assert/strict';
import {SCOUT_OPTIONAL_MISSIONS,scoutingMissionQuote,SCOUT_MISSION_REVIEW_RELEASED} from '../src/core/exploration-scouting-missions-review';
import {SCOUT_ROUTES,type ScoutState,type ScoutAuthority} from '../src/core/exploration-scouting-review';
const state:ScoutState={accountId:'a',characterId:'c',explorationLevel:5,explorationXp:1000,discoveredRouteIds:['SCOUT_GREENFIELDS'],visitedZoneIds:['GREENFIELDS']};
const authority:ScoutAuthority={owned:{UNIT_001:{companionId:'UNIT_001',level:10,xp:0,ascensionTier:0,bondLevel:1,bondXp:0,bondTraitUnlocked:false}},legacyAssignments:[],equipped:new Set(),trialLocked:new Set(),unavailable:new Set()};
assert.equal(SCOUT_MISSION_REVIEW_RELEASED,false);
assert.equal(SCOUT_OPTIONAL_MISSIONS.length,14);
assert.ok(SCOUT_OPTIONAL_MISSIONS.every(m=>SCOUT_ROUTES.some(r=>r.id===m.routeId&&r.released)));
assert.ok(!SCOUT_OPTIONAL_MISSIONS.some(m=>m.missionId.includes('ASH')));
const start={state,authority,receipts:[],missionId:'MISSION_SCOUT_2H',companionIds:['UNIT_001'],pensLevel:1,now:1000};
const q=scoutingMissionQuote(start);assert.ok(q.ok);
if(q.ok){assert.equal(q.explorationXp,1800);assert.equal(q.costs.gold,300);assert.equal(q.preview.gold,280);assert.equal(q.preview.essence,3);assert.equal(q.preview.bondstonesGranted,0);assert.equal(q.rewardsGranted,false);assert.ok(q.durationMs<7200000);}
assert.deepEqual(scoutingMissionQuote({...start,state:{...state,discoveredRouteIds:[]}}),{ok:false,reason:'discover_route_first'});
assert.deepEqual(scoutingMissionQuote({...start,state:{...state,explorationLevel:1}}),{ok:false,reason:'exploration_level'});
assert.equal(scoutingMissionQuote({...start,pensLevel:0}).ok,false);
assert.equal(scoutingMissionQuote({...start,companionIds:[]}).ok,false);
assert.equal(scoutingMissionQuote({...start,authority:{...authority,equipped:new Set(['UNIT_001'])}}).ok,false);
assert.equal(scoutingMissionQuote({...start,missionId:'MISSION_ASH_12H'}).ok,false);
console.log('PASS scouting optional mission mapping, legacy costs, exploration gates and no reward issuance');
