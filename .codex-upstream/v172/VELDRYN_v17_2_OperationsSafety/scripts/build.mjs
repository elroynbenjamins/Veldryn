import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(src, dist, { recursive: true });
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://REPLACE_WITH_PROJECT.supabase.co';
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || 'REPLACE_WITH_SUPABASE_ANON_KEY';
await writeFile(path.join(dist, 'config.js'), `window.VELDRYN_CONTROL_CONFIG = ${JSON.stringify({ supabaseUrl, supabaseAnonKey })};\n`);
const index = await readFile(path.join(dist, 'index.html'), 'utf8');
if (!index.includes('/config.js') || !index.includes('/app.js')) throw new Error('build_output_missing_entry_scripts');
console.log(`Built VELDRYN Control to ${dist}`);
if (supabaseUrl.includes('REPLACE_') || supabaseAnonKey.includes('REPLACE_')) console.log('NOTE: build uses placeholder Supabase public configuration. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in Cloudflare Pages.');
