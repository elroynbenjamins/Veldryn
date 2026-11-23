import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GUILD_TREE_DEVELOPMENT_GATES, guildTreeDevelopmentCost } from './progression';
import {
 GUILD_V2_RESOURCE_SINK_CONTRACT,GUILD_V2_RESOURCE_SINK_RELEASE_ENABLED,
 GuildV2SinkReviewError,guildV2AllocateBasketQuotas,
 guildV2MakeCostPreview,guildV2ReviewDonation,
 type GuildV2SinkPolicy,type GuildV2FrozenCostPreview,
 type GuildV2AuthenticatedReviewState,type GuildV2DonationPreviewRequest,
} from './guild-v2-resource-sink-plan';

const policy = JSON.parse(readFileSync(resolve(__dirname,
 '../../../../docs/2-0/resource-sinks-equipment-guild-v1.json'),'utf8')) as GuildV2SinkPolicy;
const rejects=(fn:()=>unknown,code:string)=>{
 assert.throws(fn,(error:unknown)=>error instanceof GuildV2SinkReviewError && error.code===code,code);
};
const start=1_795_430_000_000;
function preview(key='guild.tree.professions.tier2',members=10,kind:'development'|'weekly_supply'='development'){
 return guildV2MakeCostPreview({
  policy,kind,definitionKey:key,guildId:'guild-1',projectInstanceId:'project-1',
  policyVersion:'review-policy-1',guildLevel:10,activeMembers:members,
  startsAtMs:start,endsAtMs:start+7*86_400_000,
 });
}
function state(p:GuildV2FrozenCostPreview):GuildV2AuthenticatedReviewState{
 return {
  accountId:'account-1',authenticatedCharacterId:'character-1',guildId:p.guildId,
  memberOfGuild:true,projectId:p.projectInstanceId,policyVersion:p.policyVersion,
  revision:11,status:'active',nowMs:start+120_000,
  inventory:{GREENWOOD_LOG:1200,IRONWOOD_LOG:10},bank:{GREENWOOD_LOG:2000},
  walletGold:200000,
  progress:{},goldContributed:0,
 };
}
function request(p:GuildV2FrozenCostPreview):GuildV2DonationPreviewRequest{
 return {
  accountId:'account-1',characterId:'character-1',guildId:p.guildId,
  projectInstanceId:p.projectInstanceId,policyVersion:p.policyVersion,
  expectedRevision:11,idempotencyKey:'unique-req-001',
  resourceKind:'item',resourceId:'GREENWOOD_LOG',amount:1400,
 };
}

assert.equal(GUILD_V2_RESOURCE_SINK_RELEASE_ENABLED,false);
assert.equal(GUILD_V2_RESOURCE_SINK_CONTRACT,'guild-v2-resource-sinks-review-v1');
assert.equal(policy.guildDevelopmentGates.length,6);
assert.equal(policy.weeklySupplyCandidates.length,3);
let totalWoodAtTen=0;
for(const def of policy.guildDevelopmentGates){
 const key=def.unlockKey!;
 const gate=GUILD_TREE_DEVELOPMENT_GATES.find(x=>x.unlockKey===key)!;
 assert(gate);
 for(const members of [2,10,20]){
  const p=preview(key,members);
  const actual=guildTreeDevelopmentCost(gate,members);
  assert.equal(p.goldTarget,actual.gold);
  assert.equal(p.weightedTarget,actual.weightedResources);
  assert.equal(p.baskets.reduce((s,b)=>s+b.target,0),p.weightedTarget);
  assert.equal(p.activeMembersSnapshot,members);
  assert.equal(p.canActivate,false);
  assert.equal(p.reviewOnly,true);
  assert(Object.isFrozen(p)&&Object.isFrozen(p.baskets)&&
    p.baskets.every(b=>Object.isFrozen(b)&&Object.isFrozen(b.options)));
  assert.equal(p.baskets.length,def.baskets.length);
  assert(p.baskets.every(b=>b.options.some(o=>o.registration==='existing_inventory_identity')));
 }
 const ten=preview(key,10);
 totalWoodAtTen+=ten.baskets.find(b=>b.id==='timber')!.target;
}
assert.equal(totalWoodAtTen,18650);
for(const def of policy.weeklySupplyCandidates){
 const p=preview(def.id!,10,'weekly_supply');
 assert.equal(p.goldTarget,0);
 assert.equal(p.weightedTarget,def.weightedBase+10*def.weightedPerMember);
 assert.equal(p.baskets.reduce((s,b)=>s+b.target,0),p.weightedTarget);
}
const p=preview();
assert.equal(p.goldTarget,150000);
assert.equal(p.weightedTarget,9000);
assert.equal(p.baskets.find(b=>b.id==='timber')!.target,2700);
assert.deepEqual(guildV2AllocateBasketQuotas(17,[
 {id:'x',shareBps:3300,options:[]},{id:'y',shareBps:3300,options:[]},
 {id:'z',shareBps:3400,options:[]},
]),[6,5,6]);

const req=request(p),s=state(p);
const plan=guildV2ReviewDonation({snapshot:p,state:s,request:req});
assert.equal(plan.canPersist,false);
assert.equal(plan.requiresAuthenticatedAtomicDbAdapter,true);
assert.equal(plan.replay,false);
assert.equal(plan.basketId,'timber');
assert.equal(plan.creditUnits,1400);
assert.deepEqual(plan.debit,{fromInventory:1200,fromBank:200,fromGold:0});
assert.equal(s.inventory.GREENWOOD_LOG,1200,'preview must not debit anything');
assert.equal(s.bank.GREENWOOD_LOG,2000,'preview must not debit shared bank');
assert.equal(s.revision,11,'preview must not mutate project revision');
const prior={idempotencyKey:req.idempotencyKey,fingerprint:plan.fingerprint,
 debitAmount:1400,creditedUnits:1400};
const replay=guildV2ReviewDonation({snapshot:p,request:req,
 state:{...s,status:'completed',revision:12,previousReceipt:prior}});
assert.equal(replay.replay,true);
assert.deepEqual(replay.debit,{fromInventory:0,fromBank:0,fromGold:0});

function failRequest(partial:Partial<GuildV2DonationPreviewRequest>,
 expected:string,modified:Partial<GuildV2AuthenticatedReviewState>={}){
 rejects(()=>guildV2ReviewDonation({
  snapshot:p,request:{...req,...partial},state:{...s,...modified},
 }),expected);
}
failRequest({characterId:'character-2'},'guild_account_character_or_policy_mismatch');
failRequest({guildId:'guild-2'},'guild_account_character_or_policy_mismatch');
failRequest({policyVersion:'stale'},'guild_account_character_or_policy_mismatch');
failRequest({expectedRevision:10},'stale_project_revision');
failRequest({amount:0},'invalid_donation_request');
failRequest({amount:0.5},'invalid_donation_request');
failRequest({amount:-2},'invalid_donation_request');
failRequest({amount:99999999999999999},'invalid_donation_request');
failRequest({idempotencyKey:'short'},'invalid_donation_request');
failRequest({resourceId:'NEVER_AVAILABLE'},'item_not_required');
failRequest({amount:2701},'donation_exceeds_remaining_quota');
failRequest({amount:100},'donation_exceeds_remaining_quota',{progress:{timber:2650}});
failRequest({amount:100},'insufficient_materials',{inventory:{GREENWOOD_LOG:0},bank:{GREENWOOD_LOG:99}});
failRequest({amount:100},'invalid_material_balance',{inventory:{GREENWOOD_LOG:-1}});
failRequest({amount:100},'invalid_material_balance',{bank:{GREENWOOD_LOG:1.5}});
failRequest({amount:10},'corrupt_project_progress',{progress:{timber:999999}});
failRequest({amount:100},'project_not_active',{status:'expired'});
failRequest({amount:100},'project_not_active',{nowMs:p.endsAtMs});
failRequest({amount:100},'guild_account_character_or_policy_mismatch',{memberOfGuild:false});
failRequest({amount:100},'idempotency_key_payload_conflict',
 {previousReceipt:{...prior,fingerprint:'other-request'}});
const shield=p.baskets.find(b=>b.id==='timber')!.options.find(x=>x.registration==='unregistered_eq2_output')!;
failRequest({amount:1,resourceId:shield.itemId},'unregistered_item_not_donatable',
 {inventory:{[shield.itemId]:100},bank:{}});
const iron=guildV2ReviewDonation({snapshot:p,state:s,
 request:{...req,resourceId:'IRONWOOD_LOG',amount:10}});
assert.equal(iron.creditUnits,20);
assert.deepEqual(iron.debit,{fromInventory:10,fromBank:0,fromGold:0});
const money=guildV2ReviewDonation({snapshot:p,state:s,
 request:{...req,resourceKind:'gold',resourceId:'gold',amount:150000}});
assert.deepEqual(money.debit,{fromInventory:0,fromBank:0,fromGold:150000});
assert.equal(money.creditUnits,0);
assert.equal(money.basketId,null);
failRequest({resourceKind:'gold',resourceId:'gold',amount:150001},'donation_exceeds_remaining_gold');
failRequest({resourceKind:'gold',resourceId:'gold',amount:300},'donation_exceeds_remaining_gold',
 {goldContributed:149800});
failRequest({resourceKind:'gold',resourceId:'gold',amount:500},'insufficient_gold',
 {walletGold:499});
const weekly=preview('guild.v2.weekly.hall_maintenance',10,'weekly_supply');
rejects(()=>guildV2ReviewDonation({snapshot:weekly,state:state(weekly),
 request:{...request(weekly),resourceKind:'gold',resourceId:'gold',amount:1}}),
 'gold_not_required');
rejects(()=>guildV2MakeCostPreview({
 policy,kind:'development',definitionKey:'guild.tree.professions.tier3',guildId:'g',
 projectInstanceId:'p',policyVersion:'review-policy-1',guildLevel:3,
 activeMembers:10,startsAtMs:start,endsAtMs:start+1000,
}),'guild_level_below_sink_gate');
const driftPolicy={
 ...policy,
 guildDevelopmentGates:policy.guildDevelopmentGates.map(d=>d.unlockKey===p.definitionKey?
  {...d,weightedBase:d.weightedBase+100}:d),
};
rejects(()=>guildV2MakeCostPreview({
 policy:driftPolicy,kind:'development',definitionKey:p.definitionKey,guildId:'g',
 projectInstanceId:'p',policyVersion:'review-policy-1',guildLevel:10,
 activeMembers:10,startsAtMs:start,endsAtMs:start+1000,
}),'guild_gate_source_drift');
console.log('PASS: 6 development gates, 3 weekly candidates, source parity, 2/10/20 member costs, quotas, bank split, Gold, replay, overfill and forged identities');
