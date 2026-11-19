/**
 * V65 — unmounted Party Sigils adapter for the existing V63 SQL transaction.
 *
 * This is one currency; the future migration must reconcile legacy wallets
 * before promoting private.party_sigils_wallet_v65 as the canonical source.
 * Exactly-once ledger writes are tied to the immutable V61 chest/exchange
 * receipt via the SQL function, never arbitrary mobile client deltas.
 */
import type {PartyEventAtomicPortsV63,PartySqlConnectionV63} from
 './weekly-party-event-atomic-store-v63';

export const PARTY_SIGILS_V65_RELEASED=false;
export const PARTY_SIGILS_V65_SCHEMA='party-sigils-v65' as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const integer=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n);
const permitted=(value:string)=>value==='participation'||
 value==='preparation'||value==='finale'||value==='exchange';
const assertAccount=(accountId:string)=>{
 if(!UUID.test(accountId)||accountId!==accountId.toLowerCase())
  throw Error('party_sigils_v65_invalid_account');
};
function assertKey(account:string,sourceKey:string){
 if(typeof sourceKey!=='string')throw Error('party_sigils_v65_invalid_source');
 const pieces=sourceKey.split(':');
 if(pieces.length!==4||pieces[0]!=='party-event'||
  !/^\d{13}$/.test(pieces[1]??'')||pieces[2]!==account||
  !permitted(pieces[3]??''))
  throw Error('party_sigils_v65_invalid_source');
 const week=Number(pieces[1]);
 if(!Number.isSafeInteger(week)||week<0||week%86400000!==0||
  new Date(week).getUTCDay()!==1)
  throw Error('party_sigils_v65_invalid_week');
}
export type PartySigilsV65Ports=Pick<PartyEventAtomicPortsV63,
 'readExistingPartySigils'|'applyExistingPartySigils'>;
const walletSql='select balance from private.party_sigils_wallet_v65 where account_id=$1::uuid for update';
const applySql='select private.apply_party_sigils_from_receipt_v65($1::uuid,$2::text) as applied';
export function createPartySigilsPortsV65(qaEnabled=false):PartySigilsV65Ports{
 const gate=()=>{
  if(!qaEnabled||PARTY_SIGILS_V65_RELEASED||
   process.env.NODE_ENV==='production')
   throw Error('party_sigils_v65_unreleased');
 };
 return {
  async readExistingPartySigils(tx:PartySqlConnectionV63,accountId:string):Promise<number>{
   gate();assertAccount(accountId);
   const rows=(await tx.query<{balance:number|string}>(walletSql,[accountId])).rows;
   if(rows.length>1)throw Error('party_sigils_v65_duplicate_wallet');
   if(!rows.length)return 0;
   const value=rows[0]!.balance;
   const balance=typeof value==='string'?Number(value):value;
   if(!integer(balance)||balance<0||balance>2147483647)
    throw Error('party_sigils_v65_corrupt_balance');
   return balance;
  },
  async applyExistingPartySigils(tx:PartySqlConnectionV63,
   accountId:string,sourceKey:string,delta:number):Promise<void>{
   gate();assertAccount(accountId);assertKey(accountId,sourceKey);
   const expected:Record<string,number>={participation:8,preparation:10,finale:16,exchange:-60};
   const kind=sourceKey.split(':')[3]!;
   if(!integer(delta)||delta!==expected[kind])
    throw Error('party_sigils_v65_noncanonical_delta');
   const rows=(await tx.query<{applied:unknown}>(applySql,[accountId,sourceKey])).rows;
   if(rows.length!==1)throw Error('party_sigils_v65_ledger_write_missing');
   const result=rows[0]!.applied;
   if(!result||typeof result!=='object'||Array.isArray(result))
    throw Error('party_sigils_v65_invalid_ledger_result');
   const record=result as Record<string,unknown>;
   if(record.sourceKey!==sourceKey||record.accountId!==accountId||
    record.delta!==delta||record.replayed!==false||
    !integer(record.balanceAfter)||(record.balanceAfter as number)<0||
    (record.balanceAfter as number)>2147483647)
    throw Error('party_sigils_v65_invalid_ledger_result');
  },
 };
}
