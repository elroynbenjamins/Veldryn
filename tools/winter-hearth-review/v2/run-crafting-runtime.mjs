// Isolated, non-deployable build: override one compile-time flag in memory.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const require=createRequire(join(root,'backend/package.json'));
const {build}=require('esbuild');
const flag=resolve(root,'apps/mobile/src/core/release-flags.ts');
const entry=resolve(root,'tools/winter-hearth-review/v2/crafting-runtime-fixture.ts');
const source=readFileSync(flag,'utf8');
const needle='export const WINTER_HEARTH_GUILD_RELEASED=false;';
if(source.split(needle).length!==2)throw Error('Expected a single disabled release flag');
let replacements=0;
const built=await build({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',target:'node22',write:false,logLevel:'warning',plugins:[{name:'qa-only-winter-hearth-flag',setup(b){b.onLoad({filter:/release-flags\.ts$/},args=>{if(resolve(args.path)!==flag)return;replacements++;return {contents:source.replace(needle,'export const WINTER_HEARTH_GUILD_RELEASED=true;'),loader:'ts',resolveDir:join(root,'apps/mobile/src/core')};});}}]});
if(replacements!==1||built.outputFiles.length!==1)throw Error('QA overlay was not applied exactly once');
const dir=mkdtempSync(join(tmpdir(),'winter-hearth-crafting-qa-'));
try{
 const file=join(dir,'fixture.cjs');
 writeFileSync(file,built.outputFiles[0].contents);
 const child=spawnSync(process.execPath,[file],{stdio:'inherit',timeout:120000});
 if(child.error)throw child.error;
 if(child.status!==0)throw Error('Crafting runtime fixture failed: '+child.status);
 if(readFileSync(flag,'utf8')!==source)throw Error('Release source changed during QA');
}finally{rmSync(dir,{recursive:true,force:true});}
