import {COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP,type CompanionAccountState} from './companion-runtime';
import {companionMission} from '../../../../backend/src/server/companions/content';
import {combatCompanionDef} from '../content/combat-companions';
import {newCompanionTrialSeasonState,newCompanionTrialLifetimeStats} from '../../../../backend/src/server/companions/trial-season';

const int=(v:unknown,max=Number.MAX_SAFE_INTEGER)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
const record=(v:unknown):Record<string,number>=>Object.fromEntries(Object.entries(v&&typeof v==='object'?v:{}).filter(([k,n])=>k.length<=120&&typeof n==='number'&&Number.isFinite(n)).slice(0,500).map(([k,n])=>[k,int(n)]));
const list=(v:unknown,max=100):string[]=>Array.isArray(v)?[...new Set(v.filter((x):x is string=>typeof x==='string'&&x.length<=120))].slice(0,max):[];
const month=(v:unknown)=>typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const iso=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function normalizeCompanionRuntimeSave(raw:any):CompanionAccountState {
  const a=raw??{};
  if(a.companionSchemaVersion!==undefined&&a.companionSchemaVersion!==1)throw new Error('Unsupported companion save version.');
  const out:CompanionAccountState={companionSchemaVersion:1,companionMaterials:record(a.companionMaterials),companionBossClears:record(a.companionBossClears),companionSpecialClears:list(a.companionSpecialClears),companionActionSequence:int(a.companionActionSequence),companionAssignmentBondstoneWeek:typeof a.companionAssignmentBondstoneWeek==='string'?a.companionAssignmentBondstoneWeek:undefined,companionAssignmentBondstones:int(a.companionAssignmentBondstones,1),companionRematchBondstoneWeek:typeof a.companionRematchBondstoneWeek==='string'?a.companionRematchBondstoneWeek:undefined,companionRematchBondstones:int(a.companionRematchBondstones,COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP)};
  out.companionAssignments=Array.isArray(a.companionAssignments)?a.companionAssignments.filter((x:any)=>x&&typeof x.assignmentId==='string'&&companionMission(x.missionId)&&iso(x.startedAt)&&iso(x.endsAt)&&Array.isArray(x.companionIds)&&x.companionIds.length<=3&&x.companionIds.every((id:string)=>!!combatCompanionDef(id))&&['active','completed','claimed','cancelled'].includes(x.status)&&typeof x.seed==='string').slice(-12).map((x:any)=>({...x,companionIds:list(x.companionIds,3)})):[];
  out.companionBondRewardClaims=list(a.companionBondRewardClaims,100);
  out.companionBattleReadyAtMs=int(a.companionBattleReadyAtMs);
  out.companionBossRematchReadyAtMs=int(a.companionBossRematchReadyAtMs);
  if(a.companionTrialProgress){
    const p=a.companionTrialProgress,s=p.season;if(!s||!month(s.seasonKey))throw new Error('Invalid companion Trial save.');
    const season={...newCompanionTrialSeasonState(s.seasonKey),...s};
    season.monthlyChallengeClaims=list(s.monthlyChallengeClaims,20);
    for(const key of ['firstClearFloors','bossRewardFloors'])season[key]=Array.isArray(s[key])?[...new Set(s[key].filter((x:unknown)=>typeof x==='number'&&Number.isInteger(x)&&x>=1&&x<=30))]:[];
    season.currentFloor=Math.max(1,int(s.currentFloor,30));season.checkpointFloor=Math.max(1,int(s.checkpointFloor,30));season.currentSeasonHighestFloor=int(s.currentSeasonHighestFloor,30);
    const run=s.activeRun;
    if(run&&(!Array.isArray(run.teamCompanionIds)||run.teamCompanionIds.length!==3||new Set(run.teamCompanionIds).size!==3||run.teamCompanionIds.some((id:string)=>!combatCompanionDef(id))||typeof run.runId!=='string'||typeof run.seed!=='string'||!Number.isInteger(run.currentFloor)||run.currentFloor<1||run.currentFloor>30||run.seasonKey!==s.seasonKey))throw new Error('Invalid active companion Trial.');
    out.companionTrialProgress={season,lifetime:{...newCompanionTrialLifetimeStats(),...record(p.lifetime)},archive:Array.isArray(p.archive)?p.archive.filter((x:any)=>x&&month(x.seasonKey)).slice(-36):[]};
  }
  if(a.companionProvingGround&&typeof a.companionProvingGround.weekKey==='string')out.companionProvingGround={weekKey:a.companionProvingGround.weekKey,progress:record(a.companionProvingGround.progress),completedIds:list(a.companionProvingGround.completedIds),claimedIds:list(a.companionProvingGround.claimedIds)};
  if(a.companionLastBattle&&typeof a.companionLastBattle.title==='string')out.companionLastBattle={title:a.companionLastBattle.title.slice(0,120),won:a.companionLastBattle.won===true,durationMs:int(a.companionLastBattle.durationMs),gold:int(a.companionLastBattle.gold),essence:int(a.companionLastBattle.essence),bondstones:int(a.companionLastBattle.bondstones),atMs:int(a.companionLastBattle.atMs)};
  return out;
}
