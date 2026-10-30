import type {QModeRun} from '../src/server/coop/qmode';
import {projectCombatReplay} from '../src/server/coop/combat-replay-projection';

/** Real wall-clock pacing. Damage, cooldowns and battle rewards still use the
 * unmodified deterministic combat simulation; only the Live reveal is paced. */
export const LIVE_DUNGEON_PACING=Object.freeze({
 standardVoteMs:8_000,
 eventVoteMs:10_000,
 readyCheckMs:20_000,
 normal:{min:15_000,max:30_000,scale:.26},
 elite:{min:25_000,max:40_000,scale:.30},
 boss:{min:40_000,max:60_000,scale:.38},
});

export function liveNodeWaitMs(kind:string,simulatedDurationMs:number):number {
 if(kind!=='battle'&&kind!=='elite'&&kind!=='boss')return 0;
 const rule=kind==='boss'?LIVE_DUNGEON_PACING.boss:kind==='elite'?LIVE_DUNGEON_PACING.elite:LIVE_DUNGEON_PACING.normal;
 const duration=Number.isFinite(simulatedDurationMs)?Math.max(0,simulatedDurationMs):0;
 return Math.max(rule.min,Math.min(rule.max,Math.round(duration*rule.scale)));
}

/** Only reveal already elapsed battle cues. Never disclose victory/wipe,
 * final health, contribution totals or unreleased rewards before settlement.
 * All peers derive the same cue horizon from the server clock. */
export function livePendingCombat(run:QModeRun,elapsedMs:number,waitMs:number){
 const replay=projectCombatReplay(run.lastResolution);
 if(!replay||waitMs<=0)return undefined;
 const progress=Math.max(0,Math.min(.999,elapsedMs/waitMs));
 const horizon=replay.durationMs*progress;
 return {
  nodeId:replay.nodeId,
  durationMs:replay.durationMs,
  elapsedMs:Math.max(0,Math.min(waitMs,elapsedMs)),
  wallDurationMs:waitMs,
  combatants:replay.combatants,
  cues:replay.cues.filter(cue=>cue.atMs<=horizon&&!['victory','wipe','timeout'].includes(cue.type)),
  statuses:replay.statuses.filter(status=>status.startsAtMs<=horizon),
  gemStates:replay.gemStates.filter(snapshot=>snapshot.atMs<=horizon),
 };
}
