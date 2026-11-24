// Review-only source-closure preview. Prints a patch; never writes files, deploys,
// or changes database rows. Apply only after future-use/issuance clearance.
import {readFileSync} from 'node:fs';
const path='apps/mobile/src/content/monsters.ts';
const source=readFileSync(path,'utf8');
const entry=",{itemId:'ECHO_BAT_WING',chance:.28,min:1,max:2}";
const lines=source.split('\n');
const hits=lines.flatMap((line,i)=>line.includes(entry)?[i]:[]);
if(hits.length!==1||!lines[hits[0]].includes("id:'ECHO_BAT'"))throw Error('Unexpected drop definition; manual review required');
const i=hits[0],before=lines[i],after=before.replace(entry,'');
console.log('--- a/'+path+'\n+++ b/'+path+'\n@@ -'+(i+1)+',1 +'+(i+1)+',1 @@\n-'+before+'\n+'+after);
console.log('\nRequired DB change, review only: remove exact ECHO_BAT_WING / ITEM_0077 admin gift catalogue entries after checking pending gifts, historical campaigns, and other grants. Never delete historical receipts.');
console.log('Rebuild both canonical gameplay and coop Edge bundles; verify no wing grant in runtime before any retirement transaction.');
