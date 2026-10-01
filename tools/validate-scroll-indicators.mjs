import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from '../apps/mobile/node_modules/typescript/lib/typescript.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=path.join(root,'apps/mobile');
const fix=process.argv.includes('--fix');
const props=['showsVerticalScrollIndicator','showsHorizontalScrollIndicator'];
const primitives=new Set(['ScrollView','FlatList','SectionList','VirtualizedList']);
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):entry.name.endsWith('.tsx')?[path.join(dir,entry.name)]:[]);}
let checked=0,changed=0;
const failures=[];
for(const file of [path.join(app,'App.tsx'),...files(path.join(app,'src'))]){
 const source=fs.readFileSync(file,'utf8');
 const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const names=new Set(),namespaces=new Set(),animated=new Set();
 for(const node of tree.statements){
  if(!ts.isImportDeclaration(node)||node.moduleSpecifier.text!=='react-native')continue;
  const bindings=node.importClause?.namedBindings;
  if(bindings&&ts.isNamespaceImport(bindings))namespaces.add(bindings.name.text);
  if(bindings&&ts.isNamedImports(bindings))for(const entry of bindings.elements){
   const imported=entry.propertyName?.text??entry.name.text;
   if(primitives.has(imported))names.add(entry.name.text);
   if(imported==='Animated')animated.add(entry.name.text);
  }
 }
 const edits=[];
 function visit(node){
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const tag=node.tagName.getText(tree),parts=tag.split('.');
   if(names.has(tag)||((namespaces.has(parts[0])||animated.has(parts[0]))&&primitives.has(parts.at(-1)))){
    checked++;
    const missing=[];
    for(const prop of props){
     const attr=node.attributes.properties.find(entry=>ts.isJsxAttribute(entry)&&entry.name.getText(tree)===prop);
     const hidden=attr?.initializer&&ts.isJsxExpression(attr.initializer)&&attr.initializer.expression?.kind===ts.SyntaxKind.FalseKeyword;
     if(hidden)continue;
     failures.push(`${path.relative(root,file)}:${tree.getLineAndCharacterOfPosition(node.getStart(tree)).line+1} ${prop}`);
     if(attr)edits.push({start:attr.getStart(tree),end:attr.end,text:`${prop}={false}`});
     else missing.push(`${prop}={false}`);
    }
    if(missing.length)edits.push({start:node.attributes.end,end:node.attributes.end,text:' '+missing.join(' ')});
   }
  }
  ts.forEachChild(node,visit);
 }
 visit(tree);
 if(fix&&edits.length){
  let output=source;
  for(const edit of edits.sort((a,b)=>b.start-a.start))output=output.slice(0,edit.start)+edit.text+output.slice(edit.end);
  fs.writeFileSync(file,output);changed++;
 }
}
if(failures.length&&!fix){console.error(failures.join('\n'));process.exitCode=1;}
else console.log(`${fix?'UPDATED':'PASS'}: ${checked} native scroll surfaces hide both indicators${fix?` (${changed} files updated)`:''}; scrolling remains enabled.`);
