import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..','backend','supabase','migrations');
const files=fs.readdirSync(root).filter(name=>/^\d{14}_.+\.sql$/.test(name));
const byVersion=new Map();
for(const name of files){
  const version=name.slice(0,14);
  const rows=byVersion.get(version)??[];
  rows.push(name);
  byVersion.set(version,rows);
}
const collisions=[...byVersion.entries()].filter(([,rows])=>rows.length>1);
if(collisions.length){
  console.error('Supabase migration version collisions detected:');
  for(const [version,rows] of collisions)console.error('  '+version+': '+rows.join(', '));
  process.exit(1);
}
console.log('PASS: Supabase migration versions are unique ('+files.length+' migrations checked)');
