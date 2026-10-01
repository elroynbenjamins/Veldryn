import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('../apps/mobile/node_modules/typescript');
const root=path.resolve('apps/mobile/src/i18n');
const placeholders=text=>[...new Set([...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(match=>match[1]))].sort().join(',');
let count=0;const errors=[];
for(const file of fs.readdirSync(root).filter(name=>name.endsWith('.ts'))){
 const sf=ts.createSourceFile(file,fs.readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true);
 function visit(node){
  if(ts.isPropertyAssignment(node)&&ts.isStringLiteral(node.name)&&ts.isArrayLiteralExpression(node.initializer)&&[5,6].includes(node.initializer.elements.length)&&node.initializer.elements.every(ts.isStringLiteral)){
   count++;const expected=placeholders(node.initializer.elements.length===6?node.initializer.elements[0].text:node.name.text);
   node.initializer.elements.forEach((value,index)=>{if(!value.text.trim())errors.push(`${file}: empty translation ${node.name.text} [${index}]`);if(placeholders(value.text)!==expected)errors.push(`${file}: placeholder mismatch ${node.name.text} [${index}]`);});
  }
  ts.forEachChild(node,visit);
 }
 visit(sf);
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`PASS: ${count} catalog rows have five nonempty translations with matching placeholders. Typed keyed catalogs are additionally checked by TypeScript and their domain tests.`);
