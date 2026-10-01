import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('../apps/mobile/node_modules/typescript');
const root=path.resolve('apps/mobile');
const protectedAttributes=new Set(['pointerEvents','animationType','accessibilityRole','resizeMode','keyboardType','autoCapitalize','testID','nativeID']);
const protectedFields=new Set(['kind','type','mode','targetId','itemId','skillId','recipeId','monsterId','zoneId']);
const translationCall=/^(?:t|tr|gt|gl|at|st|pt|ct|it|contentText|itemDetailText|itemDetailContent|craftingDetailText|appText|sharedText|navigationText|battleText|visualText|accountT|accountText|socialText|socialLabel|progressionT|progressionText|creationT|profileT|companionT|localizeGameplay)$/;
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):/\.tsx?$/.test(entry.name)?[path.join(dir,entry.name)]:[]);}
function translated(node){
 if(!node)return false;
 if(ts.isCallExpression(node)&&translationCall.test(node.expression.getText()))return true;
 return ts.forEachChild(node,translated)===true;
}
function translationParameters(node){
 const object=node.parent,call=object?.parent;
 return object&&ts.isObjectLiteralExpression(object)&&call&&ts.isCallExpression(call)&&translationCall.test(call.expression.getText());
}
const issues=[];
for(const file of [path.join(root,'App.tsx'),...files(path.join(root,'src/components')),...files(path.join(root,'src/screens'))]){
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 const report=node=>issues.push(`${path.relative(root,file)}:${source.getLineAndCharacterOfPosition(node.getStart()).line+1} ${node.getText().slice(0,160)}`);
 function visit(node){
  if(ts.isJsxAttribute(node)){
   const name=node.name.getText(),element=node.parent.parent;
   const iconName=name==='name'&&ts.isJsxSelfClosingElement(element)&&element.tagName.getText()==='UiIcon';
   if((protectedAttributes.has(name)||iconName)&&translated(node.initializer))report(node);
  }
  if(ts.isPropertyAssignment(node)&&protectedFields.has(node.name.getText())&&!translationParameters(node)&&translated(node.initializer))report(node);
  ts.forEachChild(node,visit);
 }
 visit(source);
}
if(issues.length){console.error('Translation calls found in technical values:\n'+issues.join('\n'));process.exitCode=1;}
else console.log('PASS localization boundaries: technical props and gameplay identifiers are not translated.');
