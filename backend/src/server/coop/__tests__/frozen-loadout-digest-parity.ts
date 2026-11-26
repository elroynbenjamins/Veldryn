import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {frozenLoadoutDigest} from '../loadout-snapshots';

for(const value of ['', 'abc', 'Veldryn', 'Frostfall ❄', '日本語', '🛡️', 'a\ud800b', '\udc00', JSON.stringify({id:'QA_🛡',revision:3})]){
 assert.equal(frozenLoadoutDigest(value),createHash('sha256').update(value).digest('hex'));
}
console.log('PASS: portable frozen-loadout digest retains Node SHA-256 UTF-8 parity');
