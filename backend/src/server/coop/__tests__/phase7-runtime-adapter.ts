import { strict as assert } from 'node:assert';
import { CoopDomainError } from '../errors';
import { SupabaseCoopRuntimeRepository, type ReservedMatchMember, type ServiceRoleRpcClient } from '../repositories/supabase-runtime';

async function main(){
  const calls:{name:string;args:Record<string,unknown>}[]=[];
  const members:ReservedMatchMember[]=[['t','tank'],['d1','damage'],['d2','damage'],['s','support']].map(([id,role])=>({ticketId:id,accountId:`a-${id}`,characterId:`c-${id}`,role:role as ReservedMatchMember['role'],loadoutId:`l-${id}`,loadoutRevision:1,loadoutSnapshotHash:`h-${id}`,originalEnqueuedAt:'2026-09-09T00:00:00Z',reservationId:'reservation-1',reservationExpiresAt:'2026-09-09T00:00:20Z'}));
  const client:ServiceRoleRpcClient={rpc:async <T>(name:string,args:Record<string,unknown>)=>{calls.push({name,args});return {data:(name==='reserve_coop_match_server_v1'?members:4) as T,error:null};}};
  const repository=new SupabaseCoopRuntimeRepository(client);
  const reserved=await repository.reserveMatch(['t','d1','d2','s'],'reservation-1','2026-09-09T00:00:00Z','2026-09-09T00:00:20Z');
  assert.equal(reserved.length,4);assert.deepEqual(calls[0].args.p_ticket_ids,['t','d1','d2','s']);assert.equal(calls[0].args.p_readiness_floor,.8);
  assert.equal(await repository.releaseExpiredReservations('2026-09-09T00:00:21Z'),4);
  assert.equal(calls[1].name,'release_expired_coop_reservations_server_v1');
  let invalid='';try{await repository.reserveMatch(['t','d1','d1','s'],'reservation-2','now','later');}catch(error){invalid=error instanceof Error?error.message:String(error);}assert.equal(invalid,'invalid_reservation_request');
  const conflict=new SupabaseCoopRuntimeRepository({rpc:async()=>({data:null,error:{message:'RESERVATION_CONFLICT'}})});
  let conflictCode='';try{await conflict.reserveMatch(['t','d1','d2','s'],'reservation-2','now','later');}catch(error){conflictCode=error instanceof CoopDomainError?error.code:String(error);}assert.equal(conflictCode,'reservation_conflict');
  console.log('coop phase7 runtime adapter OK');
}
void main();
