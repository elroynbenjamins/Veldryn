/**
 * Run current-content combat benchmark without touching the app or database.
 * Output is JSON to stdout, diagnostics to stderr.
 *
 * Usage:
 *   node tools/regional-combat-sim.mjs > regional-combat-sim.json
 */
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(join(root,'backend/package.json'));
const {build}=require('esbuild');
const result=await build({
 absWorkingDir:root,entryPoints:[join(root,'tools/regional-combat-sim-entry.ts')],
 bundle:true,platform:'node',format:'cjs',target:'es2022',
 write:false,logLevel:'silent',legalComments:'none',
});
if(result.outputFiles?.length!==1)throw new Error('regional_combat_sim_bundle_failed');
const executed=spawnSync(process.execPath,['-'],{
 cwd:root,input:result.outputFiles[0].text,encoding:'utf8',
 env:{...process.env,VELDRYN_REGIONAL_CP_FIXTURES_ONLY:'1'},
 timeout:180000,maxBuffer:20*1024*1024,
});
if(executed.stderr)process.stderr.write(executed.stderr);
if(executed.stdout)process.stdout.write(executed.stdout);
if(executed.error)throw executed.error;
if(executed.status!==0)process.exitCode=executed.status||1;
