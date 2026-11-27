/** Review-only assembly for the exact four SQL sources tested on staging.
 * Does not connect to a database, create a migration or deploy anything.
 * Default/--check validates pinned Git blob hashes and transaction boundaries.
 * --emit prints a single proposed transaction for separately approved review.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sources=[
 ['ultra-luxe-six-set-grant-schema-candidate.sql','31f203e282b5b4e3175840d62eda8342ba29a7c7'],
 ['ultra-luxe-full-set-commit-candidate.sql','69bca1655d6517ffee1fb09c81c8673657ca9bf2'],
 ['ultra-luxe-six-name-authority-candidate.sql','c20a70f537091510d6354723ff7ce78fc3dc3799'],
 ['ultra-luxe-full-set-undo-candidate.sql','189724828c9ea3bed4d3df495c2cf2d44945cde1'],
];
const args=process.argv.slice(2);
if(args.length>1||args.length===1&&!['--check','--emit'].includes(args[0]))throw Error('Use --check or --emit; no database execution is supported.');
const segments=sources.map(([file,expected],i)=>{
 const bytes=readFileSync(path.join(root,'docs/roadmap',file));
 const hash=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 if(hash!==expected)throw Error('Unreviewed SQL source drift: '+file);
 let sql=bytes.toString('utf8');
 const controls=sql.split(/\r?\n/).filter(line=>/^\s*(begin|commit|rollback)\s*;\s*$/i.test(line)).map(line=>line.trim().toLowerCase());
 if(JSON.stringify(controls)!==JSON.stringify(i===0?['begin;','commit;']:[]))throw Error('Unexpected transaction controls: '+file);
 if(i===0)sql=sql.replace(/^begin;\r?$/m,'').replace(/^commit;\r?$/m,'');
 return '-- Source: '+file+' / '+expected+'\n'+sql.trim()+'\n';
});
const assembled='-- REVIEW ONLY: 1.0.13 premium cosmetic schema candidate.\n-- No deployment authorization. Verify production function fingerprints,\n-- environment and tested rollback plan before creating a real migration.\nbegin;\nset local lock_timeout=\'3s\';\nset local statement_timeout=\'60s\';\n'+segments.join('\n')+'\ncommit;\n';
const finalControls=assembled.split('\n').filter(line=>/^\s*(begin|commit|rollback)\s*;\s*$/i.test(line)).map(line=>line.trim().toLowerCase());
if(JSON.stringify(finalControls)!==JSON.stringify(['begin;','commit;']))throw Error('Assembly must contain exactly one outer transaction.');
if(args[0]==='--emit')process.stdout.write(assembled);
else console.log('PASS: four exact reviewed SQL blobs in dependency order; one outer transaction; no deployment performed.');
