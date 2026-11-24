import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceAudit} from './independent-shield-review-v26.mjs';
test('eight exact self shield proposals, five shared cooldown families and three threshold forms',()=>{
 const r=sourceAudit();
 assert.equal(r.sourceIds,8);assert.equal(r.cooldownFamilies,5);assert.equal(r.triggerForms,3);
 assert.equal(new Set(r.rows.map(x=>x.id)).size,8);assert.equal(r.releaseApproved,false);
 assert.ok(r.rows.every(x=>x.duration===6&&x.value>=3.2&&x.value<=6));
});
