import {guildDailyTokenClaimStatus,type GuildDailyTokenWallet,type GuildDailyTokenMuster} from '../src/core/guild-token-daily-claim';

function ok(condition:boolean,label:string){if(!condition)throw new Error(label)}
const day='2026-11-04';
const wallet:GuildDailyTokenWallet={claimedDailyKinds:[],earnedThisWeek:20,weeklyCap:250};
const none:GuildDailyTokenMuster={activityDate:day,checkInPoints:0,combatPoints:0,skillingPoints:0};

ok(guildDailyTokenClaimStatus(null,none,'attendance',day)==='unavailable','Cannot claim without an authoritative wallet snapshot');
ok(guildDailyTokenClaimStatus(wallet,null,'contribution',day)==='unavailable','Cannot claim without a verified Muster snapshot');
ok(guildDailyTokenClaimStatus(wallet,{...none,activityDate:'2026-11-03',checkInPoints:10,combatPoints:5},'contribution',day)==='unavailable','Yesterday’s points must never unlock today’s reward');
ok(guildDailyTokenClaimStatus(wallet,none,'attendance',day)==='locked','Unrecorded check-in is blocked');
ok(guildDailyTokenClaimStatus(wallet,none,'contribution',day)==='locked','No recorded Combat or Skilling activity is blocked');
const checkedIn={...none,checkInPoints:10};
ok(guildDailyTokenClaimStatus(wallet,checkedIn,'attendance',day)==='ready','Recorded Muster check-in unlocks Attendance');
ok(guildDailyTokenClaimStatus(wallet,checkedIn,'contribution',day)==='locked','Check-in alone must not unlock Activity');
ok(guildDailyTokenClaimStatus(wallet,{...checkedIn,combatPoints:1},'contribution',day)==='ready','One verified Combat point unlocks Activity');
ok(guildDailyTokenClaimStatus(wallet,{...checkedIn,skillingPoints:1},'contribution',day)==='ready','One verified Skilling point unlocks Activity');
ok(guildDailyTokenClaimStatus({...wallet,claimedDailyKinds:['contribution']},checkedIn,'contribution',day)==='claimed','Claimed daily Activity cannot be re-claimed');
ok(guildDailyTokenClaimStatus({...wallet,claimedDailyKinds:['attendance'],earnedThisWeek:250},checkedIn,'attendance',day)==='claimed','Already claimed takes precedence over cap status');
ok(guildDailyTokenClaimStatus({...wallet,earnedThisWeek:250},checkedIn,'attendance',day)==='capped','Weekly token cap blocks new daily claims');
ok(guildDailyTokenClaimStatus({...wallet,earnedThisWeek:275,weeklyCap:275},checkedIn,'attendance',day)==='capped','Construction-enhanced weekly cap remains authoritative');

// Contract checks: daily claims live in Guild Home's wallet underneath Shop,
// never remain tappable in the hidden Shop Earn tab.
export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const home=fs.readFileSync('src/components/GuildHallSummary.tsx','utf8');
const shop=fs.readFileSync('src/components/GuildTokenShopView.tsx','utf8');
ok(home.includes('Guild Token Shop" onPress={onOpenShop}/>\n   {dailyActions}') &&
 home.includes('Open Guild Token Shop" onPress={onOpenShop}/>\n   {dailyActions}'),
 'Compact and expanded Guild dashboards must show daily claim tiles directly below the Token Shop action');
ok(home.includes("disabled={!enabled}")&&home.includes("C.goodSurface")&&home.includes("C.badSurface"),
 'Ready / not-earned / disabled claim states must use theme colors and real disabled controls');
ok(home.includes("guildDailyTokenClaimStatus(shop,muster,kind)!=='ready'"),
 'Daily claim handler must re-check server-derived eligibility before submitting');
ok(!shop.includes('onDaily(kind)')&&shop.includes('claims are now on Guild Home'),
 'Daily reward claim controls must not remain buried in the Guild Token Shop Earn tab');
console.log('PASS: Guild Token daily eligibility matches verified Muster criteria, UTC date, claim and cap; dashboard claim controls are safely enabled and visible');
