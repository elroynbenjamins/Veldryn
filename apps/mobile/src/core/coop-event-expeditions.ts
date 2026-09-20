import type {CoopRole} from './coop-ui-contract';
import {validateCoopRunView,type CoopRunView} from './coop-presentation';

export type CoopEventExpeditionStatus='preview'|'available';

/** Server-projected seasonal content. Only the authenticated co-op entry endpoint may
 * promote an expedition to available; calendar dates in the client remain preview metadata. */
export interface CoopEventExpeditionPreview{
  id:string;
  eventName:string;
  name:string;
  description:string;
  routeHighlights:string[];
  finalBoss:string;
  status:CoopEventExpeditionStatus;
  minLevel:number;
  rewardMarks:number;
  lockedReason?:string;
  /** Present only when this expedition matches the authoritative active LiveOps runtime. */
  liveEventId?:string;
}

export interface CoopEventRunServerProjection{
  runId:string;
  eventExpeditionId:string;
  liveEventId:string;
  eventName:string;
  dungeonName:string;
  phase:string;
  stateVersion:number;
  decisionId?:string;
  decisionRevision?:number;
  team:Array<{memberId:string;displayName:string;role:CoopRole;kind:'controller'|'echo';effectiveLevel:number;downed?:boolean}>;
  options:Array<{nodeId:string;kind:string;risk:number;rewardTag:string}>;
  settlement:{status:'pending'|'claimed';rewardMarks?:number};
}

const EVENT_EXPEDITION_SERIES=new Set([
  'EVT_ANNUAL_001','EVT_ANNUAL_002','EVT_ANNUAL_003','EVT_ANNUAL_006',
  'EVT_ANNUAL_008','EVT_ANNUAL_010','EVT_ANNUAL_011','EVT_ANNUAL_012',
]);

export function seasonalEventHasExpedition(liveEventId:string):boolean{
  const match=liveEventId.match(/^(EVT_ANNUAL_\d{3})(?:_|$)/);
  return Boolean(match&&EVENT_EXPEDITION_SERIES.has(match[1]));
}

export function validateCoopEventExpeditionPreview(value:CoopEventExpeditionPreview):void{
  if(!value.id.trim()||!value.eventName.trim()||!value.name.trim()||!value.description.trim()||!value.finalBoss.trim())throw new Error('invalid_event_expedition_preview');
  if(value.status!=='preview'&&value.status!=='available')throw new Error('invalid_event_expedition_status');
  if(!Number.isInteger(value.minLevel)||value.minLevel<1||!Number.isInteger(value.rewardMarks)||value.rewardMarks<0)throw new Error('invalid_event_expedition_requirements');
  if(value.status==='available'&&!value.liveEventId?.trim())throw new Error('available_event_requires_live_event');
  if(value.routeHighlights.length<3||new Set(value.routeHighlights.map(item=>item.trim().toLocaleLowerCase())).size!==value.routeHighlights.length||value.routeHighlights.some(item=>!item.trim()))throw new Error('invalid_event_route_highlights');
}

export function presentEventExpeditionRun(projection:CoopEventRunServerProjection):CoopRunView{
  if(!projection.runId.trim()||!projection.eventExpeditionId.trim()||!projection.liveEventId.trim()||!projection.eventName.trim()||!projection.dungeonName.trim())throw new Error('invalid_event_run_projection');
  if(!Number.isInteger(projection.stateVersion)||projection.stateVersion<1||projection.team.length!==4)throw new Error('invalid_event_run_projection');
  const options=projection.options.map(option=>{
    if(!option.nodeId.trim()||!option.kind.trim()||!Number.isFinite(option.risk)||!option.rewardTag.trim())throw new Error('invalid_event_route_option');
    const title=option.kind==='boss'?'Final boss':option.kind.charAt(0).toUpperCase()+option.kind.slice(1);
    return {nodeId:option.nodeId,title,kind:option.kind,risk:`Risk ${option.risk}`,reward:option.rewardTag.replace(/_/g,' ')};
  });
  const marks=projection.settlement.rewardMarks??0;
  const run:CoopRunView={
    runId:projection.runId,
    mode:'qmode',
    modeLabel:'Seasonal expedition',
    phase:projection.phase,
    syncedLevel:Math.min(...projection.team.map(member=>member.effectiveLevel)),
    roleSlots:projection.team.map(member=>({role:member.role,name:member.displayName,echo:member.kind==='echo',ready:member.downed===undefined?true:!member.downed})),
    options,
    stateVersion:projection.stateVersion,
    decisionId:projection.decisionId,
    decisionRevision:projection.decisionRevision,
    rewardText:projection.phase==='completed'?(projection.settlement.status==='claimed'?`${marks} event currency collected.`:`${marks} event currency ready to collect.`):undefined,
  };
  validateCoopRunView(run);
  return run;
}
