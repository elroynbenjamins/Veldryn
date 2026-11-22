/**
 * Guild Expeditions V15 — HIDDEN, read-only guild campaign progress preview.
 *
 * Input MUST originate from a server-owned, committed V9-format ledger.
 * This module neither authenticates callers nor reads a database. It NEVER
 * authorizes claims or grants wallet, guild XP, items, or achievements.
 * It must not be mounted on a live route or included in public state yet.
 */
import {GUILD_PVE_V8_MANIFEST} from './guild-pve-shared-v8';
import {proveGuildPveV14Candidate} from './guild-pve-reward-proof-v14';
import type {GuildPveV9StoreState} from './guild-pve-transaction-v9';

export const GUILD_PVE_V15_LIVE=false as const;
const DAY_MS=86_400_000;
const idOk=(value:unknown):value is string=>
 typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9:_-]{1,99}$/.test(value);
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const percentage=(n:number)=>Math.round(n*1000)/10;
const required=GUILD_PVE_V8_MANIFEST.filter(n=>n.required&&n.boss);
const nodeIds=GUILD_PVE_V8_MANIFEST.map(n=>n.id);

export interface GuildPveV15NodeProgress {
 id:string;name:string;
 maxHp:number;remainingHp:number;progressPercent:number;
 state:'locked'|'available'|'in_progress'|'cleared';
}
export interface GuildPveV15Snapshot {
 cycleId:string;guildId:string;
 /** No individual identifiers are exposed in the projection. */
 difficulty:'Scout'|'Veteran'|'Mythic';
 stage:'scheduled'|'active'|'completed'|'closed';
 startUtcMs:number;endUtcMs:number;revision:number;
 frozenAccounts:number;participatingAccounts:number;
 spentAssaultSeals:number;spentExplorationOrders:number;
 sharedPressure:number;requiredCleared:number;requiredTotal:7;
 requiredHpRemoved:number;requiredHpTotal:number;progressPercent:number;
 nodes:GuildPveV15NodeProgress[];
 /** Nothing here may be interpreted as an entitlement or payout. */
 finalizationVerified:false;canClaim:false;rewardGranted:false;
 proposedTokenAmount:null;
}
function reject(why:string):never{throw Error('guild_pve_v15_'+why);}
const validSpend=(value:unknown,max:number)=>
 Number.isSafeInteger(value)&&typeof value==='number'&&value>=0&&value<=max;

/**
 * This is a presentation projection, not the source of truth for combat,
 * eligibility, membership or rewards. The clock MUST come from the server.
 */
export function projectGuildPveV15Campaign(input:{
 state:GuildPveV9StoreState;cycleId:string;guildId:string;nowUtcMs:number;
}):GuildPveV15Snapshot {
 const {state,cycleId,guildId,nowUtcMs}=input;
 if(!idOk(cycleId)||!idOk(guildId)||!Number.isSafeInteger(nowUtcMs)||nowUtcMs<0)
  reject('invalid_input');
 const run=state.guildRuns[JSON.stringify([cycleId,guildId])];
 if(!run||run.cycleId!==cycleId||run.guildId!==guildId)
  reject('unknown_run');
 if(!Number.isSafeInteger(run.startMs)||run.startMs<=0||
  run.endMs!==run.startMs+14*DAY_MS||
  !Number.isSafeInteger(run.revision)||run.revision<0||
  !finite(run.pressure)||run.pressure<0||run.pressure>100||
  !['Scout','Veteran','Mythic'].includes(run.difficulty))
  reject('invalid_run_state');
 const accounts=Object.keys(run.members);
 if(!accounts.length||accounts.some(x=>!idOk(x))||
  Object.keys(run.nodes).length!==nodeIds.length||
  nodeIds.some(id=>!Object.hasOwn(run.nodes,id)))
  reject('invalid_roster_or_nodes');
 // Reject guild-bound ledger entries from accounts that were never in the
 // frozen roster, including zero-cost stale attempts. They must not silently
 // disappear from the aggregate while remaining in the authoritative ledger.
 for(const entry of Object.values(state.receipts)){
  const receipt=entry.value;
  if(receipt.cycleId===cycleId&&receipt.guildId===guildId&&
   !Object.hasOwn(run.members,receipt.accountId))
   reject('unrostered_receipt');
 }
 let seals=0,orders=0,participating=0;
 for(const accountId of accounts){
  const member=run.members[accountId];
  if(!member||!validSpend(member.sealsSpent,8)||!validSpend(member.ordersSpent,6))
   reject('invalid_allowance');
  // V14 re-checks all immutable receipt keys, ownership, and contribution
  // evidence, even when this participant has no claimed reward.
  const proof=proveGuildPveV14Candidate({
   state,cycleId,guildId,principalAccountId:accountId,
  });
  if(proof.committedActions>0)participating++;
  let committedSeals=0,committedOrders=0;
  for(const entry of Object.values(state.receipts)){
   const receipt=entry.value;
   if(receipt.cycleId!==cycleId||receipt.guildId!==guildId||
    receipt.accountId!==accountId||receipt.status!=='committed')continue;
   committedSeals+=receipt.costSeals;
   committedOrders+=receipt.costOrders;
  }
  if(committedSeals!==member.sealsSpent||committedOrders!==member.ordersSpent)
   reject('allowance_receipt_mismatch');
  seals+=member.sealsSpent;
  orders+=member.ordersSpent;
 }
 for(const [accountId,guildBinding] of Object.entries(state.cycleBindings)){
  let key:unknown;
  try{key=JSON.parse(accountId)}catch{reject('invalid_binding_key');}
  if(!Array.isArray(key)||key.length!==2)reject('invalid_binding_key');
  if(key[0]===cycleId&&guildBinding===guildId&&!Object.hasOwn(run.members,key[1]))
   reject('unrostered_binding');
 }
 let requiredHpTotal=0,remaining=0,cleared=0;
 const nodes=required.map(def=>{
  const node=run.nodes[def.id];
  if(!node||!finite(node.maxHp)||node.maxHp<=0||
   !finite(node.hp)||node.hp<0||node.hp>node.maxHp||
   node.cleared!==(node.hp===0))
   reject('invalid_node_health');
  requiredHpTotal+=node.maxHp;
  remaining+=node.hp;
  if(node.cleared)cleared++;
  const accessible=def.all.every(id=>run.nodes[id]?.cleared===true)&&
   (!def.any||def.any.some(id=>run.nodes[id]?.cleared===true));
  const progressPercent=percentage((node.maxHp-node.hp)/node.maxHp);
  const state:GuildPveV15NodeProgress['state']=node.cleared?'cleared':
   !accessible?'locked':node.hp<node.maxHp?'in_progress':'available';
  return {id:def.id,name:def.name,maxHp:node.maxHp,
   remainingHp:node.hp,progressPercent,state};
 });
 if(requiredHpTotal<=0)reject('empty_combat_budget');
 const complete=cleared===required.length;
 const stage:GuildPveV15Snapshot['stage']=complete?'completed':
  nowUtcMs<run.startMs?'scheduled':nowUtcMs>=run.endMs?'closed':'active';
 return {
  cycleId,guildId,difficulty:run.difficulty,stage,
  startUtcMs:run.startMs,endUtcMs:run.endMs,revision:run.revision,
  frozenAccounts:accounts.length,participatingAccounts:participating,
  spentAssaultSeals:seals,spentExplorationOrders:orders,
  sharedPressure:run.pressure,requiredCleared:cleared,
  requiredTotal:7,requiredHpRemoved:Math.round((requiredHpTotal-remaining)*100)/100,
  requiredHpTotal:Math.round(requiredHpTotal*100)/100,
  progressPercent:percentage((requiredHpTotal-remaining)/requiredHpTotal),
  nodes,
  finalizationVerified:false,canClaim:false,rewardGranted:false,
  proposedTokenAmount:null,
 };
}
