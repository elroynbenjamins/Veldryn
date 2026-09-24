import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=path.join(root,'apps/mobile');
const target=JSON.parse(readFileSync(path.join(root,'tools/staging-project.json'),'utf8'));
const config=JSON.parse(readFileSync(path.join(app,'eas.json'),'utf8')).build.staging.env;
if(target.id!=='iqfmmpvwanvvmxcftfxw'||config.EXPO_PUBLIC_SUPABASE_URL!==`https://${target.id}.supabase.co`||config.EXPO_PUBLIC_COOP_LIVE_READY_V1!=='false')throw new Error('Invalid staging target or Live gate');
console.log(`Starting ${target.name}: online solo and Q-Mode; Live disabled.`);
const child=spawn(process.execPath,[path.join(app,'node_modules/expo/bin/cli'),'start',...process.argv.slice(2)],{
  cwd:app,stdio:'inherit',windowsHide:true,
  env:{...process.env,...config,EXPO_NO_DOTENV:'1'},
});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
