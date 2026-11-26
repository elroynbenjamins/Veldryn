const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const src=path.join(__dirname,'../src'),core=path.join(src,'core'),cache=new Map();
function load(name){
 if(cache.has(name))return cache.get(name);
 const file=path.join(core,name+'.ts'),mod={exports:{}};
 const t=ts.transpileModule(fs.readFileSync(file,'utf8'),{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});
 assert(!t.diagnostics.some(d=>d.category===ts.DiagnosticCategory.Error),file);
 cache.set(name,mod.exports);
 new Function('exports','module','require',t.outputText)(mod.exports,mod,id=>{
  assert(id.startsWith('./'));return load(id.slice(2));
 });return mod.exports;
}
const m=load('next-premium-ownership-review'),{NEXT_PREMIUM_SETS:sets}=load('next-premium-set-review');
const scope={accountId:'a',characterId:'c'},other={accountId:'b',characterId:'c'},switched={accountId:'a',characterId:'d'};
const ready={wardrobe:true,iconArt:true,namePresets:true};
const current={icon:'class:IRONWARDEN',scene:'asterfall-night',frame:'old-frame',effect:'old-effect',pet:'old-pet',title:'New Adventurer'};
const categories=['scene','frame','pet','title','icon','effect'].map(kind=>({kind,label:kind,owned:0,total:0,rows:[]}));
for(const s of sets){
 const grant={accountId:'a',collectionIds:[s.id]};
 const pieces={...scope,backgrounds:[s.background],borders:[s.border],pets:[s.pet],titles:[s.title],badges:[s.badge],icons:[s.icon],nameStyles:[s.nameStyle]};
 assert.deepEqual(m.nextPremiumOwnedSets(scope,grant,pieces),[]);
 assert.equal(m.appendNextPremiumWardrobe(categories,current,scope,grant,pieces),categories);
 assert.equal(m.nextPremiumQuickSelection(scope,scope,grant,pieces,current,s.id),null);
 assert.equal(m.nextPremiumNameStyle(s.nameStyle,scope,grant,pieces),undefined);
 assert.equal(m.nextPremiumQuickSets(scope,grant,pieces,ready).length,1);
 assert.equal(m.nextPremiumQuickSets(scope,undefined,pieces,ready).length,0);
 assert.equal(m.nextPremiumQuickSets(scope,grant,undefined,ready).length,0);
 assert.equal(m.nextPremiumQuickSets(other,grant,pieces,ready).length,0);
 assert.equal(m.nextPremiumQuickSets(switched,grant,pieces,ready).length,0);
 assert.equal(m.nextPremiumQuickSets(scope,{...grant,collectionIds:[]},pieces,ready).length,0);
 for(const key of ['backgrounds','borders','pets','titles','badges']){
  const partial={...pieces,[key]:[]};
  assert.equal(m.nextPremiumQuickSets(scope,grant,partial,ready).length,0);
  assert.equal(m.appendNextPremiumWardrobe(categories,current,scope,grant,partial,ready),categories);
  assert.equal(m.nextPremiumPatchAllowed(scope,scope,grant,partial,{scene:s.background},ready),false);
 }
 const draft=m.nextPremiumQuickSelection(scope,scope,grant,pieces,current,s.id,ready);
 assert.deepEqual(draft,{...current,scene:s.background,frame:s.border,pet:s.pet,title:s.titleName,effect:''});
 assert.equal(m.nextPremiumQuickSelection(scope,switched,grant,pieces,current,s.id,ready),null);
 assert.equal(m.nextPremiumQuickSelection(scope,scope,grant,pieces,current,'unknown',ready),null);
 assert(m.nextPremiumPatchAllowed(scope,scope,grant,pieces,draft,ready));
 assert(!m.nextPremiumPatchAllowed(scope,switched,grant,pieces,draft,ready));
 assert(!m.nextPremiumPatchAllowed(scope,scope,{...grant,collectionIds:[]},pieces,draft,ready));
 assert(!m.nextPremiumPatchAllowed(scope,scope,grant,pieces,{effect:s.showcase},ready));
 assert(!m.nextPremiumPatchAllowed(scope,scope,grant,pieces,{icon:s.icon},{...ready,iconArt:false}));
 assert(!m.nextPremiumPatchAllowed(scope,scope,grant,{...pieces,icons:[]},{icon:s.icon},ready));
 assert(m.nextPremiumPatchAllowed(scope,scope,grant,pieces,{icon:s.icon},ready));
 assert(m.nextPremiumPatchAllowed(scope,scope,undefined,undefined,{scene:'asterfall-night'},ready));
 const wardrobe=m.appendNextPremiumWardrobe(categories,draft,scope,grant,pieces,ready);
 assert.equal(wardrobe.reduce((n,c)=>n+c.total,0),5);
 assert.equal(wardrobe.reduce((n,c)=>n+c.owned,0),5);
 assert.equal(m.appendNextPremiumWardrobe(wardrobe,draft,scope,grant,pieces,ready).reduce((n,c)=>n+c.total,0),5);
 assert.equal(m.appendNextPremiumWardrobe(categories,draft,scope,grant,pieces,{...ready,iconArt:false}).reduce((n,c)=>n+c.total,0),4);
 assert.deepEqual(m.nextPremiumNameStyle(s.nameStyle,scope,grant,pieces,ready),{mode:'gradient',gradientColors:[...s.colors],animation:'flow'});
 assert.equal(m.nextPremiumNameStyle(s.colors,scope,grant,pieces,ready),undefined);
 assert.equal(m.nextPremiumNameStyle(s.nameStyle,scope,grant,{...pieces,nameStyles:[]},ready),undefined);
 const title=' '+s.titleName.toUpperCase()+' ';
 assert.equal(m.nextPremiumReservedTitle(title).id,s.id);
 assert(!m.nextPremiumTitleAllowed(title,scope,undefined,pieces,ready));
 assert(m.nextPremiumTitleAllowed(title,scope,grant,pieces,ready));
 assert(m.nextPremiumTitleAllowed('New Adventurer',scope,undefined,undefined,ready));
 const appearance={background:s.background,border:s.border,pet:s.pet,verifiedTitleId:s.title,displayedBadges:[s.badge]};
 assert.equal(m.nextPremiumPublicShowcase(appearance,[s.id]),undefined);
 assert.equal(m.nextPremiumPublicShowcase(appearance,[],true),undefined);
 assert.deepEqual(m.nextPremiumPublicShowcase(appearance,[s.id],true),{id:s.id,fullSet:true});
 for(const partial of [{pet:'other'},{verifiedTitleId:null},{displayedBadges:[]}])assert.deepEqual(m.nextPremiumPublicShowcase({...appearance,...partial},[s.id],true),{id:s.id,fullSet:false});
 assert.equal(m.nextPremiumPublicShowcase({...appearance,effect:'incompatible'},[s.id],true),undefined);
 assert.equal(m.nextPremiumPublicShowcase({...appearance,border:'other'},[s.id],true),undefined);
}
function walk(dir){return fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]):[];}
for(const file of [...walk(src),...walk(path.join(__dirname,'../app'))]){
 if(!/\.[jt]sx?$/.test(file)||file.endsWith('next-premium-ownership-review.ts'))continue;
 assert(!fs.readFileSync(file,'utf8').includes('next-premium-ownership-review'),'review ownership adapter cannot be used live: '+file);
}
console.log('Next premium ownership, scoped draft equip, revocation, private visibility and prestige checks passed.');
