/**
 * Read-only standalone build calibration.
 * Executes the real mobile game source through esbuild, without writing
 * app bundles, data migrations or any production state.
 */
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(join(root,'backend/package.json'));
const {build}=require('esbuild');
const compiled=await build({
 absWorkingDir:root,
 entryPoints:[join(root,'tools/regional-gear-cp-benchmark-entry.ts')],
 platform:'node',format:'cjs',target:'es2022',bundle:true,
 write:false,logLevel:'silent',legalComments:'none',
});
if(compiled.outputFiles?.length!==1)throw Error('regional_calibration_bundle_invalid');
const run=spawnSync(process.execPath,['-'],{
 input:compiled.outputFiles[0].text,encoding:'utf8',cwd:root,timeout:180000,
 maxBuffer:12*1024*1024,
});
if(run.stdout)process.stdout.write(run.stdout);
if(run.stderr)process.stderr.write(run.stderr);
if(run.error)throw run.error;
if(run.status!==0)process.exitCode=run.status||1;
