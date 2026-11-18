export type SharedWorldState='scheduled'|'active'|'secured'|'defeated'|'failed'|'expired'|'cancelled'|'finalized';
export interface CrisisSummary {instanceId:string;name:string;regionId:string;state:SharedWorldState;endsAt:string;targetPoints:number;creditedPoints:number;currentStageName:string;yourPoints:number;partyPoints?:number;guildPoints?:number;securedAt?:string;}
export interface WorldBossSummary {instanceId:string;name:string;regionId:string;state:SharedWorldState;endsAt:string;maxHp:number;remainingHp:number;phaseName:string;attemptsToday:number;dailyAttemptCap:number;yourRaidImpact:number;yourAppliedDamage:number;defeatedAt?:string;
  /** End of the post-defeat Echo window, when the server supplies it. */
  echoEndsAt?:string;
  /** Server verdict on this account's Echo eligibility; undefined means "check on entry". */
  echoEligible?:boolean;}

export function fraction(current:number,total:number):number{if(!Number.isFinite(current)||!Number.isFinite(total)||total<=0)return 0;return Math.max(0,Math.min(1,current/total));}

const COMPACT_UNITS:readonly [number,string][]=[[1_000_000_000,'B'],[1_000_000,'M'],[1000,'K']];
/** 999_950 renders as 1.0M, not 1000.0K; negative and non-finite values never leak into the UI. */
export function formatCompact(value:number):string{
  if(!Number.isFinite(value))return '0';
  const sign=value<0?'-':'',abs=Math.abs(value);
  for(let i=0;i<COMPACT_UNITS.length;i++){
    const [unit,suffix]=COMPACT_UNITS[i];
    if(abs<unit)continue;
    const scaled=Number((abs/unit).toFixed(1));
    if(scaled>=1000&&i>0){const [bigger,biggerSuffix]=COMPACT_UNITS[i-1];return `${sign}${(abs/bigger).toFixed(1)}${biggerSuffix}`;}
    return `${sign}${scaled.toFixed(1)}${suffix}`;
  }
  return sign+String(Math.floor(abs));
}

/** Progress toward a goal: rounds down so an unfinished goal never reads as 100%. */
export function progressPercent(current:number,total:number):number{const f=fraction(current,total);return f>=1?100:Math.min(99,Math.floor(f*100));}
/** Remaining HP: a living boss never reads as 0% and a damaged one never as 100%. */
export function remainingPercent(remaining:number,total:number):number{const f=fraction(remaining,total);if(f<=0)return 0;if(f>=1)return 100;return Math.min(99,Math.max(1,Math.round(f*100)));}
export function formatPercent(language:string,percent:number):string{return language==='de'||language==='fr'?`${percent} %`:`${percent}%`;}

export function bossAttemptsRemaining(boss:WorldBossSummary):number{return Math.max(0,boss.dailyAttemptCap-boss.attemptsToday);}
/** The Echo entry stays visible only while the server window is open and this account is still eligible. */
export function bossEchoAvailable(boss:WorldBossSummary,nowMs:number=Date.now()):boolean{
  if(boss.state!=='defeated'||boss.echoEligible===false)return false;
  const ends=boss.echoEndsAt?Date.parse(boss.echoEndsAt):Number.NaN;
  return Number.isNaN(ends)||nowMs<ends;
}

export function crisisSucceeded(crisis:CrisisSummary):boolean{return crisis.state==='secured'||(crisis.state==='finalized'&&Boolean(crisis.securedAt));}
export function crisisStatusLabel(crisis:CrisisSummary):string{
  if(crisisSucceeded(crisis))return 'Region Secured';
  if(crisis.state==='failed'||crisis.state==='expired'||crisis.state==='cancelled'||crisis.state==='finalized')return 'Crisis Ended';
  return crisis.currentStageName;
}

/** Milliseconds until an ISO timestamp; null when the timestamp is missing or invalid. */
export function msUntil(iso:string|undefined,nowMs:number=Date.now()):number|null{
  if(!iso)return null;
  const at=Date.parse(iso);
  return Number.isNaN(at)?null:Math.max(0,at-nowMs);
}
/** Compact, language-neutral duration: 1d 4h · 5h 12m · 12m · <1m. */
export function formatTimeLeft(ms:number):string{
  const minutes=Math.floor(Math.max(0,ms)/60_000);
  if(minutes<1)return '<1m';
  const days=Math.floor(minutes/1440),hours=Math.floor((minutes%1440)/60),mins=minutes%60;
  if(days>0)return hours>0?`${days}d ${hours}h`:`${days}d`;
  if(hours>0)return mins>0?`${hours}h ${mins}m`:`${hours}h`;
  return `${mins}m`;
}
