import AsyncStorage from '@react-native-async-storage/async-storage';

/** Device-local visual preference. Never affects authoritative combat or rewards. */
const KEY='veldryn.coop.dungeon-playback-speed.v1';
export type DungeonPlaybackPreference=1|2;

export async function rememberedDungeonPlaybackSpeed():Promise<DungeonPlaybackPreference>{
 try{return (await AsyncStorage.getItem(KEY))==='2'?2:1;}catch{return 1;}
}
export async function rememberDungeonPlaybackSpeed(value:DungeonPlaybackPreference):Promise<void>{
 try{await AsyncStorage.setItem(KEY,String(value));}catch{/* UI playback preference is optional. */}
}
