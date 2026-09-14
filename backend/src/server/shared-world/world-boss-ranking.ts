export interface WorldBossRankCandidate {
  accountId:string;
  displayNameSnapshot?:string;
  raidImpact:number;
  appliedGlobalDamage:number;
  validAttempts:number;
  bestAttemptImpact:number;
  lastScoredAttemptAtMs:number;
}
export interface WorldBossFinalRank extends WorldBossRankCandidate {finalRank:number;}

/** Echo encounters never enter candidates. Ranking is prestige-only; power rewards must not scale sharply with rank. */
export function rankWorldBossCandidates(rows:readonly WorldBossRankCandidate[]):WorldBossFinalRank[]{
  return [...rows]
    .filter(x=>x.validAttempts>0&&x.raidImpact>0)
    .sort((a,b)=>b.raidImpact-a.raidImpact || b.appliedGlobalDamage-a.appliedGlobalDamage || b.bestAttemptImpact-a.bestAttemptImpact || a.lastScoredAttemptAtMs-b.lastScoredAttemptAtMs || a.accountId.localeCompare(b.accountId))
    .map((row,index)=>({...row,finalRank:index+1}));
}

export function worldBossPrestigeTier(rank:number,totalQualifiers:number):'top10'|'top100'|'top10pct'|'qualified'|null{
  if(rank<1||totalQualifiers<1||rank>totalQualifiers) return null;
  if(rank<=10) return 'top10';
  if(rank<=100) return 'top100';
  if(rank/totalQualifiers<=0.10) return 'top10pct';
  return 'qualified';
}
