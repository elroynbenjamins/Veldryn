// Render the real boundary with a throwing child; no Android device required.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const app=path.resolve(__dirname,'../apps/mobile');
const fromApp=Module.createRequire(path.join(app,'package.json'));
const React=fromApp('react');
const {act,create}=fromApp('react-test-renderer');
const ts=fromApp('typescript');
global.IS_REACT_ACT_ENVIRONMENT=true;
const mocks=new Map([
 ['react',React],
 ['react-native',{Text:'Text',View:'View'}],
 [path.join(app,'src/theme/ThemeContext'),{useGameTheme:()=>({line:'#555',panel2:'#222',info:'#9cf',text:'#fff'})}],
]);
const loaded=new Map();
function load(filename){
 filename=path.resolve(filename);
 if(mocks.has(filename))return mocks.get(filename);
 if(!path.extname(filename))filename+=(fs.existsSync(filename+'.tsx')?'.tsx':'.ts');
 if(loaded.has(filename))return loaded.get(filename).exports;
 const mod={exports:{}};loaded.set(filename,mod);
 const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const localRequire=name=>name.startsWith('.')?load(path.resolve(path.dirname(filename),name)):mocks.get(name)||fromApp(name);
 new Function('require','module','exports',compiled)(localRequire,mod,mod.exports);
 return mod.exports;
}
const {ChatRowErrorBoundary}=load(path.join(app,'src/components/ChatRowErrorBoundary'));
function BrokenBadge(){throw new Error('Simulated malformed badge render');}
async function main(){
 let tree;const originalError=console.error;
 try{
  // React logs the intentionally thrown test error even though the boundary catches it.
  console.error=()=>{};
  await act(async()=>{tree=create(React.createElement(ChatRowErrorBoundary,{name:'Guild Officer',body:'Hello from Guild Chat'},React.createElement(BrokenBadge)));});
  const visible=tree.root.findAllByType('Text').map(node=>node.children.join(' ')).join(' | ');
  assert.match(visible,/Guild Officer/);
  assert.match(visible,/Hello from Guild Chat/,'Failed decoration must show the original authorized text.');
  await act(async()=>{tree.unmount();});tree=null;
  await act(async()=>{tree=create(React.createElement(ChatRowErrorBoundary,{name:'Guild Leader',body:'Hi'},React.createElement('Text',null,'Healthy decorated row')));});
  assert.equal(tree.root.findAllByType('Text').length,1,'Healthy messages keep their original presentation.');
  assert.match(tree.root.findByType('Text').children.join(' '),/Healthy decorated row/);
  console.log('PASS: Guild Chat row errors preserve readable text and healthy rows retain the original UI');
 }finally{console.error=originalError;if(tree)await act(async()=>tree.unmount());}
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
