/** Dedicated dungeon-only weekly quests. No dependencies on Class Challenges,
 * monthly quest points, or the generic quest claim/rotation systems. */
export const DUNGEON_WEEKLY_REWARD_MARKS=25;
export const DUNGEON_WEEKLY_QUESTS=[
 {id:'clears',name:'Dungeon Duty',description:'Defeat a dungeon boss this week.',target:1},
 {id:'deep15',name:'Deep Delver',description:'Reach room 15 in a single dungeon run this week.',target:15},
 {id:'elite3',name:'Elite Hunter',description:'Defeat 3 elite encounters in a single dungeon run this week.',target:3},
] as const;
export type DungeonWeeklyQuestId=(typeof DUNGEON_WEEKLY_QUESTS)[number]['id'];
export interface DungeonWeeklyQuestSnapshot{
 weekKey:string;
 id:DungeonWeeklyQuestId;
 name:string;
 description:string;
 progress:number;
 target:1|3|15;
 rewardMarks:number;
 claimed:boolean;
 resetAtMs:number;
}
export function dungeonWeeklyQuestForWeek(weekKey:string){
 if(!/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(weekKey))throw new Error('invalid_dungeon_week');
 const week=Number(weekKey.slice(-2));
 return DUNGEON_WEEKLY_QUESTS[week%DUNGEON_WEEKLY_QUESTS.length];
}
export function validateDungeonWeeklyQuestSnapshot(raw:unknown):DungeonWeeklyQuestSnapshot{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('invalid_dungeon_weekly_quest');
 const data=raw as Record<string,unknown>;
 const weekKey=String(data.weekKey??'');
 const quest=dungeonWeeklyQuestForWeek(weekKey);
 if(data.id!==quest.id||data.name!==quest.name||data.description!==quest.description||
   !Number.isSafeInteger(data.progress)||Number(data.progress)<0||Number(data.progress)>quest.target||
   data.target!==quest.target||Number(data.progress)>quest.target||data.rewardMarks!==DUNGEON_WEEKLY_REWARD_MARKS||typeof data.claimed!=='boolean'||
   !Number.isSafeInteger(data.resetAtMs)||Number(data.resetAtMs)<0)throw new Error('invalid_dungeon_weekly_quest');
 return data as unknown as DungeonWeeklyQuestSnapshot;
}
