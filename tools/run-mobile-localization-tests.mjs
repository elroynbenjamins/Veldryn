import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=path.join(root,'apps/mobile');
function run(file,args=[],cwd=root){
 const result=spawnSync(process.execPath,[file,...args],{cwd,stdio:'inherit',windowsHide:true});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
run(path.join(app,'node_modules/typescript/lib/tsc.js'),['--noEmit'],app);
run(path.join(root,'tools/validate-localization-catalogs.mjs'));
run(path.join(root,'tools/validate-localization-boundaries.mjs'));
run(path.join(root,'tools/run-mobile-tests.mjs'),['localization','localization-foundation']);
for(const file of ['account-localization.cjs','localization-creation-profile-focused.mjs','gameplay-localization-focused.mjs','progression-localization.cjs','companions-localization.cjs','localization-social.mjs']){
 run(path.join(app,'tests',file),[],app);
}
console.log('PASS: mobile localization checks');
