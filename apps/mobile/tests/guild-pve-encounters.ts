const assert={equal:(a:unknown,b:unknown)=>{if(a!==b)throw Error(`${a} !== ${b}`)},deepEqual:(a:unknown,b:unknown)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Deep equality failed')}};
import {guildPveActivitySummary,guildPvePresentation,guildPveView,guildRaidEncountersForTab,guildWeeklyBossSections,guildEventBossSections,type GuildPveEncounter} from '../src/core/guild-pve-encounters';
const row:GuildPveEncounter={rosterSize:12,personalCap:30000,dailyCap:6000,dailyUsed:1000,eligible:true,id:'test',kind:'weekly',name:'Boss',startsAt:'2026-10-01T00:00:00Z',endsAt:'2026-10-08T00:00:00Z',claimEndsAt:'2026-10-15T00:00:00Z',maxHp:500000,damage:250000,personalDamage:1000,allowanceUsed:1000,contributors:5,claimed:[]};
const live=Date.parse('2026-10-04T00:00:00Z');
assert.deepEqual(guildPveView(row,live).milestones.map(x=>x.ready),[true,true,false]);
assert.equal(guildPveView({...row,personalDamage:999},live).milestones.some(x=>x.ready),false);
assert.equal(guildPveView({...row,claimed:[25]},live).milestones[0].ready,false);
assert.equal(guildPveView(row,Date.parse(row.startsAt)-1).milestones.some(x=>x.ready),false);
assert.equal(guildPveView(row,Date.parse(row.endsAt)).active,false);
assert.equal(guildPveView(row,Date.parse(row.endsAt)).milestones[1].ready,true);
assert.equal(guildPveView(row,Date.parse(row.claimEndsAt)).milestones.some(x=>x.ready),false);
assert.equal(guildPveView({...row,allowanceUsed:50000},live).allowance,0);
assert.equal(guildPveView({...row,damage:500000},live).status,'Defeated');
assert.equal(guildPveView({...row,damage:500000},live).active,false);
assert.equal(guildPveView({...row,attemptCap:3,attemptsUsed:2},live).attemptsRemaining,1);
assert.equal(guildPveView({...row,attemptCap:3,attemptsUsed:1,guildLevel:3,requiredGuildLevel:3},live).canContribute,true); // Weekly guild fights must remain accessible without event character-level fields.
assert.equal(guildPveView({...row,attemptCap:3,attemptsUsed:3},live).canContribute,false);
assert.equal(guildPveView({...row,attemptCap:3,attemptsUsed:1,pendingAttempts:1},live).canContribute,false);
assert.equal(guildPveView({...row,attemptCap:3,attemptsUsed:1,guildLevel:2,requiredGuildLevel:3},live).canContribute,false);
const frostRow:GuildPveEncounter={...row,kind:'event',eventId:'EVT_ANNUAL_012_2026',startsAt:'2026-12-03T00:00:00Z',endsAt:'2026-12-27T00:00:00Z',claimEndsAt:'2026-12-29T00:00:00Z',guildLevel:1,requiredGuildLevel:1,characterLevel:9,requiredCharacterLevel:10,attemptCap:9,attemptsUsed:0};
const frostNow=Date.parse('2026-12-05T00:00:00Z');
assert.equal(guildPveView(frostRow,frostNow).canContribute,false);
assert.equal(guildPveView({...frostRow,characterLevel:10},frostNow).canContribute,true);
assert.equal(guildPveView({...frostRow,characterLevel:10,guildLevel:1,requiredGuildLevel:3},frostNow).canContribute,false);
// Production seasonal claim_guild_pve_v1 payout contract, verified 2026-11-25.
const frostComplete={...frostRow,characterLevel:10,damage:frostRow.maxHp};
const frostMilestones=guildPveView(frostComplete,frostNow).milestones;
assert.deepEqual(frostMilestones.map(m=>[m.percent,m.gold,m.guildTokens,m.eventCurrency,m.candy,m.candyKind,m.bank.gold,m.bank.xp]),[
 [25,250,0,100,1,'Skill',5000,150],
 [50,500,0,200,1,'Battle',10000,300],
 [100,1000,0,400,2,'Bond',20000,600],
]);
assert.deepEqual(frostMilestones.map(m=>m.bank.materials),[
 {MOSS_FIBER:75,GREENWOOD_LOG:40},
 {IRONWOOD_LOG:75,ASTER_IRON_INGOT:20},
 {IRONWOOD_LOG:150,ASTER_IRON_INGOT:40,OATHGLASS_SHARD:10},
]);
const frostEnd=Date.parse(frostRow.endsAt), frostClaimEnd=Date.parse(frostRow.claimEndsAt);
assert.equal(guildPveView({...frostRow,characterLevel:10},frostEnd).canContribute,false);
assert.deepEqual(guildPveView(frostComplete,frostEnd).milestones.map(m=>m.ready),[true,true,true]);
assert.deepEqual(guildPveView(frostComplete,frostClaimEnd-1).milestones.map(m=>m.ready),[true,true,true]);
assert.deepEqual(guildPveView(frostComplete,frostClaimEnd).milestones.map(m=>m.ready),[false,false,false]);
assert.deepEqual(guildPveView({...frostComplete,personalDamage:999},frostEnd).milestones.map(m=>m.ready),[false,false,false]);
assert.deepEqual(guildPveView({...frostComplete,claimed:[25,50]},frostEnd).milestones.map(m=>m.ready),[false,false,true]);
assert.equal(guildPvePresentation(frostRow).visualKey,'frostfall');
assert.equal(guildPvePresentation(frostRow).bossName,'Frostbell Herald');
const weeklyPresentation=guildPvePresentation(row);
assert.equal(weeklyPresentation.bossName,'Rootbound Colossus');
assert.deepEqual(weeklyPresentation.activities,['combat']);
assert.equal(guildPvePresentation({...row,name:'Fallen Oathbreaker'}).visualKey,'guild_fallen_oathbreaker');
assert.equal(guildPvePresentation({...row,name:'Fallen Oathbreaker',startsAt:'2026-11-23T00:00:00Z'}).visualKey,'guild_fallen_oathbreaker');
assert.equal(guildPvePresentation({...row,name:'Granite Moss Troll',startsAt:'2026-11-09T00:00:00Z'}).visualKey,'guild_granite_moss_troll');
assert.equal(guildPvePresentation({...row,name:'Veilbound Revenant',startsAt:'2026-11-16T00:00:00Z'}).visualKey,'guild_veilbound_revenant');
assert.equal(guildPvePresentation({...row,name:'Granite Moss Troll',startsAt:'2026-11-09T00:00:00Z'}).mechanicName,'Shatter the Stone');
assert.equal(guildPvePresentation({...row,name:'Granite Moss Troll',startsAt:'2026-11-09T00:00:00Z'}).focusRole,'Damage');
assert.equal(guildPvePresentation({...row,name:'Fallen Oathbreaker',startsAt:'2026-11-23T00:00:00Z'}).focusRole,'Tank');
assert.equal(guildPvePresentation({...row,name:'Veilbound Revenant',startsAt:'2026-11-16T00:00:00Z'}).focusRole,'Support');
assert.equal(guildPvePresentation({...row,name:'Fallen Oathbreaker'}).mechanicName,'Oathbound Guard');
const veilPresentation=guildPvePresentation({...row,kind:'event',name:'The Veilbreak',eventId:'EVT_ANNUAL_010_2026'});
assert.equal(veilPresentation.bossName,'Gloam Riftwarden');
assert.equal(veilPresentation.visualKey,'veilbreak');
assert.deepEqual(veilPresentation.activities,['combat']);
assert.equal(guildPveActivitySummary('event').includes('three attempts per seven days'),true);
const mixedBosses:GuildPveEncounter[]=[row,{...row,id:'festival-boss',kind:'event',name:'Festival Guardian'}];
assert.deepEqual(guildRaidEncountersForTab(mixedBosses,'weekly',live).map(boss=>boss.id),['test']);
assert.deepEqual(guildRaidEncountersForTab(mixedBosses,'event',live).map(boss=>boss.id),['festival-boss']);
assert.deepEqual(guildRaidEncountersForTab([row],'event',live),[]);
assert.deepEqual(guildRaidEncountersForTab([],'weekly',live),[]);
const eventBoss:GuildPveEncounter={...row,id:'veilbreak-2026',kind:'event',name:'The Veilbreak',eventId:'EVT_ANNUAL_010_2026',startsAt:'2026-10-10T00:00:00Z',endsAt:'2026-11-03T00:00:00Z',claimEndsAt:'2026-11-06T00:00:00Z'};
const duringEvent=Date.parse('2026-11-02T23:59:59Z');
const duringClaim=Date.parse('2026-11-04T08:00:00Z');
assert.deepEqual(guildEventBossSections([eventBoss,row],duringEvent).active.map(x=>x.id),['veilbreak-2026']);
assert.deepEqual(guildEventBossSections([eventBoss,row],duringEvent).rewards,[]);
assert.deepEqual(guildEventBossSections([eventBoss,row],duringClaim).active,[]);
assert.deepEqual(guildEventBossSections([eventBoss,row],duringClaim).rewards.map(x=>x.id),['veilbreak-2026']);
assert.deepEqual(guildEventBossSections([{...eventBoss,claimed:[25,50]}],duringClaim).rewards,[]);
assert.deepEqual(guildEventBossSections([{...eventBoss,personalDamage:999}],duringClaim).rewards,[]);
assert.deepEqual(guildEventBossSections([eventBoss],Date.parse(eventBoss.claimEndsAt)).rewards,[]);
assert.deepEqual(guildEventBossSections([eventBoss],Date.parse(eventBoss.startsAt)-1).active,[]);
const currentWeekly:GuildPveEncounter={...row,id:'current-week',name:'Fallen Oathbreaker',startsAt:'2026-11-02T00:00:00Z',endsAt:'2026-11-09T00:00:00Z',claimEndsAt:'2026-11-16T00:00:00Z'};
const priorWeekly:GuildPveEncounter={...row,id:'previous-week',name:'Rootbound Colossus',startsAt:'2026-10-26T00:00:00Z',endsAt:'2026-11-02T00:00:00Z',claimEndsAt:'2026-11-09T00:00:00Z'};
const overlap=Date.parse('2026-11-08T00:00:00Z');
assert.deepEqual(guildWeeklyBossSections([priorWeekly,currentWeekly],overlap).active.map(b=>b.id),['current-week']);
assert.deepEqual(guildWeeklyBossSections([priorWeekly,currentWeekly],overlap).rewards.map(b=>b.id),['previous-week']);
assert.deepEqual(guildRaidEncountersForTab([priorWeekly,currentWeekly],'weekly',overlap).map(b=>b.id),['current-week']);
assert.deepEqual(guildWeeklyBossSections([{...priorWeekly,claimed:[25,50]},currentWeekly],overlap).rewards,[]);
assert.deepEqual(guildWeeklyBossSections([priorWeekly,currentWeekly],Date.parse(currentWeekly.endsAt)).rewards.map(b=>b.id),['current-week']);
assert.deepEqual(guildWeeklyBossSections([priorWeekly],Date.parse(priorWeekly.claimEndsAt)).rewards,[]);
console.log('PASS Guild PvE boss rotation UI, thresholds, eligibility, claims and lifecycle boundaries');

// Receipt recovery and lost acknowledgements: no local changes to shared damage.
import {RaidAttemptRetryKeys,reconcileRaidRow,validRaidStartReceipt} from '../src/core/guild-raid-recovery';
const receipt={attemptsUsed:1,attemptCap:3,resolvesAt:'2026-10-04T00:03:00Z'};
assert.equal(validRaidStartReceipt(receipt),true);
for(const invalid of [null,{...receipt,resolvesAt:'invalid'},{...receipt,attemptsUsed:4},{...receipt,attemptsUsed:0},{...receipt,attemptsUsed:1.5}])assert.equal(validRaidStartReceipt(invalid),false);
const stale={...row,attemptsUsed:0,attemptCap:3};
const reserved=reconcileRaidRow(stale,receipt,[25]);
assert.equal(reserved.row.pendingAttempts,1);
assert.equal(reserved.row.damage,stale.damage);
assert.equal(reserved.row.personalDamage,stale.personalDamage);
assert.equal(reserved.startPending,true);
assert.equal(reserved.claimsPending,true);
assert.equal(guildPveView(reserved.row,live).canContribute,false);
const settled=reconcileRaidRow({...stale,attemptsUsed:1,pendingAttempts:0,claimed:[25],damage:260000},receipt,[25]);
assert.equal(settled.startPending,false);
assert.equal(settled.claimsPending,false);
assert.equal(settled.row.pendingAttempts,0);
assert.equal(settled.row.damage,260000);
let seq=0;const retries=new RaidAttemptRetryKeys(()=>String(++seq),2);
const key=retries.get('accountA/guildA/charA',stale,live);
assert.equal(retries.get('accountA/guildA/charA',stale,live+1000),key);
assert.equal(retries.get('accountA/guildA/charB',stale,live)!==key,true);
retries.observe('accountA/guildA/charA',{...stale,attemptsUsed:1});
const next=retries.get('accountA/guildA/charA',{...stale,attemptsUsed:1},live);
assert.equal(next!==key,true);
retries.confirm('accountA/guildA/charA',stale.id,key); // stale ACK cannot clear newer nonce
assert.equal(retries.get('accountA/guildA/charA',{...stale,attemptsUsed:1},live),next);
retries.confirm('accountA/guildA/charA',stale.id,next);
assert.equal(retries.get('accountA/guildA/charA',{...stale,attemptsUsed:1},live)!==next,true);
console.log('PASS raid receipt validation, monotonic settlement, retry scope and stale ACK recovery');
