import {COMPANION_PROVING_GROUNDS} from '../content';
import {activeCompanionProvingGroundChallenges,claimCompanionProvingGroundChallenge,newCompanionProvingGroundState,provingGroundEventMatches,recordCompanionProvingGroundEvent,rolloverCompanionProvingGroundState} from '../proving-grounds';
import {companionTrialWeekKey} from '../trial-season';
import {claimWeeklyCompanionChallenge} from '../trials';
import type {CompanionProvingGroundEvent,OwnedCompanionSnapshot} from '../domain';
const ok=(v:unknown,m:string)=>{if(!v)throw new Error(m)};const eq=(a:unknown,b:unknown,m:string)=>{if(a!==b)throw new Error(`${m}: expected ${String(b)}, got ${String(a)}`)};const throws=(f:()=>unknown,m:string)=>{let did=false;try{f()}catch{did=true}if(!did)throw new Error(m)};
const p=(id:string,bondLevel=5):OwnedCompanionSnapshot=>({companionId:id,level:20,xp:0,ascensionTier:2,bondLevel,bondXp:0,bondTraitUnlocked:bondLevel>=10});
const owned:Record<string,OwnedCompanionSnapshot>={UNIT_001:p('UNIT_001'),UNIT_002:p('UNIT_002'),UNIT_003:p('UNIT_003'),UNIT_004:p('UNIT_004',8),UNIT_007:p('UNIT_007'),UNIT_008:p('UNIT_008')};
const def=(id:string)=>COMPANION_PROVING_GROUNDS.find(x=>x.id===id)!;
const event=(type:CompanionProvingGroundEvent['type'],ids:string[],extra:Partial<CompanionProvingGroundEvent>={}):CompanionProvingGroundEvent=>({eventId:`E-${type}-${ids.join('-')}`,type,companionIds:ids,...extra});
// 31 rarity restriction; 32 Bond; 33 character + companion role; 34 Trial team; Against Odds and rarity mix.
ok(provingGroundEventMatches(def('PG_UNDERESTIMATED'),event('boss_defeat',['UNIT_004']),owned),'Rare-or-lower boss challenge failed');ok(!provingGroundEventMatches(def('PG_UNDERESTIMATED'),event('boss_defeat',['UNIT_007']),owned),'Elite incorrectly satisfied Rare-or-lower challenge');
ok(provingGroundEventMatches(def('PG_TRUSTED_ALLY'),event('dungeon_complete',['UNIT_004']),owned),'Bond 8 challenge failed');ok(!provingGroundEventMatches(def('PG_TRUSTED_ALLY'),event('dungeon_complete',['UNIT_001']),owned),'Low Bond satisfied challenge');
ok(provingGroundEventMatches(def('PG_BORROWED_DEFENSE'),event('battle_complete',['UNIT_002'],{characterRole:'damage'}),owned),'Damage+Tank role objective failed');ok(!provingGroundEventMatches(def('PG_BORROWED_DEFENSE'),event('battle_complete',['UNIT_002'],{characterRole:'tank'}),owned),'Wrong character role satisfied objective');
ok(provingGroundEventMatches(def('PG_REGIONAL_LOYALTY'),event('trial_boss_clear',['UNIT_001','UNIT_002','UNIT_008']),owned),'Trial same-origin team challenge failed');
ok(provingGroundEventMatches(def('PG_AGAINST_ODDS'),event('trial_floor_clear',['UNIT_001','UNIT_002','UNIT_003'],{teamPower:3000,recommendedPower:3500}),owned),'Below-power Trial challenge failed');
ok(provingGroundEventMatches(def('PG_MIXED_COMPANY'),event('trial_floor_clear',['UNIT_001','UNIT_004','UNIT_007']),owned),'Rarity-mix challenge failed');
// Legacy Trial-local weekly claims are disabled so Bondstone rewards cannot be collected from two parallel weekly systems.
throws(()=>claimWeeklyCompanionChallenge(),'Legacy Trial weekly reward path remained active');
// 30 progress is derived from server event inputs/time; there is no client clock field in the contract.
const sep=Date.UTC(2026,8,14,12),oct=Date.UTC(2026,8,21,12);eq(companionTrialWeekKey(sep),'2026-09-14','Unexpected weekly key');const originalOwnedJson=JSON.stringify(owned);
let state=newCompanionProvingGroundState(sep);const active=activeCompanionProvingGroundChallenges(sep).definitions[0];
// Create an event guaranteed to match the active definition by selecting an existing representative.
const representatives:Record<string,CompanionProvingGroundEvent>={
 PG_UNDERESTIMATED:event('boss_defeat',['UNIT_004']),PG_TRUSTED_ALLY:event('dungeon_complete',['UNIT_004']),PG_BORROWED_DEFENSE:event('battle_complete',['UNIT_002'],{characterRole:'damage'}),PG_OLD_FRIENDS:event('battle_complete',['UNIT_001']),PG_REGIONAL_LOYALTY:event('trial_boss_clear',['UNIT_001','UNIT_002','UNIT_003']),PG_AGAINST_ODDS:event('trial_floor_clear',['UNIT_001','UNIT_002','UNIT_003'],{teamPower:3000,recommendedPower:3500}),PG_MIXED_COMPANY:event('trial_floor_clear',['UNIT_001','UNIT_004','UNIT_007'])};
for(let i=0;i<active.targetCount;i++)state=recordCompanionProvingGroundEvent({state,serverNowMs:sep,event:{...representatives[active.id],eventId:`${active.id}-${i}`},owned}).state;
ok(state.completedIds.includes(active.id),'Server-authoritative weekly challenge did not complete');
// 35 claim once.
const claimed=claimCompanionProvingGroundChallenge({state,serverNowMs:sep,challengeId:active.id});ok(claimed.state.claimedIds.includes(active.id),'Weekly reward not claimed');throws(()=>claimCompanionProvingGroundChallenge({state:claimed.state,serverNowMs:sep,challengeId:active.id}),'Weekly reward claimed twice');
// 36-38 rollover uses server week, clears temporary state, preserves permanent Companion progression owned by caller.
const rolled=rolloverCompanionProvingGroundState(claimed.state,oct);ok(rolled.rolled,'Weekly rollover did not occur');eq(rolled.state.weekKey,companionTrialWeekKey(oct),'Wrong new weekly key');eq(Object.keys(rolled.state.progress).length,0,'Old weekly progress leaked');eq(rolled.state.claimedIds.length,0,'Old weekly claims leaked');eq(JSON.stringify(owned),originalOwnedJson,'Weekly rollover mutated permanent Companion progression');
console.log('companion-phase3-proving-grounds: PASS');
