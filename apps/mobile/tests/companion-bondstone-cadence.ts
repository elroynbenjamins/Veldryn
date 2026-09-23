import {challengeFallenKnightRematch,createCharacter,newGame} from '../src/core/game';
import {awardCompanionRematchBondstone,companionRematchBondstoneStatus,COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP} from '../src/core/companion-runtime';
import {normalizeCompanionRuntimeSave} from '../src/core/companion-save';
import {FALLEN_KNIGHT_WEEKLY_REWARD_CAP,fallenKnightWeeklyStatus} from '../src/core/weekly-boss';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

const monday=Date.UTC(2026,8,14,12);
let state=createCharacter(newGame(monday),'IRONWARDEN','Bondstone Tester');

equal(COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP,2,'Fallen Knight rematch weekly Bondstone cap');
let status=companionRematchBondstoneStatus(state,monday);
equal(status.used,0,'fresh week starts with zero rematch Bondstones');
equal(status.remaining,2,'fresh week has two Bondstone rewards available');

const first=awardCompanionRematchBondstone(state,monday);state=first.state;
equal(first.reward,1,'first successful rematch awards Bondstone');
const second=awardCompanionRematchBondstone(state,monday+86400000);state=second.state;
equal(second.reward,1,'second successful rematch awards Bondstone');
const third=awardCompanionRematchBondstone(state,monday+2*86400000);state=third.state;
equal(third.reward,0,'third successful rematch in same UTC week awards no Bondstone');
status=companionRematchBondstoneStatus(state,monday+5*86400000);
equal(status.used,2,'weekly rematch Bondstone usage is capped');
equal(status.remaining,0,'weekly cap reports no remaining Bondstone rewards');

const normalized=normalizeCompanionRuntimeSave(state.account);
equal(normalized.companionRematchBondstones,2,'rematch Bondstone usage survives save normalization');
equal(normalized.companionRematchBondstoneWeek,status.week,'rematch Bondstone week survives save normalization');

const nextWeek=monday+7*86400000;
status=companionRematchBondstoneStatus(state,nextWeek);
equal(status.used,0,'new UTC week resets rematch Bondstone allowance');
equal(status.remaining,2,'new UTC week restores rematch Bondstone allowance');
const resetAward=awardCompanionRematchBondstone(state,nextWeek);
equal(resetAward.reward,1,'new UTC week can award Bondstones again');
equal(resetAward.state.account.companionRematchBondstones,1,'new week starts a new rematch Bondstone counter');

const bossMonday=Date.UTC(2026,8,21,12);
let bossState=createCharacter(newGame(bossMonday),'RAVAGER','Weekly Boss Tester');
bossState={...bossState,defeatedBossIds:['FALLEN_KNIGHT'],character:{...bossState.character!,level:100,hp:5000,currentHp:5000,attack:5000,defense:1200},inventory:{...bossState.inventory,stacks:[{itemId:'TRAVEL_RATION',quantity:20}]}};
equal(FALLEN_KNIGHT_WEEKLY_REWARD_CAP,3,'Fallen Knight rewarded rematch cap');
let bossStatus=fallenKnightWeeklyStatus(bossState,bossMonday);equal(bossStatus.rewardedClears,0,'fresh boss week starts with no rewarded rematches');
const bossFirst=challengeFallenKnightRematch(bossState,bossMonday);bossState=bossFirst.state;equal(bossFirst.won,true,'first weekly Fallen Knight rematch can win');equal(fallenKnightWeeklyStatus(bossState,bossMonday).rewardedClears,1,'first win consumes one weekly rewarded clear');
const bossSecond=challengeFallenKnightRematch(bossState,bossMonday+60_000);bossState=bossSecond.state;bossStatus=fallenKnightWeeklyStatus(bossState,bossMonday+60_000);equal(bossStatus.rewardedClears,2,'second win advances weekly rematch count');equal(bossStatus.bountyAwarded,true,'second win automatically completes the Oathglass Bounty');
equal(bossState.inventory.stacks.find(row=>row.itemId==='TEMPERING_CORE')?.quantity,1,'weekly bounty grants one Tempering Core');
const bossThird=challengeFallenKnightRematch(bossState,bossMonday+120_000);bossState=bossThird.state;bossStatus=fallenKnightWeeklyStatus(bossState,bossMonday+120_000);equal(bossStatus.rewardedClears,3,'third win reaches weekly cap');equal(bossStatus.remaining,0,'third win exhausts weekly rewarded rematches');
let weeklyBlocked=false;try{challengeFallenKnightRematch(bossState,bossMonday+180_000)}catch{weeklyBlocked=true}equal(weeklyBlocked,true,'fourth rewarded rematch in the same UTC week must be blocked');
const normalizedBoss=normalizeCompanionRuntimeSave(bossState.account);equal(normalizedBoss.fallenKnightWeekly?.rewardedClears,3,'weekly boss state survives companion save normalization');equal(normalizedBoss.fallenKnightWeekly?.bountyAwarded,true,'weekly boss bounty claim state survives normalization');

const corrupt=normalizeCompanionRuntimeSave({...state.account,companionRematchBondstones:999});
equal(corrupt.companionRematchBondstones,2,'save normalization clamps forged rematch Bondstone usage');

console.log('PASS: Fallen Knight rematch Bondstone cadence validates');
