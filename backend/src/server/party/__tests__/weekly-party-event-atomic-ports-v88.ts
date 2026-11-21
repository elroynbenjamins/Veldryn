/** V88 wiring gate: no production path and exactly five approved ports. */
import {
 createPartyEventAtomicPortsV88,
 PARTY_EVENT_ATOMIC_PORTS_V88_RELEASED,
} from '../weekly-party-event-atomic-ports-v88';
import {
 PARTY_EVENT_CANONICAL_PG_V87_RELEASED,
} from '../weekly-party-event-canonical-pg-v87';
import {
 PARTY_EVENT_REAL_REWARDS_V86_RELEASED,
} from '../weekly-party-event-real-reward-ports-v86';
import type {PartyEventAtomicPortsV88} from
 '../weekly-party-event-atomic-ports-v88';

function check(ok:unknown,why:string):asserts ok{
 if(!ok)throw Error('party_event_v88_test_'+why);
}
function fail(work:()=>unknown,part:string){
 let rejected=false;
 try{work()}catch(e){rejected=String(e).includes(part)}
 check(rejected,'expected_'+part);
}
check(!PARTY_EVENT_ATOMIC_PORTS_V88_RELEASED,'assembly_flag_on');
check(!PARTY_EVENT_CANONICAL_PG_V87_RELEASED,'source_flag_on');
check(!PARTY_EVENT_REAL_REWARDS_V86_RELEASED,'writer_flag_on');
fail(()=>createPartyEventAtomicPortsV88(),'party_event_v88_unreleased');
const original=process.env.NODE_ENV;
try{
 process.env.NODE_ENV='production';
 fail(()=>createPartyEventAtomicPortsV88(true),
  'party_event_v88_unreleased');
}finally{process.env.NODE_ENV=original}
const ports:PartyEventAtomicPortsV88=createPartyEventAtomicPortsV88(true);
const methods=Object.keys(ports).sort();
check(JSON.stringify(methods)===JSON.stringify([
 'creditGuaranteed','grantDrop','grantInbox',
 'readCanonicalSource','verifyPhysical',
 ]),'no_extra_writer_or_public_api');
for(const method of methods){
 check(typeof ports[method as keyof PartyEventAtomicPortsV88]==='function',
  'missing_port_'+method);
}
check(!('withLockedAccountSource' in ports)&&!('query' in ports)&&
 !('connect' in ports)&&!('open' in ports),'no_independent_transaction');
console.log('PARTY_EVENT_ATOMIC_PORTS_V88_OK: one QA-only V87 proof and V86 physical writer bundle, production closed');
