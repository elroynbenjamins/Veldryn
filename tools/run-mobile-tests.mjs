import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=path.join(root,'apps/mobile');
const env={...process.env,NODE_PATH:[path.join(root,'backend/node_modules'),process.env.NODE_PATH].filter(Boolean).join(path.delimiter)};
function run(args){const result=spawnSync(process.execPath,args,{cwd:app,env,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);}
run([path.join(app,'node_modules/typescript/bin/tsc'),'-p','tsconfig.core.json','--outDir','.core-build']);
for(const test of process.argv.slice(2)){
  if(!/^[a-z0-9-]+$/.test(test))throw new Error('Invalid test name');
  run([path.join(app,'.core-build/apps/mobile/tests',`${test}.js`)]);
}
