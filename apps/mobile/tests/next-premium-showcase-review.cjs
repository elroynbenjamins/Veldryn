const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const mobile=path.resolve(__dirname,'..'),src=path.join(mobile,'src');
const component=path.join(src,'components/profile/NextPremiumShowcaseReview.tsx');
// Render pure component structure with a mock native host. This is not device or visual QA.
const clock={interpolate:config=>({config})};
const jsx=(type,props)=>typeof type==='function'?type(props):({type,props});
const rn={View:'View',Image:'Image',Animated:{Image:'Animated.Image',multiply:()=>clock,modulo:()=>clock},StyleSheet:{create:x=>x,absoluteFill:{position:'absolute'}}};
const cache=new Map();
function load(file){
 if(cache.has(file))return cache.get(file);
 const source=fs.readFileSync(file,'utf8');
 const transpile=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}});
 assert(!transpile.diagnostics.some(d=>d.category===ts.DiagnosticCategory.Error),file);
 const mod={exports:{}};cache.set(file,mod.exports);
 const req=name=>{
  if(name==='react')return {memo:x=>x,useMemo:f=>f()};
  if(name==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'Fragment'};
  if(name==='react-native')return rn;
  if(name.endsWith('.webp'))return name;
  if(name.startsWith('.')){
   const base=path.resolve(path.dirname(file),name);
   for(const ext of ['.ts','.tsx'])if(fs.existsSync(base+ext))return load(base+ext);
  }
  throw Error('Unexpected mocked import '+name+' from '+file);
 };
 new Function('exports','module','require',transpile.outputText)(mod.exports,mod,req);return mod.exports;
}
const {NextPremiumShowcaseReview:render}=load(component);
const {NEXT_PREMIUM_SETS:sets}=load(path.join(src,'core/next-premium-set-review.ts'));
function nodes(node){
 if(Array.isArray(node))return node.flatMap(nodes);
 if(!node||typeof node!=='object'||!node.type)return [];
 return [node,...nodes(node.props?.children)];
}
const count=(tree,type)=>nodes(tree).filter(x=>x.type===type).length;
const bySource=(tree,fragment)=>nodes(tree).filter(x=>typeof x.props?.source==='string'&&x.props.source.includes(fragment));
for(const [i,set] of sets.entries()){
 const stem=i===0?'spirit_fox':'direwolf',badge=i===0?'blossom_crest_64':'wolf_crest_64';
 const p={setId:set.id,width:340,fontScale:1,clock,running:true,fullSet:true,petId:set.pet,badgeId:set.badge,identity:'Identity',guild:'Guild',fallback:'Fallback'};
 const live=render(p);
 assert.equal(count(live,'Animated.Image'),15); // 8 border + 6 environment + 1 atlas
 assert.equal(bySource(live,stem+'_idle_atlas').length,1);
 assert.equal(bySource(live,badge).length,1);
 assert.equal(bySource(live,badge)[0].type,'Image'); // badge never animated
 assert.equal(bySource(live,badge)[0].props.accessibilityLabel,set.badgeName);
 const still=render({...p,running:false});
 assert.equal(count(still,'Animated.Image'),0);
 assert.equal(bySource(still,stem+'_showcase').length,1);
 assert.equal(bySource(still,badge).length,1);
 const alternate=render({...p,petId:'other',alternatePetArt:'other.webp'});
 assert.equal(count(alternate,'Animated.Image'),14);
 assert.equal(bySource(alternate,'other.webp').length,1);
 assert.equal(bySource(alternate,stem+'_idle_atlas').length,0);
 const noPet=render({...p,petId:undefined});
 assert.equal(count(noPet,'Animated.Image'),14);
 assert.equal(bySource(noPet,stem).length,0);
 assert.equal(bySource(render({...p,badgeId:'other'}),badge).length,0);
 for(const width of [320,480])assert.equal(count(render({...p,width}),'Animated.Image'),15);
 for(const invalid of [{width:319},{width:481},{fontScale:1.06},{setId:'unknown'}]){
  const tree=render({...p,...invalid});assert.equal(tree.type,'Fragment');assert.equal(tree.props.children,'Fallback');
 }
}
function walk(dir){return fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]):[];}
for(const file of [...walk(src),...walk(path.join(mobile,'app'))]){
 if(!/\.[jt]sx?$/.test(file)||file===component)continue;
 assert(!fs.readFileSync(file,'utf8').includes('NextPremiumShowcaseReview'),'isolated showcase cannot be imported by '+file);
}
const source=fs.readFileSync(component,'utf8');
assert(!/Animated\.loop\(|setInterval\(|setTimeout\(|\.start\(/.test(source));
console.log('Both isolated showcase trees, 14 FX nodes + atlas, static badge, fallback and import isolation passed in mocked host.');
