import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecoveryCallback,recoveryRedirectUrl,validateRecoveryPassword} from '../src/password-recovery.js';

test('password reset redirects back to the current HTTPS control panel',()=>{
  assert.equal(recoveryRedirectUrl('https://veldryn-control.pages.dev'),
    'https://veldryn-control.pages.dev/?recover=1');
  assert.equal(recoveryRedirectUrl('http://localhost:8788'),
    'http://localhost:8788/?recover=1');
  assert.throws(()=>recoveryRedirectUrl('http://untrusted.test'));
});

test('recovery callback accepts only explicit recovery tokens',()=>{
  assert.deepEqual(parseRecoveryCallback('#access_token=sensitive&type=magiclink',''),{kind:'none'});
  assert.deepEqual(parseRecoveryCallback('',''),{kind:'none'});
  const callback=parseRecoveryCallback('#access_token=reset-access&type=recovery&expires_in=3600','?recover=1');
  assert.deepEqual(callback,{kind:'recovery',accessToken:'reset-access',expiresIn:3600});
});

test('expired and incomplete links provide a recoverable error',()=>{
  const result=parseRecoveryCallback('#error=access_denied&error_code=otp_expired&error_description=Email+link+has+expired','?recover=1');
  assert.equal(result.kind,'error');
  assert.match(result.message,/expired/);
  assert.equal(parseRecoveryCallback('','?recover=1').kind,'error');
});

test('password validation rejects short, excessive and mismatched passwords',()=>{
  assert.match(validateRecoveryPassword('short','short'),/12/);
  assert.match(validateRecoveryPassword('a'.repeat(129),'a'.repeat(129)),/too long/);
  assert.match(validateRecoveryPassword('securePassphrase123!','differentPassphrase'),/match/);
  assert.equal(validateRecoveryPassword('securePassphrase123!','securePassphrase123!'),null);
});
