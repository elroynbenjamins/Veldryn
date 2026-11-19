import {
 PARTY_SIGILS_V65_RELEASED,createPartySigilsPortsV65,
} from '../weekly-party-sigils-ledger-v65';
import type {PartySqlConnectionV63} from '../weekly-party-event-atomic-store-v63';

function check(value:unknown,label:string):asserts value{
 if(!value)throw Error('party_sigils_v65_test:'+label);
}
async function rejects(fn:()=>Promise<unknown>,label:string){
 let failed=false;try{await fn()}catch(e){failed=String(e).includes(label)}
 check(failed,'reject_'+label);
}
const account='11111111-1111-4111-8111-111111111111';
const foreign='22222222-2222-4222-8222-222222222222';
const week=Date.UTC(2026,10,16);
const source=(kind:string)=>'party-event:'+week+':'+account+':'+kind;
const operations:string[]=[];
let reported=0;
const connection:PartySqlConnectionV63={
 async query<T extends Record<string,unknown>=Record<string,unknown>>(
  sql:string,params:readonly unknown[]=[],
 ):Promise<{rows:T[]}>{
  operations.push(sql);
  if(sql.startsWith('select balance from private.party_sigils_wallet_v65')){
   check(params[0]===account,'account_scoped_wallet');
   return {rows:[{balance:String(reported)} as unknown as T]};
  }
  if(sql.startsWith('select private.apply_party_sigils_from_receipt_v65')){
   check(params[0]===account,'account_scoped_apply');
   const kind=String(params[1]).split(':').at(-1);
   const delta=kind==='participation'?8:kind==='preparation'?10:
    kind==='finale'?16:-60;
   reported+=delta;
   return {rows:[{applied:{sourceKey:params[1],accountId:params[0],
    delta,balanceAfter:reported,replayed:false}} as unknown as T]};
  }
  throw Error('unapproved_sql_query');
 },
 release(){},
};
async function run(){
 check(!PARTY_SIGILS_V65_RELEASED,'unreleased');
 const hidden=createPartySigilsPortsV65();
 await rejects(()=>hidden.readExistingPartySigils(connection,account),
  'unreleased');
 const ports=createPartySigilsPortsV65(true);
 const start=await ports.readExistingPartySigils(connection,account);
 check(start===0,'zero_wallet');
 for(const [kind,delta] of [['participation',8],['preparation',10],
  ['finale',16]] as const){
  await ports.applyExistingPartySigils(connection,account,source(kind),delta);
 }
 check(await ports.readExistingPartySigils(connection,account)===34,
  'canonical_total_34');
 for(const [kind,delta] of [
  ['participation',10],['finale',8],['exchange',16],
 ] as const){
  await rejects(()=>ports.applyExistingPartySigils(connection,account,
   source(kind),delta),'noncanonical_delta');
 }
 await rejects(()=>ports.applyExistingPartySigils(connection,foreign,
  source('participation'),8),'invalid_source');
 await rejects(()=>ports.applyExistingPartySigils(connection,account,
  'party-event:'+week+':'+account+':unknown',8),'invalid_source');
 await rejects(()=>ports.applyExistingPartySigils(connection,account,
  'party-event:1970010100000:'+account+':participation',8),'invalid_week');
 check(reported===34,'invalid_sources_no_effect');
 const old=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  await rejects(()=>ports.applyExistingPartySigils(connection,account,
   source('participation'),8),'unreleased');
 }finally{process.env.NODE_ENV=old;}
 check(reported===34,'production_no_wallet_access');
 check(operations.length===5,'only_two_reads_and_three_valid_applies');
 console.log('PARTY_SIGILS_V65_OK: one account wallet, exact chest rates, no forged source/delta or production writes');
}
run().catch(e=>{console.error(e);throw e;});
