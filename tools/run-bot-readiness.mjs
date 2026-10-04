import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const group=process.argv[2]??'mobile';
const out=path.join(root,'artifacts/bot-readiness');fs.mkdirSync(out,{recursive:true});
const retry=process.argv.includes('--retry');
const previous=retry&&fs.existsSync(path.join(out,group+'.json'))?JSON.parse(fs.readFileSync(path.join(out,group+'.json'),'utf8')):null;
const report=previous??{group,startedAt:new Date().toISOString(),scope:'Local isolated simulations; no hosted services or real player accounts',checks:[]};
const env={...process.env,NODE_PATH:path.join(root,'backend/node_modules'),PGLITE_MODULE:process.env.PGLITE_MODULE??path.join(process.env.TEMP,'veldryn-guild-pve-test/node_modules/@electric-sql/pglite/dist/index.js')};
function save(){fs.writeFileSync(path.join(out,group+'.json'),JSON.stringify(report,null,2)+'\n');}
async function run(id,args,cwd=root){
 const old=report.checks.find(row=>row.id===id);if(retry&&old?.status==='PASS'&&!id.includes('compile')&&!id.includes('typecheck'))return true;
 const begin=Date.now(),logPath=path.join(out,group+'-'+id.replace(/[^a-z0-9_-]/gi,'_')+'.log');const log=fs.createWriteStream(logPath);
 const status=await new Promise(resolve=>{const child=spawn(process.execPath,args,{cwd,env,windowsHide:true});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',error=>{log.write(String(error));resolve(-1)});child.on('close',code=>resolve(code));});
 await new Promise(resolve=>log.end(resolve));const row={id,status:status===0?'PASS':'FAIL',exitCode:status,seconds:Math.round((Date.now()-begin)/1000),log:path.relative(root,logPath)};if(old){row.previousStatus=old.status;report.checks[report.checks.indexOf(old)]=row;}else report.checks.push(row);save();console.log(row.status+' '+id+' ('+row.seconds+'s)');return status===0;
}
const tsc=path.join(root,'backend/node_modules/typescript/lib/tsc.js');
if(group==='mobile'){
 const app=path.join(root,'apps/mobile');
 await run('full-typecheck',[tsc,'-p','tsconfig.json','--noEmit'],app);
 if(await run('core-compile',[tsc,'-p','tsconfig.core.json','--outDir','.bot-readiness-build'],app)){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'tools/mobile-core-tests.json'),'utf8'));
 const extra=['bot-player-journeys','guild-customization','guild-pve-encounters','guild-pve-effort','live-events','offline-event-currency','queue-continuation'];
 const tests=[...new Set([...manifest,...extra.map(name=>'.core-build/apps/mobile/tests/'+name+'.js')])];
 for(const test of tests)await run(path.basename(test),[test.replace('.core-build/','.bot-readiness-build/')],app);
 }
}else if(group==='online'){
 if(await run('online-compile',[tsc,'-p','backend/tsconfig.online.json','--outDir','backend/.bot-readiness-online'])){
 const dir=path.join(root,'backend/.bot-readiness-online/backend/online/tests');
 for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.js')).sort())await run(file,[path.join(dir,file)]);
 }
}else if(group==='database'){
 for(const name of ['guild-pve-db','guild-pve-balance-db','guild-project-rewards-db','guild-event-name-colors-db','guild-event-color-visibility-db','guild-background-db','guild-name-limit-db','profile-icons-db'])await run(name,['tools/test-'+name+'.mjs']);
 await run('billing-handler',['tools/test-play-billing.mjs']);
 await run('billing-transport',['tools/test-play-billing-transport.mjs']);
 for(const name of ['recent-migration-versions','event-release-graph','master-roster-assets','companion-art-coverage','localization-catalogs','localization-boundaries','identity-safety','social-invitations','guild-chat','chat-usability','chat-attention'])await run(name,['tools/validate-'+name+'.mjs']);
}else if(group==='backend'){
 if(await run('backend-compile',[tsc,'-p','backend/tsconfig.json','--outDir','backend/.bot-readiness-backend'])){
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'backend/package.json'),'utf8'));
 const tests=new Set();for(const cmd of Object.values(pkg.scripts))for(const m of cmd.matchAll(/node (dist\/server\/[^\s]+\.js)/g))if(!m[1].endsWith('pve-balance-cli.js'))tests.add(m[1]);
 for(const file of tests)await run(path.basename(file),[file.replace('dist/','.bot-readiness-backend/')],path.join(root,'backend'));
 }
}else throw new Error('Unknown group');
report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(x=>x.status==='PASS').length;report.failed=report.checks.length-report.passed;save();console.log(JSON.stringify({group,passed:report.passed,failed:report.failed}));process.exitCode=report.failed?1:0;
