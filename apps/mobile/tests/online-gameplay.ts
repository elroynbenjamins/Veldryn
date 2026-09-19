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
 throws(()=>executeGameCommand(state,{type:'deposit',args:{id:'TRAVEL_RATION',quantity:-1}},now),'negative inventory rejected');
 throws(()=>executeGameCommand(state,{type:'profile',args:{profileBorderId:'unowned'}},now),'cosmetic entitlement required');
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
