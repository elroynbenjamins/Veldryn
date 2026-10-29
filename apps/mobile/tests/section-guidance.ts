import {deepEqual,equal} from './assertions';
import {cleanSectionGuideIds,createSectionGuideStore} from '../src/core/section-guidance';
async function run(){
 const saved=new Map<string,string>();
 const storage={
  getItem:async(key:string)=>saved.get(key)??null,
  setItem:async(key:string,value:string)=>{saved.set(key,value);}
 };
 const store=createSectionGuideStore(storage);
 deepEqual(await store.load('player-a','companions'),[],'no guide state on a new account');
 await Promise.all([
  store.complete('player-a','companions','Collection'),
  store.complete('player-a','companions','Training')
 ]);
 deepEqual(await store.load('player-a','companions'),['Collection','Training'],'simultaneous acknowledgements keep both sections');
 deepEqual(await store.load('player-a','guild'),[],'Guild guidance is independent of Companion guidance');
 deepEqual(await store.load('player-b','companions'),[],'guidance does not leak between accounts');
 await store.complete('player-a','guild','Home');
 deepEqual(await store.load('player-a','guild'),['Home'],'a new Guild tab may be acknowledged independently');
 equal(saved.has('veldryn.section-guidance.v1:companions:player-a'),true,'acknowledgements are persisted per area and account');
 const fresh=createSectionGuideStore(storage);
 deepEqual(await fresh.load('player-a','companions'),['Collection','Training'],'reload preserves independently visited Companion tabs');
 saved.set('veldryn.companion-tour.v1:legacy','3');
 const migrated=createSectionGuideStore(storage);
 deepEqual(await migrated.load('legacy','companions'),['Collection','Training','Sanctuary'],'old tour steps migrate without re-prompting');
 deepEqual(cleanSectionGuideIds(['Training',null,'Training','Sanctuary',42]),['Training','Sanctuary'],'invalid and duplicate IDs are ignored');
 const failed=createSectionGuideStore({getItem:async()=>{throw new Error('offline')},setItem:async()=>{throw new Error('offline')}});
 deepEqual(await failed.load('offline','social'),[],'guidance never blocks when storage fails');
 deepEqual(await failed.complete('offline','social','Chat'),['Chat'],'a storage error still dismisses the guide during the session');
 console.log('PASS: independent account-scoped guidance, legacy migration and storage-failure recovery');
}
void run().catch(error=>{throw error;});
