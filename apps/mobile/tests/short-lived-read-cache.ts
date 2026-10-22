import {ShortLivedReadCache} from '../src/core/short-lived-read-cache';
function assert(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
async function test(){
 const cache=new ShortLivedReadCache<number>(1000,2);
 const realNow=Date.now;
 let now=5000,calls=0;
 Date.now=()=>now;
 try{
  let release:(value:number)=>void=()=>{};
  const pending=cache.read('accountA:guildA',()=>{calls++;return new Promise<number>(resolve=>{release=resolve;});});
  const same=cache.read('accountA:guildA',()=>{calls++;return Promise.resolve(99);});
  await Promise.resolve();assert(calls===1,'simultaneous reads share one query');
  release(10);assert(await pending===10&&await same===10,'singleflight result reused');
  assert(await cache.read('accountA:guildA',async()=>99)===10,'fresh response reused');
  assert(await cache.read('accountB:guildA',async()=>20)===20,'viewer separation');
  now+=999;assert(await cache.read('accountA:guildA',async()=>99)===10,'TTL measured from completion');
  now+=1;assert(await cache.read('accountA:guildA',async()=>{calls++;return 30;})===30,'expired data revalidated');
  cache.invalidate('accountA:guildA');
  assert(await cache.read('accountA:guildA',async()=>40)===40,'mutation invalidates immediately');
  let finishOld:(value:number)=>void=()=>{};
  const old=cache.read('accountA:guildA',()=>new Promise<number>(resolve=>{finishOld=resolve;}),true);
  await Promise.resolve();cache.invalidate('accountA:guildA');
  const newer=cache.read('accountA:guildA',async()=>50);
  finishOld(5);assert(await old===5&&await newer===50,'in-flight revoked reads do not replace newer data');
  assert(await cache.read('accountA:guildA',async()=>99)===50,'late old response never caches');
  cache.invalidate('accountA:guildA');
  try{await cache.read('accountA:guildA',async()=>{throw new Error('network');});throw new Error('expected failure');}catch(e){assert((e as Error).message==='network','network failure passes through');}
  assert(await cache.read('accountA:guildA',async()=>60)===60,'failed requests not cached');
  await cache.read('accountC:guildC',async()=>70);
  await cache.read('accountD:guildD',async()=>80);
  assert(await cache.read('accountA:guildA',async()=>90)===90,'bounded cache evicts oldest entry');
  cache.clear();assert(await cache.read('accountA:guildA',async()=>100)===100,'clear invalidates viewer data');
  console.log('PASS short lived cache: singleflight, account isolation, TTL, mutation, races, failures, bounds');
 }finally{Date.now=realNow;}
}
void test().catch(error=>{console.error(error);throw error;});
