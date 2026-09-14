import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),backend=path.join(root,'backend');
function run(args,cwd=root){const r=spawnSync(process.execPath,args,{cwd,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1);}
run([path.join(backend,'node_modules/typescript/bin/tsc'),'-p','tsconfig.companions.json'],backend);
for(const file of readdirSync(path.join(backend,'.companions-build/companions/__tests__')).filter(x=>x.endsWith('.js')).sort())run([path.join(backend,'.companions-build/companions/__tests__',file)],backend);
run([path.join(root,'tools/run-mobile-tests.mjs'),'companion-integration','class-skills','monster-mastery']);
run([path.join(backend,'node_modules/typescript/bin/tsc'),'-p','tsconfig.online.json'],backend);
run([path.join(backend,'dist/online/backend/online/tests/companions.js')],backend);
