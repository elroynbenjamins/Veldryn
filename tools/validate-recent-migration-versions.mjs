import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..','backend','supabase','migrations');
const floor='20261023000000';
const files=fs.readdirSync(root).filter(name=>/^\d{14}_.+\.sql$/.test(name));
const recent=files.filter(name=>name.slice(0,14)>=floor);
const byVersion=new Map();
for(const name of recent){
  const version=name.slice(0,14);
  const rows=byVersion.get(version)??[];
  rows.push(name);
  byVersion.set(version,rows);
}
const collisions=[...byVersion.entries()].filter(([,rows])=>rows.length>1);
if(collisions.length){
  console.error('Recent Supabase migration version collisions detected:');
  for(const [version,rows] of collisions)console.error('  '+version+': '+rows.join(', '));
  process.exit(1);
}
console.log('PASS: recent Supabase migration versions are unique ('+recent.length+' migrations checked)');
