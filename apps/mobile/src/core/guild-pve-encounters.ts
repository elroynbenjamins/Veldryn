export interface GuildPveEncounter {
 id:string;kind:'weekly'|'event';name:string;eventId?:string;startsAt:string;endsAt:string;claimEndsAt:string;
 maxHp:number;damage:number;personalDamage:number;allowanceUsed:number;contributors:number;claimed:number[];
 rosterSize:number;personalCap:number;dailyCap:number;dailyUsed:number;eligible:boolean;attemptCap?:number;attemptsUsed?:number;pendingAttempts?:number;nextAttemptResolvesAt?:string;lastAttemptDamage?:number;lastAttemptCharacterDamage?:number;lastAttemptCompanionDamage?:number;lastAttemptCompanionId?:string;guildLevel?:number;requiredGuildLevel?:number;requiredCharacterLevel?:number;characterLevel?:number;
}

export type GuildBossTab=GuildPveEncounter['kind'];
/** Only the current UTC weekly encounter is fightable. Old encounters remain
 * eligible for their original rewards, but are never rendered as another boss. */
export function guildWeeklyBossSections(rows:readonly GuildPveEncounter[],now=Date.now()){
 const active=rows.filter(row=>row.kind==='weekly'&&now>=Date.parse(row.startsAt)&&now<Date.parse(row.endsAt))
  .sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt)).slice(0,1);
 const rewards=rows.filter(row=>row.kind==='weekly'&&now>=Date.parse(row.endsAt)&&now<Date.parse(row.claimEndsAt)&&guildPveView(row,now).milestones.some(m=>m.ready))
  .sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt));
 return {active,rewards};
}
/** Separate weekly and seasonal encounters; never show expired boss cards. */
export function guildRaidEncountersForTab(rows:readonly GuildPveEncounter[],tab:GuildBossTab,now=Date.now()):GuildPveEncounter[]{
 return tab==='weekly'?guildWeeklyBossSections(rows,now).active:guildEventBossSections(rows,now).active;
}

/** Keep expired festival bosses out of the raid encounter UI, without
 * discarding milestone rewards during the server's claim window. */
export function guildEventBossSections(rows:readonly GuildPveEncounter[],now=Date.now()){
 const active:GuildPveEncounter[]=[];
 const rewards:GuildPveEncounter[]=[];
 for(const row of rows){
  if(row.kind!=='event')continue;
  const start=Date.parse(row.startsAt),end=Date.parse(row.endsAt),claimEnd=Date.parse(row.claimEndsAt);
  if(now>=start&&now<end){active.push(row);continue;}
  if(now>=end&&now<claimEnd&&guildPveView(row,now).milestones.some(m=>m.ready))rewards.push(row);
 }
 return {active,rewards};
}

export type GuildPveActivity='combat'|'gathering'|'crafting';
export interface GuildPvePresentation{
 bossName:string;bossTitle:string;summary:string;mechanicName?:string;mechanicSummary?:string;activities:readonly GuildPveActivity[];focusRole?:'Tank'|'Damage'|'Support';focusDescription?:string;visualKey:'treant'|'fallen_knight'|'forest_troll'|'veilbreak'|'guild_fallen_oathbreaker'|'guild_granite_moss_troll'|'guild_veilbound_revenant'|'harvestwake'|'merchant_guild'|'frostfall'|'default_event';
}

/**
 * Encounter rules live on the server, but this small catalogue gives every
 * seasonal encounter a real boss identity in the client instead of presenting
 * the festival title as though it were the boss. Unknown future festivals keep
 * a useful generic presentation until their themed client content ships.
 */
export function guildPvePresentation(row:Pick<GuildPveEncounter,'kind'|'name'|'eventId'|'startsAt'>):GuildPvePresentation{
 // The active week that began 2 Nov keeps its original combat modifiers.
 // New role-focus mechanics begin only with the 9 Nov UTC rotation.
 const roleRotation=row.kind==='weekly'&&Date.parse(row.startsAt)>=Date.parse('2026-11-09T00:00:00Z');
 if(roleRotation&&row.name==='Fallen Oathbreaker')return {bossName:row.name,bossTitle:'Weekly raid threat',summary:'Break the oathbound knight’s guard before its cleave can overwhelm the party.',mechanicName:'Guardian’s Stand',mechanicSummary:'Tank week: defence and endurance add protective raid contribution. All classes still contribute through combat.',activities:['combat'],focusRole:'Tank',focusDescription:'Tank builds earn extra contribution from their protective stat profile. No blocked hits are fabricated.',visualKey:'guild_fallen_oathbreaker'};
 if(roleRotation&&row.name==='Granite Moss Troll')return {bossName:row.name,bossTitle:'Weekly raid threat',summary:'Wear down the troll before its earthshaking swings end the attempt early.',mechanicName:'Shatter the Stone',mechanicSummary:'Damage week: attack-oriented builds excel at breaking the troll’s armour.',activities:['combat'],focusRole:'Damage',focusDescription:'Attack power is weighted more heavily this week. Other roles and companions still help.',visualKey:'guild_granite_moss_troll'};
 if(roleRotation&&row.name==='Veilbound Revenant')return {bossName:row.name,bossTitle:'Weekly raid threat',summary:'Keep the revenant from reforming in the gaps between your assaults.',mechanicName:'Veil Reformation',mechanicSummary:'Support week: sustain-oriented character builds earn more raid contribution.',activities:['combat'],focusRole:'Support',focusDescription:'Support contribution is based on server-side character stats and class, not fabricated healing events.',visualKey:'guild_veilbound_revenant'};
 if(row.kind==='weekly'&&row.name==='Fallen Oathbreaker')return {bossName:row.name,bossTitle:'Weekly raid threat',summary:'Break the oathbound knight’s guard before its cleave overwhelms the party.',mechanicName:'Oathbound Guard',mechanicSummary:'The knight’s armour reduces character damage by 6%.',activities:['combat'],visualKey:'guild_fallen_oathbreaker'};
 if(row.kind==='weekly'&&row.name==='Granite Moss Troll')return {bossName:row.name,bossTitle:'Weekly raid threat',summary:'Wear down the troll before its earthshaking swings end the attempt.',mechanicName:'Seismic Swing',mechanicSummary:'Quaking ground reduces companion damage by 10%.',activities:['combat'],visualKey:'guild_granite_moss_troll'};
 if(row.kind==='weekly'&&row.name==='Veilbound Revenant')return {bossName:row.name,bossTitle:'Weekly raid threat',summary:'Keep the revenant from reforming between assaults.',mechanicName:'Veil Reformation',mechanicSummary:'Companion damage is increased by 15%.',activities:['combat'],visualKey:'guild_veilbound_revenant'};
 if(row.kind==='weekly')return {bossName:'Rootbound Colossus',bossTitle:'Weekly raid threat',summary:'Face the ancient treant in dedicated attempts to break its living armour.',mechanicName:'Rooted Bulwark',mechanicSummary:'A steady raid profile that rewards balanced damage and survival.',activities:['combat'],visualKey:'treant'};
 if(row.eventId?.startsWith('EVT_ANNUAL_010'))return {bossName:'Gloam Riftwarden',bossTitle:row.name,summary:'Hold the lantern wards against the creature pressing through the Veilbreak.',mechanicName:'Rift Pressure',mechanicSummary:'The event boss profile changes with the live festival.',activities:['combat'],visualKey:'veilbreak'};
 if(row.eventId?.startsWith('EVT_ANNUAL_012'))return {bossName:'Frostbell Herald',bossTitle:'Frostfall Guild Boss',summary:'Stand together against the Frostbell Herald and restore the winter bells. Every guild member can contribute through server-timed attempts.',activities:['combat'],visualKey:'frostfall'};
 if(row.eventId?.startsWith('EVT_ANNUAL_011'))return {bossName:'Caravan Siegebeast',bossTitle:row.name,summary:'Protect the festival caravans against the festival siege.',activities:['combat'],visualKey:'merchant_guild'};
 if(row.eventId?.startsWith('EVT_ANNUAL_006'))return {bossName:'The Withered Harvester',bossTitle:row.name,summary:'Defend the harvest stores from the corrupted reaper.',activities:['combat'],visualKey:'harvestwake'};
 return {bossName:`${row.name} Vanguard`,bossTitle:row.name,summary:'Fight this seasonal threat in dedicated Guild Boss attempts.',activities:['combat'],visualKey:'default_event'};
}

export function guildPveActivitySummary(kind:GuildPveEncounter['kind'],startsAt?:string){
 return kind==='weekly'
  ? startsAt&&Date.parse(startsAt)<Date.parse('2026-11-09T00:00:00Z')
    ? 'Your boss-fight damage is your contribution. Each raid resolves after three minutes; you have three attempts for the weekly encounter.'
    : 'Three server-timed attempts each week. Raid contribution combines general combat (65%) and this boss’s role focus (35%); defence and support are stat-based estimates, not recorded heals or blocks.'
  : 'Your boss-fight damage is your contribution. Each raid resolves after three minutes; event encounters grant three attempts per seven days, up to nine total.';
}
export const GUILD_PVE_ALLOWANCE=30000;
export const GUILD_PVE_DAILY_CAP=6000;
export const GUILD_PVE_DAMAGE_PER_MINUTE=200;
export const GUILD_PVE_MIN_CONTRIBUTION=1000;
export const GUILD_PVE_MILESTONES=[{percent:25,gold:250},{percent:50,gold:500},{percent:100,gold:1000}] as const;
export const GUILD_PVE_BANK_REWARDS={
 weekly:{
  25:{gold:2500,xp:100,materials:{MOSS_FIBER:50,GREENWOOD_LOG:25}},
  50:{gold:5000,xp:200,materials:{IRONWOOD_LOG:40,ASTER_IRON_INGOT:10}},
  100:{gold:10000,xp:400,materials:{IRONWOOD_LOG:100,ASTER_IRON_INGOT:25,OATHGLASS_SHARD:5}},
 },
 event:{
  25:{gold:5000,xp:150,materials:{MOSS_FIBER:75,GREENWOOD_LOG:40}},
  50:{gold:10000,xp:300,materials:{IRONWOOD_LOG:75,ASTER_IRON_INGOT:20}},
  100:{gold:20000,xp:600,materials:{IRONWOOD_LOG:150,ASTER_IRON_INGOT:40,OATHGLASS_SHARD:10}},
 },
} as const;
export function guildPveBalance(members:number,durationDays=7){
 const rosterSize=members<=5?5:members<=8?8:members<=12?12:members<=16?16:20;
 const weeks=Math.max(1,Math.min(4,durationDays/7));
 return {rosterSize,maxHp:Math.ceil(rosterSize*15000*weeks),personalCap:Math.ceil(GUILD_PVE_ALLOWANCE*weeks),dailyCap:GUILD_PVE_DAILY_CAP};
}
export function guildPveView(row:GuildPveEncounter,now=Date.now()){
 const defeated=row.damage>=row.maxHp,expired=now>=Date.parse(row.claimEndsAt),ended=now>=Date.parse(row.endsAt),started=now>=Date.parse(row.startsAt);
 const allowance=Math.max(0,row.personalCap-row.allowanceUsed),dailyAllowance=Math.max(0,Math.min(allowance,row.dailyCap-row.dailyUsed));
 const attemptCap=Math.max(0,Math.floor(row.attemptCap??0)),attemptsUsed=Math.max(0,Math.floor(row.attemptsUsed??0)),attemptsRemaining=Math.max(0,attemptCap-attemptsUsed),pendingAttempts=Math.max(0,Math.floor(row.pendingAttempts??0)),requiredGuildLevel=Math.max(1,Math.floor(row.requiredGuildLevel??1)),guildLevel=Math.max(1,Math.floor(row.guildLevel??requiredGuildLevel)),requiredCharacterLevel=Math.max(1,Math.floor(row.requiredCharacterLevel??1)),characterLevel=Math.max(0,Math.floor(row.characterLevel??0));
 return {percent:Math.min(100,Math.max(0,row.damage/Math.max(1,row.maxHp)*100)),remaining:Math.max(0,row.maxHp-row.damage),allowance,dailyAllowance,
  attemptCap,attemptsUsed,attemptsRemaining,pendingAttempts,requiredGuildLevel,guildLevel,requiredCharacterLevel,characterLevel,
  active:started&&!ended&&!defeated,open:started&&!ended,canContribute:row.eligible&&guildLevel>=requiredGuildLevel&&(row.kind!=='event'||row.requiredCharacterLevel===undefined||row.characterLevel===undefined||characterLevel>=requiredCharacterLevel)&&pendingAttempts===0&&started&&!ended&&(attemptCap>0?attemptsRemaining>0:dailyAllowance>0),
  status:(expired?'Expired':defeated?'Defeated':ended?'Claim rewards':!started?'Upcoming':'In progress') as 'Expired'|'Defeated'|'Claim rewards'|'Upcoming'|'In progress',
  milestones:GUILD_PVE_MILESTONES.map(m=>({...m,gold:row.kind==='event'?m.gold:0,bank:GUILD_PVE_BANK_REWARDS[row.kind][m.percent],eventCurrency:row.kind==='event'?(m.percent===25?100:m.percent===50?200:400):0,candy:row.kind==='event'?(m.percent===100?2:1):0,candyKind:m.percent===25?'Skill' as const:m.percent===50?'Battle' as const:'Bond' as const,claimed:row.claimed.includes(m.percent),ready:row.eligible&&started&&!expired&&row.damage*100>=row.maxHp*m.percent&&row.personalDamage>=GUILD_PVE_MIN_CONTRIBUTION&&!row.claimed.includes(m.percent)}))};
}
