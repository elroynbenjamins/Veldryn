const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const core=path.join(__dirname,'../src/core'),cache=new Map();
function load(name){
 if(cache.has(name))return cache.get(name);
 const mod={exports:{}};cache.set(name,mod.exports);
 const code=ts.transpileModule(fs.readFileSync(path.join(core,name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('exports','module','require',code)(mod.exports,mod,id=>load(id.slice(2)));return mod.exports;
}
const m=load('ultra-luxe-full-set-name'),g=load('ultra-luxe-name-gradients'),n=load('next-premium-ownership-review'),{NEXT_PREMIUM_SETS}=load('next-premium-set-review');
const scope={accountId:'a',characterId:'c'},other={accountId:'b',characterId:'c'},switched={accountId:'a',characterId:'d'};
const before={icon:'old-icon',scene:'old-scene',frame:'old-frame',effect:'old-effect',pet:'old-pet',title:'old-title'};
const after={...before,scene:'new-scene',frame:'new-frame',effect:'',pet:'new-pet',title:'new-title'};
const ids=['celestial-sovereign','draconic-dominion','abyssal-majesty','paradox-eternal','sakura-enchantment','stormforged-sovereign'];
for(const [i,set] of ids.entries()){
 const id=g.ULTRA_LUXE_GRADIENTS[i].id,old=g.ULTRA_LUXE_GRADIENTS[(i+1)%6].id;
 const read={accountId:'a',ownedIds:[id,old],selectedId:old};
 assert.equal(m.ultraLuxeFullSetNamePreset(set),id);assert.equal(m.ultraLuxeFullSetNamePreset('ascendant-'+set),id);
 assert.equal(m.planUltraLuxeFullSet(scope,set,before,after,undefined),null);
 assert.equal(m.planUltraLuxeFullSet(other,set,before,after,read),null);
 assert.equal(m.planUltraLuxeFullSet(scope,set,before,after,{...read,ownedIds:[old]}),null);
 const plan=m.planUltraLuxeFullSet(scope,set,before,after,read);
 assert.deepEqual(plan.after,{wardrobe:after,namePresetId:id});
 assert(m.ultraLuxeFullSetPlanAllowed(plan,scope,read));
 assert(!m.ultraLuxeFullSetPlanAllowed(plan,switched,read));
 assert(!m.ultraLuxeFullSetPlanAllowed(plan,scope,{...read,selectedId:null}));
 assert(!m.ultraLuxeFullSetPlanAllowed(plan,scope,{...read,ownedIds:[old]}));
 assert(!m.ultraLuxeFullSetEquipped(after,after,set,read,scope));
 assert(m.ultraLuxeFullSetEquipped(after,after,set,{...read,selectedId:id},scope));
 const committed={...read,selectedId:id};
 assert.deepEqual(m.undoUltraLuxeFullSet(plan.after,plan,scope,committed),plan.before);
 assert.equal(m.undoUltraLuxeFullSet(plan.after,plan,switched,committed),null);
 assert.equal(m.undoUltraLuxeFullSet(plan.after,plan,scope,{...committed,ownedIds:[id]}).namePresetId,null);
 const edited={wardrobe:{...after,pet:'other'},namePresetId:old};
 assert.deepEqual(m.undoUltraLuxeFullSet(edited,plan,scope,read),{wardrobe:{...before,pet:'other'},namePresetId:old});
}
assert.equal(m.ultraLuxeFullSetNamePreset('ordinary'),undefined);
const ready={wardrobe:true,iconArt:false,namePresets:true};
for(const s of NEXT_PREMIUM_SETS){
 const grant={accountId:'a',collectionIds:[s.id]},pieces={...scope,backgrounds:[s.background],borders:[s.border],pets:[s.pet],titles:[s.title],badges:[s.badge],icons:[],nameStyles:[s.nameStyle]},names={accountId:'a',ownedIds:[s.nameStyle],selectedId:null};
 assert.equal(n.nextPremiumFullSetPlan(scope,scope,grant,pieces,before,s.id,names),null);
 assert.equal(n.nextPremiumFullSetPlan(scope,scope,grant,{...pieces,nameStyles:[]},before,s.id,names,ready),null);
 const plan=n.nextPremiumFullSetPlan(scope,scope,grant,pieces,before,s.id,names,ready);
 assert.equal(plan.after.namePresetId,s.nameStyle);
 assert(n.nextPremiumFullSetPlanAllowed(plan,scope,grant,pieces,names,ready));
 assert(!n.nextPremiumFullSetPlanAllowed(plan,scope,{...grant,collectionIds:[]},pieces,names,ready));
 assert(!n.nextPremiumFullSetPlanAllowed(plan,scope,grant,pieces,{...names,ownedIds:[]},ready));
 assert(!n.nextPremiumFullSetPlanAllowed({...plan,after:{...plan.after,wardrobe:{...plan.after.wardrobe,scene:'tampered'}}},scope,grant,pieces,names,ready));
}
console.log('Six-set matching preset, scoped equip plan, revocation and independent edit undo contract passed.');
