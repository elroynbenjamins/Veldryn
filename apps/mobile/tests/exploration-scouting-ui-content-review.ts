import assert from 'node:assert/strict';
import {scoutingMissionSetupReview,scoutingTrainingSetupReview} from '../src/core/exploration-scouting-ui-review';
import {EXPLORATION_2_SKILL_COPY,EXPLORATION_2_COMPANION_COPY,EXPLORATION_2_QUEST_COPY,EXPLORATION_2_ACHIEVEMENTS,SCOUTING_2_CONTENT_RELEASED} from '../src/core/exploration-scouting-content-review';
import type {ScoutState,ScoutAuthority} from '../src/core/exploration-scouting-review';
const state:ScoutState={accountId:'a',characterId:'c',explorationLevel:20,explorationXp:100000,discoveredRouteIds:['SCOUT_GREENFIELDS'],visitedZoneIds:['GREENFIELDS']};
const authority:ScoutAuthority={owned:{
 UNIT_001:{companionId:'UNIT_001',level:20,xp:0,ascensionTier:0,bondLevel:5,bondXp:0,bondTraitUnlocked:false},
 UNIT_002:{companionId:'UNIT_002',level:20,xp:0,ascensionTier:0,bondLevel:5,bondXp:0,bondTraitUnlocked:false},
},legacyAssignments:[],equipped:new Set(),trialLocked:new Set(),unavailable:new Set()};
const setup=scoutingMissionSetupReview({state,authority,receipts:[],missionId:'MISSION_SCOUT_2H',selectedIds:['UNIT_001'],pensLevel:2,now:1000,earnExplorationXp:true});
assert.equal(setup.released,false);assert.equal(setup.ready,true);assert.ok(setup.preview);assert.ok(setup.teamBonus>0);
assert.equal(setup.candidates[0].available,true);assert.ok(setup.candidates.some(c=>c.preferredAffinity));assert.ok(['C','B','A','S'].includes(setup.expectedGrade!));
const blocked=scoutingMissionSetupReview({state,authority:{...authority,equipped:new Set(['UNIT_001'])},receipts:[],missionId:'MISSION_SCOUT_2H',selectedIds:['UNIT_001'],pensLevel:2,now:1000,earnExplorationXp:true});
assert.equal(blocked.ready,false);
const training=scoutingTrainingSetupReview({state,authority,receipts:[],routeId:'scout2:SCOUT_GREENFIELDS',companionIds:[],kind:'practice',now:1000});
assert.equal(training.options.length,7);assert.equal(training.options[0].minutes,5);assert.equal(training.options.at(-1)?.minutes,480);assert.ok(training.options.every(o=>o.available&&o.xp>0));
assert.equal(SCOUTING_2_CONTENT_RELEASED,false);
assert.match(EXPLORATION_2_SKILL_COPY.scopeLabel,/Account-wide/);assert.match(EXPLORATION_2_SKILL_COPY.characterSlots,/does not count/);
assert.match(EXPLORATION_2_COMPANION_COPY.sanctuary,/preserved/);assert.match(EXPLORATION_2_QUEST_COPY.QST_003.description,/Send a scout/);
assert.deepEqual(EXPLORATION_2_ACHIEVEMENTS.map(a=>a.required),[1,5,4,4,3]);
assert.equal(new Set(EXPLORATION_2_ACHIEVEMENTS.map(a=>a.id)).size,EXPLORATION_2_ACHIEVEMENTS.length);
console.log('PASS assignment presentation, affinity/grade preview, duration setup and 2.0 content contract');
