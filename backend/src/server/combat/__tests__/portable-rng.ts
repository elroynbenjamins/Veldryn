import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {CombatRng} from '../deterministic-rng';
for(const seed of ['', 'veldryn', 'x'.repeat(200), 'Écho 🔥', '\ud800broken\udfff']){
 const rng=new CombatRng(seed);
 for(let i=0;i<256;i++){
  const label=`target:${i}:🐉\ud800`;
  const expected=parseInt(createHmac('sha256',seed).update(`${i}:${label}`).digest().toString('hex').slice(0,13),16)/0x1fffffffffffff;
  assert.equal(rng.next(label),expected,'portable combat must retain every existing deterministic outcome');
 }
}
assert.throws(()=>new CombatRng('seed').pick([],'empty'),/cannot_pick_empty/);
console.log('PASS portable combat RNG: 1,280 exact Node HMAC comparisons, long keys, Unicode and malformed surrogates');
