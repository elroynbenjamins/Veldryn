import type { CoopRole } from '../../shared/coop-types';
import { COOP_ROGUELITE_CONFIG } from './config';
import { hasExactCoopRoles } from './invariants';
import type { ReadyRosterMember } from './ready-checks';

export interface CoopQueueTicket {
 id:string; accountId:string; characterId:string; role:CoopRole; normalizedReadiness:number;
 loadoutId:string; loadoutRevision:number; loadoutSnapshotHash:string;
 expeditionId:string; tier:number; contentVersion:string; balanceVersion:string; serviceRegion:string;
 enqueuedAtMs:number; heartbeatExpiresAtMs:number; status:'queued'|'reserved'|'cancelled'|'expired';
 reservationId?:string; reservationExpiresAtMs?:number;
}
export interface CoopMatchCandidate {ticketIds:string[];score:number;partition:string;}

export interface CoopQuickMatchDemand {
 expeditionId:string;
 tank:number;
 damage:number;
 support:number;
 oldestQueuedAtMs?:number;
}

export function queuePartition(ticket:CoopQueueTicket):string{return `${ticket.expeditionId}|${ticket.contentVersion}|${ticket.balanceVersion}`;}
export function resolvedAutoTier(tickets:readonly CoopQueueTicket[]):number{if(!tickets.length)throw new Error('empty_match');const tier=Math.min(...tickets.map(ticket=>ticket.tier));if(!Number.isInteger(tier)||tier<1||tier>5)throw new Error('invalid_auto_tier');return tier;}
function ticketScore(ticket:CoopQueueTicket,nowMs:number):number{return Math.min(120,(nowMs-ticket.enqueuedAtMs)/1_000)-Math.abs(1-ticket.normalizedReadiness)*20;}

export function chooseQuickMatchExpedition(demands:readonly CoopQuickMatchDemand[],eligibleExpeditionIds:readonly string[],role:CoopRole,nowMs:number):string|null{
 if(!eligibleExpeditionIds.length)return null;
 const eligible=new Set(eligibleExpeditionIds),rows=new Map(demands.filter(row=>eligible.has(row.expeditionId)).map(row=>[row.expeditionId,row]));
 const required={tank:1,damage:2,support:1} as const;
 const completeGroups=(row:CoopQuickMatchDemand)=>Math.min(Math.floor(row.tank/required.tank),Math.floor(row.damage/required.damage),Math.floor(row.support/required.support));
 let best:{id:string;score:number}|null=null;
 for(let order=0;order<eligibleExpeditionIds.length;order++){
  const id=eligibleExpeditionIds[order],row=rows.get(id)??{expeditionId:id,tank:0,damage:0,support:0};
  const before=completeGroups(row),after={...row,[role]:row[role]+1},afterGroups=completeGroups(after);
  const pressure=role==='tank'?Math.max(0,Math.min(Math.floor(row.damage/2),row.support)-row.tank):
   role==='support'?Math.max(0,Math.min(row.tank,Math.floor(row.damage/2))-row.support):
   Math.max(0,Math.min(row.tank,row.support)*2-row.damage);
  const total=row.tank+row.damage+row.support,oldestWait=row.oldestQueuedAtMs===undefined?0:Math.max(0,Math.min(3600,Math.floor((nowMs-row.oldestQueuedAtMs)/1000)));
  const score=(afterGroups-before)*1_000_000+pressure*25_000+Math.min(total,32)*500+oldestWait-order*.001;
  if(!best||score>best.score)best={id,score};
 }
 return best?.id??eligibleExpeditionIds[0]??null;
}

export function chooseBoundedCoopMatch(tickets:readonly CoopQueueTicket[],nowMs:number,maxPerRole=8,requiredTicketIds:readonly string[]=[],canMatch:(roster:readonly CoopQueueTicket[])=>boolean=()=>true):CoopMatchCandidate|null{
 if(!Number.isInteger(maxPerRole)||maxPerRole<1||maxPerRole>32||new Set(requiredTicketIds).size!==requiredTicketIds.length||requiredTicketIds.length>4)throw new Error('invalid_match_bounds');
 const eligible=tickets.filter(ticket=>ticket.status==='queued'&&ticket.heartbeatExpiresAtMs>nowMs&&ticket.normalizedReadiness>=COOP_ROGUELITE_CONFIG.normalizedReadinessFloor);
 const partitions=new Map<string,CoopQueueTicket[]>();for(const ticket of eligible){const key=queuePartition(ticket);partitions.set(key,[...(partitions.get(key)??[]),ticket]);}
 let best:CoopMatchCandidate|null=null;
 for(const [partition,rows] of partitions){
  const top=(role:CoopRole)=>rows.filter(ticket=>ticket.role===role).sort((a,b)=>Number(requiredTicketIds.includes(b.id))-Number(requiredTicketIds.includes(a.id))||ticketScore(b,nowMs)-ticketScore(a,nowMs)).slice(0,maxPerRole);
  const tanks=top('tank'),damage=top('damage'),supports=top('support');
  for(const tank of tanks)for(const support of supports)for(let first=0;first<damage.length-1;first++)for(let second=first+1;second<damage.length;second++){
   const set=[tank,damage[first],damage[second],support];
   if(requiredTicketIds.some(id=>!set.some(ticket=>ticket.id===id)))continue;
   if(!canMatch(set))continue;
   if(new Set(set.map(ticket=>ticket.accountId)).size!==4||new Set(set.map(ticket=>ticket.characterId)).size!==4)continue;
   if(!hasExactCoopRoles(set.map(ticket=>ticket.role)))continue;
   const regionBonus=Math.max(...Object.values(Object.fromEntries(set.map(ticket=>[ticket.serviceRegion,set.filter(other=>other.serviceRegion===ticket.serviceRegion).length]))))*2;
   const spread=Math.max(...set.map(ticket=>ticket.normalizedReadiness))-Math.min(...set.map(ticket=>ticket.normalizedReadiness));
   const score=set.reduce((sum,ticket)=>sum+ticketScore(ticket,nowMs),0)+regionBonus-spread*25;
   if(!best||score>best.score)best={ticketIds:set.map(ticket=>ticket.id),score,partition};
  }
 }
 return best;
}

export function readyRosterFromReservedTickets(tickets:readonly CoopQueueTicket[]):ReadyRosterMember[]{
 if(tickets.length!==4||tickets.some(ticket=>ticket.status!=='reserved'))throw new Error('invalid_reserved_roster');
 if(new Set(tickets.map(ticket=>ticket.reservationId)).size!==1||!tickets[0].reservationId)throw new Error('reservation_mismatch');
 const roster=tickets.map(ticket=>({accountId:ticket.accountId,characterId:ticket.characterId,ticketId:ticket.id,role:ticket.role,originalEnqueuedAtMs:ticket.enqueuedAtMs,loadoutId:ticket.loadoutId,loadoutRevision:ticket.loadoutRevision,loadoutSnapshotHash:ticket.loadoutSnapshotHash}));
 if(new Set(roster.map(member=>member.accountId)).size!==4||new Set(roster.map(member=>member.characterId)).size!==4||!hasExactCoopRoles(roster.map(member=>member.role)))throw new Error('invalid_reserved_roster');
 return roster;
}

export class MemoryQueueRepository{
 private tickets=new Map<string,CoopQueueTicket>();private accountReservations=new Map<string,string>();
 add(ticket:CoopQueueTicket):void{if([...this.tickets.values()].some(row=>row.accountId===ticket.accountId&&['queued','reserved'].includes(row.status)))throw new Error('account_already_participating');this.tickets.set(ticket.id,structuredClone(ticket));}
 list():CoopQueueTicket[]{return [...this.tickets.values()].map(ticket=>structuredClone(ticket));}
 reserve(candidate:CoopMatchCandidate,reservationId:string,nowMs:number,expiresAtMs:number):CoopQueueTicket[]{
  const rows=candidate.ticketIds.map(id=>this.tickets.get(id));if(rows.some(row=>!row||row.status!=='queued'||row.heartbeatExpiresAtMs<=nowMs))throw new Error('reservation_conflict');
  if(new Set(rows.map(row=>row!.accountId)).size!==4||rows.some(row=>this.accountReservations.has(row!.accountId)))throw new Error('reservation_conflict');
  for(const row of rows){row!.status='reserved';row!.reservationId=reservationId;row!.reservationExpiresAtMs=expiresAtMs;this.accountReservations.set(row!.accountId,reservationId);}
  return rows.map(row=>structuredClone(row!));
 }
 releaseExpired(nowMs:number):void{for(const row of this.tickets.values())if(row.status==='reserved'&&(row.reservationExpiresAtMs??0)<=nowMs){row.status='queued';delete row.reservationId;delete row.reservationExpiresAtMs;this.accountReservations.delete(row.accountId);}}
 cancel(ticketId:string,accountId:string):void{const row=this.tickets.get(ticketId);if(!row||row.accountId!==accountId)throw new Error('ticket_not_owned');if(row.status==='reserved')this.accountReservations.delete(accountId);row.status='cancelled';}
}
