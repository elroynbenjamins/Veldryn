/**
 * Read-only cross-runtime calibration runner.
 * esbuild bundles the REAL mobile equipment/stat sources and the hidden server
 * boss simulator together. The output exists only in memory; no game bundle,
 * database, client route or feature flag is modified.
 */
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(join(root,'backend/package.json'));
const {build}=require('esbuild');
const compile=await build({
 absWorkingDir:root,
 entryPoints:[join(root,'tools/party-events-gear-calibration-entry.ts')],
 bundle:true,platform:'node',format:'cjs',target:'es2022',
 write:false,logLevel:'silent',legalComments:'none',
});
if(compile.outputFiles?.length!==1)throw Error('party_events_bundle_unexpected_output');
const executed=spawnSync(process.execPath,['-'],{
 input:compile.outputFiles[0].text,encoding:'utf8',
 cwd:root,timeout:180000,maxBuffer:12*1024*1024,
});
if(executed.stdout)process.stdout.write(executed.stdout);
if(executed.stderr)process.stderr.write(executed.stderr);
if(executed.error)throw executed.error;
if(executed.status!==0)process.exitCode=executed.status||1;
