/** Guild PvE V15 hidden/nonpaying projection tests; synthetic ledgers only. */
import {assert} from './test-assert';
import {makeGuildPveReferenceV7} from '../../../backend/src/server/combat/guild-pve-broken-forge-v7';
import {GUILD_PVE_V8_MANIFEST} from '../../../backend/src/server/combat/guild-pve-shared-v8';
import {makeGuildPveV9Run,type GuildPveV9StoreState,type GuildPveV9Receipt}
 from '../../../backend/src/server/combat/guild-pve-transaction-v9';
import {projectGuildPveV15Campaign} from
 '../../../backend/src/server/combat/guild-pve-progress-v15';

const CYCLE='GX_V15_CYCLE',GUILD='GX_V15_GUILD';
const ACCOUNT_A='GX_V15_ACC_A',ACCOUNT_B='GX_V15_ACC_B';
const START=Date.UTC(2026,10,16),DAY=86400000;
const run=makeGuildPveV9Run({
 cycleId:CYCLE,guildId:GUILD,startMs:START,difficulty:'Scout',
 accountIds:[ACCOUNT_A,ACCOUNT_B],
 reference:makeGuildPveReferenceV7('T2',{
  attack:1000,defense:650,maxHp:4500,
 }),
});
const state:GuildPveV9StoreState={
 guildRuns:{[JSON.stringify([CYCLE,GUILD])]:run},
 cycleBindings:{},receipts:{},
};
const preview=(nowUtcMs=START+DAY)=>projectGuildPveV15Campaign({
 state,cycleId:CYCLE,guildId:GUILD,nowUtcMs,
});
function rejects(fn:()=>unknown,part:string){
 let error='';try{fn()}catch(e){error=String(e)}
 assert.ok(error.includes(part),'Expected '+part+', got '+error);
}
function runTests(){
 const initial=preview();
 assert.equal(initial.stage,'active');
 assert.equal(initial.requiredCleared,0);
 assert.equal(initial.requiredTotal,7);
 assert.equal(initial.nodes.length,7);
 assert.equal(initial.frozenAccounts,2);
 assert.equal(initial.participatingAccounts,0);
 assert.equal(initial.progressPercent,0);
 assert.equal(initial.canClaim,false);
 assert.equal(initial.proposedTokenAmount,null);
 assert.equal(initial.rewardGranted,false);
 assert.equal(preview(START-1).stage,'scheduled');
 assert.equal(preview(START+14*DAY).stage,'closed');
 assert.equal(initial.nodes[0].state,'available');
 assert.equal(initial.nodes[1].state,'locked');
 assert.ok(initial.nodes.every(n=>n.maxHp>0&&n.remainingHp===n.maxHp));
 // One test-only exploration; no real engine damage and no wallet action.
 run.nodes['C1-02'].cleared=true;
 run.revision++;
 run.members[ACCOUNT_A].ordersSpent=1;
 state.cycleBindings[JSON.stringify([CYCLE,ACCOUNT_A])]=GUILD;
 const receipt:GuildPveV9Receipt={
  cycleId:CYCLE,guildId:GUILD,accountId:ACCOUNT_A,
  characterId:'GX_V15_CHAR_A',requestId:'GX_V15_REQ_A',
  nodeId:'C1-02',kind:'exploration',status:'committed',
  costSeals:0,costOrders:1,beforeHp:0,afterHp:0,creditedHp:0,
  beforePressure:0,afterPressure:0,phaseTransitions:[],
  guildRevision:run.revision,combat:null,
  rewardMinted:false,inventorySpent:false,databasePersisted:false,
 };
 const key=JSON.stringify([CYCLE,ACCOUNT_A,receipt.requestId]);
 state.receipts[key]={fingerprint:'a'.repeat(64),value:receipt};
 assert.equal(preview().participatingAccounts,1);
 assert.equal(preview().spentExplorationOrders,1);
 assert.equal(preview().spentAssaultSeals,0);
 assert.equal(preview().canClaim,false);
 run.members[ACCOUNT_A].ordersSpent=2;
 rejects(()=>preview(),'allowance_receipt_mismatch');
 run.members[ACCOUNT_A].ordersSpent=1;
 // One allowed Seal/Order belongs to an ACCOUNT, not each character.
 state.receipts[key].value.costOrders=0;
 rejects(()=>preview(),'invalid_paid_action');
 state.receipts[key].value.costOrders=1;
 // Shared HP moves progress; only zero remaining HP marks completion.
 const patrol=run.nodes['C1-04'];
 const half=patrol.maxHp/2;
 patrol.hp=half;
 assert.equal(preview().nodes[0].state,'in_progress');
 assert.ok(preview().progressPercent>0);
 patrol.hp=-1;
 rejects(()=>preview(),'invalid_node_health');
 patrol.hp=half;
 patrol.cleared=true;
 rejects(()=>preview(),'invalid_node_health');
 patrol.cleared=false;
 // Completing mandatory bosses never makes a payout claim by itself.
 for(const n of GUILD_PVE_V8_MANIFEST.filter(x=>x.required&&x.boss)){
  run.nodes[n.id].hp=0;run.nodes[n.id].cleared=true;
 }
 const completed=preview();
 assert.equal(completed.stage,'completed');
 assert.equal(completed.progressPercent,100);
 assert.equal(completed.requiredCleared,7);
 assert.equal(completed.canClaim,false);
 assert.equal(completed.finalizationVerified,false);
 assert.equal(completed.proposedTokenAmount,null);
 assert.equal(completed.participatingAccounts,1);
 assert.equal(preview(START+15*DAY).stage,'completed');
 // A second guild in the same cycle cannot claim this account's activity.
 state.cycleBindings[JSON.stringify([CYCLE,ACCOUNT_A])]='GX_OTHER_GUILD';
 rejects(()=>preview(),'other_guild_binding');
 state.cycleBindings[JSON.stringify([CYCLE,ACCOUNT_A])]=GUILD;
 // Only entries in the frozen roster may be bound to this guild.
 state.cycleBindings[JSON.stringify([CYCLE,'GX_UNKNOWN_ACC'])]=GUILD;
 rejects(()=>preview(),'unrostered_binding');
 delete state.cycleBindings[JSON.stringify([CYCLE,'GX_UNKNOWN_ACC'])];
 // A forged guild receipt for someone outside the frozen roster is rejected
 // even if there was no matching cycle binding record.
 const foreign={...receipt,accountId:'GX_UNKNOWN_ACC',requestId:'GX_FOREIGN_REQ'};
 const foreignKey=JSON.stringify([CYCLE,foreign.accountId,foreign.requestId]);
 state.receipts[foreignKey]={fingerprint:'b'.repeat(64),value:foreign};
 rejects(()=>preview(),'unrostered_receipt');
 delete state.receipts[foreignKey];
 rejects(()=>projectGuildPveV15Campaign({
  state,cycleId:CYCLE,guildId:'INVALID_GUILD',nowUtcMs:START,
 }), 'unknown_run');
 assert.equal(preview().rewardGranted,false);
 console.log('Guild PvE V15: hidden campaign projection, claims, replay guard and membership QA passed');
}
runTests();
