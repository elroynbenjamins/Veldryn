import type { CoopRole } from '../../shared/coop-types';
import { COOP_ROGUELITE_CONFIG } from './config';
import { hasExactCoopRoles } from './invariants';
import { freezeCoopRosterAtCommit, type FrozenLoadoutSnapshot, type LoadoutRepository } from './loadout-snapshots';

export interface ReadyRosterMember {accountId:string;characterId:string;ticketId:string;role:CoopRole;originalEnqueuedAtMs:number;loadoutId:string;loadoutRevision:number;loadoutSnapshotHash:string;}
export interface ReadyCheckRecord {id:string;partyId:string;rosterRevision:number;roster:ReadyRosterMember[];accepts:Record<string,boolean>;status:'open'|'refilling'|'committed'|'requeued';openedAtMs:number;closesAtMs:number;refillStartedAtMs?:number;}
export function freezeCommittedReadyRoster(check:ReadyCheckRecord,minLevel:number,syncLevel:number,repository:LoadoutRepository):FrozenLoadoutSnapshot[]{
 if(check.status!=='committed'||!check.roster.every(member=>check.accepts[member.accountId]))throw new Error('ready_check_not_committed');
 return freezeCoopRosterAtCommit({minLevel,syncLevel,repository,selections:check.roster.map(member=>({accountId:member.accountId,characterId:member.characterId,loadoutId:member.loadoutId,expectedRevision:member.loadoutRevision,queuedSnapshotHash:member.loadoutSnapshotHash}))});
}
export class MemoryReadyCheckRepository{
 private checks=new Map<string,ReadyCheckRecord>();
 save(check:ReadyCheckRecord){this.checks.set(check.id,structuredClone(check));}
 get(id:string){const check=this.checks.get(id);return check?structuredClone(check):undefined;}
}
export class ReadyCheckService{
 constructor(private repository:MemoryReadyCheckRepository){}
 open(id:string,partyId:string,rosterRevision:number,roster:ReadyRosterMember[],nowMs:number):ReadyCheckRecord{
  if(roster.length!==4||new Set(roster.map(member=>member.accountId)).size!==4||!hasExactCoopRoles(roster.map(member=>member.role)))throw new Error('invalid_ready_roster');
  const check:ReadyCheckRecord={id,partyId,rosterRevision,roster:structuredClone(roster),accepts:{},status:'open',openedAtMs:nowMs,closesAtMs:nowMs+COOP_ROGUELITE_CONFIG.readyCheckMs};this.repository.save(check);return check;
 }
 respond(id:string,rosterRevision:number,accountId:string,accept:boolean,nowMs:number):ReadyCheckRecord{
  const check=this.required(id);if(check.rosterRevision!==rosterRevision)throw new Error('stale_ready_roster');if(check.status!=='open')throw new Error('ready_check_closed');if(nowMs>=check.closesAtMs){this.fail(check,nowMs);throw new Error('ready_check_closed');}
  if(!check.roster.some(member=>member.accountId===accountId))throw new Error('not_ready_member');
  if(!accept){this.fail(check,nowMs,accountId);return this.required(id);}
  check.accepts[accountId]=true;
  if(check.roster.every(member=>check.accepts[member.accountId]))check.status='committed';
  this.repository.save(check);return structuredClone(check);
 }
 timeout(id:string,nowMs:number):ReadyCheckRecord{const check=this.required(id);if(check.status!=='open')return check;if(nowMs<check.closesAtMs)throw new Error('ready_deadline_not_reached');this.fail(check,nowMs);return this.required(id);}
 cancel(id:string,accountId:string,nowMs:number):ReadyCheckRecord{const check=this.required(id);if(check.status==='committed')throw new Error('run_already_committed');if(check.status!=='open')throw new Error('ready_check_closed');this.fail(check,nowMs,accountId);return this.required(id);}
 refill(id:string,newId:string,replacement:ReadyRosterMember,nowMs:number):ReadyCheckRecord{
  const prior=this.required(id);if(prior.status!=='refilling')throw new Error('not_refilling');if(nowMs-(prior.refillStartedAtMs??nowMs)>=COOP_ROGUELITE_CONFIG.reconnectGraceMs){prior.status='requeued';this.repository.save(prior);throw new Error('refill_window_expired');}
  const retained=prior.roster.filter(member=>prior.accepts[member.accountId]);const roster=[...retained,replacement];if(roster.length!==4)throw new Error('replacement_does_not_complete_roster');
  return this.open(newId,prior.partyId,prior.rosterRevision+1,roster,nowMs);
 }
 private fail(check:ReadyCheckRecord,nowMs:number,explicitAccountId?:string){
  const failed=new Set(explicitAccountId?[explicitAccountId]:check.roster.filter(member=>!check.accepts[member.accountId]).map(member=>member.accountId));
  check.roster=check.roster.filter(member=>!failed.has(member.accountId));check.status='refilling';check.refillStartedAtMs=check.refillStartedAtMs??nowMs;this.repository.save(check);
 }
 private required(id:string):ReadyCheckRecord{const check=this.repository.get(id);if(!check)throw new Error('ready_check_not_found');return check;}
}
