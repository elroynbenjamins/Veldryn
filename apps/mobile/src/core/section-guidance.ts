/** Tab guidance is presentation state only. It never gates gameplay or spends resources. */
export interface SectionGuideStorage {
 getItem(key:string):Promise<string|null>;
 setItem(key:string,value:string):Promise<void>;
}
const COMPANION_SECTIONS=['Collection','Training','Sanctuary','Trials','Expeditions','Codex'] as const;
export function cleanSectionGuideIds(value:unknown):string[]{
 return Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'&&id.length>0&&id.length<=60))]:[];
}
export function createSectionGuideStore(storage:SectionGuideStorage){
 const memory=new Map<string,string[]>();
 const loads=new Map<string,Promise<string[]>>();
 const writes=new Map<string,Promise<void>>();
 const key=(scope:string,area:string)=>`veldryn.section-guidance.v1:${area}:${scope}`;
 async function load(scope:string,area:string):Promise<string[]>{
  if(!scope||!area)return [];
  const id=key(scope,area);
  const cached=memory.get(id);if(cached)return [...cached];
  let task=loads.get(id);
  if(!task){
   task=(async()=>{
    let done:string[]=[];
    try{
     const raw=await storage.getItem(id);
     done=cleanSectionGuideIds(raw?JSON.parse(raw):[]);
     // Preserve progress from the previous six-screen Companion tour rather
     // than replaying completed steps after upgrading the app.
     if(area==='companions'&&!raw){
      const prior=await storage.getItem('veldryn.companion-tour.v1:'+scope);
      const count=prior?JSON.parse(prior):0;
      if(Number.isInteger(count)&&count>0)done=COMPANION_SECTIONS.slice(0,Math.min(count,COMPANION_SECTIONS.length));
     }
    }catch{/* Optional help must work even without local storage. */}
    const merged=cleanSectionGuideIds([...(memory.get(id)??[]),...done]);
    memory.set(id,merged);return [...merged];
   })();
   loads.set(id,task);
  }
  try{return [...await task]}finally{if(loads.get(id)===task)loads.delete(id);}
 }
 async function complete(scope:string,area:string,section:string):Promise<string[]>{
  if(!scope||!area||!section)return [];
  const id=key(scope,area);
  const previous=writes.get(id)??Promise.resolve();
  const task=previous.catch(()=>{}).then(async()=>{
   const current=await load(scope,area);
   const next=cleanSectionGuideIds([...current,section]);
   memory.set(id,next);
   try{await storage.setItem(id,JSON.stringify(next));}catch{/* Keep a session-local acknowledgement. */}
  });
  writes.set(id,task);
  try{await task;return [...(memory.get(id)??[])]}
  finally{if(writes.get(id)===task)writes.delete(id);}
 }
 return {load,complete};
}
