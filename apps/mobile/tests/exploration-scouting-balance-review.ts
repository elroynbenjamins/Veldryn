import assert from 'node:assert/strict';
import {simulateScoutingProgress} from '../src/core/exploration-scouting-balance-review';
import {explorationDiscoveryCollection} from '../src/core/exploration-discovery-review';
import {SCOUT_ROUTES,scoutingTeamBreakdown,type ScoutAuthority} from '../src/core/exploration-scouting-review';
const owned=Object.fromEntries(['UNIT_001','UNIT_002','UNIT_003'].map(id=>[id,{companionId:id,level:20,xp:0,ascensionTier:0 as const,bondLevel:5,bondXp:0,bondTraitUnlocked:false}]));
const authority:ScoutAuthority={owned,legacyAssignments:[],equipped:new Set(),trialLocked:new Set(),unavailable:new Set()};
const cases=[
 {name:'guide practice, immediate claim',companionIds:[],repeat:'practice' as const,claimCadenceMs:1000,xpMultiplier:1},
 {name:'one scout, 2h claim cadence',companionIds:['UNIT_001'],repeat:'survey' as const,claimCadenceMs:7200000,xpMultiplier:1},
 {name:'three scouts, immediate claim',companionIds:['UNIT_001','UNIT_002','UNIT_003'],repeat:'survey' as const,claimCadenceMs:1000,xpMultiplier:1},
 {name:'candidate 60% repeat XP, three scouts',companionIds:['UNIT_001','UNIT_002','UNIT_003'],repeat:'survey' as const,claimCadenceMs:1000,xpMultiplier:.6},
];
const results=cases.map(c=>({name:c.name,...simulateScoutingProgress({...c,authority,targetLevel:100})}));
for(const r of results){assert.equal(r.level,100);assert.ok(r.xp>=r.targetXp);assert.equal(r.discovered,13);assert.ok(r.hours>=r.activeHours);assert.ok(r.levels[20]<r.levels[50]&&r.levels[50]<r.levels[100]);}
assert.ok(results[3].hours>results[2].hours);
console.table(results.map(r=>({scenario:r.name,level20:Math.round(r.levels[20]/3600000),level50:Math.round(r.levels[50]/3600000),level100:Math.round(r.hours),assignments:r.assignments})));
const green=SCOUT_ROUTES.find(r=>r.legacyId==='SCOUT_GREENFIELDS')!;
const frost=SCOUT_ROUTES.find(r=>r.legacyId==='SCOUT_FROSTMARCH')!;
const wild=scoutingTeamBreakdown(green,['UNIT_001'],authority);
assert.equal(wild.scouts[0].affinityBonus,.03);assert.equal(wild.scouts[0].originBonus,.04);
assert.equal(scoutingTeamBreakdown(frost,['UNIT_001'],authority).scouts[0].affinityBonus,0);
assert.equal(scoutingTeamBreakdown(frost,['UNIT_002'],authority).scouts[0].affinityBonus,.03);
assert.ok(scoutingTeamBreakdown(green,['UNIT_001','UNIT_002','UNIT_003'],authority).total<=.2);
assert.throws(()=>scoutingTeamBreakdown(green,['UNIT_001','UNIT_001'],authority),/invalid_team/);
const empty=explorationDiscoveryCollection({creditedDiscoveryIds:['SCOUT_ASHLANDS','not_a_route']});
assert.equal(empty.count,0);assert.equal(empty.total,13);
const complete=explorationDiscoveryCollection({creditedDiscoveryIds:[...SCOUT_ROUTES.map(r=>r.legacyId),'SCOUT_GREENFIELDS']});
assert.deepEqual(complete.regions.map(r=>[r.count,r.total]),[[5,5],[4,4],[4,4]]);
assert.equal(complete.realm.eligible,true);assert.equal(complete.rewardsGranted,false);
assert.equal(explorationDiscoveryCollection({creditedDiscoveryIds:SCOUT_ROUTES.map(r=>r.legacyId)},[complete.realm.milestoneId]).realm.eligible,false);
console.log('PASS progression simulations, affinity identity, actual discovery collections');
