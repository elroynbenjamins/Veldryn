export type HuntGoalKind='session_kills'|'champion_defeats'|'duration_seconds';
export type HuntGoalId='open'|'kills_50'|'kills_100'|'champion_1'|'duration_30m';
export interface HuntGoalSnapshot{kind:HuntGoalKind;value:number;label:string}
export interface HuntGoalDef{id:HuntGoalId;label:string;summary:string;goal?:HuntGoalSnapshot}
export const HUNT_GOAL_IDS:readonly HuntGoalId[]=['open','kills_50','kills_100','champion_1','duration_30m'];
export const HUNT_GOALS:Record<HuntGoalId,HuntGoalDef>={
 open:{id:'open',label:'Open',summary:'Run until you stop it, storage fills, or a safety rule triggers.'},
 kills_50:{id:'kills_50',label:'50 Kills',summary:'Stop after 50 kills in this hunt session.',goal:{kind:'session_kills',value:50,label:'50 kills'}},
 kills_100:{id:'kills_100',label:'100 Kills',summary:'Stop after 100 kills in this hunt session.',goal:{kind:'session_kills',value:100,label:'100 kills'}},
 champion_1:{id:'champion_1',label:'1 Champion',summary:'Stop after defeating the first rare Champion in this hunt.',goal:{kind:'champion_defeats',value:1,label:'1 Champion'}},
 duration_30m:{id:'duration_30m',label:'30 Min',summary:'Stop after 30 minutes of session time.',goal:{kind:'duration_seconds',value:1800,label:'30 minutes'}},
};
export function normalizeHuntGoalId(value:unknown):HuntGoalId{return HUNT_GOAL_IDS.includes(value as HuntGoalId)?value as HuntGoalId:'open'}
export function huntGoalSnapshot(value:unknown){return HUNT_GOALS[normalizeHuntGoalId(value)].goal}
