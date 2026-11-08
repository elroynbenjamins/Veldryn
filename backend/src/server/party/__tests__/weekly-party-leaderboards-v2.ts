import {
  PARTY_EVENT_LEADERBOARDS_RELEASED,
  projectVerifiedPartyBossScore,
  rankVerifiedPartyBossEntries,
  snapshotPartyLeaderboardName,
} from '../weekly-party-leaderboards-v2';
import type {PartyBossResolution} from '../weekly-party-boss-v2';

function assert(cond:unknown,label:string):asserts cond {
  if(!cond)throw new Error('party_leaderboard_v2: '+label);
}
function rejects(fn:()=>unknown,match:string){
  try{fn();throw new Error('unexpected_success');}
  catch(error){assert(String(error).includes(match),'expected '+match+'; got '+String(error));}
}
assert(PARTY_EVENT_LEADERBOARDS_RELEASED===false,
  'rankings must not be player visible before the global Leaderboards feature');

const eventStartsAtMs=Date.parse('2026-11-09T00:00:00Z');
const base:PartyBossResolution={
  completedAtMs:eventStartsAtMs+8*86_400_000,
  tiersCleared:4,highestTierReached:5,totalBossDamage:50000,
  totalPossibleBossHp:51000,rewardBand:3,
  preparation:{
    completedRequiredStages:3,completedOptionalPreparations:[],
    outgoingBonus:.045,damageReduction:.045,healingBonus:.045,
    shieldingBonus:.045,maxHpBonus:0,
  },
  contributions:[
    {accountId:'a',characterId:'a1',role:'tank',damage:6000,healing:0,
      shielding:2500,absorbedDamage:1300,damageTaken:7000,interrupts:2,meaningfulContribution:true},
    {accountId:'b',characterId:'b1',role:'support',damage:4000,healing:9000,
      shielding:3400,absorbedDamage:800,damageTaken:2000,interrupts:3,meaningfulContribution:true},
  ],
  tiers:[
    {tier:1,cleared:true,bossMaxHp:10000,bossRemainingHp:0,partyDamage:10000,durationMs:10000,reason:'victory'},
    {tier:2,cleared:true,bossMaxHp:10000,bossRemainingHp:0,partyDamage:10000,durationMs:10000,reason:'victory'},
    {tier:3,cleared:true,bossMaxHp:10000,bossRemainingHp:0,partyDamage:10000,durationMs:10000,reason:'victory'},
    {tier:4,cleared:true,bossMaxHp:10000,bossRemainingHp:0,partyDamage:10000,durationMs:10000,reason:'victory'},
    {tier:5,cleared:false,bossMaxHp:11000,bossRemainingHp:1000,partyDamage:10000,durationMs:90000,reason:'timeout'},
  ],
};
const make=(id:string,partyName:string,result=base,partySize=2,difficulty:'standard'|'veteran'='standard')=>
  projectVerifiedPartyBossScore({
    eventId:'event'+id,partyId:'party'+id,partyName,
    eventStartsAtMs,family:'broken_caravan',difficulty,partySize,
    completedAtMs:result.completedAtMs,result,
  });
assert(snapshotPartyLeaderboardName(null,'IScaredMeAHat')==="IScaredMeAHat's Party",
  'existing unnamed parties use a stable leader-based name');
assert(snapshotPartyLeaderboardName(' Guildbreakers ','other')==='Guildbreakers',
  'future explicit party names take precedence');
assert(snapshotPartyLeaderboardName('',null)==='Unnamed Party','safe fallback label');
const first=make('1',"Alpha's Party");
assert(first.healed===9000&&first.shielding===5900&&first.support===14900,
  'real support metrics are aggregated from combat');
assert(first.absorbed===2100&&first.interrupts===5,
  'tanks and supports have separate visible impact');
const second=make('2',"Bravo's Party",{...base,totalBossDamage:80000,tiersCleared:5,highestTierReached:5});
const tied=make('3',"Charlie’s Party",{...base,totalBossDamage:50000});
const otherDifficulty=make('4',"Heroic Party",base,2,'veteran');
const otherSize=make('5',"Full Party",{
  ...base,contributions:[...base.contributions,
    {...base.contributions[0]!,accountId:'c',characterId:'c1'},
    {...base.contributions[1]!,accountId:'d',characterId:'d1'}],
},4);
const otherWeek={...make('6',"Other Week"),eventStartsAtMs:eventStartsAtMs+21*86400000};
const entries=[first,second,tied,otherDifficulty,otherSize,otherWeek];
const ranked=rankVerifiedPartyBossEntries(entries,{
  eventStartsAtMs,difficulty:'standard',partySize:2,metric:'damage',
});
assert(ranked.length===3&&ranked[0]?.partyName==="Bravo's Party",
  'highest boss damage tops same-size difficulty bracket');
assert(ranked[0]?.score===80000&&ranked[0]?.rank===1,'rank and score correct');
assert(ranked[1]?.rank===2&&ranked[2]?.rank===2,
  'tied scores keep the same competition rank');
assert(ranked.every(r=>r.partySize===2&&r.difficulty==='standard'),
  'difficulty and roster size are separate fair brackets');
assert(rankVerifiedPartyBossEntries(entries,{
  eventStartsAtMs,difficulty:'standard',partySize:2,metric:'depth',
})[0]?.score===5,'tiers defeated are independently ranked');
assert(rankVerifiedPartyBossEntries(entries,{
  eventStartsAtMs,difficulty:'standard',partySize:2,metric:'support',
})[0]?.score===14900,'healing plus shields produce support leaderboard');
assert(rankVerifiedPartyBossEntries(entries,{
  eventStartsAtMs,difficulty:'standard',partySize:2,metric:'shielding',
})[0]?.score===8000,'shields and absorbs are tracked separately');
assert(rankVerifiedPartyBossEntries(entries,{
  eventStartsAtMs,difficulty:'standard',partySize:2,metric:'mechanics',
})[0]?.score===5,'interrupts form mechanics leaderboard');
assert(rankVerifiedPartyBossEntries(entries,{
  eventStartsAtMs,difficulty:'standard',metric:'damage',limit:1,
}).length===1,'rankings limit is respected');
rejects(()=>rankVerifiedPartyBossEntries([...entries,first],{
  eventStartsAtMs,difficulty:'standard',partySize:2,metric:'damage',
}),'duplicate_party_boss_rank_event');
rejects(()=>make('bad','',base),'invalid_party_boss_ranking_source');
rejects(()=>make('bad','test',{...base,contributions:[]}),
  'invalid_party_boss_ranking_source');
rejects(()=>make('bad','test',{...base,contributions:[
  {...base.contributions[0]!,healing:-10},base.contributions[1]!,
]}),'invalid_party_boss_contribution');
console.log('Hidden party boss leaderboard rankings verified');
