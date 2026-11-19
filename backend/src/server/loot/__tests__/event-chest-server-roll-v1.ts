import {
 EVENT_CHEST_SERVER_ROLL_V1_RELEASED,
 EVENT_CHEST_SERVER_ROLL_V1_MODULUS,
 deriveServerChestRollsV1,
} from '../event-chest-server-roll-v1';
import {
 previewVerifiedPartyChestsV51,resolvePartyChestGearDraftV51,
} from '../../party/weekly-party-event-chests-v51';
import {
 previewVerifiedWorldBossChestsV58,resolveWorldBossChestGearDraftV58,
} from '../../combat/world-boss-chests-v58';

function check(ok:unknown,label:string):asserts ok{
 if(!ok)throw Error('event_chest_roll_test:'+label);
}
function rejects(fn:()=>unknown,needle:string){
 let rejected=false;
 try{fn();}catch(e){rejected=String(e).includes(needle);}
 check(rejected,needle);
}
check(!EVENT_CHEST_SERVER_ROLL_V1_RELEASED,'not_mounted');
const key='party-event:1794787200000:11111111-1111-4111-8111-111111111111:participation';
const worldKey='world-boss:22222222-2222-4222-8222-222222222222:11111111-1111-4111-8111-111111111111:three_attempts';
const secret=new Uint8Array(32).fill(37);
const req={secret,domain:'party_event_v51' as const,committedChestKey:key};
const a=deriveServerChestRollsV1(req),b=deriveServerChestRollsV1(req);
check(a.hitRoll===b.hitRoll&&a.pieceRoll===b.pieceRoll,'retry_is_replay_stable');
check(a.hitRoll>=0&&a.hitRoll<EVENT_CHEST_SERVER_ROLL_V1_MODULUS&&
 a.pieceRoll>=0&&a.pieceRoll<EVENT_CHEST_SERVER_ROLL_V1_MODULUS,
 'bounded_pair');
check(a.derivation==='hmac_sha256_domain_separated_v1','auditable_version');
const other=deriveServerChestRollsV1({...req,committedChestKey:key+':other'});
check(other.hitRoll!==a.hitRoll||other.pieceRoll!==a.pieceRoll,
 'independent_account_source');
const differentSecret=deriveServerChestRollsV1({...req,secret:new Uint8Array(32).fill(38)});
check(differentSecret.hitRoll!==a.hitRoll||
 differentSecret.pieceRoll!==a.pieceRoll,'secret_controls_draw');
const world=deriveServerChestRollsV1({
 secret,domain:'world_boss_v58',committedChestKey:worldKey,
});
check(world.hitRoll>=0&&world.hitRoll<10000&&
 world.pieceRoll>=0&&world.pieceRoll<10000,'world_domain');
const partyPreview=previewVerifiedPartyChestsV51({
 accountId:'11111111-1111-4111-8111-111111111111',
 eventStartsAtUtcMs:Date.UTC(2026,10,16),
 family:'broken_caravan',difficulty:'standard',personalPoints:20,
 contributedToPreparation:false,optionalPreparationGoalCompleted:false,
 verifiedFinaleVictory:false,eligibleGearTier:2,
})[0]!;
const partyRoll=deriveServerChestRollsV1({
 secret,domain:'party_event_v51',committedChestKey:partyPreview.chestId,
});
check(resolvePartyChestGearDraftV51(partyPreview,{
 gearRoll:partyRoll.hitRoll,pieceRoll:partyRoll.pieceRoll,ownedPieceIds:[],
}).gearTier===2,'real_party_chest_roll_interface');
const worldPreview=previewVerifiedWorldBossChestsV58({
 eventId:'22222222-2222-4222-8222-222222222222',
 accountId:'11111111-1111-4111-8111-111111111111',
 bossId:'hollowroot',preparationGoalCompleted:false,
 personalCommittedDonations:0,committedAttempts:3,
 communityDamageGoalCompleted:false,personalProvenAttacks:3,
})[0]!;
const worldDraw=deriveServerChestRollsV1({
 secret,domain:'world_boss_v58',committedChestKey:worldPreview.chestId,
});
check(resolveWorldBossChestGearDraftV58(worldPreview,{
 hitRoll:worldDraw.hitRoll,slotRoll:worldDraw.pieceRoll,ownedSlots:[],
}).bossId==='hollowroot','real_world_boss_chest_roll_interface');
rejects(()=>deriveServerChestRollsV1({...req,secret:new Uint8Array(8)}),
 'invalid_server_roller_contract');
rejects(()=>deriveServerChestRollsV1({...req,domain:'world_boss_v58'}),
 'invalid_server_roller_contract');
rejects(()=>deriveServerChestRollsV1({...req,committedChestKey:'other'}),
 'invalid_server_roller_contract');
console.log('EVENT_CHEST_SERVER_ROLL_V1_OK: secure domain-separated HMAC, replay stability, rejected weak secret and full Party/World Boss roll interfaces');
