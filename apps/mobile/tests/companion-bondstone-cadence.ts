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
equal(FALLEN_KNIGHT_WEEKLY_REWARD_CAP,3,'Fallen Knight has three rewarded rematches each UTC week');
let bossStatus=fallenKnightWeeklyStatus(bossState,bossMonday);equal(bossStatus.rewardedClears,0,'fresh boss week starts with no rewarded rematch');
const bossFirst=challengeFallenKnightRematch(bossState,bossMonday);bossState=bossFirst.state;bossStatus=fallenKnightWeeklyStatus(bossState,bossMonday);
equal(bossFirst.won,true,'weekly Fallen Knight rematch can win');
equal(bossStatus.rewardedClears,1,'first weekly win consumes one rewarded clear');
equal(bossStatus.bountyAwarded,true,'weekly win automatically completes the Oathglass Bounty');
equal(bossStatus.remaining,2,'first weekly win leaves two rewarded Fallen Knight clears');
equal(bossState.account.companionBossClears?.FALLEN_KNIGHT,2,'one weekly rematch must add exactly one Fallen Knight clear');
equal((bossState.inventory.stacks.find(row=>row.itemId==='OATHGLASS_FRAGMENT')?.quantity??0)>=1,true,'weekly bounty guarantees an Oathglass Fragment');
equal((bossState.inventory.stacks.find(row=>row.itemId==='TEMPERING_CORE')?.quantity??0)>=1,true,'first weekly bounty guarantees a bonus Tempering Core');
const fragmentAfterFirst=bossState.inventory.stacks.find(row=>row.itemId==='OATHGLASS_FRAGMENT')?.quantity??0;
const bossSecond=challengeFallenKnightRematch(bossState,bossMonday+60_000);bossState=bossSecond.state;bossStatus=fallenKnightWeeklyStatus(bossState,bossMonday);
equal(bossSecond.won,true,'second rewarded weekly rematch remains available');
equal(bossStatus.rewardedClears,2,'second win advances weekly clear count');
equal(bossStatus.remaining,1,'second win leaves one rewarded clear');
equal(bossState.inventory.stacks.find(row=>row.itemId==='OATHGLASS_FRAGMENT')?.quantity??0,fragmentAfterFirst,'weekly bounty bonus must not repeat on clear two');
const bossThird=challengeFallenKnightRematch(bossState,bossMonday+120_000);bossState=bossThird.state;bossStatus=fallenKnightWeeklyStatus(bossState,bossMonday);
equal(bossThird.won,true,'third rewarded weekly rematch remains available');
equal(bossStatus.rewardedClears,3,'third win reaches weekly boss cap');
equal(bossStatus.remaining,0,'third win exhausts rewarded clears');
let weeklyBlocked=false;try{challengeFallenKnightRematch(bossState,bossMonday+180_000)}catch{weeklyBlocked=true}equal(weeklyBlocked,true,'fourth rewarded rematch in the same UTC week must be blocked');
const normalizedBoss=normalizeCompanionRuntimeSave(bossState.account);equal(normalizedBoss.fallenKnightWeekly?.rewardedClears,3,'weekly boss state survives companion save normalization');equal(normalizedBoss.fallenKnightWeekly?.bountyAwarded,true,'weekly boss bounty state survives normalization');

const corrupt=normalizeCompanionRuntimeSave({...state.account,companionRematchBondstones:999,fallenKnightWeekly:{weekKey:'2026-W38',rewardedClears:999,bountyAwarded:true}});
equal(corrupt.companionRematchBondstones,1,'save normalization clamps forged rematch Bondstone usage');
equal(corrupt.fallenKnightWeekly?.rewardedClears,3,'save normalization clamps forged Fallen Knight weekly clears');
console.log('PASS: Fallen Knight rematch Bondstone cadence validates');
