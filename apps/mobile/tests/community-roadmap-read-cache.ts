import {CommunityRoadmapReadCache,COMMUNITY_ROADMAP_CACHE_TTL_MS} from '../src/core/community-roadmap-read-cache';

function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
async function tests(){
 const storage=new Map<string,string>();
 const adapter={
   getItem:async(key:string)=>storage.get(key)??null,
   setItem:async(key:string,value:string)=>{storage.set(key,value);},
 };
 let now=123456789,calls=0;
 const parse=(x:unknown):number=>{
   if(typeof x!=='number'||!Number.isFinite(x))throw new Error('invalid cache');
   return x;
 };
 const make=()=>new CommunityRoadmapReadCache<number>(adapter,parse,'test-roadmap',()=>now);
 const cache=make();
 const fetch=async()=>{calls++;return 101;};
 const first=await cache.read('account-a',fetch);
 check(first.value===101&&!first.fromCache&&!first.stale,'first visit fetches once');
 check(calls===1,'first read once');
 const second=await cache.read('account-a',fetch);
 check(second.value===101&&second.fromCache&&calls===1,
   'reopening within two hours must not fetch again');

 const restart=make();
 const persisted=await restart.read('account-a',async()=>{calls++;return 999;});
 check(persisted.value===101&&persisted.fromCache&&calls===1,
   'cache survives app restarts and avoids repeated RPCs');
 check((await restart.read('account-b',async()=>{calls++;return 22;})).value===22,
   'account changes do not leak personal votes');
 check(calls===2,'a second account gets exactly one independent fetch');

 now+=COMMUNITY_ROADMAP_CACHE_TTL_MS-1;
 check((await restart.read('account-a',async()=>{calls++;return 88;})).value===101,
   'before expiry cache stays fresh');
 now++;
 const expired=await restart.read('account-a',async()=>{calls++;return 202;});
 check(expired.value===202&&!expired.fromCache&&calls===3,
   'exactly two hours after success a new server read is permitted');
 const afterExpiry=await restart.read('account-a',async()=>{calls++;return 888;});
 check(afterExpiry.value===202&&calls===3,'new TTL starts after completed refresh');

 await restart.record('account-a',303);
 check((await restart.read('account-a',async()=>{calls++;return 888;})).value===303,
   'voting immediately updates display and cache without another read');
 check(calls===3,'vote update never requires an extra snapshot RPC');
 const restartAgain=make();
 check((await restartAgain.read('account-a',async()=>{calls++;return 777;})).value===303,
   'vote response persists across app restarts');

 // Multiple mounts after TTL share one request.
 now+=COMMUNITY_ROADMAP_CACHE_TTL_MS;
 let resolveFetch:(v:number)=>void=()=>{};
 const deferred=new Promise<number>(resolve=>{resolveFetch=resolve;});
 const concurrent1=restartAgain.read('account-a',()=>{calls++;return deferred;});
 const concurrent2=restartAgain.read('account-a',()=>{calls++;return Promise.resolve(0);});
 await Promise.resolve();
 resolveFetch(404);
 const [one,two]=await Promise.all([concurrent1,concurrent2]);
 check(one.value===404&&two.value===404&&calls===4,
   'two simultaneous screen opens must make one RPC');

 // A late read must not overwrite a more recent vote response.
 now+=COMMUNITY_ROADMAP_CACHE_TTL_MS;
 let resolveOld:(value:number)=>void=()=>{};
 const oldResponse=new Promise<number>(resolve=>{resolveOld=resolve;});
 const slow=restartAgain.read('account-a',()=>oldResponse);
 await Promise.resolve();
 await restartAgain.record('account-a',505);
 resolveOld(111);
 check((await slow).value===505,'in-flight stale read cannot replace vote result');
 check((await restartAgain.read('account-a',async()=>909)).value===505,
   'vote result remains authoritative in memory');
 check((await make().read('account-a',async()=>909)).value===505,
   'vote result remains authoritative in persisted cache');

 // Corrupt cache is rejected; a normal network fetch restores it.
 storage.set('test-roadmap:bad','{"updatedAtMs":99,"value":"corrupt"}');
 const repaired=await make().read('bad',async()=>606);
 check(repaired.value===606&&!repaired.fromCache,'corrupted cache must be discarded');

 // A transient outage leaves previously cached roadmap visible, marked stale.
 now+=COMMUNITY_ROADMAP_CACHE_TTL_MS;
 const fallback=await restartAgain.read('account-a',async()=>{throw new Error('offline');});
 check(fallback.value===505&&fallback.stale,'network outage can show cached roadmap');
 check(storage.size>=3,'multiple viewer records have independent persisted keys');

 console.log('PASS: two-hour persisted roadmap cache, singleflight, vote freshness, viewer isolation and offline fallback');
}
void tests().catch(error=>{console.error(error);throw error;});
