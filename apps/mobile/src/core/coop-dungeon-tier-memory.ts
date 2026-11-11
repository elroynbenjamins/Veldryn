import AsyncStorage from '@react-native-async-storage/async-storage';
import type {CoopTier} from './coop-dungeon-browsing';

/** Per-character last-chosen tier per dungeon. Preference only, never
 * authorization: the server still validates level, mode and availability. */
const KEY='veldryn.coop.dungeon-tier.v1';
const MAX_ENTRIES=64;
type Store=Record<string,Record<string,CoopTier>>;

function scope(characterId:string|undefined):string|undefined{
 return characterId&&characterId.length>0?characterId:undefined;
}

async function readStore():Promise<Store>{
 try{
  const raw=await AsyncStorage.getItem(KEY);
  if(!raw)return {};
  const parsed=JSON.parse(raw) as unknown;
  if(!parsed||typeof parsed!=='object')return {};
  return parsed as Store;
 }catch{return {};}
}

export async function rememberedCoopTier(characterId:string|undefined,dungeonId:string):Promise<CoopTier|undefined>{
 const key=scope(characterId);if(!key||!dungeonId)return undefined;
 const store=await readStore(),value=store[key]?.[dungeonId];
 return value===1||value===2||value===3||value===4||value===5?value:undefined;
}

export async function rememberCoopTier(characterId:string|undefined,dungeonId:string,tier:CoopTier):Promise<void>{
 const key=scope(characterId);if(!key||!dungeonId)return;
 try{
  const store=await readStore(),character=store[key]??{};
  character[dungeonId]=tier;
  const entries=Object.entries(character);
  if(entries.length>MAX_ENTRIES)store[key]=Object.fromEntries(entries.slice(entries.length-MAX_ENTRIES));
  else store[key]=character;
  await AsyncStorage.setItem(KEY,JSON.stringify(store));
 }catch{/* preference failure never blocks a dungeon action */}
}
