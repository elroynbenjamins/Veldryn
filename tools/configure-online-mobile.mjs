import fs from 'node:fs';
import path from 'node:path';
import {projectKeys,url,root} from './online-context.mjs';
const file=path.join(root,'apps/mobile/.env.local');
const publicValues={EXPO_PUBLIC_SUPABASE_URL:url,EXPO_PUBLIC_SUPABASE_ANON_KEY:projectKeys().anon,EXPO_PUBLIC_SERVER_GAMEPLAY:'true'};
const existing=fs.existsSync(file)?fs.readFileSync(file,'utf8').split(/\r?\n/):[];
const preserved=existing.filter(line=>!Object.keys(publicValues).some(key=>line.startsWith(key+'=')));
fs.writeFileSync(file,[...preserved,...Object.entries(publicValues).map(([key,value])=>key+'='+value)].join('\n').trim()+'\n');
console.log('Configured ignored mobile .env.local with public Supabase settings and server gameplay. No privileged key was written.');
