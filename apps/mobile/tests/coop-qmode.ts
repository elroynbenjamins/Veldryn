import {qModeStatusCanEnterRun,validateCoopQModeTeam,type CoopQModeTeamView} from '../src/core/coop-qmode';
import {qModeConflictFixture,qModeReadyFixture,qModeResumeFixture,qModeShortageFixture} from '../src/dev/coop-qmode-fixtures';
function equal(actual:unknown,expected:unknown,message='values differ'){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)}`)}
function throws(work:()=>unknown,pattern:RegExp){let message='';try{work()}catch(error){message=error instanceof Error?error.message:String(error)}if(!pattern.test(message))throw new Error(`Expected ${pattern}, received ${message}`)}
validateCoopQModeTeam(qModeReadyFixture);equal(qModeStatusCanEnterRun(qModeReadyFixture),true);equal(qModeReadyFixture.members.filter(member=>member.kind==='echo').length,3);equal(new Set(qModeReadyFixture.members.map(member=>member.memberId)).size,4);
validateCoopQModeTeam(qModeShortageFixture);validateCoopQModeTeam(qModeConflictFixture);equal(qModeStatusCanEnterRun(qModeShortageFixture),false);equal(qModeStatusCanEnterRun(qModeResumeFixture),false,'resume must refetch before commands');
throws(()=>validateCoopQModeTeam({...qModeReadyFixture,members:qModeReadyFixture.members.slice(0,3)}),/incomplete_qmode_team/);
throws(()=>validateCoopQModeTeam({...qModeReadyFixture,members:qModeReadyFixture.members.map((member,index)=>index===0?{...member,role:'damage' as const}:member)}),/invalid_qmode_composition/);
throws(()=>validateCoopQModeTeam({...qModeReadyFixture,sourceAccountId:'private'} as CoopQModeTeamView),/private_echo_data_forbidden/);
equal(qModeReadyFixture.requestId,'q-gallery-request','request identity must remain stable for duplicate retries');
console.log('coop qmode presentation OK');
