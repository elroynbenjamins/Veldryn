import {strict as assert} from 'node:assert';
import {guildTagAvailability,normalizeGuildTag,validateGuildTag} from '../tags';
function throws(fn:()=>unknown,needle:string){try{fn()}catch(error){assert.ok(String(error).includes(needle));return}throw new Error(`expected ${needle}`)}
assert.equal(normalizeGuildTag(' arc '),'ARC');
assert.equal(validateGuildTag('fox'),'FOX');
throws(()=>validateGuildTag('AB'),'invalid_format');
throws(()=>validateGuildTag('ADM'),'reserved');
throws(()=>validateGuildTag('SEX'),'blocked');
assert.deepEqual(guildTagAvailability('arc',new Set(['ARC'])),{normalizedTag:'ARC',available:false,reason:'taken'});
console.log('guild tags v53 backend PASS');
