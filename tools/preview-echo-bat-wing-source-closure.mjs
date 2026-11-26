// Read-only verification of the persisted source closure.
import {readFileSync} from 'node:fs';
const path='apps/mobile/src/content/monsters.ts';
const source=readFileSync(path,'utf8');
const line=source.split('\n').find(row=>row.includes("id:'ECHO_BAT'"));
if(!line)throw Error('Echo Bat definition missing');
if(line.includes("itemId:'ECHO_BAT_WING'"))throw Error('Echo Bat Wing drop is still active');
if(!line.includes("itemId:'WISP_DUST'")||!line.includes("itemId:'OATHGLASS_SHARD'"))throw Error('Unrelated Echo Bat drops changed');
console.log('PASS: Echo Bat remains available, Echo Bat Wing drop is closed, unrelated drops preserved.');
console.log('Database retirement remains separate: close the exact admin gift source, run live preflight, compensate existing stock atomically, then require postflight reconciliation.');
