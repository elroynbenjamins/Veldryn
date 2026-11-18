import {
  PARTY_EVENT_SETTLEMENT_V26_RELEASED,
  planPrivatePartyEventSettlementV26,
  claimPrivatePartyEventRewardV26,
  type PartyEventCanonicalStoresV26,
} from '../weekly-party-settlement-policy-v26';
import {partyEventRewardBundle} from '../weekly-party-rewards-v2';

function ok(value:unknown,label:string):asserts value {
  if(!value)throw Error('party-v26-test: '+label);
}
function rejected(fn:()=>unknown,reason:string):void {
  try{fn();throw Error('unexpected_success');}
  catch(e){ok(String(e).includes(reason),'expected '+reason+' got '+String(e));}
}
const account='11111111-1111-4111-8111-111111111111';
const character='22222222-2222-4222-8222-222222222222';
const standard=partyEventRewardBundle({
 difficulty:'standard',performanceBand:1,personalPoints:15,choice:'artisan',
});
const source:PartyEventCanonicalStoresV26={
 accountId:account,frozenCharacterId:character,activeCharacterId:character,
 onlineRevision:41n,walletGold:5000n,characterProjectionGold:5000n,
 onlineCharacterGold:5000n,combatSkillXp:500n,artisanSkillXp:300n,
 companionEssence:20n,bondstones:3n,partyRenown:10n,
 inventoryUsedSlots:10,inventoryCapacity:10,gemDustStackCount:1,
 gemDustInMergeStack:25n,maxGemDustPerStack:999n,
 inboxDestinationAvailable:true,
};
const base={
 trustedAccountId:account,frozenCharacterId:character,
 difficulty:'standard' as const,quote:standard,stores:source,
 artisanSkillTarget:'mining',permittedArtisanSkills:['mining','woodcutting'],
 permittedCombatSkills:['swordsmanship'],
};
const snapshot=JSON.stringify(source,(_key,value)=>
 typeof value==='bigint'?value.toString():value);
const plan=planPrivatePartyEventSettlementV26(base);
ok(PARTY_EVENT_SETTLEMENT_V26_RELEASED===false,'feature remains hidden');
ok(plan.after.gold===6700n&&plan.after.artisanSkillXp===2550n,
 'artisan reward expected balances');
ok(plan.after.gemDustTotalAdded===4n
 &&plan.requiredNewInventorySlots===0,
 'full inventory can receive a verified mergeable stack');
ok(!plan.claimed&&!plan.entitled&&!plan.economyApplied
 &&!plan.inboxDelivered&&plan.previewOnly,
 'plan never grants anything');
ok(source.walletGold===5000n&&source.artisanSkillXp===300n
 &&JSON.stringify(source,(_key,value)=>
 typeof value==='bigint'?value.toString():value)===snapshot,'no source mutation');

rejected(()=>planPrivatePartyEventSettlementV26({
 ...base,stores:{...source,characterProjectionGold:4999n},
}),'gold_projection_conflict');
rejected(()=>planPrivatePartyEventSettlementV26({
 ...base,stores:{...source,activeCharacterId:account},
}),'identity_mismatch');
rejected(()=>planPrivatePartyEventSettlementV26({
 ...base,quote:{...standard,gold:standard.gold+1},
}),'reward_model_mismatch');
rejected(()=>planPrivatePartyEventSettlementV26({
 ...base,quote:{...standard,materials:{GEM_DUST:4,FAKE:10}},
}),'reward_model_mismatch');
rejected(()=>planPrivatePartyEventSettlementV26({
 ...base,artisanSkillTarget:'alchemy',
}),'artisan_xp_target_unverified');
rejected(()=>planPrivatePartyEventSettlementV26({
 ...base,artisanSkillTarget:undefined,
}),'artisan_xp_target_unverified');
rejected(()=>planPrivatePartyEventSettlementV26({
 ...base,stores:{...source,inboxDestinationAvailable:false},
}),'inbox_destination_unavailable');
rejected(()=>planPrivatePartyEventSettlementV26({
 ...base,stores:{...source,gemDustInMergeStack:998n},
}),'inventory_full');
rejected(()=>planPrivatePartyEventSettlementV26({
 ...base,stores:{...source,walletGold:9223372036854775807n,
 characterProjectionGold:9223372036854775807n,
 onlineCharacterGold:9223372036854775807n},
}),'overflow_gold');
rejected(()=>planPrivatePartyEventSettlementV26({
 ...base,stores:{...source,gemDustStackCount:2},
}),'gem_dust_stack_topology_unverified');

const participating=partyEventRewardBundle({
 difficulty:'standard',performanceBand:1,personalPoints:5,
});
const participation=planPrivatePartyEventSettlementV26({
 ...base,quote:participating,artisanSkillTarget:undefined,
});
ok(participation.after.gold===5420n
 &&participation.after.artisanSkillXp===300n
 &&participation.after.gemDustTotalAdded===0n
 &&participation.requiredNewInventorySlots===0,
 'participation gold only');

const warrior=partyEventRewardBundle({
 difficulty:'standard',performanceBand:1,personalPoints:15,choice:'warrior',
});
const warriorPlan=planPrivatePartyEventSettlementV26({
 ...base,quote:warrior,combatSkillTarget:'swordsmanship',
 artisanSkillTarget:undefined,
});
ok(warriorPlan.after.combatSkillXp===2150n
 &&warriorPlan.after.artisanSkillXp===300n,
 'warrior uses a verified class combat-skill destination');

const companion=partyEventRewardBundle({
 difficulty:'heroic',performanceBand:5,personalPoints:30,choice:'companion',
});
const companionPlan=planPrivatePartyEventSettlementV26({
 ...base,difficulty:'heroic',quote:companion,
 artisanSkillTarget:undefined,
});
ok(companionPlan.after.companionEssence===20n+BigInt(companion.companionEssence)
 &&companionPlan.after.bondstones===5n
 &&companionPlan.after.partyRenown===24n,
 'companion currencies and renown need complete atomic transfer');
void claimPrivatePartyEventRewardV26()
 .then(()=>{throw Error('unexpected_payout');})
 .catch(e=>{
  ok(String(e).includes('atomic_payout_unreleased'),
    'v26 cannot claim even if a planner succeeds');
  console.log('Party Events v26: all-or-nothing destination preview, v2 parity, overflow, inventory, XP target, source immutability, no payouts');
 }).catch(e=>{console.error(e);process.exitCode=1;});
