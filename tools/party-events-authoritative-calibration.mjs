/**
 * Test-only; bundle the production online dungeon loadout builder and
 * the hidden Party Event boss with real mobile stat and equipment sources.
 * No file writes, no external database and no Party Events feature gate changes.
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
 entryPoints:[join(root,'tools/party-events-authoritative-calibration-entry.ts')],
 bundle:true,platform:'node',format:'cjs',target:'es2022',
 write:false,logLevel:'silent',legalComments:'none',
});
if(compile.outputFiles?.length!==1)throw Error('party_event_authoritative_bundle_count');
const result=spawnSync(process.execPath,['-'],{
 input:compile.outputFiles[0].text,encoding:'utf8',cwd:root,
 timeout:180000,maxBuffer:15*1024*1024,
});
if(result.stdout)process.stdout.write(result.stdout);
if(result.stderr)process.stderr.write(result.stderr);
if(result.error)throw result.error;
if(result.status!==0)process.exitCode=result.status||1;
