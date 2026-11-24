import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// Read-only checkout audit; never touches databases, secrets, or runtime state.
// Exact literal hits are evidence to classify, not automatic retirement clearance.
const pattern='ECHO_BAT_WING|Echo[ _-]Bat[ _-]Wing';
let paths=[];
try {
 paths=execFileSync('git',['grep','-Iil','-E',pattern,'--','apps/mobile/src','backend','packages'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
} catch(e) {
 if(e.status!==1)throw e;
}
let total=0;
for(const path of paths){
 const source=readFileSync(path,'utf8');
 const hits=[...source.matchAll(new RegExp(pattern,'gi'))];
 total+=hits.length;
 console.log(path+' — '+hits.length+' exact references');
 for(const hit of hits.slice(0,16)){
  const index=hit.index;
  const line=source.slice(0,index).split('\n').length;
  const excerpt=source.slice(Math.max(0,index-100),Math.min(source.length,index+hit[0].length+120)).replace(/\s+/g,' ');
  console.log('  L'+line+': '+excerpt);
 }
 if(hits.length>16)console.log('  Remaining '+(hits.length-16)+' occurrences require inspection.');
}
console.log('Total: '+total+' exact references in '+paths.length+' files. Classify producers, consumers, aliases, generated duplicates and metadata before approving retirement.');
if(!paths.some(p=>p==='backend/supabase/functions/gameplay/index.ts'))console.log('No exact literal in gameplay bundle; inspect indirect and generated mappings separately.');
