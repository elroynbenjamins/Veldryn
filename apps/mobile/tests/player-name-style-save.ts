import {newGame} from '../src/core/game';
import {OnlineGameRepository,type OnlineSnapshot,type PendingGameCommand} from '../src/core/online-game-repository';
import {normalizePlayerNameStyle,type PlayerNameStylePreference} from '../src/core/player-name-style';
import {saveAndRefreshPlayerNameStyle,writePlayerNameStyleForAccount} from '../src/core/player-name-style-save';

function ok(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
function equal(actual:unknown,expected:unknown,message:string){ok(JSON.stringify(actual)===JSON.stringify(expected),message);}
async function rejects(work:()=>Promise<unknown>,message:string){let failed=false;try{await work();}catch{failed=true;}ok(failed,message);}
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}

const base=newGame(1700000000000);
const solid:PlayerNameStylePreference={mode:'solid',solidColor:'#AABBCC',animation:'none'};
function snapshot(style:PlayerNameStylePreference=solid,accountId='alice'):OnlineSnapshot{
 return {accountId,version:8,serverNow:1700000001000,state:{...base,account:{...base.account,entitlements:{supporter:true},playerNameStyle:style}}};
}

async function main(){
 const draft:PlayerNameStylePreference={mode:'solid',solidColor:'#abc',animation:'none'},original=JSON.stringify(draft);
 const pending:PendingGameCommand={requestId:'already-pending',expectedVersion:7,command:{type:'claim'}};
 const server=snapshot();let accepted:OnlineSnapshot|null=null,writes=0;
 const calls:string[]=[];
 const repository=new OnlineGameRepository('alice',{
  read:async()=>{calls.push('read');return server;},
  send:async()=>{throw new Error('Cosmetic save must not submit a gameplay command.');},
 },{read:async()=>pending,write:async()=>{throw new Error('Cosmetic save must preserve pending gameplay.');}},()=> 'unused');
 const confirmed=await saveAndRefreshPlayerNameStyle(draft,{
  accountId:'alice',isCurrent:()=>true,
  write:async value=>{writes++;calls.push('write');equal(value,solid,'Only normalized cosmetic fields reach the writer.');return solid;},
  refresh:()=>repository.refresh(),accept:value=>{calls.push('accept');accepted=value;},
 });
 equal(confirmed,solid,'Save returns the confirmed canonical style.');
 equal(calls,['write','read','accept'],'Success waits for persistence and authoritative refresh before hydrating.');
 ok(accepted===server,'Accept the complete server snapshot, never the submitted local game state.');
 ok(writes===1&&await repository.hasPending(),'Name style saving leaves uncertain gameplay commands intact.');
 equal((await repository.refresh()).state.account.playerNameStyle,solid,'The next gameplay refresh retains the saved preference.');
 ok(JSON.stringify(draft)===original,'Saving does not mutate the caller draft.');

 let refreshes=0,accepts=0;
 const port={accountId:'alice',isCurrent:()=>true,write:async()=>solid,
  refresh:async()=>{refreshes++;return snapshot();},accept:()=>{accepts++;}};
 await rejects(()=>saveAndRefreshPlayerNameStyle(draft,{...port,write:async()=>{throw new Error('network unavailable');}}),'Failed writes must reject.');
 ok(refreshes===0&&accepts===0,'Failed writes neither refresh nor announce a saved profile.');
 await rejects(()=>saveAndRefreshPlayerNameStyle(draft,{...port,refresh:async()=>{throw new Error('refresh unavailable');}}),'Failed readback must reject.');
 ok(accepts===0,'A write acknowledgement alone must not hydrate or report full success.');
 await rejects(()=>saveAndRefreshPlayerNameStyle(draft,{...port,refresh:async()=>snapshot({mode:'default',animation:'none'})}),'Stale readback cannot report a changed name style as confirmed.');
 ok(accepts===0,'Missing canonical projection must not replace the visible profile.');

 let current=false,staleWrites=0;
 await rejects(()=>saveAndRefreshPlayerNameStyle(draft,{...port,isCurrent:()=>current,write:async()=>{staleWrites++;return solid;}}),'A stale account must reject before persistence.');
 ok(staleWrites===0,'An account that is no longer current must not send a write.');
 current=true;const waitingWrite=deferred<PlayerNameStylePreference>();
 const duringWrite=saveAndRefreshPlayerNameStyle(draft,{...port,isCurrent:()=>current,write:()=>waitingWrite.promise});
 current=false;waitingWrite.resolve(solid);
 await rejects(()=>duringWrite,'Account switching while a write is in flight must reject.');
 ok(refreshes===0&&accepts===0,'An old account response must neither refresh nor hydrate the next account.');

 current=true;const waitingRead=deferred<OnlineSnapshot>(),readStarted=deferred<void>();
 const duringRead=saveAndRefreshPlayerNameStyle(draft,{...port,isCurrent:()=>current,refresh:()=>{readStarted.resolve();return waitingRead.promise;}});
 await readStarted.promise;current=false;waitingRead.resolve(snapshot());
 await rejects(()=>duringRead,'Account switching during readback must reject.');
 ok(accepts===0,'Late readback may not hydrate a different account.');
 await rejects(()=>saveAndRefreshPlayerNameStyle(draft,{...port,refresh:async()=>snapshot(solid,'bob')}),'A mismatched snapshot account must reject.');
 ok(accepts===0,'Mismatched account snapshots must not be accepted.');

 const credentials=deferred<{accountId:string;accessToken:string}|null>();let scopedWrites=0;
 const credentialRace=writePlayerNameStyleForAccount('alice',draft,{
  session:()=>credentials.promise,write:async()=>{scopedWrites++;return solid;},
 });
 credentials.resolve({accountId:'bob',accessToken:'bob-test-token'});
 await rejects(()=>credentialRace,'Switching accounts during credential lookup must stop the write.');
 ok(scopedWrites===0,'The previous draft must never be written using the new account credentials.');
 await rejects(()=>writePlayerNameStyleForAccount('alice',draft,{session:async()=>null,write:async()=>{scopedWrites++;return solid;}}),'Signed-out sessions cannot send a name-style write.');
 ok(scopedWrites===0,'No auth session means no mutation.');

 let currentSession={accountId:'alice',accessToken:'alice-test-token'},sentToken='';
 const writeStarted=deferred<void>(),sendAllowed=deferred<void>();
 const pinned=writePlayerNameStyleForAccount('alice',draft,{
  session:async()=>currentSession,
  write:async(preference,token)=>{writeStarted.resolve();await sendAllowed.promise;sentToken=token;equal(preference,solid,'Account-scoped writer receives normalized cosmetics.');return solid;},
 });
 await writeStarted.promise;currentSession={accountId:'bob',accessToken:'bob-test-token'};sendAllowed.resolve();
 await pinned;
 equal(sentToken,'alice-test-token','An already captured token remains bound to the original account while sending.');

 const defaultStyle=normalizePlayerNameStyle(undefined),expired=snapshot(defaultStyle);
 expired.state.account.entitlements={supporter:false};
 const reset=await saveAndRefreshPlayerNameStyle(defaultStyle,{...port,write:async()=>defaultStyle,refresh:async()=>expired});
 equal(reset,defaultStyle,'An expired subscription can still reset to the default name.');
 equal(accepts,1,'Confirmed default reset accepts exactly one authoritative snapshot.');
 console.log('PASS name-style persistence, canonical readback, pending gameplay preservation, failure and account-switch isolation');
}
void main().catch(error=>{console.error(error);throw error;});
