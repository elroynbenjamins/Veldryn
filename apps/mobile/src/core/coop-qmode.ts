import type {CoopRole} from './coop-ui-contract';
import {validateCoopRunView,type CoopRunView} from './coop-presentation';
export type CoopQModeStatus='recruiting'|'ready'|'candidate_shortage'|'content_conflict'|'resuming'|'error'|'reward_pending'|'completed';
export interface CoopQModeMemberView {memberId:string;displayName:string;role:CoopRole;kind:'controller'|'echo';effectiveLevel:number;status:'ready'|'loading'|'unavailable';appearanceId?:string;}
export interface CoopQModeTeamView {runId?:string;requestId:string;status:CoopQModeStatus;members:CoopQModeMemberView[];message?:string;stateVersion?:number;}
export interface CoopQModeServerProjection {runId:string;mode:'qmode';phase:string;tier:1|2|3|4|5;expeditionId:string;controller:true;team:Array<{memberId:string;displayName:string;role:CoopRole;classId:string;companionId?:string;kind:'controller'|'echo';effectiveLevel:number;currentHp:number;maximumHp:number;downed:boolean}>;graph:unknown;currentNodeId:string;options:unknown[];visitedNodeIds:string[];resources:number;boons:string[];artifacts:string[];curses:string[];settlement:{status:'not_ready'|'pending_entitlement'};}
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

export function presentQModeRun(projection:CoopQModeServerProjection&{stateVersion?:number;decisionId?:string;decisionRevision?:number;resolvesAtMs?:number}):CoopRunView{
 const options=projection.options.map(value=>{
  if(!value||typeof value!=='object')throw new Error('invalid_route_option');const node=value as Record<string,unknown>;
  if(typeof node.nodeId!=='string'||typeof node.kind!=='string'||typeof node.risk!=='number'||!Number.isFinite(node.risk)||typeof node.rewardTag!=='string'||node.previewHidden)throw new Error('invalid_route_option');
  const kind=node.kind,title=kind==='boss'?'Final boss':kind.charAt(0).toUpperCase()+kind.slice(1);
  return {nodeId:node.nodeId,title,kind,risk:`Risk ${node.risk}`,reward:node.rewardTag.replace(/_/g,' ')};
 });
 const run:CoopRunView={runId:projection.runId,mode:'qmode',phase:projection.phase,syncedLevel:Math.min(...projection.team.map(member=>member.effectiveLevel)),roleSlots:projection.team.map(member=>({role:member.role,name:member.displayName,echo:member.kind==='echo',classId:member.classId,companionId:member.companionId,currentHp:member.currentHp,maximumHp:member.maximumHp,ready:!member.downed})),options,stateVersion:projection.stateVersion,decisionId:projection.decisionId,decisionRevision:projection.decisionRevision,resolvesAtMs:projection.resolvesAtMs};
 validateCoopRunView(run);return run;
}
