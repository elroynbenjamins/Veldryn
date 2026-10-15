import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const smoke=fs.readFileSync(path.join(root,'tools','online-staging-smoke.mjs'),'utf8');
const mobilePackage=JSON.parse(fs.readFileSync(path.join(root,'apps','mobile','package.json'),'utf8'));
function need(value,label){if(!smoke.includes(value))throw new Error(`online staging smoke contract missing ${label}: ${value}`);}

for(const [value,label] of [
 ['ONLINE_SMOKE_CONFIRM','explicit write confirmation'],
 ['I_UNDERSTAND_STAGING_WRITES','write confirmation value'],
 ['ONLINE_SMOKE_EMAIL','dedicated test account configuration'],
 ['/auth/v1/token?grant_type=password','Supabase password authentication'],
 ['/functions/v1/gameplay','authoritative gameplay Edge Function'],
 ["gameplay('GET')",'authenticated snapshot read'],
 ["type:'settings'",'safe no-op mutation'],
 ['expectedVersion:before.version','optimistic version contract'],
 ['Dedicated smoke account must be idle','idle staging-account guard'],
 ['Repeated gameplay receipt was not idempotent','idempotent retry assertion'],
])need(value,label);
if(mobilePackage.scripts?.['test:online-staging-smoke']!=='node ../../tools/online-staging-smoke.mjs')throw new Error('mobile package must expose the staging smoke command');
console.log('PASS: opt-in staging gameplay smoke contract');
