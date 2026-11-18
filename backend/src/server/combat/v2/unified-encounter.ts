/**
 * Combined Combat 2.0 private entrypoint: equipment is validated in each
 * server-compiled character build; enemies use authored opt-in behaviors.
 *
 * This file has NO live game route importer. Missing equipment affix math and
 * boss final balance deliberately remain outside the production game.
 */
import {simulateCombat} from '../engine';
import type {CombatInput,CombatResult} from '../types';
import {simulateCombatWithSkillsV2,type VerifiedSkillBuildV2} from './skill-effects';
import {compileEnemiesForCombatV2} from './enemy-bridge';

export interface UnifiedV2CombatResult{
  readonly combat:CombatResult;
  readonly enemyMechanicLabels:readonly string[];
}
export function simulateUnifiedCombatV2(
  input:CombatInput,
  verifiedBuilds:readonly VerifiedSkillBuildV2[],
  serverEnabled=false,
):UnifiedV2CombatResult{
  if(!serverEnabled)return {combat:simulateCombat(input),enemyMechanicLabels:[]};
  const enhanced=compileEnemiesForCombatV2(input.enemies,true);
  const combat=simulateCombatWithSkillsV2({
    ...input,enemies:[...enhanced.enemies],
  },verifiedBuilds,true);
  return {combat,enemyMechanicLabels:enhanced.mechanicLabels};
}
