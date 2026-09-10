import { COOP_ROGUELITE_CONFIG } from './config';
export interface LiveMemberConnection {accountId:string;characterId:string;connected:boolean;disconnectedAtMs?:number;absent:boolean;voluntaryLeaver:boolean;}
export interface LiveRecoveryState {members:LiveMemberConnection[];phase:'combat'|'safe_boundary'|'paused_for_reconnect'|'continue_or_end'|'active'|'abandoned';}
export function disconnectMember(state:LiveRecoveryState,accountId:string,nowMs:number):LiveRecoveryState{return{...state,members:state.members.map(member=>member.accountId===accountId?{...member,connected:false,disconnectedAtMs:nowMs}:member)};}
export function reconnectMember(state:LiveRecoveryState,accountId:string,nowMs:number):LiveRecoveryState{
 const member=state.members.find(row=>row.accountId===accountId);if(!member||member.voluntaryLeaver)throw new Error('reconnect_not_allowed');if(member.disconnectedAtMs!==undefined&&nowMs-member.disconnectedAtMs>COOP_ROGUELITE_CONFIG.reconnectGraceMs)throw new Error('reconnect_grace_expired');
 return{...state,phase:'active',members:state.members.map(row=>row.accountId===accountId?{...row,connected:true,disconnectedAtMs:undefined}:row)};
}
export function enterSafeBoundary(state:LiveRecoveryState,nowMs:number):LiveRecoveryState{
 const disconnected=state.members.filter(member=>!member.connected&&!member.voluntaryLeaver);if(!disconnected.length)return{...state,phase:'active'};
 const graceActive=disconnected.some(member=>nowMs-(member.disconnectedAtMs??nowMs)<COOP_ROGUELITE_CONFIG.reconnectGraceMs);return{...state,phase:graceActive?'paused_for_reconnect':'continue_or_end',members:state.members.map(member=>!member.connected?{...member,absent:!graceActive}:member)};
}
export function resolveContinueOrEnd(state:LiveRecoveryState,votes:Record<string,'continue'|'end'>):LiveRecoveryState{
 if(state.phase!=='continue_or_end')throw new Error('no_disconnect_decision');const eligible=state.members.filter(member=>member.connected&&!member.voluntaryLeaver);const continues=eligible.filter(member=>votes[member.accountId]==='continue').length,ends=eligible.filter(member=>votes[member.accountId]==='end').length;
 return{...state,phase:continues>ends?'active':'abandoned'};
}
