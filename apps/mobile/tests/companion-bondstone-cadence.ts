import {challengeFallenKnightRematch,createCharacter,newGame} from '../src/core/game';
import {awardCompanionRematchBondstone,companionRematchBondstoneStatus,COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP} from '../src/core/companion-runtime';
import {normalizeCompanionRuntimeSave} from '../src/core/companion-save';
import {FALLEN_KNIGHT_WEEKLY_REWARD_CAP,fallenKnightWeeklyStatus} from '../src/core/weekly-boss';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

const monday=Date.UTC(2026,8,14,12);
let state=createCharacter(newGame(monday),'IRONWARDEN','Bondstone Tester');

equal(COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP,1,'Fallen Knight rematch weekly Bondstone cap');
let status=companionRematchBondstoneStatus(state,monday);
equal(status.used,0,'fresh week starts with zero rematch Bondstones');
equal(status.remaining,1,'fresh week has one Bondstone reward available');

const first=awardCompanionRematchBondstone(state,monday);state=first.state;
equal(first.reward,1,'weekly successful rematch awards Bondstone');
const extra=awardCompanionRematchBondstone(state,monday+86400000);state=extra.state;
equal(extra.reward,0,'additional rematch in same UTC week awards no Bondstone');
status=companionRematchBondstoneStatus(state,monday+5*86400000);
equal(status.used,1,'weekly rematch Bondstone usage is capped at one');
equal(status.remaining,0,'weekly cap reports no remaining Bondstone rewards');

const normalized=normalizeCompanionRuntimeSave(state.account);
equal(normalized.companionRematchBondstones,1,'rematch Bondstone usage survives save normalization');
equal(normalized.companionRematchBondstoneWeek,status.week,'rematch Bondstone week survives save normalization');

const nextWeek=monday+7*86400000;
status=companionRematchBondstoneStatus(state,nextWeek);
equal(status.used,0,'new UTC week resets rematch Bondstone allowance');
equal(status.remaining,1,'new UTC week restores one Bondstone reward');
const resetAward=awardCompanionRematchBondstone(state,nextWeek);
equal(resetAward.reward,1,'new UTC week can award a Bondstone again');
equal(resetAward.state.account.companionRematchBondstones,1,'new week starts a new rematch Bondstone counter');

const bossMonday=Date.UTC(2026,8,21,12);
let bossState=createCharacter(newGame(bossMonday),'RAVAGER','Weekly Boss Tester');
bossState={...bossState,defeatedBossIds:['FALLEN_KNIGHT'],account:{...bossState.account,companionBossClears:{FALLEN_KNIGHT:1}},character:{...bossState.character!,level:100,hp:5000,currentHp:5000,attack:5000,defense:1200},inventory:{...bossState.inventory,stacks:[{itemId:'TRAVEL_RATION',quantity:20}]}};
equal(FALLEN_KNIGHT_WEEKLY_REWARD_CAP,1,'Fallen Knight has one rewarded rematch each UTC week');
let bossStatus=fallenKnightWeeklyStatus(bossState,bossMonday);equal(bossStatus.rewardedClears,0,'fresh boss week starts with no rewarded rematch');
const bossFirst=challengeFallenKnightRematch(bossState,bossMonday);bossState=bossFirst.state;bossStatus=fallenKnightWeeklyStatus(bossState,bossMonday);
equal(bossFirst.won,true,'weekly Fallen Knight rematch can win');
equal(bossStatus.rewardedClears,1,'weekly win consumes the one rewarded clear');
equal(bossStatus.bountyAwarded,true,'weekly win automatically completes the Oathglass Bounty');
equal(bossStatus.remaining,0,'weekly win exhausts rewarded Fallen Knight clears');
equal(bossState.account.companionBossClears?.FALLEN_KNIGHT,2,'one weekly rematch must add exactly one Fallen Knight clear');
equal((bossState.inventory.stacks.find(row=>row.itemId==='OATHGLASS_FRAGMENT')?.quantity??0)>=1,true,'weekly bounty guarantees an Oathglass Fragment');
equal((bossState.inventory.stacks.find(row=>row.itemId==='TEMPERING_CORE')?.quantity??0)>=2,true,'weekly bounty adds a bonus Tempering Core on top of the boss drop table');
let weeklyBlocked=false;try{challengeFallenKnightRematch(bossState,bossMonday+60_000)}catch{weeklyBlocked=true}equal(weeklyBlocked,true,'second rewarded rematch in the same UTC week must be blocked');
const normalizedBoss=normalizeCompanionRuntimeSave(bossState.account);equal(normalizedBoss.fallenKnightWeekly?.rewardedClears,1,'weekly boss state survives companion save normalization');equal(normalizedBoss.fallenKnightWeekly?.bountyAwarded,true,'weekly boss bounty state survives normalization');

const corrupt=normalizeCompanionRuntimeSave({...state.account,companionRematchBondstones:999,fallenKnightWeekly:{weekKey:'2026-W38',rewardedClears:999,bountyAwarded:true}});
equal(corrupt.companionRematchBondstones,1,'save normalization clamps forged rematch Bondstone usage');
equal(corrupt.fallenKnightWeekly?.rewardedClears,1,'save normalization clamps forged Fallen Knight weekly clears');
console.log('PASS: Fallen Knight rematch Bondstone cadence validates');
