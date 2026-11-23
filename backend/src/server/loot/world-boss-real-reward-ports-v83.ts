/**
 * Hidden V83: World Boss reward writers against EXISTING Veldryn storage.
 * Only the V70 same-connection transaction may call these review-only ports.
 * No new wallet, no RPC, no HTTP, no client-supplied amounts or recipient.
 *
 * V83 deliberately DOES NOT solve Equipment 2.0 issuance: a gear hit must
 * abort V70 and roll back all credits. The already-paid Inbox history carries
 * ZERO attachments, so legacy gift/Party claim handlers cannot pay twice.
 */
import type {
 ChestSqlV70,ChestLedgerLegV70,ChestPhysicalGrantV70,ChestPhysicalPortsV70,
} from './chest-postgres-store-v70';
import type {FrozenChestReceiptV69} from './chest-reward-settlement-v69';
import {worldBossChestGuaranteeV58,
 type WorldBossChestKindV58} from '../combat/world-boss-chests-v58';

export const WORLD_BOSS_REAL_REWARDS_V83_RELEASED=false;
export const WORLD_BOSS_REAL_REWARDS_V83_VERSION='world-boss-real-rewards-v83' as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SOURCE=new RegExp(
 '^world-boss:([0-9a-f-]{36}):([0-9a-f-]{36}):'+
 '(donations_goal|three_attempts|community_damage_goal)$');
const ids=['gold','companion_essence','gem_dust','tempering_dust'] as const;
type RewardId=typeof ids[number];
type Custody='character_wallet'|'account_state'|'inventory'|'bank';
interface GameStateV83{
 character:{gold:number;[key:string]:unknown};
 account:{companionEssence?:number;[key:string]:unknown};
 inventory:{stacks:Array<{itemId:string;quantity:number}>;capacity:number;[key:string]:unknown};
 bank:{stacks:Array<{itemId:string;quantity:number}>;capacity:number;[key:string]:unknown};
 [key:string]:unknown;
}
interface GameRow extends Record<string,unknown>{
 character_id:string;state:unknown;
}
interface WalletRow extends Record<string,unknown>{gold:string|number;}
interface AuditRow extends Record<string,unknown>{
 id:string;account_id:string;source_key:string;character_id:string;
 ordinal:number;reward_id:string;quantity:number;
 custody:Custody;balance_before:string|number;balance_after:string|number;
}
interface InboxRow extends Record<string,unknown>{
 id:string;account_id:string;source_key:string;source_kind:string;
 source_id:string;title:string;body:string;attachments:unknown;
 claimed_at:unknown;
}
const readGameSql='SELECT character_id::text AS character_id,state '+
 'FROM public.online_game_states WHERE account_id=$1::uuid FOR UPDATE';
const readOwnedCharacterSql='SELECT id::text AS id FROM public.characters '+
 'WHERE id=$1::uuid AND account_id=$2::uuid FOR KEY SHARE';
const readWalletSql='SELECT gold::text AS gold FROM public.character_wallets '+
 'WHERE character_id=$1::uuid FOR UPDATE';
const readAuditSql='SELECT id::text AS id,source_key,account_id::text AS account_id,'+
 'character_id::text AS character_id,ordinal,reward_id,quantity,custody,'+
 'balance_before::text AS balance_before,balance_after::text AS balance_after '+
 'FROM private.world_boss_chest_resource_grants_v83 '+
 'WHERE source_key=$1 AND account_id=$2::uuid ORDER BY ordinal';
const readInboxSql='SELECT id::text AS id,source_key,account_id::text AS account_id,'+
 'source_kind,source_id::text AS source_id,title,body,attachments,claimed_at '+
 'FROM private.reward_inbox_v1 WHERE source_key=$1 AND account_id=$2::uuid';
const TITLE='World Boss chest received';
const BODY='Your World Boss chest rewards were credited when it was opened. No additional Inbox claim is required.';
function number(value:unknown,reason:string):number{
 const n=typeof value==='string'&&/^\d+$/.test(value)?Number(value):value;
 if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0||
  n>Number.MAX_SAFE_INTEGER)
  throw Error('world_boss_v83_bad_'+reason);
 return n;
}
function object(value:unknown):Record<string,unknown>{
 const o=typeof value==='string'?JSON.parse(value) as unknown:value;
 if(!o||typeof o!=='object'||Array.isArray(o))
  throw Error('world_boss_v83_invalid_game_state');
 return o as Record<string,unknown>;
}
function checkedReceipt(receipt:FrozenChestReceiptV69){
 const match=SOURCE.exec(receipt?.sourceKey??'');
 if(!receipt||receipt.rulesVersion!=='chest-settlement-v69'||
  receipt.tableId!=='world_boss_chest'||receipt.committed!==true||
  !match||!UUID.test(match[1]!)||!UUID.test(match[2]!)||
  match[2]!==receipt.accountId||
  !receipt.tableVersion.startsWith('world_boss_v58_')||
  !['hollowroot','sunscar','frostmarch'].some(boss=>
   receipt.tableVersion==='world_boss_v58_'+boss+'_'+match[3])||
  receipt.guaranteed.length!==4||receipt.groups.length!==1||
  receipt.groups[0]?.groupId!=='equipment'||
  receipt.groups[0]?.type!=='equipment'||
  receipt.groups[0]?.chanceBps!==100)
  throw Error('world_boss_v83_untrusted_chest');
 const kind=match[3] as WorldBossChestKindV58;
 const amounts=worldBossChestGuaranteeV58(kind);
 const expected=[amounts.gold,amounts.companionEssence,
  amounts.gemDust,amounts.temperingDust];
 if(receipt.guaranteed.some((g,i)=>g.id!==ids[i]||
  g.quantity!==expected[i]))
  throw Error('world_boss_v83_noncanonical_amounts');
 return {eventId:match[1]!,kind};
}
function state(value:unknown):GameStateV83{
 const s=object(value);
 if(!s.character||!s.account||!s.inventory||!s.bank)
  throw Error('world_boss_v83_missing_game_components');
 for(const key of ['character','account','inventory','bank']){
  const part=s[key];
  if(!part||typeof part!=='object'||Array.isArray(part))
   throw Error('world_boss_v83_bad_game_part');
 }
 for(const key of ['inventory','bank'] as const){
  const bag=s[key] as GameStateV83[typeof key];
  if(!Array.isArray(bag.stacks)||
   !Number.isSafeInteger(bag.capacity)||bag.capacity<0||
   bag.stacks.length>bag.capacity||
   bag.stacks.some(x=>!x||typeof x.itemId!=='string'||
    !Number.isSafeInteger(x.quantity)||x.quantity<1))
   throw Error('world_boss_v83_bad_inventory');
 }
 return s as unknown as GameStateV83;
}
async function lockedGame(tx:ChestSqlV70,accountId:string){
 // Same advisory lock used by existing online game-state claim writers.
 await tx.query(
  "SELECT pg_advisory_xact_lock(hashtextextended('party-account:'||$1::text,0))",
  [accountId]);
 const rows=(await tx.query<GameRow>(readGameSql,[accountId])).rows;
 if(rows.length!==1||!UUID.test(rows[0]!.character_id))
  throw Error('world_boss_v83_online_character_required');
 const game=state(rows[0]!.state);
 if(game.character.id!==rows[0]!.character_id)
  throw Error('world_boss_v83_active_character_mismatch');
 // A matching active-state UUID alone does not prove ownership. Without
 // this same-transaction check, a corrupted online_game_states binding could
 // credit a character wallet belonging to another account.
 const owned=(await tx.query<{id:string}>(readOwnedCharacterSql,
  [rows[0]!.character_id,accountId])).rows;
 if(owned.length!==1||owned[0]!.id!==rows[0]!.character_id)
  throw Error('world_boss_v83_character_not_owned');
 return {characterId:rows[0]!.character_id,game};
}
function rewardBalance(s:GameStateV83,id:RewardId,
 custody?:Custody):number{
 if(id==='companion_essence')
  return number(s.account.companionEssence??0,'essence_balance');
 const itemId=id==='gem_dust'?'GEM_DUST':'TEMPERING_DUST';
 if(id==='gold')throw Error('world_boss_v83_wallet_not_in_game_state');
 const bag=(custody==='bank'?s.bank:s.inventory);
 return bag.stacks.filter(x=>x.itemId===itemId)
  .reduce((sum,x)=>sum+number(x.quantity,'item_count'),0);
}
function awardStack(s:GameStateV83,id:'gem_dust'|'tempering_dust',
 quantity:number):{custody:'inventory'|'bank';before:number;after:number}{
 const itemId=id==='gem_dust'?'GEM_DUST':'TEMPERING_DUST';
 for(const custody of ['inventory','bank'] as const){
  const bag=s[custody];
  const matches=bag.stacks.filter(x=>x.itemId===itemId);
  if(matches.length>1)throw Error('world_boss_v83_ambiguous_material_stacks');
  const stack=matches[0];
  if(stack){
   const before=number(stack.quantity,'stack_quantity');
   const after=before+quantity;
   if(!Number.isSafeInteger(after)||after>2147483647)
    throw Error('world_boss_v83_material_overflow');
   stack.quantity=after;return {custody,before,after};
  }
 }
 for(const custody of ['inventory','bank'] as const){
  const bag=s[custody];
  if(bag.stacks.length>=bag.capacity)continue;
  bag.stacks.push({itemId,quantity});
  return {custody,before:0,after:quantity};
 }
 // Never use expiring overflow for earned, persistent boss rewards.
 throw Error('world_boss_v83_inventory_and_bank_full');
}
function immutableReceiptNoGear(receipt:FrozenChestReceiptV69){
 checkedReceipt(receipt);
 if(receipt.drops.length!==0||
  receipt.equipmentDeliveryMode!==null||
  receipt.recipientCharacterId!==null||
  receipt.groups[0]?.entryId!==null||
  receipt.groups[0]?.quantity!==0)
  throw Error('world_boss_v83_equipment_issuer_not_ready');
}
function gate(qa:boolean):void{
 if(!qa||WORLD_BOSS_REAL_REWARDS_V83_RELEASED||
  process.env.NODE_ENV==='production')
  throw Error('world_boss_v83_unreleased');
}
export function createWorldBossRealRewardPortsV83(qaEnabled=false):
 Pick<ChestPhysicalPortsV70,'creditGuaranteed'|'grantDrop'|'grantInbox'|'verifyPhysical'>{
 return {
  async creditGuaranteed(tx,receipt,index):Promise<ChestPhysicalGrantV70>{
   gate(qaEnabled);immutableReceiptNoGear(receipt);
   if(!Number.isInteger(index)||index<0||index>=4)
    throw Error('world_boss_v83_invalid_ordinal');
   const reward=receipt.guaranteed[index]!;
   const {characterId,game}=await lockedGame(tx,receipt.accountId);
   let before:number,after:number,custody:Custody;
   if(reward.id==='gold'){
    const rows=(await tx.query<WalletRow>(readWalletSql,[characterId])).rows;
    if(rows.length!==1)throw Error('world_boss_v83_wallet_missing');
    before=number(rows[0]!.gold,'wallet_gold');
    // The canonical Gold wallet and its mirrored active-character state
    // must agree BEFORE the first credit. Otherwise paying a chest would
    // conceal an existing stale/misbound state and overwrite visible Gold.
    // Abort the entire V70 transaction; never attempt silent reconciliation.
    if(number(game.character.gold,'character_gold')!==before)
     throw Error('world_boss_v83_wallet_state_mismatch');
    after=before+reward.quantity;
    if(!Number.isSafeInteger(after)||after>Number.MAX_SAFE_INTEGER)
     throw Error('world_boss_v83_gold_overflow');
    const updated=(await tx.query<WalletRow>(
     'UPDATE public.character_wallets SET gold=$2::bigint,updated_at=now() '+
     'WHERE character_id=$1::uuid AND gold=$3::bigint RETURNING gold::text AS gold',
     [characterId,String(after),String(before)])).rows;
    if(updated.length!==1||number(updated[0]!.gold,'gold_update')!==after)
     throw Error('world_boss_v83_wallet_cas_failed');
    game.character.gold=after;custody='character_wallet';
   }else if(reward.id==='companion_essence'){
    before=rewardBalance(game,'companion_essence');
    after=before+reward.quantity;
    if(!Number.isSafeInteger(after)||after>2147483647)
     throw Error('world_boss_v83_essence_overflow');
    game.account.companionEssence=after;custody='account_state';
   }else if(reward.id==='gem_dust'||reward.id==='tempering_dust'){
    const item=awardStack(game,reward.id,reward.quantity);
    before=item.before;after=item.after;custody=item.custody;
   }else throw Error('world_boss_v83_unknown_resource');
   const update=(await tx.query<{revision:number}>(
    'UPDATE public.online_game_states SET state=$2::jsonb,'+
    'revision=revision+1,updated_at=now() WHERE account_id=$1::uuid '+
    'RETURNING revision',
    [receipt.accountId,JSON.stringify(game)])).rows;
   if(update.length!==1)
    throw Error('world_boss_v83_game_state_write_missing');
   const audits=(await tx.query<{id:string}>(
    'INSERT INTO private.world_boss_chest_resource_grants_v83 '+
    '(source_key,account_id,character_id,ordinal,reward_id,quantity,'+
    'balance_before,balance_after,custody) '+
    'VALUES($1,$2::uuid,$3::uuid,$4,$5,$6,$7::bigint,$8::bigint,$9) '+
    'RETURNING id::text AS id',
    [receipt.sourceKey,receipt.accountId,characterId,index,reward.id,
     reward.quantity,String(before),String(after),custody])).rows;
   if(audits.length!==1||!UUID.test(audits[0]!.id))
    throw Error('world_boss_v83_missing_resource_receipt');
   return {grantId:'wb83:'+audits[0]!.id,itemInstanceId:null};
  },
  async grantDrop():Promise<ChestPhysicalGrantV70>{
   gate(qaEnabled);
   throw Error('world_boss_v83_equipment_issuer_not_ready');
  },
  async grantInbox(tx,receipt):Promise<ChestPhysicalGrantV70>{
   gate(qaEnabled);immutableReceiptNoGear(receipt);
   const {eventId}=checkedReceipt(receipt);
   const rows=(await tx.query<{id:string}>(
    'INSERT INTO private.reward_inbox_v1 '+
    '(account_id,source_key,source_kind,source_id,title,body,'+
    'attachments,claimed_at) '+
    "VALUES($1::uuid,$2,'gift',$3::uuid,$4,$5,'[]'::jsonb,now()) "+
    'RETURNING id::text AS id',
    [receipt.accountId,receipt.sourceKey,eventId,TITLE,BODY])).rows;
   if(rows.length!==1||!UUID.test(rows[0]!.id))
    throw Error('world_boss_v83_inbox_missing');
   return {grantId:'inbox:'+rows[0]!.id,itemInstanceId:null};
  },
  async verifyPhysical(tx,receipt,legs:readonly ChestLedgerLegV70[],
   phase:'fresh'|'replay'){
   gate(qaEnabled);immutableReceiptNoGear(receipt);
   if(phase!=='fresh'&&phase!=='replay')
    throw Error('world_boss_v83_untrusted_verify_phase');
   const {eventId}=checkedReceipt(receipt);
   if(legs.length!==5||legs.some(x=>x.sourceKey!==receipt.sourceKey||
    x.accountId!==receipt.accountId||x.itemInstanceId!==null))
    return false;
   const audit=(await tx.query<AuditRow>(readAuditSql,
    [receipt.sourceKey,receipt.accountId])).rows;
   const inbox=(await tx.query<InboxRow>(readInboxSql,
    [receipt.sourceKey,receipt.accountId])).rows;
   if(audit.length!==4||inbox.length!==1)return false;
   const ib=inbox[0]!;
   let attachments=ib.attachments;
   if(typeof attachments==='string'){
    try{attachments=JSON.parse(attachments)}catch{return false}
   }
   if(!UUID.test(ib.id)||ib.account_id!==receipt.accountId||
    ib.source_key!==receipt.sourceKey||ib.source_id!==eventId||
    ib.source_kind!=='gift'||ib.title!==TITLE||ib.body!==BODY||
    !Array.isArray(attachments)||attachments.length!==0||
    ib.claimed_at===null||
    !legs.some(x=>x.kind==='inbox'&&x.ordinal===0&&
     x.grantId==='inbox:'+ib.id))return false;
   // A paid chest is historical: Gold, materials and the active character
   // can change after the original commit. Only a FRESH claim compares
   // physical balances. A REPLAY checks the immutable audit+receipt legs and
   // zero-attachment historical Inbox, never mutable current balances.
   const rows=phase==='fresh'?
    (await tx.query<GameRow>(readGameSql,[receipt.accountId])).rows:[];
   if(phase==='fresh'&&rows.length!==1)return false;
   const s=phase==='fresh'?state(rows[0]!.state):null;
   const creditedCharacter=audit[0]?.character_id;
   if(!creditedCharacter||!UUID.test(creditedCharacter)||
    creditedCharacter===receipt.accountId)return false;
   for(let i=0;i<4;i++){
    const a=audit[i]!,g=receipt.guaranteed[i]!;
    const before=number(a.balance_before,'audit_before');
    const after=number(a.balance_after,'audit_after');
    if(a.account_id!==receipt.accountId||
     a.source_key!==receipt.sourceKey||a.character_id!==creditedCharacter||
     (phase==='fresh'&&a.character_id!==rows[0]!.character_id)||
     Number(a.ordinal)!==i||a.reward_id!==g.id||
     Number(a.quantity)!==g.quantity||after-before!==g.quantity||
     !legs.some(x=>x.kind==='guarantee'&&x.ordinal===i&&
      x.rewardId===g.id&&x.quantity===g.quantity&&
      x.grantId==='wb83:'+a.id))
     return false;
    if(g.id==='gold'&&a.custody!=='character_wallet')return false;
    if(g.id==='companion_essence'&&a.custody!=='account_state')
     return false;
    if((g.id==='gem_dust'||g.id==='tempering_dust')&&
     a.custody!=='inventory'&&a.custody!=='bank')return false;
    if(phase==='replay')continue;
    if(!s)return false;
    let current:number;
    if(g.id==='gold'){
     const wallet=(await tx.query<WalletRow>(readWalletSql,
      [creditedCharacter])).rows;
     if(wallet.length!==1)return false;
     current=number(wallet[0]!.gold,'verify_gold');
     if(number(s.character.gold,'verify_character_gold')!==current)
      return false;
    }else if(g.id==='companion_essence'){
     current=rewardBalance(s,'companion_essence');
    }else if(g.id==='gem_dust'||g.id==='tempering_dust'){
     current=rewardBalance(s,g.id,a.custody);
    }else return false;
    if(current!==after)return false;
   }
   return true;
  },
 };
}
