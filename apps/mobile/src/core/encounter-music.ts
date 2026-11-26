import type {MusicSelectionId} from './audio-preferences';
/** Stable canonical IDs from the server catalogue; never use tier or random choice. */
const dungeonTracks:Readonly<Record<string,MusicSelectionId>>={
 EXP_001:'dungeon',EXP_002:'dungeon',EXP_003:'dungeon_A',EXP_004:'dungeon_A',EXP_005:'dungeon_B',EXP_006:'dungeon_B',
 EVENT_FROSTFALL_AURORA_HOLLOW:'frostfall_dungeon',
};
const bossTracks:Readonly<Record<string,MusicSelectionId>>={
 BOSS_EXP_ROOT:'boss','Rootbound Heart':'boss',
 BOSS_EXP_BELL:'boss_A','Bell-Warden':'boss_A',
 BOSS_EXP_SOLAR:'boss_B','The Buried Heliarch':'boss_B',
 BOSS_EXP_SPHINX:'boss_A','The Veiled Sphinx':'boss_A',
 BOSS_EXP_BELLBEAST:'boss_B','The Bellbeast of Shiverlake':'boss_B',
 BOSS_EXP_CANTOR:'boss','The Frozen Cantor':'boss',
};
const worldTracks:Readonly<Record<string,MusicSelectionId>>={hollowroot:'world_boss',sunscar:'world_boss_A',frostmarch:'world_boss_B'};
function known(map:Readonly<Record<string,MusicSelectionId>>,key:string|undefined):MusicSelectionId|undefined{
 return key&&Object.prototype.hasOwnProperty.call(map,key)?map[key]:undefined;
}
export function dungeonMusicFor(expeditionId?:string,region?:string):MusicSelectionId{
 return known(dungeonTracks,expeditionId)??(region==='Sunscar'?'dungeon_A':region==='Frostmarch'?'dungeon_B':'dungeon');
}
export function dungeonBossMusicFor(expeditionId?:string,bossId?:string,bossName?:string):MusicSelectionId{
 if(expeditionId==='EVENT_FROSTFALL_AURORA_HOLLOW')return 'frostfall_dungeon';
 return known(bossTracks,bossId)??known(bossTracks,bossName)??'boss';
}
export function worldBossMusicFor(bossId:string):MusicSelectionId{return known(worldTracks,bossId)??'world_boss';}
