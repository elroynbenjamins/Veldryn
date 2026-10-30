import {newGame} from '../src/core/game';
import {forgetOnlineSnapshot,peekOnlineSnapshot,rememberOnlineSnapshot} from '../src/core/online-snapshot-cache';

function ok(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}

function main(){
 const realNow=Date.now;let now=50_000;Date.now=()=>now;
 try{
  const state=newGame(now);
  rememberOnlineSnapshot({accountId:'cache-a',state,version:4,serverNow:now,reward:{gold:500,xp:0,items:[],kills:0,elapsedSeconds:0},message:'do not replay'});
  const cached=peekOnlineSnapshot('cache-a');
  ok(cached?.state===state&&cached.version===4,'latest authoritative state is available immediately');
  ok(!cached?.reward&&!cached?.message,'cached startup state never replays rewards or transient notices');
  ok(peekOnlineSnapshot('cache-b')===null,'account scoped cache never crosses accounts');
  now+=119_999;ok(peekOnlineSnapshot('cache-a')?.version===4,'cache remains available during its short TTL');
  now+=1;ok(peekOnlineSnapshot('cache-a')===null,'expired projection is not used');
  rememberOnlineSnapshot({accountId:'cache-a',state,version:5,serverNow:now});forgetOnlineSnapshot('cache-a');
  ok(peekOnlineSnapshot('cache-a')===null,'explicit account disposal removes cached projection');
  console.log('PASS online snapshot cache: account scope, TTL, safe projection and disposal');
 }finally{Date.now=realNow;}
}
main();
