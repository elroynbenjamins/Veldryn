export type DungeonRole='tank'|'damage'|'support';
export type QueueState='idle'|'queued'|'matched'|'ready_check'|'in_run';
export interface DungeonQueueStatusV20 {state:QueueState;contentId:string;contentName:string;role:DungeonRole;waitSeconds:number;estimatedWaitSeconds?:number;playersFound:number;requiredPlayers:4;}
export interface ReadyMemberV20 {accountId:string;displayName:string;role:DungeonRole;ready:boolean;you:boolean;}
export interface DungeonReadyCheckV20 {contentName:string;expiresInSeconds:number;members:readonly ReadyMemberV20[];}
export interface DungeonRouteOptionV20 {id:string;name:string;type:string;risk:'Low'|'Medium'|'High';rewardHint:string;votes:number;selectedByYou:boolean;}
export interface DungeonRunSummaryV20 {runId:string;contentName:string;nodeIndex:number;nodesTotal:number;currentNodeName:string;bossName:string;party:readonly ReadyMemberV20[];voteSecondsRemaining?:number;routeOptions?:readonly DungeonRouteOptionV20[];connectionWarning?:string;}
export interface SunscarZoneSummaryV20 {id:string;name:string;levelRange:string;locked:boolean;identity:string;activities:readonly string[];}
export interface SetBonusProgressV20 {setName:string;equippedPieces:number;thresholds:readonly {pieces:number;label:string;active:boolean}[];}
export function formatWait(seconds:number):string{const s=Math.max(0,Math.floor(seconds));return s<60?`${s}s`:`${Math.floor(s/60)}m ${String(s%60).padStart(2,'0')}s`;}
export function readyCount(check:DungeonReadyCheckV20):number{return check.members.filter(m=>m.ready).length;}
export function routeVoteLeader(options:readonly DungeonRouteOptionV20[]):string|undefined{return [...options].sort((a,b)=>b.votes-a.votes||a.id.localeCompare(b.id))[0]?.id;}
export function setBonusSummary(progress:SetBonusProgressV20):string{return progress.thresholds.filter(t=>t.active).map(t=>`${t.pieces}pc`).join(' + ')||'No bonus active';}
