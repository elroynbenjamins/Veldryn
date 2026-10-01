import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('../apps/mobile/node_modules/typescript');
const root=path.resolve('apps/mobile');
const attributes=new Set(['title','label','message','description','placeholder','accessibilityLabel','accessibilityHint','emptyText','confirmLabel','cancelLabel','eyebrow','helper','note']);
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):entry.name.endsWith('.tsx')?[path.join(dir,entry.name)]:[]);}
const candidates=[];
for(const file of [path.join(root,'App.tsx'),...files(path.join(root,'src/screens')),...files(path.join(root,'src/components'))]){
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const add=(node,text,kind)=>{text=text.replace(/\s+/g,' ').trim();if(!/[A-Za-z]{2}/.test(text))return;const {line}=source.getLineAndCharacterOfPosition(node.getStart(source));candidates.push({file:path.relative(root,file).replaceAll('\\','/'),line:line+1,kind,text});};
 const visibleExpression=node=>{
  if(!node)return;
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))add(node,node.text,'literal');
  else if(ts.isTemplateExpression(node))add(node,[node.head.text,...node.templateSpans.map(span=>`{expression}${span.literal.text}`)].join(''),'template');
  else if(ts.isConditionalExpression(node)){visibleExpression(node.whenTrue);visibleExpression(node.whenFalse);}
  else if(ts.isBinaryExpression(node)){visibleExpression(node.left);visibleExpression(node.right);}
 };
 function visit(node){
  if(ts.isJsxText(node))add(node,node.text,'jsx');
  if(ts.isJsxAttribute(node)&&attributes.has(node.name.getText(source))){if(node.initializer&&ts.isStringLiteral(node.initializer))add(node.initializer,node.initializer.text,'attribute');else if(node.initializer&&ts.isJsxExpression(node.initializer))visibleExpression(node.initializer.expression);}
  if(ts.isJsxExpression(node)&&node.parent&&ts.isJsxElement(node.parent)&&/^(?:Text|Animated\.Text)$/.test(node.parent.openingElement.tagName.getText(source)))visibleExpression(node.expression);
  ts.forEachChild(node,visit);
 }
 visit(source);
}
const counts={};for(const row of candidates)counts[row.file]=(counts[row.file]??0)+1;
const report={note:'Review candidates, not a claim of complete coverage: proper names, technical abbreviations and user content may be intentional. Data-driven descriptions and server errors require separate review.',count:candidates.length,files:Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([file,count])=>({file,count})),candidates};
const output=process.argv.indexOf('--output');
if(output>=0){const target=path.resolve(process.argv[output+1]);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({...report,candidates:process.argv.includes('--details')?candidates:undefined},null,2));
