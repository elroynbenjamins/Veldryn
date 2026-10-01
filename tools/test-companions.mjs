import {spawnSync} from 'node:child_process';
import {readdirSync,rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),backend=path.join(root,'backend');
const env={...process.env,NODE_PATH:[path.join(root,'backend/node_modules'),process.env.NODE_PATH].filter(Boolean).join(path.delimiter)};
function run(args,cwd=root){const r=spawnSync(process.execPath,args,{cwd,env,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1);}
// Invoke the JavaScript compiler entrypoint directly. The package's
// extensionless `bin/tsc` launcher is executable through a shell, but Node
// cannot load it reliably on Windows.
const tsc=path.join(backend,'node_modules/typescript/lib/tsc.js');
rmSync(path.join(backend,'.companions-build'),{recursive:true,force:true});
run([tsc,'-p','tsconfig.companions.json'],backend);
for(const file of readdirSync(path.join(backend,'.companions-build/server/companions/__tests__')).filter(x=>x.endsWith('.js')).sort())run([path.join(backend,'.companions-build/server/companions/__tests__',file)],backend);
