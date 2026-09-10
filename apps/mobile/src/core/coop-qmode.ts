import type {CoopRole} from './coop-ui-contract';
export type CoopQModeStatus='recruiting'|'ready'|'candidate_shortage'|'content_conflict'|'resuming'|'error'|'reward_pending'|'completed';
export interface CoopQModeMemberView {memberId:string;displayName:string;role:CoopRole;kind:'controller'|'echo';effectiveLevel:number;status:'ready'|'loading'|'unavailable';appearanceId?:string;}
export interface CoopQModeTeamView {runId?:string;requestId:string;status:CoopQModeStatus;members:CoopQModeMemberView[];message?:string;stateVersion?:number;}
export interface CoopQModeServerProjection {runId:string;mode:'qmode';phase:string;tier:1|2|3|4|5;expeditionId:string;controller:true;team:Array<{memberId:string;displayName:string;role:CoopRole;kind:'controller'|'echo';effectiveLevel:number;currentHp:number;maximumHp:number;downed:boolean}>;graph:unknown;currentNodeId:string;options:unknown[];visitedNodeIds:string[];resources:number;boons:string[];artifacts:string[];curses:string[];settlement:{status:'not_ready'|'pending_entitlement'};}
export function validateCoopQModeTeam(view:CoopQModeTeamView):void{
  const serialized=JSON.stringify(view);if(/sourceAccountId|ownerAccountId|wallet/i.test(serialized))throw new Error('private_echo_data_forbidden');
  if(view.status==='ready'||view.status==='resuming'||view.status==='reward_pending'||view.status==='completed'){
    if(!view.runId||view.members.length!==4)throw new Error('incomplete_qmode_team');
    const counts={tank:0,damage:0,support:0};for(const member of view.members)counts[member.role]++;
    if(counts.tank!==1||counts.damage!==2||counts.support!==1)throw new Error('invalid_qmode_composition');
    if(view.members.filter(member=>member.kind==='controller').length!==1||new Set(view.members.map(member=>member.memberId)).size!==4)throw new Error('invalid_qmode_members');
  }
}
export function qModeStatusCanEnterRun(view:CoopQModeTeamView):boolean{validateCoopQModeTeam(view);return view.status==='ready';}
