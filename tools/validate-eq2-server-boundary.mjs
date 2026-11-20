import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/** Hidden 2.0 backend authority modules must not import mobile runtime.
 * TypeScript's rootDir check handles deeper transitive dependencies; this
 * narrow direct-import gate also makes future accidental coupling obvious.
 * GameState rehearsal adapters are intentionally not on this pure list yet.
 */
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const pure=[
 'manifest','rolls','instances','transaction','commit-plan','custody',
 'delivery','storage-reservations','pouch-snapshot','legacy-custody-view',
 'server-projection','virtual-history','gem-sidecar-types','gem-identity',
 'gem-verifier','effect-gem-policy','skill-xp',
];
const errors=[];
for(const name of pure){
 const path=resolve(root,'backend/src/server/equipment/equipment-crafting-v2-'+name+'.ts');
 let source;
 try{source=readFileSync(path,'utf8');}catch{errors.push(name+': missing server module');continue;}
 const imports=[...source.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]/g)];
 for(const [,normal,dynamic] of imports){
  const target=normal??dynamic;
  if(target.includes('apps/mobile')||target.includes('react-native')||target.includes('/screens/')){
   errors.push(name+': forbidden client dependency '+target);
  }
 }
}
if(errors.length){
 for(const error of errors)console.error('EQ2 SERVER BOUNDARY: '+error);
 process.exitCode=1;
}else{
 console.log('PASS: '+pure.length+' isolated Equipment 2.0 server authority modules have no direct mobile runtime imports');
}
