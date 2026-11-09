import {newGame} from '../src/core/game';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import {accountPassword,authCallbackCode,chunkedAuthStorage,passwordRequirements} from '../src/core/auth-callback';
import {OnlineGameRepository,OnlineCommandError,type OnlineSnapshot,type PendingGameCommand} from '../src/core/online-game-repository';
function ok(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
function throws(fn:()=>unknown,message:string){let threw=false;try{fn()}catch{threw=true;}ok(threw,message);}
async function main(){
 const now=1700000000000;let state=executeGameCommand(newGame(now),{type:'create',args:{classId:'IRONWARDEN',name:'Online Hero'}},now,{characterId:'server-character'}).state;
 ok(state.character?.id==='server-character'&&state.character.gold===100,'server character identity');
 throws(()=>validateGameCommand({type:'claim',args:{gold:999,now:now+999999}}),'client authority rejected');
 throws(()=>validateGameCommand({type:'constructor'}),'prototype operation rejected');
 throws(()=>validateGameCommand({type:'processing_start',args:{id:'SMELT_COPPER_INGOT',batches:5,gold:0}}),'processing batch arguments rejected when client forges economy fields');
 throws(()=>executeGameCommand(state,{type:'deposit',args:{id:'TRAVEL_RATION',quantity:-1}},now),'negative inventory rejected');
 throws(()=>executeGameCommand(state,{type:'profile',args:{profileBorderId:'unowned'}},now),'cosmetic entitlement required');
 // Inventory flags must remain writable when an old save has unrelated settings
 // fields that would make the full-settings command fail validation.
 const legacyState={...state,settings:{...state.settings,retiredInventoryTheme:'legacy'}} as typeof state;
 throws(()=>executeGameCommand(legacyState,{type:'settings',args:{settings:legacyState.settings}},now),'full-settings validation remains strict for unknown keys');
 const lock={type:'inventory_preference',args:{id:'TRAVEL_RATION',kind:'lock',enabled:true}};
 let protectedState=executeGameCommand(legacyState,lock,now).state;
 ok(protectedState.settings.lockedItemIds?.includes('TRAVEL_RATION'),'online lock works without submitting legacy settings');
 protectedState=executeGameCommand(protectedState,lock,now).state;
 ok(protectedState.settings.lockedItemIds?.filter(id=>id==='TRAVEL_RATION').length===1,'repeat lock is idempotent');
 throws(()=>executeGameCommand(protectedState,{type:'sell',args:{id:'TRAVEL_RATION',quantity:1}},now),'locked items are protected from sale');
 protectedState=executeGameCommand(protectedState,{type:'inventory_preference',args:{id:'TRAVEL_RATION',kind:'favorite',enabled:true}},now).state;
 ok(protectedState.settings.favoriteItemIds?.includes('TRAVEL_RATION'),'online favorite is independent of lock');
 protectedState=executeGameCommand(protectedState,{type:'inventory_preference',args:{id:'TRAVEL_RATION',kind:'lock',enabled:false}},now).state;
 ok(!protectedState.settings.lockedItemIds?.includes('TRAVEL_RATION'),'online unlock succeeds');
 throws(()=>executeGameCommand(protectedState,{type:'sell',args:{id:'TRAVEL_RATION',quantity:1}},now),'favorite still protects from sale after unlock');
 protectedState=executeGameCommand(protectedState,{type:'inventory_preference',args:{id:'TRAVEL_RATION',kind:'favorite',enabled:false}},now).state;
 ok(!protectedState.settings.favoriteItemIds?.includes('TRAVEL_RATION'),'online favorite removal succeeds');
 protectedState={...protectedState,settings:{...protectedState.settings,seenItemIds:[]}};
 protectedState=executeGameCommand(protectedState,{type:'inventory_seen_all'},now).state;
 ok(protectedState.settings.seenItemIds?.includes('TRAVEL_RATION'),'mark all seen uses atomic inventory command');
 throws(()=>executeGameCommand(state,{type:'inventory_preference',args:{id:'TRAVEL_RATION',kind:'lock',enabled:'true'}},now),'non-boolean inventory flags rejected');
 throws(()=>executeGameCommand(state,{type:'inventory_preference',args:{id:'not_an_item',kind:'lock',enabled:true}},now),'unknown inventory item rejected');
 throws(()=>validateGameCommand({type:'inventory_preference',args:{id:'TRAVEL_RATION',kind:'lock',enabled:true,gold:500}}),'unrecognized inventory command arguments rejected');
 state=executeGameCommand(state,{type:'start',args:{kind:'combat',id:'MOSS_RAT'}},now).state;
 const claim=executeGameCommand(state,{type:'claim'},now+60000);ok((claim.reward?.kills??0)>0&&claim.state.character!.xp>0,'server elapsed combat');
 ok(claim.contributions.length===1&&claim.contributions[0].contentId==='MOSS_RAT','verified Contract event');
 ok(executeGameCommand(claim.state,{type:'claim'},now+60000).reward?.kills===0,'same-time claim gives no more progress');
 const changed=executeGameCommand(state,{type:'settings',args:{settings:{...state.settings,autoEatThresholdPct:80}}},now+60000);ok(changed.reward?.xp===claim.reward?.xp,'settle before settings changes');
 ok(authCallbackCode('veldryn://auth?code=abc','veldryn://auth')==='abc','PKCE extracts code');
 ok(authCallbackCode('https://evil.invalid/auth?code=abc','veldryn://auth')===null,'unrelated links ignored');
 throws(()=>authCallbackCode('veldryn://auth#error=access_denied&error_description=Link%20expired','veldryn://auth'),'expired email errors in fragments reach the account UI');
 ok(authCallbackCode('https://evil.invalid/auth#error=access_denied','veldryn://auth')===null,'unrelated error links are ignored');
 throws(()=>accountPassword('onlyletters'),'password needs a number and symbol');
 throws(()=>accountPassword('lowercase1!'),'password needs an uppercase letter');
 const strongPassword='Asterfall9!';ok(accountPassword(strongPassword)===strongPassword,'strong password accepted');
 ok(Object.values(passwordRequirements(strongPassword)).every(Boolean),'password checklist matches validator');
 const memory=new Map<string,string>(),storage=chunkedAuthStorage({getItem:async key=>memory.get(key)??null,setItem:async(key,value)=>{ok(value.length<=1700,'secure chunk size');memory.set(key,value);},removeItem:async key=>{memory.delete(key);}});
 await storage.setItem('session','x'.repeat(6500));ok((await storage.getItem('session'))?.length===6500,'large secure session');await storage.setItem('session','short');ok(await storage.getItem('session')==='short','replace secure session');await storage.removeItem('session');ok(memory.size===0,'remove session chunks');
 let pending:PendingGameCommand|null=null,attempts=0,keys=0;
 const snapshot:OnlineSnapshot={accountId:'alice',state,version:0,serverNow:now};
 const repo=new OnlineGameRepository('alice',{read:async()=>snapshot,send:async request=>{attempts++;if(attempts===1)throw new Error('connection_lost');ok(request.requestId==='key-1','retry keeps request identity');return {...snapshot,version:1};}},{read:async()=>pending,write:async value=>{pending=value;}},()=>`key-${++keys}`);
 await repo.load();try{await repo.execute({type:'claim'})}catch{}ok(await repo.hasPending(),'uncertain request retained');await repo.execute();ok(!await repo.hasPending()&&keys===1,'retry once and clear');

 // Timeout after an unknown commit: the next Claim replays exactly the same receipt.
 let claimPending:PendingGameCommand|null=null,claimSends=0,claimKeys=0;
 const claimRecovery=new OnlineGameRepository('alice',{
  read:async()=>snapshot,send:async request=>{
   claimSends++;ok(request.requestId==='retry-1','claim retry reuses the same request ID');
   if(claimSends===1)throw new Error('request_timeout');
   return {...snapshot,version:1,serverNow:now+claimSends,reward:claim.reward};
  },
 },{read:async()=>claimPending,write:async value=>{claimPending=value;}},()=>`retry-${++claimKeys}`);
 await claimRecovery.load();
 try{await claimRecovery.execute({type:'claim'})}catch{}
 ok(await claimRecovery.hasPending(),'timeout preserves the original claim');
 // Simulate an Android process restart: a new repository reads the same durable receipt.
 const restartedClaim=new OnlineGameRepository('alice',{
  read:async()=>snapshot,send:async request=>{
   claimSends++;ok(request.requestId==='retry-1','app restart preserves the idempotency key');
   return {...snapshot,version:1,serverNow:now+claimSends,reward:claim.reward};
  },
 },{read:async()=>claimPending,write:async value=>{claimPending=value;}},()=>`retry-${++claimKeys}`);
 const recoveredClaim=await restartedClaim.execute({type:'claim'});
 ok(claimSends===2&&claimKeys===1,'second Claim replays rather than double-submits');
 ok(recoveredClaim.executedCommand.type==='claim'&&recoveredClaim.reward?.xp===claim.reward?.xp,'replay preserves original rewards');
 ok(!await restartedClaim.hasPending(),'confirmed claim clears the durable retry after restart');

 // The same safety also applies to repeat purchase/sell taps: the second
 // identical action recovers the first one rather than charging twice.
 let salePending:PendingGameCommand|null=null,saleSends=0,saleKeys=0;
 const saleCommand={type:'sell' as const,args:{id:'TRAVEL_RATION',quantity:1}};
 const saleRecovery=new OnlineGameRepository('alice',{
  read:async()=>snapshot,send:async request=>{
   saleSends++;
   if(saleSends===1)throw new Error('connection_lost');
   ok(request.requestId==='sale-1','repeat Sell must reuse the original idempotency key');
   return {...snapshot,version:1,serverNow:now+2};
  },
 },{read:async()=>salePending,write:async value=>{salePending=value;}},()=>`sale-${++saleKeys}`);
 await saleRecovery.load();
 try{await saleRecovery.execute(saleCommand)}catch{}
 const recoveredSale=await saleRecovery.execute(saleCommand);
 ok(saleSends===2&&saleKeys===1&&recoveredSale.executedCommand.type==='sell'&&!await saleRecovery.hasPending(),'repeat Sell resolves one sale rather than performing two');


 // Reconcile a different pending command before submitting the new request.
 let mixedPending:PendingGameCommand|null=null,mixedKeys=0,mixedSends=0;
 const requestIds:string[]=[];
 const followup=new OnlineGameRepository('alice',{
  read:async()=>({...snapshot,version:5}),send:async request=>{
   mixedSends++;requestIds.push(request.requestId);
   if(mixedSends===1)throw new Error('service_unavailable');
   return {...snapshot,version:mixedSends===2?6:7,serverNow:now+mixedSends,reward:mixedSends===2?claim.reward:undefined};
  },
 },{read:async()=>mixedPending,write:async value=>{mixedPending=value;}},()=>`mixed-${++mixedKeys}`);
 await followup.load();
 try{await followup.execute({type:'stop'})}catch{}
 const continued=await followup.execute({type:'claim'});
 ok(mixedSends===3&&mixedKeys===2,'retry resolves before a distinct command is generated');
 ok(requestIds[0]===requestIds[1]&&requestIds[1]!==requestIds[2],'replayed/new request IDs cannot collide');
 ok(continued.executedCommand.type==='claim'&&continued.recovered?.executedCommand.type==='stop','new response retains its predecessor');
 ok(continued.recovered?.reward?.xp===claim.reward?.xp,'earlier reward remains visible to client');
 ok(!await followup.hasPending(),'both verified commands clear retry storage');

 // A second failure cannot create a new command or throw away the local receipt.
 let stuckPending:PendingGameCommand|null=null,blockedSends=0,blockedKeys=0;
 const blocked=new OnlineGameRepository('alice',{
  read:async()=>snapshot,send:async()=>{blockedSends++;throw new Error('service_unavailable');},
 },{read:async()=>stuckPending,write:async value=>{stuckPending=value;}},()=>`blocked-${++blockedKeys}`);
 await blocked.load();
 try{await blocked.execute({type:'stop'})}catch{}
 try{await blocked.execute({type:'claim'})}catch{}
 ok(blockedSends===2&&blockedKeys===1&&await blocked.hasPending(),'a repeated outage cannot replace a pending command');

 // The server might return the old receipt after a foreground refresh.
 const newest:OnlineSnapshot={...snapshot,version:20,serverNow:now+100};
 let oldPending:PendingGameCommand|null={requestId:'committed-claim',expectedVersion:18,command:{type:'claim'}};
 const alreadyApplied=new OnlineGameRepository('alice',{
  read:async()=>newest,send:async()=>({...snapshot,version:19,serverNow:now+50,reward:claim.reward}),
 },{read:async()=>oldPending,write:async value=>{oldPending=value;}},()=> 'unused-key');
 await alreadyApplied.load();
 const reconciled=await alreadyApplied.execute();
 ok(reconciled.version===20&&reconciled.reward?.xp===claim.reward?.xp,'newer state preserves original replayed reward');
 ok(!await alreadyApplied.hasPending(),'confirmed replay clears local pending record');

 const stale=new OnlineGameRepository('alice',{read:async()=>snapshot,send:async()=>{throw new OnlineCommandError('stale_state',true);}},{read:async()=>pending,write:async value=>{pending=value;}},()=>`key-${++keys}`);
 await stale.load();try{await stale.execute({type:'claim'})}catch{}ok(!await stale.hasPending(),'definitive stale failure cleared');
 let releaseRead:(value:OnlineSnapshot)=>void=()=>{};
 const racing=new OnlineGameRepository('alice',{read:()=>new Promise(resolve=>{releaseRead=resolve;}),send:async()=>({...snapshot,version:2,serverNow:now+2})},{read:async()=>null,write:async()=>{}},()=> 'race-key');
 const initial=racing.refresh();releaseRead({...snapshot,version:1});await initial;
 const older=racing.refresh();await racing.execute({type:'claim'});releaseRead({...snapshot,version:1});
 ok((await older).version===2&&racing.snapshot?.version===2,'late foreground read cannot roll back a saved command');
 console.log('PASS online commands, server clock, activity settlement, authority, PKCE, secure storage, persistent retry and stale state');
}
void main().catch(error=>{console.error(error);throw error;});
