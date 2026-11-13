import AsyncStorage from '@react-native-async-storage/async-storage';

/** Per-character last-browsed equipment tier, per crafting skill. Presentation only:
 * the forge still checks character level, crafting level, materials and release state
 * before anything can be crafted, so a remembered tier can never unlock one. */
const KEY='veldryn.equipment.craft-tier.v1';
const MAX_ENTRIES=32;
type Store=Record<string,Record<string,string>>;

const isTier=(value:unknown):value is string=>typeof value==='string'&&/^T[1-9]$/.test(value);
const scope=(characterId:string|undefined)=>characterId&&characterId.length>0?characterId:undefined;

async function readStore():Promise<Store>{
 try{
  const raw=await AsyncStorage.getItem(KEY);
  if(!raw)return {};
  const parsed=JSON.parse(raw) as unknown;
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};
  return parsed as Store;
 }catch{return {};}
}

export async function rememberedEquipmentTier(characterId:string|undefined,skillId:string):Promise<string|undefined>{
 const key=scope(characterId);if(!key||!skillId)return undefined;
 const value=(await readStore())[key]?.[skillId];
 return isTier(value)?value:undefined;
}

export async function rememberEquipmentTier(characterId:string|undefined,skillId:string,tier:string):Promise<void>{
 const key=scope(characterId);if(!key||!skillId||!isTier(tier))return;
 try{
  const store=await readStore(),character={...(store[key]??{}),[skillId]:tier};
  const entries=Object.entries(character);
  store[key]=entries.length>MAX_ENTRIES?Object.fromEntries(entries.slice(entries.length-MAX_ENTRIES)):character;
  await AsyncStorage.setItem(KEY,JSON.stringify(store));
 }catch{/* a browsing preference never blocks a forge action */}
}
