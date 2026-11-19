import {hash32} from './rng';
import type {GameState} from './types';
import type {SeasonalActivity} from './seasonal-quests';
import {ensurePersonalSeasonalState,updatePersonalSeasonalState} from './personal-seasonal-state';

/** Unlike room contracts, these use the existing per-character weekly
 * quest claim and reward system. Counts come from committed dungeon results
 * queried by the authenticated game server, never the mobile app. */
export interface VerifiedDungeonWeeklyMetrics {
 clears:number;
 deep15:number;
 elite3:number;
}
export const WEEKLY_DUNGEON_OBJECTIVES=[
 {metric:'clears',name:'Dungeon Duty',description:'Defeat a dungeon boss this week.',required:1},
 {metric:'deep15',name:'Deep Delver',description:'Reach room 15 in one dungeon run this week.',required:1},
 {metric:'elite3',name:'Elite Hunter',description:'Defeat 3 elite rooms in a single dungeon run this week.',required:1},
] as const;
export type WeeklyDungeonObjective=(typeof WEEKLY_DUNGEON_OBJECTIVES)[number];

export function dungeonWeeklyObjective(weekKey:string):WeeklyDungeonObjective{
 return WEEKLY_DUNGEON_OBJECTIVES[hash32('dungeon-weekly-v1:'+weekKey)%WEEKLY_DUNGEON_OBJECTIVES.length];
}
export function verifiedDungeonWeeklyCount(weekKey:string,metrics:VerifiedDungeonWeeklyMetrics):number{
 const metric=dungeonWeeklyObjective(weekKey).metric;
 const value=metrics[metric];
 return Number.isSafeInteger(value)&&value>=0?Math.min(value,1):0;
}

/** Replaces only the dungeon weekly counter, preserving all other season
 * achievements and personal claim receipts. The server must call this with
 * its own trusted SQL metrics before accepting a weekly dungeon claim. */
export function projectVerifiedDungeonWeeklyProgress(state:GameState,weekKey:string,metrics:VerifiedDungeonWeeklyMetrics):GameState{
 const ready=ensurePersonalSeasonalState(state);
 if(!ready.character)return ready;
 const previous=ready.character.personalSeasonal?.progress??{};
 const same=previous.weekly?.key===weekKey;
 const counts:Partial<Record<SeasonalActivity,number>>=same?{...previous.weekly!.counts}:{};
 counts.dungeon=verifiedDungeonWeeklyCount(weekKey,metrics);
 const weekly={key:weekKey,counts,...(same&&previous.weekly?.tags?.length?{tags:[...previous.weekly.tags]}:{})};
 return updatePersonalSeasonalState(ready,{progress:{...previous,weekly}});
}
