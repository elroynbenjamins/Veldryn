import AsyncStorage from '@react-native-async-storage/async-storage';
import type {FirstSessionTutorialId} from '../core/first-session-tutorial';

const PREFIX='veldryn.first-session-tutorial.v1:';
const key=(characterId:string)=>PREFIX+characterId;
const valid=new Set<FirstSessionTutorialId>(['first_hunt','first_skill','ironwood_hunt','gear_check','level_ten','core_loop_complete']);

export async function loadFirstSessionTutorialCompleted(characterId:string){
 const raw=await AsyncStorage.getItem(key(characterId));
 if(!raw)return [] as FirstSessionTutorialId[];
 try{
  const parsed=JSON.parse(raw);
  return Array.isArray(parsed)?[...new Set(parsed.filter((id):id is FirstSessionTutorialId=>typeof id==='string'&&valid.has(id as FirstSessionTutorialId)))]:[];
 }catch{return [];}
}

export async function completeFirstSessionTutorialStep(characterId:string,id:FirstSessionTutorialId){
 const current=await loadFirstSessionTutorialCompleted(characterId);
 if(current.includes(id))return current;
 const next=[...current,id];
 await AsyncStorage.setItem(key(characterId),JSON.stringify(next));
 return next;
}
