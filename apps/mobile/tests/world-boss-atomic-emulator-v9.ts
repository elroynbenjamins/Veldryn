/** World Boss v9 deterministic multi-request/atomicity emulator tests — no real DB. */
import {assert} from './test-assert';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {WorldBossAtomicEmulatorV9} from '../../../backend/src/server/combat/world-boss-atomic-emulator-v9';
import {createWorldBossEventPrototype,type WorldBossAttemptPrototype} from '../../../backend/src/server/combat/world-boss-event-prototype';

const NOW=1794315600000;
const event=(maxHp:number)=>createWorldBossEventPrototype({
 eventId:'WB_V9_ATOMIC_TEST',boss:'hollowroot',startsAtUtcMs:NOW-100,
 endsAtUtcMs:NOW+86400000,maxHp,
});
function command(account:string,requestId:string,character='CHAR_PRIMARY'):WorldBossAttemptPrototype{
 return {
  accountId:account,characterId:character,requestId,atUtcMs:NOW,
  order:'steady_assault',
  serverSeed:'SERVER_NONCE_UNPREDICTABLE_'+account+'_'+requestId,
  squad:['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map((name,i)=>({
   snapshotId:account+':snapshot:'+i,ownerAccountId:i===0?account:account+':borrowed:'+i,
   resolvedCombatant:launchPlayer(name,25)
  }))
 };
}
async function main(){
 const lock=new WorldBossAtomicEmulatorV9(event(1));
 const simultaneous=Array.from({length:24},(_,i)=>command('ACCOUNT_'+String(i).padStart(2,'0'),'REQUEST_SIMULTANEOUS'));
 const out=await Promise.all(simultaneous.map(c=>lock.commit(c)));
 assert.equal(out.filter(x=>x.repeated).length,0,'different owners have independent receipt keys');
 assert.equal(out.filter(x=>x.receipt.worldHpCredited>0).length,1,'only one battle can deliver the last HP');
 assert.equal(out.reduce((n,x)=>n+x.receipt.worldHpCredited,0),1,'concurrent contributions never over-credit world HP');
 assert.equal(lock.snapshot().revision,24,'every unique committed attempt increments the event once');
 assert.equal(lock.snapshot().remainingHp,0,'last HP is clipped and never negative');
 assert.equal(Object.keys(lock.snapshot().receipts).length,24);
 assert.equal(out.filter(x=>x.receipt.residualEcho).length,23,'all subsequent attacks become residual echoes');
 assert.deepEqual(lock.snapshot().crossedThresholds,[70,30,0]);
 const unsafe=lock.snapshot();unsafe.remainingHp=999999;
 assert.equal(lock.snapshot().remainingHp,0,'read-only snapshot cannot corrupt repository');
 const changed=out[0].receipt;changed.worldHpCredited=123456;
 assert.equal(lock.snapshot().receipts[JSON.stringify(['ACCOUNT_00','REQUEST_SIMULTANEOUS'])].worldHpCredited,1,
 'returned receipts are detached from internal storage');

 const oneOwner=new WorldBossAtomicEmulatorV9(event(1_000_000));
 const requests=Array.from({length:12},(_,i)=>command('SAME_ACCOUNT','UNIQUE_REQUEST_'+i,'CHAR_'+i));
 const settled=await Promise.allSettled(requests.map(c=>oneOwner.commit(c)));
 const accepted=settled.filter(r=>r.status==='fulfilled');
 const refused=settled.filter(r=>r.status==='rejected');
 assert.equal(accepted.length,3,'only three account-wide attack slots can be used');
 assert.equal(refused.length,9,'all other concurrent character requests must be rejected');
 assert.equal(oneOwner.snapshot().revision,3);
 assert.equal(Object.keys(oneOwner.snapshot().receipts).length,3);

 const sameKey=new WorldBossAtomicEmulatorV9(event(1_000_000));
 const sameCommand=command('IDEMPOTENT_ACCOUNT','SAME_REQUEST_1');
 const retries=await Promise.all(Array.from({length:18},()=>sameKey.commit(sameCommand)));
 assert.equal(retries.filter(x=>!x.repeated).length,1,'exactly one first-time request is committed');
 assert.equal(retries.filter(x=>x.repeated).length,17,'all subsequent calls must reuse stored receipt');
 assert.equal(sameKey.snapshot().revision,1,'idempotent replays cannot increment the event revision');
 assert.equal(Object.keys(sameKey.snapshot().receipts).length,1);
 assert.ok(retries.every(x=>x.receipt.seed===retries[0].receipt.seed));
 const altered=command('IDEMPOTENT_ACCOUNT','SAME_REQUEST_1');
 altered.serverSeed='ATTACKER_REPLACED_SEED_IN_RETRY';
 let mismatched=false;
 try{await sameKey.commit(altered);}catch(e){mismatched=String(e).includes('idempotency_payload_mismatch');}
 assert.ok(mismatched,'reusing receipt key with different server entropy must fail');

 const invalid=new WorldBossAtomicEmulatorV9(event(300000));
 const malformed=command('BROKEN','INVALID_REQUEST');
 malformed.squad=[malformed.squad[0],malformed.squad[0],malformed.squad[2],malformed.squad[3]];
 const rejected=await Promise.allSettled([invalid.commit(malformed)]);
 assert.equal(rejected[0].status,'rejected');
 assert.equal(invalid.snapshot().revision,0,'bad command must never mutate event state');
 assert.equal(Object.keys(invalid.snapshot().receipts).length,0);

 const twoOwners=new WorldBossAtomicEmulatorV9(event(100000));
 const independent=await Promise.all([
  twoOwners.commit(command('ACCOUNT_A','SAME_STRING')),
  twoOwners.commit(command('ACCOUNT_B','SAME_STRING')),
 ]);
 assert.ok(independent.every(x=>!x.repeated),'request IDs may be reused by different accounts');
 assert.equal(twoOwners.snapshot().revision,2);
 console.log('WB_ATOMIC_EMULATOR_V9='+JSON.stringify({
  concurrentAccounts:24,lastHpCreditedExactlyOnce:true,residualEchoes:23,
  sameAccountAccepted:accepted.length,sameAccountRejected:refused.length,
  concurrentNetworkRetransmits:retries.length,duplicateHpCredits:0,
  allDbTransactions:0,mintedSigils:0,productionReady:false
 }));
}
void main().catch(err=>{console.error(err);throw err;});
