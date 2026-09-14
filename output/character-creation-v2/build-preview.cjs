const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),ts=require(path.join(root,'apps/mobile/node_modules/typescript'));
function readModule(file){const exports={};const js=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(js,{exports,require:()=>({})});return exports;}
const classes=readModule('apps/mobile/src/content/classes.ts').CLASSES;
const presentations=readModule('apps/mobile/src/theme/class-creation-art.ts').classCreationPresentation;
const data=classes.map(c=>({...c,...presentations[c.id]}));
const template=fs.readFileSync(path.join(__dirname,'preview.template.html'),'utf8');
const softened=template.replace('__CLASS_DATA__',JSON.stringify(data)).replace('</style>',fs.readFileSync(path.join(__dirname,'soft-layout.css'),'utf8')+'\n</style>');
fs.writeFileSync(path.join(__dirname,'preview.html'),softened);
console.log('Built visual review from canonical class data and installed artwork.');
