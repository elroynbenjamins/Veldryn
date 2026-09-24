import {normalizeFirstSessionTutorialCompleted,type FirstSessionTutorialId} from './first-session-tutorial';
export interface TutorialPreferenceStorage{getItem(key:string):Promise<string|null>;setItem(key:string,value:string):Promise<void>}
/** Presentation preferences only. Failure must never mutate gameplay or stop a tutorial action. */
export function createTutorialPreferenceStore(storage:TutorialPreferenceStorage){
 const prefix='veldryn.first-session-tutorial.v1:';
 const memory=new Map<string,FirstSessionTutorialId[]>();
 const loading=new Map<string,Promise<FirstSessionTutorialId[]>>();
 const writing=new Map<string,Promise<FirstSessionTutorialId[]>>();
 async function load(characterId:string):Promise<FirstSessionTutorialId[]>{
  if(!characterId)return [];
  const cached=memory.get(characterId);if(cached)return [...cached];
  let task=loading.get(characterId);
  if(!task){
   task=(async()=>{
    let ids:FirstSessionTutorialId[]=[];
    try{const raw=await storage.getItem(prefix+characterId);ids=normalizeFirstSessionTutorialCompleted(raw?JSON.parse(raw):[])}catch{/* Best effort; play can continue. */}
    const merged=normalizeFirstSessionTutorialCompleted([...(memory.get(characterId)??[]),...ids]);memory.set(characterId,merged);return merged;
   })();loading.set(characterId,task);
  }
  try{return [...await task]}finally{if(loading.get(characterId)===task)loading.delete(characterId)}
 }
 async function complete(characterId:string,id:FirstSessionTutorialId):Promise<FirstSessionTutorialId[]>{
  if(!characterId)return [];
  if(!normalizeFirstSessionTutorialCompleted([id]).length)return load(characterId);
  // Serialize writes per character so closely spaced acknowledgements cannot overwrite each other.
  const previous=writing.get(characterId)??Promise.resolve([] as FirstSessionTutorialId[]);
  const task=previous.catch(()=>[]).then(async()=>{
   const current=await load(characterId),next=normalizeFirstSessionTutorialCompleted([...current,id]);memory.set(characterId,next);
   try{await storage.setItem(prefix+characterId,JSON.stringify(next))}catch{/* A later acknowledgement retries the full in-memory set. */}
   return [...next];
  });writing.set(characterId,task);
  try{return await task}finally{if(writing.get(characterId)===task)writing.delete(characterId)}
 }
 return {load,complete};
}
