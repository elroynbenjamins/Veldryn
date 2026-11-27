/** Device-local presentation state only. Never used for progress, access or rewards. */
export interface JournalPreferenceStorage {getItem(key:string):Promise<string|null>;setItem(key:string,value:string):Promise<void>}
type Identity={accountId:string;characterId:string};
type Tab='story'|'quests'|'challenges'|'records';
type Region='ASTERFALL'|'SUNSCAR'|'FROSTMARCH';
type Filter='current'|'all'|'completed'|'locked';
type Preferences={tab:Tab;regionId?:Region;filter:Filter;zoneId?:string;pinnedQuestId?:string;dismissed:string[]};
type AccountPreferences={learned:string[]};
const initial=():Preferences=>({tab:'story',filter:'current',dismissed:[]});
const valid=(s:unknown):s is string=>typeof s==='string'&&s.length>0&&s.length<=160;
const ids=(x:unknown):string[]=>Array.isArray(x)?[...new Set(x.filter(valid))].slice(0,256):[];
const allowedTabs=['story','quests','challenges','records'];
const regions=['ASTERFALL','SUNSCAR','FROSTMARCH'];
const filters=['current','all','completed','locked'];
const clean=(x:unknown):Preferences=>{
 const o=(x&&typeof x==='object'?x:{}) as Partial<Preferences>;
 return {tab:allowedTabs.includes(o.tab??'')?o.tab!:'story',filter:filters.includes(o.filter??'')?o.filter!:'current',...(regions.includes(o.regionId??'')?{regionId:o.regionId}:{}),...(valid(o.zoneId)?{zoneId:o.zoneId}:{}),...(valid(o.pinnedQuestId)?{pinnedQuestId:o.pinnedQuestId}:{}),dismissed:ids(o.dismissed)};
};
export function createStoryJournalPreferenceStore(storage:JournalPreferenceStorage){
 const memory=new Map<string,unknown>(),pending=new Map<string,Promise<unknown>>();
 const key=(scope:Identity,account=false)=>valid(scope?.accountId)&&valid(scope?.characterId)?'veldryn.journal2.review.v1:'+encodeURIComponent(scope.accountId)+(account?':account':':character:'+encodeURIComponent(scope.characterId)):null;
 async function transact<T>(k:string,normalize:(x:unknown)=>T,update?:(old:T)=>T):Promise<T>{
  const previous=pending.get(k)??Promise.resolve();
  const task=previous.catch(()=>undefined).then(async()=>{
   let raw=memory.get(k);
   if(!memory.has(k)){try{const stored=await storage.getItem(k);raw=stored?JSON.parse(stored):null;}catch{raw=null;}}
   const old=normalize(raw),next=normalize(update?update(old):old);
   memory.set(k,next);
   if(update)try{await storage.setItem(k,JSON.stringify(next));}catch{/* preferences are non-critical, retain in memory */}
   return structuredClone(next);
  });
  pending.set(k,task);
  try{return await task;}finally{if(pending.get(k)===task)pending.delete(k);}
 }
 const accountClean=(x:unknown):AccountPreferences=>({learned:ids((x as Partial<AccountPreferences>|null)?.learned)});
 async function load(scope:Identity){
  const c=key(scope),a=key(scope,true);
  if(!c||!a)return {preferences:initial(),accountSeen:[] as string[]};
  const [preferences,account]=await Promise.all([transact(c,clean),transact(a,accountClean)]);
  return {preferences,accountSeen:account.learned};
 }
 async function update(scope:Identity,patch:Partial<Omit<Preferences,'dismissed'>>){
  const k=key(scope);return k?transact(k,clean,old=>({...old,...patch})):initial();
 }
 async function dismiss(scope:Identity,tipId:string){
  const k=key(scope);return k&&valid(tipId)?transact(k,clean,old=>({...old,dismissed:[...old.dismissed,tipId]})):initial();
 }
 async function learn(scope:Identity,tipId:string){
  const k=key(scope,true);return k&&valid(tipId)?transact(k,accountClean,old=>({learned:[...old.learned,tipId]})):{learned:[]};
 }
 return {load,update,dismiss,learn};
}
