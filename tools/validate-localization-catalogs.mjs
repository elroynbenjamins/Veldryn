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

// The Spanish catch-up catalog intentionally supplies exact-source UI copy only.
// Validate its tokens and make new English-only literals in these screens visible in CI.
const gapSource=fs.readFileSync(path.join(root,'spanish-ui-gaps.ts'),'utf8');
const gapMatch=/export const SPANISH_UI_GAPS = (\{[\s\S]*?\}) as const satisfies Record<string,string>;/.exec(gapSource);
let spanishGaps={};
if(!gapMatch)errors.push('spanish-ui-gaps.ts: missing parseable source catalog');
else{
 spanishGaps=JSON.parse(gapMatch[1]);
 for(const [source,translated] of Object.entries(spanishGaps)){
  if(typeof translated!=='string'||!translated.trim())errors.push('spanish-ui-gaps.ts: empty '+source);
  if(placeholders(source)!==placeholders(translated))errors.push('spanish-ui-gaps.ts: placeholder mismatch '+source);
 }
}
const accountSource=ts.createSourceFile('account.ts',fs.readFileSync(path.join(root,'account.ts'),'utf8'),ts.ScriptTarget.Latest,true);
const accountKeys=new Set();
function collectAccountKeys(node){
 if(ts.isVariableDeclaration(node)&&node.name.getText(accountSource)==='accountTranslationRows'&&node.initializer&&ts.isObjectLiteralExpression(node.initializer))
  for(const entry of node.initializer.properties)if(ts.isPropertyAssignment(entry)&&ts.isStringLiteral(entry.name))accountKeys.add(entry.name.text);
 ts.forEachChild(node,collectAccountKeys);
}
collectAccountKeys(accountSource);
const checkedScreens=[
 'ResourceCodexScreen','MarketInboxPanel','MoreScreen','SettingsScreen',
 'CommunityRoadmapScreen','HomeScreen','RewardsInboxScreen','StoreScreen',
 'SkillsScreen','EventScreen'
];
for(const screen of checkedScreens){
 const filename=path.join(root,'..','screens',screen+'.tsx');
 const file=ts.createSourceFile(screen+'.tsx',fs.readFileSync(filename,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function check(node){
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)){
   const name=node.expression.text,index=name==='a'?0:name==='accountText'?1:-1;
   const key=index>=0?node.arguments[index]:undefined;
   if(key&&(ts.isStringLiteral(key)||ts.isNoSubstitutionTemplateLiteral(key))&&!accountKeys.has(key.text)&&!Object.prototype.hasOwnProperty.call(spanishGaps,key.text))
    errors.push(screen+': missing Spanish UI string '+JSON.stringify(key.text));
  }
  ts.forEachChild(node,check);
 }
 check(file);
}

if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`PASS: ${count} catalog rows have five nonempty translations with matching placeholders. Typed keyed catalogs are additionally checked by TypeScript and their domain tests.`);
