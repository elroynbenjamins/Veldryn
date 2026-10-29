import AsyncStorage from '@react-native-async-storage/async-storage';
import {markUnlockInboxSeen,mergeUnlockInbox,normalizeUnlockInbox,type UnlockInboxEntry} from '../core/unlock-inbox';

const PREFIX='veldryn.unlock-inbox.v1:';
const queues=new Map<string,Promise<void>>();
function storageKey(scope:string){return PREFIX+scope;}
export async function loadUnlockInbox(scope:string):Promise<UnlockInboxEntry[]>{
 try{const raw=await AsyncStorage.getItem(storageKey(scope));return normalizeUnlockInbox(raw?JSON.parse(raw):[]);}catch{return [];}
}
function serialize(scope:string,change:(current:UnlockInboxEntry[])=>UnlockInboxEntry[]):Promise<UnlockInboxEntry[]>{
 let result:UnlockInboxEntry[]=[];
 const previous=queues.get(scope)??Promise.resolve();
 const task=previous.catch(()=>{}).then(async()=>{
  const current=await loadUnlockInbox(scope);
  result=change(current);
  await AsyncStorage.setItem(storageKey(scope),JSON.stringify(result));
 });
 queues.set(scope,task);
 return task.then(()=>result).finally(()=>{if(queues.get(scope)===task)queues.delete(scope);});
}
export function addUnlockInboxEntries(scope:string,entries:readonly UnlockInboxEntry[]){
 if(!entries.length)return Promise.resolve([] as UnlockInboxEntry[]);
 return serialize(scope,current=>mergeUnlockInbox(current,entries));
}
export function markUnlockInboxRead(scope:string){
 return serialize(scope,markUnlockInboxSeen);
}
