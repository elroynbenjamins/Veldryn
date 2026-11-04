import {qModeStatusCanEnterRun,validateCoopQModeTeam,type CoopQModeTeamView} from '../src/core/coop-qmode';
import {qModeConflictFixture,qModeReadyFixture,qModeResumeFixture,qModeShortageFixture} from '../src/dev/coop-qmode-fixtures';
import {presentQModeRun} from '../src/core/coop-qmode';
import {isCoopBattleResolving,isCoopCombatNodeKind} from '../src/core/coop-presentation';

function equal(actual:unknown,expected:unknown,message='values differ'){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)}`)}
function throws(work:()=>unknown,pattern:RegExp){let message='';try{work()}catch(error){message=error instanceof Error?error.message:String(error)}if(!pattern.test(message))throw new Error(`Expected ${pattern}, received ${message}`)}
validateCoopQModeTeam(qModeReadyFixture);equal(qModeStatusCanEnterRun(qModeReadyFixture),true);equal(qModeReadyFixture.members.filter(member=>member.kind==='echo').length,3);equal(new Set(qModeReadyFixture.members.map(member=>member.memberId)).size,4);
validateCoopQModeTeam(qModeShortageFixture);validateCoopQModeTeam(qModeConflictFixture);equal(qModeStatusCanEnterRun(qModeShortageFixture),false);equal(qModeStatusCanEnterRun(qModeResumeFixture),false,'resume must refetch before commands');
throws(()=>validateCoopQModeTeam({...qModeReadyFixture,members:qModeReadyFixture.members.slice(0,3)}),/incomplete_qmode_team/);
throws(()=>validateCoopQModeTeam({...qModeReadyFixture,members:qModeReadyFixture.members.map((member,index)=>index===0?{...member,role:'damage' as const}:member)}),/invalid_qmode_composition/);
throws(()=>validateCoopQModeTeam({...qModeReadyFixture,sourceAccountId:'private'} as CoopQModeTeamView),/private_echo_data_forbidden/);
equal(qModeReadyFixture.requestId,'q-gallery-request','request identity must remain stable for duplicate retries');

const roster=[
 {memberId:'tank',displayName:'Tank',role:'tank' as const,classId:'IRONWARDEN',kind:'controller' as const,effectiveLevel:20,currentHp:100,maximumHp:100,downed:false},
 {memberId:'dps1',displayName:'Damage One',role:'damage' as const,classId:'RANGER',kind:'npc' as const,effectiveLevel:20,currentHp:100,maximumHp:100,downed:false},
 {memberId:'dps2',displayName:'Damage Two',role:'damage' as const,classId:'MAGE',kind:'npc' as const,effectiveLevel:20,currentHp:100,maximumHp:100,downed:false},
 {memberId:'support',displayName:'Support',role:'support' as const,classId:'CLERIC',kind:'npc' as const,effectiveLevel:20,currentHp:100,maximumHp:100,downed:false},
];
const baseProjection={
 runId:'r-battle-routing',mode:'qmode' as const,phase:'resolving_node',tier:1 as const,expeditionId:'EXP_001',controller:true as const,
 team:roster,graph:{nodes:[{nodeId:'room-forge',kind:'forge'},{nodeId:'room-risk',kind:'risk'},{nodeId:'room-camp',kind:'camp'},{nodeId:'room-battle',kind:'battle'},{nodeId:'room-elite',kind:'elite'},{nodeId:'room-boss',kind:'boss'}]},
 currentNodeId:'entry',options:[],visitedNodeIds:[],resources:0,boons:[],artifacts:[],curses:[],
 settlement:{status:'not_ready' as const},
};
const potionProjection={...baseProjection,phase:'awaiting_choice',potionCharges:{used:1,max:3,remaining:2}};
equal(presentQModeRun(potionProjection).potionCharges,{used:1,max:3,remaining:2},'Server-owned dungeon potion charges must reach the UI unchanged');
throws(()=>presentQModeRun({...potionProjection,potionCharges:{used:4,max:3,remaining:-1}}),/invalid_dungeon_potion_charges/);
throws(()=>presentQModeRun({...potionProjection,potionCharges:{used:1,max:3,remaining:3}}),/invalid_dungeon_potion_charges/);
for(const kind of ['forge','risk','camp','battle','elite','boss'] as const){
 const projection={...baseProjection,selectedNodeId:'room-'+kind};
 const view=presentQModeRun(projection);
 equal(view.selectedNodeKind,kind,'The selected kind is inferred from the public authoritative graph');
 equal(isCoopBattleResolving(view),['battle','elite','boss'].includes(kind),'Only a combat node may open the battle theater');
}
for(const kind of ['event','merchant','shrine','treasure','echo','secret',undefined]){
 equal(isCoopCombatNodeKind(kind),false,'Utility nodes must never be mistaken for combat');
}
equal(isCoopBattleResolving({phase:'resolving_node',pendingCombat:{nodeId:'combat'} as any}),true,'Older Live projections with actual pending battle cues still open combat');
equal(isCoopBattleResolving({phase:'awaiting_choice',selectedNodeKind:'boss'}),false,'A future boss option never opens a battle before selection');
equal(isCoopBattleResolving({phase:'resolving_node',selectedNodeKind:'forge',pendingCombat:{nodeId:'old-fight'} as any}),false,'A non-combat selected kind beats stale combat projection data');

console.log('coop qmode presentation OK');
