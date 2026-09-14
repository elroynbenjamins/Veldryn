export interface RegionZoneCardV21{id:string;name:string;levelRange:string;locked:boolean;identity:string;activities:readonly string[];hazards:readonly string[];}
export interface RegionProgressV21{storyCompleted:number;storyTotal:number;sideQuestsCompleted:number;sideQuestsTotal:number;echoesCompleted:number;echoesTotal:number;dungeonsCompleted:number;dungeonsTotal:number;collectionEntries:number;collectionTotal:number;bossMasteryTier:number;bossMasteryMax:number;}
export interface RegionWeatherV21{name:string;endsInSeconds:number;summary:string;}
export interface RegionDungeonCardV21{id:string;name:string;minLevel:number;locked:boolean;modeAvailability:'live_and_q';}
export function frostmarchProgressFromState(state:Pick<GameState,'regionalProgressById'|'unlockedMonsterIds'|'defeatedBossIds'>):RegionProgressV21{
 const source=state.regionalProgressById?.REG_003??{};
 const collectionFromState=state.unlockedMonsterIds.filter(id=>/^FRMON_\d{3}$/.test(id)).length;
 const masteryFromState=state.defeatedBossIds.includes('BOSS_003')?1:0;
 return {storyCompleted:Math.min(10,source.storyCompleted??0),storyTotal:10,sideQuestsCompleted:Math.min(8,source.sideQuestsCompleted??0),sideQuestsTotal:8,echoesCompleted:Math.min(4,source.echoesCompleted??0),echoesTotal:4,dungeonsCompleted:Math.min(3,source.dungeonsCompleted??0),dungeonsTotal:3,collectionEntries:Math.min(16,Math.max(source.collectionEntries??0,collectionFromState)),collectionTotal:16,bossMasteryTier:Math.min(4,Math.max(source.bossMasteryTier??0,masteryFromState)),bossMasteryMax:4};
}
export function completionPercentV21(p:RegionProgressV21):number{const a=[p.storyCompleted/p.storyTotal,p.sideQuestsCompleted/p.sideQuestsTotal,p.echoesCompleted/p.echoesTotal,p.dungeonsCompleted/p.dungeonsTotal,p.collectionEntries/p.collectionTotal,p.bossMasteryTier/p.bossMasteryMax].map(v=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):0);return Math.round(a.reduce((x,y)=>x+y,0)/a.length*100);}
export function formatRegionTimerV21(seconds:number):string{const s=Math.max(0,Math.floor(seconds));const h=Math.floor(s/3600);const m=Math.floor((s%3600)/60);return h>0?`${h}h ${m}m`:`${m}m`;}
export function nextRegionalGoalV21(p:RegionProgressV21):string{if(p.storyCompleted<p.storyTotal)return 'Continue regional story';if(p.sideQuestsCompleted<p.sideQuestsTotal)return 'Complete regional side quests';if(p.echoesCompleted<p.echoesTotal)return 'Resolve remaining Echo conditions';if(p.dungeonsCompleted<p.dungeonsTotal)return 'Complete regional co-op content';if(p.collectionEntries<p.collectionTotal)return 'Fill the regional collection book';if(p.bossMasteryTier<p.bossMasteryMax)return 'Advance regional boss mastery';return 'Region complete';}
import type {GameState} from './types';
