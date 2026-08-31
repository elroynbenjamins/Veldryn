export interface ClaimExpeditionRewardInput {
  runId: string;
  characterId: string;
  rewardStage: 'final' | 'boss_bonus' | 'helper';
  mapBaseMarks: number;
  objectiveMultiplier?: number;
  reachedFinalBoss?: boolean;
  finalBossHpFraction?: number | null;
}

export interface ClaimExpeditionRewardResult {
  claim_id?: string;
  marks: number;
  enhanced: boolean;
  reward_fraction: number;
  tier: 1 | 2 | 3 | 4 | 5;
  daily_enhanced_used_after: number;
  weekly_enhanced_used_after: number;
  idempotent_replay: boolean;
}
