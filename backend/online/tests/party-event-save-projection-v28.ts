import {newGame,createCharacter} from '../../../apps/mobile/src/core/game';
import {normalizeSave} from '../../../apps/mobile/src/core/save-normalization';
import {levelFromXp,totalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import {MAX_CLASS_SKILL_XP} from '../../../apps/mobile/src/core/class-skills';
import type {GameState,SkillId} from '../../../apps/mobile/src/core/types';
import {partyEventRewardBundle} from '../../src/server/party/weekly-party-rewards-v2';
import type {VerifiedPartyEventEvidenceV27}
  from '../../src/server/party/weekly-party-settlement-evidence-v27';
import {
  PARTY_EVENT_SAVE_PROJECTION_V28_RELEASED,
  PARTY_EVENT_MATERIAL_STACK_CAP_V28,
  projectPartyEventSaveV28,claimPartyEventSaveV28,
} from '../party-event-save-projection-v28';

const account='11111111-1111-4111-8111-111111111111';
const character='22222222-2222-4222-8222-222222222222';
const offer='33333333-3333-4333-8333-333333333333';

function must(ok:unknown,label:string):asserts ok{
 if(!ok)throw Error('party-v28-test: '+label);
}
function denied(fn:()=>unknown,error:string){
 try{fn();throw Error('unexpected_success');}
 catch(e){must(String(e).includes(error),
   'expected '+error+', received '+String(e));}
}
async function deniedAsync(fn:()=>Promise<unknown>,error:string){
 try{await fn();throw Error('unexpected_success');}
 catch(e){must(String(e).includes(error),
   'expected '+error+', received '+String(e));}
}
const source=()=>{
 const base=createCharacter(newGame(1700000000000),
   'IRONWARDEN','Test Adventurer');
 return {...base,character:{...base.character!,id:character,gold:1000},
   inventory:{stacks:[{itemId:'GEM_DUST',quantity:90}],capacity:30},
   account:{...base.account,companionEssence:20,bondstones:5,partyRenown:11}};
};
type Quote=ReturnType<typeof partyEventRewardBundle>;
function evidence(quote:Quote,
 difficulty:'standard'|'veteran'|'heroic'='standard'):VerifiedPartyEventEvidenceV27{
 return {
  offerId:offer,partyId:'44444444-4444-4444-8444-444444444444',
  reservationId:'55555555-5555-4555-8555-555555555555',
  eventStartsAt:'2026-11-01T00:00:00+00:00',
  trustedAccountId:account,frozenCharacterId:character,
  quoteHash:'a'.repeat(64),difficulty,reward:quote,
  historicalSnapshotsStale:false,onlineRevision:10,
  evidenceReconciled:true,claimable:false,entitled:false,claimed:false,
  economyApplied:false,inboxDelivered:false,payoutEnabled:false,
  blockers:[
   'party_renown_destination_not_verified',
   'xp_progression_and_online_commit_not_verified',
   'atomic_inbox_delivery_not_implemented',
  ],
 };
}
function plan(state:GameState,quote:Quote,
 skill?:SkillId,difficulty:'standard'|'veteran'|'heroic'='standard'){
 return projectPartyEventSaveV28({
  state,evidence:evidence(quote,difficulty),
  trustedAccountId:account,expectedOnlineRevision:10,
  lockedWalletGold:state.character!.gold,
  lockedCharacterProjectionGold:state.character!.gold,
  ...(skill?{professionSkillTarget:skill}:{}),
 });
}
const artisan=partyEventRewardBundle({
 difficulty:'standard',performanceBand:1,personalPoints:15,choice:'artisan',
});
const warrior=partyEventRewardBundle({
 difficulty:'standard',performanceBand:1,personalPoints:15,choice:'warrior',
});
const companion=partyEventRewardBundle({
 difficulty:'standard',performanceBand:5,personalPoints:15,choice:'companion',
});
const participation=partyEventRewardBundle({
 difficulty:'standard',performanceBand:1,personalPoints:5,
});
must(PARTY_EVENT_SAVE_PROJECTION_V28_RELEASED===false,'payout gate off');
must(PARTY_EVENT_MATERIAL_STACK_CAP_V28===99_999,'actual material stack cap');
const before=source();
const beforeJson=JSON.stringify(before);
const artisanResult=plan(before,artisan,'mining');
must(artisanResult.previewOnly&&artisanResult.claimable===false
 &&artisanResult.claimed===false&&!artisanResult.economyApplied
 &&!artisanResult.inboxDelivered,'preview must not masquerade as payout');
must(artisanResult.goldAfter===2700
 &&artisanResult.state.character?.gold===2700
 &&artisanResult.partyRenownAfter===21
 &&artisanResult.state.account.partyRenown===21,'gold and renown paths');
must(artisanResult.state.skills.find(s=>s.skillId==='mining')?.xp===2250
 &&artisanResult.state.skills.find(s=>s.skillId==='mining')?.level===levelFromXp(2250)
 &&artisanResult.grantedProfessionXp===2250,'actual profession XP curve');
must(artisanResult.state.inventory.stacks[0]?.quantity===94
 &&artisanResult.changedInventorySlots===0,'stack merges without slot');
must(before.account.partyRenown===11&&before.character?.gold===1000
 &&JSON.stringify(before)===beforeJson,'pure preview leaves source unchanged');
must(!('partyRenown' in normalizeSave(artisanResult.state).account),
 'Renown is not a canonical saved field: live payout must remain disabled');

const warriorResult=plan(source(),warrior);
const classSkills=warriorResult.state.character!.classSkills!;
must(classSkills.length===2&&classSkills.every(s=>s.xp===825)
 &&warriorResult.grantedCombatSkillXp===1650
 &&warriorResult.state.character!.xp===source().character!.xp,
 'warrior XP uses real two-class-skill focus and not character XP');

const companionResult=plan(source(),companion);
must(companionResult.companionEssenceAfter===20+companion.companionEssence
 &&companionResult.bondstonesAfter===5+companion.bondstones
 &&companionResult.state.inventory.stacks[0]?.quantity===90,
 'companion cache writes only account currencies and gold');
const participationResult=plan(source(),participation);
must(participationResult.goldAfter===1420
 &&participationResult.partyRenownAfter===11
 &&participationResult.grantedProfessionXp===0
 &&participationResult.grantedCombatSkillXp===0,
 'participation is strictly gold-only');

denied(()=>plan(source(),artisan), 'profession_target_required');
denied(()=>plan(source(),warrior,'mining'), 'unexpected_profession_target');
denied(()=>plan(source(),artisan,'mining',
 'veteran'), 'quote_model_mismatch');
denied(()=>plan(source(),{...artisan,gold:5000},'mining'),
 'quote_model_mismatch');
denied(()=>plan(source(),{...artisan,materials:{GEM_DUST:4,FORGED:1}},
 'mining'),'quote_model_mismatch');
denied(()=>projectPartyEventSaveV28({
 state:source(),evidence:evidence(artisan),trustedAccountId:account,
 expectedOnlineRevision:11,lockedWalletGold:1000,
 lockedCharacterProjectionGold:1000,professionSkillTarget:'mining',
}), 'online_revision_conflict');
denied(()=>projectPartyEventSaveV28({
 state:source(),evidence:evidence(artisan),trustedAccountId:account,
 expectedOnlineRevision:10,lockedWalletGold:999,
 lockedCharacterProjectionGold:1000,professionSkillTarget:'mining',
}), 'gold_sources_conflict');
denied(()=>projectPartyEventSaveV28({
 state:source(),evidence:{...evidence(artisan),payoutEnabled:true as false},
 trustedAccountId:account,expectedOnlineRevision:10,
 lockedWalletGold:1000,lockedCharacterProjectionGold:1000,
 professionSkillTarget:'mining',
}), 'evidence_not_safe');
denied(()=>plan({
 ...source(),character:{...source().character!,id:account},
},artisan,'mining'), 'character_not_frozen');
denied(()=>plan({
 ...source(),inventory:{stacks:[{itemId:'GEM_DUST',quantity:99_998}],
 capacity:1},
},artisan,'mining'), 'inventory_full');
const fullMerge=plan({
 ...source(),inventory:{stacks:[{itemId:'GEM_DUST',quantity:99_995}],
 capacity:1},
},artisan,'mining');
must(fullMerge.state.inventory.stacks[0]?.quantity===99_999
 &&fullMerge.changedInventorySlots===0,
 'full inventory can merge existing stack to exact cap');
const newSlot=plan({
 ...source(),inventory:{stacks:[],capacity:1},
},artisan,'mining');
must(newSlot.state.inventory.stacks.length===1
 &&newSlot.state.inventory.stacks[0]?.itemId==='GEM_DUST'
 &&newSlot.state.inventory.stacks[0]?.quantity===4
 &&newSlot.changedInventorySlots===1,'empty inventory gets one dust slot');
denied(()=>plan({
 ...source(),inventory:{stacks:[{itemId:'GEM_DUST',quantity:100000}],
 capacity:2},
},artisan,'mining'), 'dust_stack_unverified');

const nearlyMax=source();
nearlyMax.character!.gold=Number.MAX_SAFE_INTEGER-1;
denied(()=>plan(nearlyMax,artisan,'mining'), 'overflow_gold');
const maxProfession=source();
const mine=maxProfession.skills.find(s=>s.skillId==='mining')!;
mine.xp=totalXpAtLevel(100);mine.level=100;
denied(()=>plan(maxProfession,artisan,'mining'),
 'profession_xp_cap_exceeded');
const fullCombat=source();
fullCombat.character!.classSkills=fullCombat.character!.classSkills!
 .map(s=>({...s,xp:MAX_CLASS_SKILL_XP,level:100}));
denied(()=>plan(fullCombat,warrior),'combat_xp_cap_or_curve_conflict');
const badRenown=source();
badRenown.account.partyRenown=Number.MAX_SAFE_INTEGER;
denied(()=>plan(badRenown,artisan,'mining'),'overflow_party_renown');
const badBalance=source();
badBalance.account.companionEssence=-5;
denied(()=>plan(badBalance,companion),'invalid_companion_essence');

// The pure v28 policy must work across the authored difficulties/bands
// without writing to any owned game-state snapshot.
let checked=0;
for(const difficulty of ['standard','veteran','heroic'] as const){
 for(let band=1;band<=6;band++){
  for(const kind of ['warrior','artisan','companion','participation'] as const){
   const bundle=partyEventRewardBundle({
    difficulty,performanceBand:band,
    personalPoints:kind==='participation'?5:15,
    choice:kind==='participation'?undefined:kind,
   });
   const preview=plan(source(),bundle,
     kind==='artisan'?'smithing':undefined,difficulty);
   must(preview.state.character!.gold===1000+bundle.gold,
     'reward model parity '+difficulty+' '+band+' '+kind);
   checked++;
  }
 }
}
async function test(){
 await deniedAsync(()=>claimPartyEventSaveV28(),
   'atomic_claim_unreleased');
 console.log('Party Events v28: '+checked+
  ' deterministic reward previews, canonical XP/renown/material cap, full-inventory merge, overflow guards and no payment');
}
void test().catch(e=>{console.error(e);process.exitCode=1;});
