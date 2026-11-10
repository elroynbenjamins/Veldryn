import {assert} from './test-assert';
import {CoopDungeonBrowseCache,COOP_BROWSE_CATALOG_MAX_AGE_MS} from '../src/core/coop-dungeon-browse-cache';
import type {CoopDungeonProjection} from '../src/core/coop-dungeon-browsing';

async function main(){
 const raw=new Map<string,string>();let reads=0,writes=0,now=1_750_000_000_000;
 const storage={
  getItem:async(key:string)=>{reads++;return raw.get(key)??null;},
  setItem:async(key:string,value:string)=>{writes++;raw.set(key,value);}
 };
 const dungeon:CoopDungeonProjection={id:'EXP_001',name:'Rootbound Vault',minLevel:25,syncLevel:25,available:true,difficulties:[1,2,3]};
 const accountOne='production:account-one:character-1',accountTwo='production:account-two:character-1';
 const cache=new CoopDungeonBrowseCache(storage,()=>now);
 assert.equal(await cache.read(accountOne),undefined,'empty cache returns no catalog');
 await cache.save(accountOne,[dungeon]);
 assert.equal(writes,1,'only one persisted catalog write occurs');
 assert.equal(cache.peek(accountOne)?.dungeons[0].name,dungeon.name,'warm reopen reads in memory');
 const restored=new CoopDungeonBrowseCache(storage,()=>now);
 assert.equal((await restored.read(accountOne))?.dungeons[0].id,'EXP_001','cold reopen hydrates the catalog from device storage');
 const before=reads;
 assert.equal((await restored.read(accountOne))?.dungeons.length,1,'subsequent visits remain cached');
 assert.equal(reads,before,'a warm visit must not repeat a storage read');
 assert.equal(await restored.read(accountTwo),undefined,'cached entries never cross account boundaries');
 assert.equal(await restored.read('production:account-one:character-2'),undefined,'each character has its own unlock/lock view');
 const keys=[...raw.keys()];
 assert.ok(keys.length===1&&keys[0].includes('dungeon-catalog'),'only a dungeon browse snapshot is stored');
 assert.ok(!raw.get(keys[0])!.includes('activeRun')&&!raw.get(keys[0])!.includes('loadouts'),'private dynamic co-op data is not persisted');
 now+=COOP_BROWSE_CATALOG_MAX_AGE_MS+1;
 assert.equal(await new CoopDungeonBrowseCache(storage,()=>now).read(accountOne),undefined,'expired catalog cannot appear indefinitely offline');
 now-=COOP_BROWSE_CATALOG_MAX_AGE_MS+1;
 raw.set(keys[0],'{unreadable');
 assert.equal(await new CoopDungeonBrowseCache(storage,()=>now).read(accountOne),undefined,'damaged cache must fail open to server fetch');
 raw.set(keys[0],JSON.stringify({version:99,savedAtMs:now,dungeons:[dungeon]}));
 assert.equal(await new CoopDungeonBrowseCache(storage,()=>now).read(accountOne),undefined,'new catalog schema invalidates old cache');
 const failing=new CoopDungeonBrowseCache({getItem:async()=>{throw Error('storage offline');},setItem:async()=>{throw Error('full disk');}},()=>now);
 await failing.save(accountOne,[dungeon]);
 assert.equal(failing.peek(accountOne)?.dungeons.length,1,'storage failures must retain warm memory browsing');
 assert.equal(await new CoopDungeonBrowseCache({getItem:async()=>{throw Error('bad read');},setItem:storage.setItem},()=>now).read(accountOne),undefined,'failed disk read must not block server fallback');
 console.log('PASS cache-first dungeon browsing, no repeat reads, scoped isolation, expiry, corruption and disk fallback');
}
void main();
