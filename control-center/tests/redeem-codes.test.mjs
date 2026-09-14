import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRedeemCode, hashRedeemCode, normalizeRedeemCode, redeemCodeHint, validateRedeemCode } from '../functions/_shared/redeem-codes.js';

test('generated redeem codes are high-entropy shaped and normalize consistently',()=>{
  const code=generateRedeemCode('VELD');
  const normalized=normalizeRedeemCode(code);
  assert.ok(normalized.startsWith('VELD'));
  assert.equal(validateRedeemCode(code).errors.length,0);
  assert.match(code,/^[A-Z0-9-]+$/);
  assert.match(redeemCodeHint(code),/^[A-Z0-9]{4}…[A-Z0-9]{4}$/);
});

test('redeem hashing ignores separators/case but rejects weak short codes',async()=>{
  const a=await hashRedeemCode('veld-abcd-efgh-2345');
  const b=await hashRedeemCode('VELDABCDEFGH2345');
  assert.equal(a,b);
  assert.equal(a.length,64);
  assert.ok(validateRedeemCode('short').errors.length>0);
});
