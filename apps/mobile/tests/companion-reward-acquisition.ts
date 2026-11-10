import {createCharacter,newGame} from '../src/core/game';
import {claimEventReward,eventRewardOwned,purchaseEventOffer} from '../src/core/live-events';
import {VEILBREAK_EVENT} from '../src/content/veilbreak-event';
import {RELEASED_EVENT_COMPANIONS} from '../src/content/event-companions-active';
import {GUILD_COMBAT_COMPANIONS} from '../src/content/guild-companions-v1';
import {GUILD_SHOP_CATALOGUE} from '../../../packages/guild-shop/src/catalogue';
import {combatCompanionDef} from '../src/content/combat-companions';
import {createSaveBackup,parseSaveBackup} from '../src/core/save-transfer';
import type {GameState} from '../src/core/types';
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const assert=(ok:unknown,message:string)=>{if(!ok)throw new Error(message)};
const now=Date.UTC(2026,9,18,12),eventId=VEILBREAK_EVENT.id;
const starter=createCharacter(newGame(now),'IRONWARDEN','Companion Rewards');
const original:GameState={...starter,account:{...starter.account,
  liveEvent:{enabled:true,eventId,startsAtMs:now-86400000,endsAtMs:now+86400000,graceEndsAtMs:now+2*86400000},
  eventProgressById:{[eventId]:22000},eventCurrencyBalanceById:{[eventId]:20000},
}};
const veilbreakIds=['EVT_UNIT_007','EVT_UNIT_008','EVT_UNIT_011'];
assert(JSON.stringify(RELEASED_EVENT_COMPANIONS.map(c=>c.id).sort())===JSON.stringify([...veilbreakIds].sort()),'Only the released Veilbreak trio is in the live roster');
for(const id of veilbreakIds)assert(!!combatCompanionDef(id),'Every released event reward must resolve to a playable companion');
let state=original;
for(const id of ['EVT_UNIT_008','EVT_UNIT_007']){
  const reward=VEILBREAK_EVENT.milestones(state.character!.classId).find(m=>m.reward.id===id)?.reward;
  assert(reward?.kind==='companion','The earned Veilbreak milestone is an actual companion reward: '+id);
  state=claimEventReward(state,id,now);
  assert(state.account.unlockedCombatCompanionIds?.includes(id),'Event milestone grants account-wide companion: '+id);
  assert(state.account.combatCompanionProgress?.[id]?.level===1,'Event milestone grants training progress: '+id);
  assert(state.account.combatCompanionProgress?.[id]?.bondLevel===1,'Event milestone grants Bond 1: '+id);
  assert(eventRewardOwned(state,reward!),'Event milestone appears owned after claim: '+id);
  let repeated=false;try{claimEventReward(state,id,now);}catch{repeated=true;}
  assert(repeated,'Event milestone cannot be claimed twice: '+id);
}
const shop=VEILBREAK_EVENT.shop.find(o=>o.reward.id==='EVT_UNIT_011');
assert(shop?.reward.kind==='companion','Lantern Keeper is offered as the Veilbreak shop companion');
const balance=state.account.eventCurrencyBalanceById?.[eventId]??0;
state=purchaseEventOffer(state,shop!.id,now);
assert(state.account.unlockedCombatCompanionIds?.includes('EVT_UNIT_011'),'Event shop grants Lantern Keeper');
assert(state.account.combatCompanionProgress?.EVT_UNIT_011?.bondLevel===1,'Event shop companion starts Bond 1');
assert((state.account.eventCurrencyBalanceById?.[eventId]??0)===balance-shop!.cost,'Event currency charged only once');
let repeatedShop=false;try{purchaseEventOffer(state,shop!.id,now);}catch{repeatedShop=true;}
assert(repeatedShop,'Companion shop purchase limit prevents duplicate charging');
const restored=parseSaveBackup(createSaveBackup(state));
for(const id of veilbreakIds){
 assert(restored.account.unlockedCombatCompanionIds?.includes(id),'Event companion survives backup and restore: '+id);
 assert(restored.account.combatCompanionProgress?.[id]?.level===1,'Event companion progress survives restore: '+id);
}
const catalogue=GUILD_SHOP_CATALOGUE.filter(item=>item.category==='companion').sort((a,b)=>a.guildLevel-b.guildLevel);
assert(catalogue.length===3&&GUILD_COMBAT_COMPANIONS.length===3,'Guild catalogue and actual companion roster have three entries');
const mapping=[['guild_companion_01','GUILD_UNIT_001',10,6000],['guild_companion_02','GUILD_UNIT_002',15,8000],['guild_companion_03','GUILD_UNIT_003',20,10000]] as const;
const mappingMigration=fs.readFileSync('../../backend/supabase/migrations/20261018091400_guild_shop_atomic_entitlements.sql','utf8');
const purchaseMigration=fs.readFileSync('../../backend/supabase/migrations/20261110115100_guild_companion_bond_initialization.sql','utf8');
const releaseMigration=fs.readFileSync('../../backend/supabase/migrations/20261103000002_guild_token_shop_release_v1.sql','utf8');
for(const [itemId,companionId,level,cost] of mapping){
  const offer=catalogue.find(item=>item.id===itemId);
  assert(offer?.guildLevel===level&&offer?.tokenCost===cost,'Guild shop price and level consistent: '+itemId);
  assert(GUILD_COMBAT_COMPANIONS.some(c=>c.id===companionId),'Guild shop reward points to a real companion: '+companionId);
  assert(mappingMigration.includes("when '"+itemId+"' then '"+companionId+"'")||(itemId==='guild_companion_03'&&mappingMigration.includes("else 'GUILD_UNIT_003'")),'SQL resolves Guild reward to the intended companion: '+itemId);
  assert(releaseMigration.includes("'"+itemId+"'"),'Guild companion offer has a released server catalogue entry: '+itemId);
}
assert(purchaseMigration.includes("create or replace function public.guild_shop_purchase_server_v4"),'Guild purchase still uses atomic server-owned function');
assert(purchaseMigration.includes("'bondLevel',1,'bondXp',0"),'All newly purchased Guild companions must start Bond 1');
assert(purchaseMigration.includes("'combatCompanionProgress'"),'Guild purchase stores real companion progression');
assert(purchaseMigration.includes("to service_role"),'Guild purchase remains service-only');
assert(purchaseMigration.includes("v_balance<v_cost")&&purchaseMigration.includes("insert into public.guild_shop_owned"),'Guild purchase preserves wallet and ownership checks');
console.log('PASS: Veilbreak companion milestone/shop ownership, restore and Guild reward mapping plus Bond 1 contract');
