import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const results=[];
const run=(label,args,cwd=root)=>{
 const result=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:12*1024*1024});
 const output=(result.stdout??'')+(result.stderr??'');
 results.push({check:label,status:result.status===0?'PASS':'FAIL',exitCode:result.status,output});
 console.log(`${result.status===0?'PASS':'FAIL'} ${label}${result.status===0?'':`\n${output}`}`);return result.status===0;
};
const backend=path.join(root,'backend'),mobile=path.join(root,'apps/mobile');
run('backend typecheck',['node_modules/typescript/bin/tsc','--noEmit'],backend);
if(run('online backend build/typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.online.json'],backend)){
 run('online authenticated HTTP and idempotency',['dist/online/backend/online/tests/gameplay.js'],backend);
 run('online co-op owned-loadout derivation',['dist/online/backend/online/tests/coop-loadout.js'],backend);
 run('online co-op authenticated entry and consent',['dist/online/backend/online/tests/coop-entry.js'],backend);
 run('online QMode concurrent receipt recovery',['dist/online/backend/online/tests/qmode-runtime.js'],backend);
 run('online Live queue authenticated admission and retries',['dist/online/backend/online/tests/live-queue.js'],backend);
 run('online Live ready matching and roster freeze',['dist/online/backend/online/tests/live-ready.js'],backend);
 run('online published-loadout full-run balance',['dist/online/backend/online/tests/coop-published-balance.js'],backend);
}
if(run('backend build',['node_modules/typescript/bin/tsc'],backend)){
 const scripts=JSON.parse(fs.readFileSync(path.join(backend,'package.json'))).scripts;
 for(const [name,command] of Object.entries(scripts))if(command.startsWith('node dist/'))run(`backend ${name}`,command.slice(5).split(' '),backend);
}
run('mobile full typecheck',['node_modules/typescript/bin/tsc','--noEmit'],mobile);
run('mobile core typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.core.json','--noEmit'],mobile);
if(run('mobile core build',['node_modules/typescript/bin/tsc','-p','tsconfig.core.json','--outDir','.core-build','--listEmittedFiles'],mobile)){
 // Shared backend imports widen TypeScript's common source directory. Only run
 // test files emitted by this compilation, never leftovers at the old path.
 const emitted=results.at(-1).output.split(/\r?\n/).filter(line=>line.startsWith('TSFILE: ')).map(line=>path.resolve(line.slice(8).trim()));
 const tests=emitted.filter(file=>file.endsWith('.js')&&file.startsWith(path.join(mobile,'.core-build')+path.sep)&&/[/\\](?:apps[/\\]mobile[/\\])?tests[/\\][^/\\]+\.js$/.test(file));
 if(!tests.length)throw new Error('No freshly emitted mobile tests found');
 for(const file of tests.sort())run(`mobile ${path.basename(file)}`,[file],mobile);
}
run('v16 migration static audit',['tools/verify-v16-migration.mjs']);
run('chat pilot core',['src/features/chat-pilot/tests/core.test.cjs'],mobile);
fs.mkdirSync(path.join(root,'docs/implementation/v16-verification'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/implementation/v16-verification/repository-checks.json'),JSON.stringify({runAt:new Date().toISOString(),results},null,2)+'\n');
console.log(`${results.filter(r=>r.status==='PASS').length}/${results.length} checks passed`);
process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
