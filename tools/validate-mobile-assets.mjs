import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),app=path.join(root,'apps/mobile');
const ts=createRequire(path.join(app,'package.json'))('typescript');
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):/\.[jt]sx?$/.test(entry.name)?[path.join(dir,entry.name)]:[]);
let count=0;const issues=[];
for(const file of [path.join(app,'App.tsx'),...files(path.join(app,'src'))]){
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 const visit=node=>{
  if(ts.isCallExpression(node)&&node.expression.getText(source)==='require'&&node.arguments.length===1&&ts.isStringLiteral(node.arguments[0])){
   const reference=node.arguments[0].text;
   if(/\.(png|webp|jpe?g|gif|ttf|otf|mp3|wav)$/.test(reference)){
    count++;const label=path.relative(root,file)+': '+reference;
    if(reference.includes('\\'))issues.push('Non-portable path: '+label);
    const target=path.resolve(path.dirname(file),reference.replaceAll('\\','/'));
    if(!fs.existsSync(target))issues.push('Missing asset: '+label);
    else {const name=path.basename(target);if(!fs.readdirSync(path.dirname(target)).includes(name))issues.push('Filename case mismatch: '+label);}
   }
  }
  ts.forEachChild(node,visit);
 };visit(source);
}
if(issues.length){console.error(issues.join('\n'));process.exitCode=1;}
else console.log(`PASS: ${count} static mobile asset references exist with portable paths and matching filename case`);
