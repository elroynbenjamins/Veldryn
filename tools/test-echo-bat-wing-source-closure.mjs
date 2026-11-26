// Read-only source regression for the persisted retirement change.
import {readFileSync} from 'node:fs';
const path='apps/mobile/src/content/monsters.ts';
const source=readFileSync(path,'utf8');
const line=source.split('\n').find(row=>row.includes("id:'ECHO_BAT'"));
if(!line)throw Error('Echo Bat definition missing');
if(line.includes("itemId:'ECHO_BAT_WING'"))throw Error('Retired wing drop restored');
for(const itemId of ['WISP_DUST','OATHGLASS_SHARD'])if(!line.includes(`itemId:'${itemId}'`))throw Error('Unrelated Echo Bat drop missing: '+itemId);
if(!/gold:10/.test(line))throw Error('Echo Bat ordinary Gold changed');
console.log('PASS: persisted Echo Bat Wing source closure preserves monster, Gold and unrelated drops');
