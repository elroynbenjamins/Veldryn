import {normalizeOnboardingGuideState,type GameGuideId} from './onboarding';

export interface GameGuideReadStorage{
 getItem(key:string):Promise<string|null>;
 setItem(key:string,value:string):Promise<void>;
}

/** A guide being read is a device preference, never authoritative gameplay progress. */
export function createGameGuideReadPreferenceStore(storage:GameGuideReadStorage){
 const prefix='veldryn.game-guide-read.v1:';
 const memory=new Map<string,GameGuideId[]>();
 const loading=new Map<string,Promise<GameGuideId[]>>();
 const writing=new Map<string,Promise<GameGuideId[]>>();
 const normalize=(value:unknown)=>normalizeOnboardingGuideState({seenGuideIds:value}).seenGuideIds;

 async function load(scope:string):Promise<GameGuideId[]>{
  if(!scope)return [];
  const cached=memory.get(scope);
  if(cached)return [...cached];
  let task=loading.get(scope);
  if(!task){
   task=(async()=>{
    let stored:GameGuideId[]=[];
    try{
     const raw=await storage.getItem(prefix+scope);
     stored=normalize(raw?JSON.parse(raw):[]);
    }catch{/* Device storage failure must not block reading the guide. */}
    const merged=normalize([...(memory.get(scope)??[]),...stored]);
    memory.set(scope,merged);
    return merged;
   })();
   loading.set(scope,task);
  }
  try{return [...await task]}finally{if(loading.get(scope)===task)loading.delete(scope)}
 }

 async function markRead(scope:string,id:GameGuideId):Promise<GameGuideId[]>{
  if(!scope||!normalize([id]).includes(id))return load(scope);
  // Serialize rapidly opened topics so older writes cannot overwrite newer reads.
  const previous=writing.get(scope)??Promise.resolve([] as GameGuideId[]);
  const task=previous.catch(()=>[]).then(async()=>{
   const current=await load(scope);
   const next=normalize([...current,id]);
   memory.set(scope,next);
   try{await storage.setItem(prefix+scope,JSON.stringify(next))}catch{/* Keep it read for this session. */}
   return [...next];
  });
  writing.set(scope,task);
  try{return await task}finally{if(writing.get(scope)===task)writing.delete(scope)}
 }
 return {load,markRead};
}
