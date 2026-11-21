import {existsSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
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
 'game-metadata','physical-delivery-staging',
];
const errors=[];
const visited=new Set();
// A clean root can still reach mobile runtime transitively. Check the whole
// local dependency graph, not just its first import hop (the old check missed
// physical-delivery-staging -> gem-sidecar -> apps/mobile).
function visit(file,chain){
 if(visited.has(file))return;
 visited.add(file);
 let source;
 try{source=readFileSync(file,'utf8');}
 catch{errors.push(chain.join(' -> ')+': missing server module');return;}
 const imports=[...source.matchAll(/\\bfrom\\s*['"]([^'"]+)['"]|\\bimport\\s*(?:\\(\\s*)?['"]([^'"]+)['"]/g)];
 for(const match of imports){
  const target=match[1]??match[2];
  if(target.includes('apps/mobile')||target.includes('react-native')||target.includes('/screens/')){
   errors.push([...chain,target].join(' -> ')+': forbidden client dependency');
   continue;
  }
  if(!target.startsWith('.'))continue;
  const location=resolve(dirname(file),target);
  const candidates=[location,location+'.ts',location+'.tsx',resolve(location,'index.ts')];
  const linked=candidates.find(path=>existsSync(path)&&/\\.(ts|tsx)$/.test(path));
  if(linked)visit(linked,[...chain,target]);
 }
}
for(const name of pure){
 const path=resolve(root,'backend/src/server/equipment/equipment-crafting-v2-'+name+'.ts');
 visit(path,[name]);
}
if(errors.length){
 for(const error of errors)console.error('EQ2 SERVER BOUNDARY: '+error);
 process.exitCode=1;
}else{
 console.log('PASS: '+pure.length+' isolated Equipment 2.0 authority roots and their transitive local imports have no mobile runtime dependencies');
}
