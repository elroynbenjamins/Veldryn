import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceAudit} from './timed-stat-review-v25.mjs';
test('ten exact timed-stat definitions: five Oathplate tiers, three Riposte tiers, Braced Formation and Runeforge',()=>{
 const r=sourceAudit();
 assert.equal(r.sourceIds,10);assert.equal(r.distinctMechanics,4);
 assert.equal(new Set(r.rows.map(x=>x.id)).size,10);
 assert.equal(r.releaseApproved,false);
 assert.deepEqual(r.rows.filter(x=>x.id.includes('oathplate')).map(x=>x.pct),[3.2,3.6,4,4.4,4]);
});
