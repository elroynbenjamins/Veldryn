import {createHash} from 'node:crypto';
import {
 WORLD_BOSS_CHEST_RESOLUTION_V60_LIVE,
 previewResolveWorldBossChestV60,
} from '../world-boss-chest-resolution-v60';
import {
 WORLD_BOSS_GEAR_SLOTS_V58,type VerifiedWorldBossChestEvidenceV58,
} from '../world-boss-chests-v58';
import {deriveServerChestRollsV1} from '../../loot/event-chest-server-roll-v1';
import {validateWorldBossGatheringRollV65,
 worldBossGatheringSetV64} from '../world-boss-gathering-loot-v64';
function check(v:unknown,msg:string):asserts v{
 if(!v)throw Error('world_boss_v60_test:'+msg);
}
function rejectsSync(fn:()=>unknown,code:string){
 let failed=false;try{fn();}catch(e){failed=String(e).includes(code);}
 check(failed,'expected_'+code);
}
const e:VerifiedWorldBossChestEvidenceV58={
 eventId:'11111111-1111-4111-8111-111111111111',
 accountId:'22222222-2222-4222-8222-222222222222',
 bossId:'sunscar',preparationGoalCompleted:true,
 personalCommittedDonations:1,committedAttempts:3,
 communityDamageGoalCompleted:true,personalProvenAttacks:3,
};
check(!WORLD_BOSS_CHEST_RESOLUTION_V60_LIVE,'no_live_payout');
const key='world-boss:'+e.eventId+':'+e.accountId+':donations_goal';
const owned=WORLD_BOSS_GEAR_SLOTS_V58.slice(0,9);
// Deterministically discover a test-only secret with a 1% hit.
// The real server must use an undisclosed strong random secret.
let winning:Uint8Array|undefined;
let missing:Uint8Array|undefined;
for(let i=0;i<3000&&(!winning||!missing);i++){
 const candidate=createHash('sha256').update('test-world-boss-chest-'+i).digest();
 const n=deriveServerChestRollsV1({
  secret:candidate,domain:'world_boss_v58',committedChestKey:key,
 }).hitRoll;
 if(n<100&&!winning)winning=candidate;
 if(n>=100&&!missing)missing=candidate;
}
check(winning&&missing,'both_gear_outcomes_exist');
const base={evidence:e,kind:'donations_goal' as const,ownedSlots:owned};
const grant=previewResolveWorldBossChestV60({
 ...base,serverSecret:winning,
});
check(grant.gearChanceBps===100&&grant.gear?.slot==='ring',
 'one_percent_hit_prioritizes_missing_slot');
check(grant.gear!==null&&validateWorldBossGatheringRollV65(grant.gear),
 'exact_roll_quality_rarity_and_affixes_valid');
check(grant.gear.setId===worldBossGatheringSetV64('sunscar').setId&&
 grant.gear.skill==='mining'&&grant.gear.combatPowerBonus===0,
 'boss_specific_miners_and_no_combat_stats');
check(grant.gear.bonusStats.every(a=>
 ['gathering_xp','extra_yield','rare_material_find'].includes(a.stat)),
 'gathering_only_affixes');
const same=previewResolveWorldBossChestV60({
 ...base,serverSecret:winning,
});
check(JSON.stringify(grant)===JSON.stringify(same),
 'identical_retry_resolution');
check(grant.sourceKey===key&&grant.worldSigilsGranted===0&&
 grant.accountWalletCredited===false&&
 grant.equipmentInstanceCreated===false&&
 grant.inboxReceiptCreated===false&&
 grant.requiresFirstResolutionPersistence,
 'no_unreviewed_wallet_item_or_inbox_write');
const miss=previewResolveWorldBossChestV60({
 ...base,serverSecret:missing,
});
check(miss.gear===null&&miss.selectedSlot===null&&
 miss.guaranteed.gold===450,'missing_gear_still_has_base_preview');
check(!!previewResolveWorldBossChestV60({
 evidence:{...e,bossId:'hollowroot'},kind:'three_attempts',
 ownedSlots:[],serverSecret:winning,
}).sourceKey,'other_boss_identity');
rejectsSync(()=>previewResolveWorldBossChestV60({
 ...base,evidence:{...e,personalCommittedDonations:0},
 serverSecret:winning,
}),'unearned_source');
rejectsSync(()=>previewResolveWorldBossChestV60({
 ...base,ownedSlots:['helmet','helmet'],serverSecret:winning,
}),'untrusted_gear_context');
rejectsSync(()=>previewResolveWorldBossChestV60({
 ...base,serverSecret:new Uint8Array(4),
}),'invalid_server_roller_contract');
console.log('WORLD_BOSS_V60_RESOLUTION_OK');
