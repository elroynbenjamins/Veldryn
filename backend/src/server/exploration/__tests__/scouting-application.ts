import {strict as assert} from 'node:assert';
import {parseScoutingClaimBody,parseScoutingDispatchBody} from '../scouting-api-contracts';
import {ScoutingApplicationService} from '../scouting-application';
import {ScoutingHttpApplication} from '../scouting-http-application';
import type {ScoutingRepository} from '../scouting-persistence';
import type {ScoutingClaimResult,ScoutingDispatchResult,ScoutingMigrationResult,ScoutingSnapshotProjection} from '../scouting-types';
const snapshot:ScoutingSnapshotProjection={account:{accountId:'a',xp:100,level:2,creditedDiscoveryIds:[],retainedSlots:2},character:{characterId:'c',retainedRegionIds:['GREENFIELDS'],retainedAreaIds:[],discoveredRouteIds:[]},assignments:[],camp:{level:1,capacity:1,active:0},legacyReports:0};
const dispatchResult:ScoutingDispatchResult={requestId:'request_01',idempotentReplay:false,assignment:{assignmentId:'x',characterId:'c',kind:'practice',status:'active',endsAt:new Date(1000).toISOString(),companionIds:[],explorationXp:10},snapshot};
const claimResult:ScoutingClaimResult={requestId:'request_02',assignmentId:'x',idempotentReplay:false,explorationXpAwarded:10,reward:null,snapshot};
const migration:ScoutingMigrationResult={accountId:'a',alreadyMigrated:false,xp:100,level:2,retainedSlots:2,characters:1};
class Memory implements ScoutingRepository{
 calls:string[]=[];snapshot(){this.calls.push('snapshot');return Promise.resolve(snapshot)}
 dispatch(){this.calls.push('dispatch');return Promise.resolve(dispatchResult)}
 claim(){this.calls.push('claim');return Promise.resolve(claimResult)}
 migrateAccount(){this.calls.push('migrate');return Promise.resolve(migration)}
}
const practice=parseScoutingDispatchBody({requestId:'request_01',kind:'practice',routeId:'scout2:SCOUT_GREENFIELDS',companionIds:[],trainingMinutes:480});
assert.equal(practice.command.kind,'practice');
assert.equal(practice.command.kind==='practice'&&practice.command.trainingMinutes,480);
const camp=parseScoutingDispatchBody({requestId:'request_02',kind:'camp',missionId:'MISSION_SCOUT_2H',companionIds:['UNIT_001'],earnExplorationXp:true,food:[{itemId:'TRAVEL_RATION',quantity:34}]});
assert.equal(camp.command.kind,'camp');
assert.throws(()=>parseScoutingDispatchBody({requestId:'short',kind:'practice',routeId:'r',companionIds:[],trainingMinutes:5}),/INVALID_REQUEST_ID/);
assert.throws(()=>parseScoutingDispatchBody({requestId:'request_03',kind:'survey',routeId:'r',companionIds:[],trainingMinutes:120}),/INVALID_COMPANION_TEAM/);
assert.throws(()=>parseScoutingDispatchBody({requestId:'request_04',kind:'practice',routeId:'r',companionIds:[],trainingMinutes:7}),/INVALID_TRAINING_DURATION/);
assert.throws(()=>parseScoutingDispatchBody({requestId:'request_05',kind:'camp',missionId:'m',companionIds:['x','x'],earnExplorationXp:false,food:[]}),/INVALID_COMPANION_TEAM/);
assert.deepEqual(parseScoutingClaimBody({requestId:'request_06',assignmentId:'CA_1'}),{requestId:'request_06',assignmentId:'CA_1'});
const memory=new Memory(),service=new ScoutingApplicationService(memory),http=new ScoutingHttpApplication(service,()=>1234);
void Promise.all([
 service.snapshot('a','c'),service.dispatch('a','c',{requestId:'request_07',kind:'route',routeId:'r',companionIds:[]},0),
 service.claim('a','c',{requestId:'request_08',assignmentId:'CA_1'},1),service.migrateAccount('a',2)
 ,http.get('a','c'),http.dispatch('a','c',{requestId:'request_09',kind:'practice',routeId:'r',companionIds:[],trainingMinutes:5}),http.claim('a','c',{requestId:'request_10',assignmentId:'CA_1'})
]).then(()=>{assert.deepEqual(memory.calls.sort(),['claim','claim','dispatch','dispatch','migrate','snapshot','snapshot']);assert.throws(()=>service.dispatch('','','x',-1));console.log('scouting server application PASS')});
