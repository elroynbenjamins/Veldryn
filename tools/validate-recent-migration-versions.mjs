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
const malformedDollarQuotes=[];
for(const name of files){
  const sql=fs.readFileSync(path.join(root,name),'utf8');
  const badOpen=[...sql.matchAll(/(?:as|is)\s+\$(?!\$|[A-Za-z_])/g)].map(match=>match.index);
  const badClose=[...sql.matchAll(/end\s+\$;/g)].map(match=>match.index);
  const ambiguousTaggedClose=[...sql.matchAll(/\$\$[A-Za-z_][A-Za-z0-9_]*\$/g)].map(match=>match.index);
  if(badOpen.length||badClose.length||ambiguousTaggedClose.length)malformedDollarQuotes.push({name,count:badOpen.length+badClose.length+ambiguousTaggedClose.length});
}
if(malformedDollarQuotes.length){
  console.error('Malformed PostgreSQL dollar-quote delimiters detected:');
  for(const row of malformedDollarQuotes)console.error('  '+row.name+': '+row.count+' suspicious delimiter(s)');
  process.exit(1);
}
console.log('PASS: Supabase migration versions are unique and SQL dollar-quotes are sane ('+files.length+' migrations checked)');
