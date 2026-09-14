import type {CoopLoadoutIntent} from '../core/coop-loadout-presentation';
import type {CoopRunView} from '../core/coop-presentation';
import type {CoopQModeMemberView,CoopQModeServerProjection,CoopQModeTeamView} from '../core/coop-qmode';
import {validateCoopQModeTeam,presentQModeRun} from '../core/coop-qmode';
import {coopClient} from './coop-client';
import {supabase} from './supabase';
export interface CoopQModeSource {start:(intent:CoopLoadoutIntent,requestId:string)=>Promise<{run:CoopRunView;team:CoopQModeTeamView}>;resume:(runId:string,requestId:string)=>Promise<{run:CoopRunView;team:CoopQModeTeamView}>;}
function teamFromRun(run:CoopRunView,requestId:string):CoopQModeTeamView{
  if(run.mode!=='qmode')throw new Error('not_qmode_run');
  const members:CoopQModeMemberView[]=run.roleSlots.map((slot,index)=>({memberId:`${run.runId}:seat:${index}`,displayName:slot.name,role:slot.role,kind:slot.echo?'echo':'controller',effectiveLevel:run.syncedLevel,status:slot.ready===false?'loading':'ready'}));
  const team:CoopQModeTeamView={runId:run.runId,requestId,status:'ready',members};validateCoopQModeTeam(team);return team;
}
function isPublicProjection(value:CoopRunView|CoopQModeServerProjection|{ticketId:string;status:string}):value is CoopQModeServerProjection{return 'mode' in value&&value.mode==='qmode'&&'team' in value;}
function publicProjection(value:unknown):CoopQModeServerProjection{
  if(!value||typeof value!=='object')throw new Error('invalid_qmode_projection');const row=value as Record<string,unknown>;
  if(row.mode!=='qmode'||typeof row.runId!=='string'||!Array.isArray(row.team)||!Array.isArray(row.options)||!Array.isArray(row.visitedNodeIds)||!row.settlement||typeof row.settlement!=='object')throw new Error('invalid_qmode_projection');
  return value as CoopQModeServerProjection;
}
export async function readAuthorizedQModeSnapshot(runId:string):Promise<{projection:CoopQModeServerProjection;stateVersion:number;eventCursor:number}>{
  if(!supabase)throw new Error('Co-op server is not configured.');
  const {data,error}=await supabase.from('coop_run_client_snapshots').select('state_version,event_cursor,projection_json').eq('run_id',runId).single();
  if(error)throw new Error(error.message);if(!data)throw new Error('qmode_snapshot_not_found');
  return {projection:publicProjection(data.projection_json),stateVersion:Number(data.state_version),eventCursor:Number(data.event_cursor)};
}
function fromPublicProjection(projection:CoopQModeServerProjection,requestId:string){
  const team:CoopQModeTeamView={runId:projection.runId,requestId,status:projection.phase==='completed'?'reward_pending':'ready',members:projection.team.map(member=>({memberId:member.memberId,displayName:member.displayName,role:member.role,kind:member.kind,effectiveLevel:member.effectiveLevel,status:member.downed?'unavailable':'ready'}))};validateCoopQModeTeam(team);
  return{run:presentQModeRun(projection),team};
}
export const realCoopQModeSource:CoopQModeSource={
  start:async(intent,requestId)=>{if(intent.mode!=='qmode')throw new Error('not_qmode_intent');const result=await coopClient.start('qmode',{requestId,dungeonId:intent.dungeonId,tier:intent.tier,characterId:intent.characterId,loadoutId:intent.loadoutId,loadoutRevision:intent.loadoutRevision});if(isPublicProjection(result))return fromPublicProjection(result,requestId);if(!('runId' in result))throw new Error('qmode_run_projection_missing');return {run:result,team:teamFromRun(result,requestId)}},
  resume:async(runId,requestId)=>{const result=await coopClient.run(runId);if(!isPublicProjection(result))throw new Error('qmode_run_projection_missing');return fromPublicProjection(result,requestId)}
};
