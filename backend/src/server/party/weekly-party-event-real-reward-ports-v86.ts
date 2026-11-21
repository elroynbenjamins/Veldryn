/**
 * V86 HIDDEN: physical Party Event guarantee ports for the shared V69/V70
 * chest transaction. All SQL uses the pinned V70 connection. The V61 receipt
 * is inserted in the SAME transaction as V70, then V65's ONE canonical
 * Party Sigils ledger, existing Gold wallet, game-state materials/essence,
 * four audit legs and V80 already-claimed historical Inbox.
 *
 * Gear hits MUST roll back until registered EQ2 event issuance is audited.
 * QA-only, no API, migration, activation, or production writer.
 */
import type {
 ChestPhysicalGrantV70,ChestPhysicalPortsV70,ChestLedgerLegV70,ChestSqlV70,
} from '../loot/chest-postgres-store-v70';
import type {FrozenChestReceiptV69} from '../loot/chest-reward-settlement-v69';
import {
 PARTY_EVENT_CHESTS_V51,partyChestGearChanceV51,
} from './weekly-party-event-chests-v51';
import {createPartyChestInboxHistoryPortsV80} from './weekly-party-event-inbox-v80';

export const PARTY_EVENT_REAL_REWARDS_V86_RELEASED=false;
export const PARTY_EVENT_REAL_REWARDS_V86_VERSION='party-event-real-rewards-v86' as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SOURCE=/^party-event:(\d{13}):([0-9a-f-]{36}):(participation|preparation|finale)$/;
const names=['party_sigils','gold','gem_dust','companion_essence'] as const;
type Name=typeof names[number];
type Custody='party_sigils'|'character_wallet'|'inventory'|'bank'|'account_state';
interface GameRow extends Record<string,unknown>{character_id:string;state:unknown}
interface WalletRow extends Record<string,unknown>{gold:string|number}
interface AuditRow extends Record<string,unknown>{
 id:string;account_id:string;source_key:string;credited_character_id:string;
 ordinal:number;reward_id:string;quantity:number;custody:Custody;
 balance_before:string|number;balance_after:string|number;
}
interface GameV86{
 character:{id:string;gold:number;[key:string]:unknown};
 account:{companionEssence?:number;[key:string]:unknown};
 inventory:{capacity:number;stacks:Array<{itemId:string;quantity:number}>};
 bank:{capacity:number;stacks:Array<{itemId:string;quantity:number}>};
 [key:string]:unknown;
}
const readGameSql='SELECT character_id::text AS character_id,state FROM '+
 'public.online_game_states WHERE account_id=$1::uuid FOR UPDATE';
const readWalletSql='SELECT gold::text AS gold FROM public.character_wallets '+
 'WHERE character_id=$1::uuid FOR UPDATE';
const readRosterSql=[
 'SELECT r.party_id::text AS party_id,w.family,w.difficulty',
 'FROM private.party_event_roster_v11 r',
 'JOIN private.party_event_weeks_v11 w ON',
 'w.party_id=r.party_id AND w.event_starts_at=r.event_starts_at',
 'WHERE r.account_id=$1::uuid',
 'AND r.event_starts_at=to_timestamp($2::double precision/1000)',
 "AND w.status='settled' FOR SHARE OF r,w",
].join(' ');
const readV61Sql=[
 'SELECT receipt FROM private.party_event_reward_receipts_v61',
 'WHERE source_key=$1 AND account_id=$2::uuid FOR SHARE',
].join(' ');
const insertV61Sql=[
 'INSERT INTO private.party_event_reward_receipts_v61',
 '(source_key,party_id,event_starts_at,account_id,origin,chest_kind,',
 'piece_id,item_instance_id,exact_item_receipt_version,party_sigils_delta,',
 'gold,gem_dust,companion_essence,rules_version,canonical_proof_version,receipt)',
 'VALUES($1,$2::uuid,to_timestamp($3::double precision/1000),',
 "$4::uuid,'chest',$5,NULL,NULL,NULL,$6,$7,$8,$9,",
 "'party-event-reward-v60','party-event-proof-v61',$10::jsonb)",
].join(' ');
const readAuditSql=[
 'SELECT id::text AS id,account_id::text AS account_id,source_key,',
 'credited_character_id::text AS credited_character_id,',
 'ordinal,reward_id,quantity,custody,',
 'balance_before::text AS balance_before,balance_after::text AS balance_after',
 'FROM private.party_event_chest_resource_grants_v86',
 'WHERE source_key=$1 AND account_id=$2::uuid ORDER BY ordinal',
].join(' ');
const readSigilSql=[
 'SELECT source_key,account_id::text AS account_id,delta,',
 'balance_after::text AS balance_after',
 'FROM private.party_sigils_ledger_v65',
 'WHERE source_key=$1 AND account_id=$2::uuid',
].join(' ');
function number(value:unknown,label:string,limit=Number.MAX_SAFE_INTEGER):number{
 const n=typeof value==='string'&&/^\d+$/.test(value)?Number(value):value;
 if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0||n>limit)
  throw Error('party_event_v86_invalid_'+label);
 return n;
}
function state(raw:unknown):GameV86{
 const o=typeof raw==='string'?JSON.parse(raw) as unknown:raw;
 if(!o||typeof o!=='object'||Array.isArray(o))
  throw Error('party_event_v86_bad_game_state');
 const s=o as Record<string,unknown>;
 for(const key of ['character','account','inventory','bank']){
  if(!s[key]||typeof s[key]!=='object'||Array.isArray(s[key]))
   throw Error('party_event_v86_missing_game_component');
 }
 const g=s as unknown as GameV86;
 if(!UUID.test(g.character.id)||!Number.isSafeInteger(g.character.gold)||
  g.character.gold<0)
  throw Error('party_event_v86_bad_character');
 for(const bag of [g.inventory,g.bank]){
  if(!Array.isArray(bag.stacks)||!Number.isSafeInteger(bag.capacity)||
   bag.capacity<0||bag.stacks.length>bag.capacity||
   bag.stacks.some(x=>!x||typeof x.itemId!=='string'||
    !Number.isSafeInteger(x.quantity)||x.quantity<1||x.quantity>2147483647))
   throw Error('party_event_v86_bad_inventory');
 }
 return g;
}
function check(receipt:FrozenChestReceiptV69){
 const m=SOURCE.exec(receipt?.sourceKey??'');
 if(!receipt||receipt.rulesVersion!=='chest-settlement-v69'||
  receipt.committed!==true||receipt.tableId!=='party_event_chest'||
  receipt.proofVersion!=='party-event-proof-v61'||!m||
  !UUID.test(m[2]!)||receipt.accountId!==m[2]||
  receipt.equipmentDeliveryMode!==null||
  receipt.recipientCharacterId!==null||
  receipt.drops.length!==0||receipt.groups.length!==1||
  receipt.groups[0]?.groupId!=='equipment'||
  receipt.groups[0]?.type!=='equipment'||
  receipt.groups[0]?.entryId!==null||
  receipt.groups[0]?.quantity!==0)
  throw Error('party_event_v86_untrusted_or_eq2_chest');
 const week=Number(m[1]),kind=m[3] as
  'participation'|'preparation'|'finale';
 if(!Number.isSafeInteger(week)||week%86400000!==0||
  new Date(week).getUTCDay()!==1)
  throw Error('party_event_v86_invalid_week');
 const catalog=PARTY_EVENT_CHESTS_V51.find(x=>x.kind===kind);
 const exp=catalog?[catalog.partySigils,catalog.gold,
  catalog.gemDust,catalog.companionEssence]:[];
 if(!catalog||receipt.guaranteed.length!==4||
  receipt.groups[0]?.chanceBps!==
   partyChestGearChanceV51(kind,'standard')&&
   !['veteran','heroic'].some(d=>receipt.groups[0]?.chanceBps===
    partyChestGearChanceV51(kind,d as 'veteran'|'heroic'))||
  receipt.guaranteed.some((g,i)=>
   g?.id!==names[i]||g?.quantity!==exp[i]))
  throw Error('party_event_v86_noncanonical_guarantees');
 return {week,kind,amounts:exp};
}
async function roster(tx:ChestSqlV70,receipt:FrozenChestReceiptV69){
 const {week,kind}=check(receipt);
 const rows=(await tx.query<{party_id:string;family:string;difficulty:string}>(
  readRosterSql,[receipt.accountId,week])).rows;
 if(rows.length!==1||!UUID.test(rows[0]!.party_id)||
  !['standard','veteran','heroic'].includes(rows[0]!.difficulty)||
  receipt.tableVersion!=='party_event_v51_'+rows[0]!.family+'_'+
   kind+'_'+rows[0]!.difficulty||
  receipt.groups[0]?.chanceBps!==partyChestGearChanceV51(
   kind,rows[0]!.difficulty as 'standard'|'veteran'|'heroic'))
  throw Error('party_event_v86_settled_roster_mismatch');
 return {partyId:rows[0]!.party_id,week,kind};
}
function expectedV61(receipt:FrozenChestReceiptV69,week:number,
 kind:'participation'|'preparation'|'finale'){
 const def=PARTY_EVENT_CHESTS_V51.find(x=>x.kind===kind)!;
 return {sourceKey:receipt.sourceKey,accountId:receipt.accountId,
  weekStartMs:week,origin:'chest',chestKind:kind,
  pieceId:null,frozenGear:null,partySigilsDelta:def.partySigils,
  gold:def.gold,gemDust:def.gemDust,companionEssence:def.companionEssence,
  rulesVersion:'party-event-reward-v60'};
}
async function ensureV61(tx:ChestSqlV70,receipt:FrozenChestReceiptV69,
 first:boolean){
 const r=await roster(tx,receipt);
 const expected=expectedV61(receipt,r.week,r.kind);
 const rows=(await tx.query<{receipt:unknown}>(readV61Sql,
  [receipt.sourceKey,receipt.accountId])).rows;
 if(first){
  if(rows.length!==0)throw Error('party_event_v86_preexisting_v61_payout');
  const def=PARTY_EVENT_CHESTS_V51.find(x=>x.kind===r.kind)!;
  await tx.query(insertV61Sql,[
   receipt.sourceKey,r.partyId,r.week,receipt.accountId,r.kind,
   def.partySigils,def.gold,def.gemDust,def.companionEssence,
   JSON.stringify(expected),
  ]);
 }else{
  if(rows.length!==1)throw Error('party_event_v86_v61_receipt_missing');
  const stored=typeof rows[0]!.receipt==='string'?
   JSON.parse(rows[0]!.receipt as string) as unknown:rows[0]!.receipt;
  if(JSON.stringify(stored)!==JSON.stringify(expected)&&
   (!stored||typeof stored!=='object'||Array.isArray(stored)||
    Object.entries(expected).some(([k,v])=>
     JSON.stringify((stored as Record<string,unknown>)[k])!==
      JSON.stringify(v))))
   throw Error('party_event_v86_v61_receipt_mismatch');
 }
 return r;
}
async function lockedGame(tx:ChestSqlV70,accountId:string){
 await tx.query(
  "SELECT pg_advisory_xact_lock(hashtextextended('party-account:'||$1::text,0))",
  [accountId]);
 const rows=(await tx.query<GameRow>(readGameSql,[accountId])).rows;
 if(rows.length!==1||!UUID.test(rows[0]!.character_id))
  throw Error('party_event_v86_active_character_required');
 const g=state(rows[0]!.state);
 if(g.character.id!==rows[0]!.character_id)
  throw Error('party_event_v86_active_character_mismatch');
 const own=(await tx.query<{id:string}>(
  'SELECT id::text AS id FROM public.characters WHERE id=$1::uuid AND account_id=$2::uuid',
  [rows[0]!.character_id,accountId])).rows;
 if(own.length!==1)
  throw Error('party_event_v86_foreign_active_character');
 return {characterId:rows[0]!.character_id,game:g};
}
async function writeGame(tx:ChestSqlV70,accountId:string,g:GameV86){
 const rows=(await tx.query<{revision:string|number}>(
  'UPDATE public.online_game_states SET state=$2::jsonb,revision=revision+1,updated_at=now() '+
  'WHERE account_id=$1::uuid RETURNING revision',
  [accountId,JSON.stringify(g)])).rows;
 if(rows.length!==1)throw Error('party_event_v86_game_write_missing');
}
function dust(g:GameV86,count:number){
 for(const custody of ['inventory','bank'] as const){
  const bag=g[custody],items=bag.stacks.filter(x=>x.itemId==='GEM_DUST');
  if(items.length>1)throw Error('party_event_v86_duplicate_dust_stacks');
  if(items[0]){
   const before=number(items[0].quantity,'dust_before',2147483647);
   const after=before+count;
   if(after>2147483647)throw Error('party_event_v86_dust_overflow');
   items[0].quantity=after;
   return {before,after,custody};
  }
 }
 for(const custody of ['inventory','bank'] as const){
  const bag=g[custody];
  if(bag.stacks.length>=bag.capacity)continue;
  bag.stacks.push({itemId:'GEM_DUST',quantity:count});
  return {before:0,after:count,custody};
 }
 throw Error('party_event_v86_inventory_and_bank_full');
}
function gate(enabled:boolean){
 if(!enabled||PARTY_EVENT_REAL_REWARDS_V86_RELEASED||
  process.env.NODE_ENV==='production')
  throw Error('party_event_v86_unreleased');
}
export function createPartyEventRealRewardPortsV86(qaEnabled=false):
 Pick<ChestPhysicalPortsV70,
 'creditGuaranteed'|'grantDrop'|'grantInbox'|'verifyPhysical'>{
 const inbox=createPartyChestInboxHistoryPortsV80(qaEnabled);
 return {
  async creditGuaranteed(tx,receipt,index):Promise<ChestPhysicalGrantV70>{
   gate(qaEnabled);check(receipt);
   if(!Number.isInteger(index)||index<0||index>3)
    throw Error('party_event_v86_invalid_ordinal');
   await ensureV61(tx,receipt,index===0);
   const {characterId,game}=await lockedGame(tx,receipt.accountId);
   const reward=receipt.guaranteed[index]!;
   let before:number,after:number,custody:Custody;
   if(index===0){
    const rows=(await tx.query<{applied:unknown}>(
     'SELECT private.apply_party_sigils_from_receipt_v65($1::uuid,$2::text) AS applied',
     [receipt.accountId,receipt.sourceKey])).rows;
    const result=rows[0]?.applied;
    if(rows.length!==1||!result||typeof result!=='object'||
     Array.isArray(result))
     throw Error('party_event_v86_sigils_apply_missing');
    const r=result as Record<string,unknown>;
    after=number(r.balanceAfter,'sigils_balance',2147483647);
    before=after-reward.quantity;
    if(r.accountId!==receipt.accountId||r.sourceKey!==receipt.sourceKey||
     r.delta!==reward.quantity||r.replayed!==false||before<0)
     throw Error('party_event_v86_sigils_receipt_mismatch');
    custody='party_sigils';
   }else if(index===1){
    const w=(await tx.query<WalletRow>(readWalletSql,[characterId])).rows;
    if(w.length!==1)throw Error('party_event_v86_gold_wallet_missing');
    before=number(w[0]!.gold,'gold_before');
    after=before+reward.quantity;
    if(!Number.isSafeInteger(after))
     throw Error('party_event_v86_gold_overflow');
    const changed=(await tx.query<WalletRow>(
     'UPDATE public.character_wallets SET gold=$2::bigint,updated_at=now() '+
     'WHERE character_id=$1::uuid AND gold=$3::bigint RETURNING gold::text AS gold',
     [characterId,String(after),String(before)])).rows;
    if(changed.length!==1||number(changed[0]!.gold,'gold_cas')!==after)
     throw Error('party_event_v86_gold_cas_failed');
    game.character.gold=after;custody='character_wallet';
    await writeGame(tx,receipt.accountId,game);
   }else if(index===2){
    const d=dust(game,reward.quantity);
    before=d.before;after=d.after;custody=d.custody;
    await writeGame(tx,receipt.accountId,game);
   }else{
    before=number(game.account.companionEssence??0,
     'essence_before',2147483647);
    after=before+reward.quantity;
    if(after>2147483647)throw Error('party_event_v86_essence_overflow');
    game.account.companionEssence=after;custody='account_state';
    await writeGame(tx,receipt.accountId,game);
   }
   const audits=(await tx.query<{id:string}>(
    'INSERT INTO private.party_event_chest_resource_grants_v86 '+
    '(source_key,account_id,credited_character_id,ordinal,reward_id,quantity,'+
    'custody,balance_before,balance_after) '+
    'VALUES($1,$2::uuid,$3::uuid,$4,$5,$6,$7,$8::bigint,$9::bigint) '+
    'RETURNING id::text AS id',
    [receipt.sourceKey,receipt.accountId,characterId,index,reward.id,
     reward.quantity,custody,String(before),String(after)])).rows;
   if(audits.length!==1||!UUID.test(audits[0]!.id))
    throw Error('party_event_v86_grant_audit_missing');
   return {grantId:'pe86:'+audits[0]!.id,itemInstanceId:null};
  },
  async grantDrop():Promise<ChestPhysicalGrantV70>{
   gate(qaEnabled);
   throw Error('party_event_v86_eq2_issuer_not_ready');
  },
  async grantInbox(tx,receipt):Promise<ChestPhysicalGrantV70>{
   gate(qaEnabled);check(receipt);
   return inbox.grantInbox(tx,receipt);
  },
  async verifyPhysical(tx,receipt,legs:readonly ChestLedgerLegV70[],
   phase:'fresh'|'replay'){
   gate(qaEnabled);check(receipt);
   if(phase!=='fresh'&&phase!=='replay')return false;
   if(legs.length!==5||legs.some(x=>
    x.sourceKey!==receipt.sourceKey||x.accountId!==receipt.accountId||
    x.itemInstanceId!==null))return false;
   await ensureV61(tx,receipt,false);
   const audits=(await tx.query<AuditRow>(readAuditSql,
    [receipt.sourceKey,receipt.accountId])).rows;
   const ledger=(await tx.query<{
    source_key:string;account_id:string;delta:number;
    balance_after:string|number;
   }>(readSigilSql,[receipt.sourceKey,receipt.accountId])).rows;
   if(audits.length!==4||ledger.length!==1)return false;
   const sigil=ledger[0]!;
   if(sigil.source_key!==receipt.sourceKey||
    sigil.account_id!==receipt.accountId||
    Number(sigil.delta)!==receipt.guaranteed[0]!.quantity||
    number(sigil.balance_after,'sigils_ledger')!==
     number(audits[0]!.balance_after,'sigils_audit'))return false;
   const seen=new Set<number>();
   const credited=audits[0]!.credited_character_id;
   if(!UUID.test(credited)||credited===receipt.accountId)return false;
   for(const [i,row] of audits.entries()){
    const g=receipt.guaranteed[i]!;
    const before=number(row.balance_before,'audit_before');
    const after=number(row.balance_after,'audit_after');
    const allowed:Custody[]=i===0?['party_sigils']:
     i===1?['character_wallet']:
      i===2?['inventory','bank']:['account_state'];
    if(!UUID.test(row.id)||Number(row.ordinal)!==i||
     seen.has(Number(row.ordinal))||
     row.source_key!==receipt.sourceKey||
     row.account_id!==receipt.accountId||
     row.credited_character_id!==credited||
     row.reward_id!==g.id||Number(row.quantity)!==g.quantity||
     after-before!==g.quantity||!allowed.includes(row.custody)||
     !legs.some(x=>x.kind==='guarantee'&&x.ordinal===i&&
      x.rewardId===g.id&&x.quantity===g.quantity&&
      x.grantId==='pe86:'+row.id))
     return false;
    seen.add(i);
   }
   const ib=legs.find(x=>x.kind==='inbox'&&x.ordinal===0);
   if(!ib||!await inbox.verifyInbox(tx,receipt,ib.grantId))return false;
   // Historical replay verifies the frozen award and immutable audit, NOT
   // balances that legitimately changed after the first successful claim.
   if(phase==='replay')return true;
   const {characterId,game}=await lockedGame(tx,receipt.accountId);
   if(characterId!==credited)return false;
   const wallet=(await tx.query<WalletRow>(readWalletSql,[credited])).rows;
   if(wallet.length!==1)return false;
   if(number(wallet[0]!.gold,'verify_wallet')!==
    number(audits[1]!.balance_after,'audit_gold')||
    game.character.gold!==number(wallet[0]!.gold,'verify_character_gold'))
    return false;
   const bag=audits[2]!.custody==='bank'?game.bank:game.inventory;
   const dustCount=bag.stacks.filter(s=>s.itemId==='GEM_DUST')
    .reduce((sum,s)=>sum+number(s.quantity,'dust_count'),0);
   return dustCount===number(audits[2]!.balance_after,'audit_dust')&&
    number(game.account.companionEssence??0,'verify_essence')===
     number(audits[3]!.balance_after,'audit_essence');
  },
 };
}
