const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(
 fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}
).outputText,file);
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {WORLD_ZONES}=require('../src/content/world-map.ts');
const {GATHERING}=require('../src/content/skills.ts');
const {weeklyOrderDestination}=require('../src/core/weekly-order-integrations-v41.ts');
const {weeklyOrderCopyRows,weeklyOrderText,weeklyOrderTitle,weeklyOrderBrief,weeklyOrderReward,weeklyOrderDestinationLabel}=require('../src/i18n/weekly-order-copy.ts');
const languages=['en','de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],languages);
const keys=Object.keys(weeklyOrderCopyRows);
assert.equal(keys.length,42,'39 authored and dynamic strings plus three fallbacks');
const tokens=s=>[...s.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(x=>x[1]).sort();
for(const key of keys){
 const row=weeklyOrderCopyRows[key];assert.equal(row.length,7,'seven non-English languages: '+key);
 for(const [i,language]of languages.slice(1).entries()){
  assert.ok(row[i].trim(),'missing '+key+' '+language);
  assert.deepEqual(tokens(row[i]),tokens(key),'placeholder mismatch '+key+' '+language);
  assert.equal(weeklyOrderText(language,key,{name:'OPAQUE',zone:'ZONE',region:'REGION'}),row[i].replace(/\{(name|zone|region)\}/g,(_,k)=>({name:'OPAQUE',zone:'ZONE',region:'REGION'})[k]),'runtime translation '+language+' '+key);
 }
 assert.equal(weeklyOrderText('en',key),key,'English source untouched: '+key);
}
const region='Greenfields';
const template={id:'week:region:GREENFIELDS:WARDSTONES',kind:'regional',weekKey:'2026-W45',slot:0,targetId:'GREENFIELDS',regionId:'GREENFIELDS',activityId:'region:GREENFIELDS:WARDSTONES',source:{kind:'region',id:'GREENFIELDS',label:region,available:true},target:25,progress:4,claimed:false,
 title:'Broken Wardstones',brief:'Old roadside wards are flickering out. Thin the creatures pressing against them and gather what the wardens need to rebuild the line.',reward:{rewardRef:'weekly_order_regional_greenfields',label:region+' Relief Cache'}};
assert.ok(WORLD_ZONES.some(z=>z.id==='GREENFIELDS'&&z.name===region),'region identity changed');
assert.equal(weeklyOrderTitle('nl',template),weeklyOrderCopyRows['Broken Wardstones'][2]);
assert.equal(weeklyOrderBrief('ru',template),weeklyOrderCopyRows[template.brief][5]);
assert.equal(weeklyOrderReward('de',template),weeklyOrderText('de','{region} Relief Cache',{region}));
assert.equal(weeklyOrderDestinationLabel('tr',template,'button'),weeklyOrderText('tr','Open region'));
assert.equal(weeklyOrderDestinationLabel('tr',template,'detail'),weeklyOrderText('tr','Combat and gathering in {region} advance this Regional Problem.',{region}));
assert.equal(weeklyOrderTitle('fr',{...template,title:'Server changed title'}),'Server changed title','custom server title untouched');
assert.equal(weeklyOrderBrief('fr',{...template,brief:'Edited regional lore'}),'Edited regional lore','edited text untouched');
const hunt={...template,id:'week:hunt:MOSS_RAT',kind:'hunt',title:'Defeat Moss Rat',brief:undefined,source:{kind:'monster',id:'MOSS_RAT',label:'Moss Rat',available:true},targetId:'MOSS_RAT',activityId:'combat:MOSS_RAT',reward:{rewardRef:'weekly_order_hunt_standard',label:'Hunt Order reward'}};
assert.equal(weeklyOrderTitle('de',hunt),weeklyOrderText('de','Defeat {name}',{name:'Moss Rat'}));
assert.equal(weeklyOrderDestinationLabel('es',hunt,'button'),weeklyOrderText('es','Hunt {name}',{name:'Moss Rat'}));
assert.equal(weeklyOrderReward('es',hunt),weeklyOrderCopyRows['Hunt Order reward'][1]);
assert.equal(weeklyOrderTitle('nl',{...hunt,title:'Special hunt: Moss Rat'}),'Special hunt: Moss Rat','only generated titles translated');
const boss={...hunt,id:'week:boss:FALLEN_KNIGHT',targetId:'FALLEN_KNIGHT',title:'Oathglass Bounty: Fallen Knight',source:{kind:'monster',id:'FALLEN_KNIGHT',label:'Fallen Knight',available:true},reward:{rewardRef:'weekly_order_boss_fallen_knight',label:'Oathglass Bounty Cache'}};
assert.equal(weeklyOrderTitle('nl',boss),weeklyOrderText('nl','Oathglass Bounty: {name}',{name:'Fallen Knight'}));
assert.equal(weeklyOrderDestinationLabel('ru',boss,'detail'),weeklyOrderText('ru',weeklyOrderDestination(boss).detail));
const action=GATHERING[0];
const work={...template,kind:'profession',targetId:action.id,source:{kind:'skill',id:action.skillId,label:action.name,available:true},title:action.name,brief:undefined,activityId:action.id,professionKind:'gathering',reward:{rewardRef:'weekly_order_profession_standard',label:'Work Order reward'}};
assert.equal(weeklyOrderTitle('de',work),action.name,'skill/action names unchanged');
assert.equal(weeklyOrderDestinationLabel('fr',work,'button'),weeklyOrderText('fr','Work {name}',{name:action.name}));
assert.equal(weeklyOrderDestinationLabel('tr',work,'detail'),weeklyOrderText('tr','Open the exact {name} activity for this Work Order.',{name:action.name}));
assert.equal(weeklyOrderText('tr','User generated odd text'),'User generated odd text');
const regionSrc=fs.readFileSync(path.join(__dirname,'../src/core/launch-readiness-v47.ts'),'utf8');
const early=regionSrc.slice(regionSrc.indexOf('GREENFIELDS:['),regionSrc.indexOf('SUNSCAR:['));
const pairs=[...early.matchAll(/\{key:'([^']+)',title:'([^']+)',brief:'([^']+)'\}/g)];
assert.equal(pairs.length,10,'all first five region seed pairs must be represented');
for(const [,key,title,brief]of pairs){
 assert.ok(Object.hasOwn(weeklyOrderCopyRows,title),'missing '+key+' title');
 assert.ok(Object.hasOwn(weeklyOrderCopyRows,brief),'missing '+key+' narrative');
}
for(const file of ['QuestRefinedScreen.tsx','QuestScreen.tsx']){
 const s=fs.readFileSync(path.join(__dirname,'../src/screens',file),'utf8');
 for(const text of ['weeklyOrderTitle(language,','weeklyOrderBrief(language,','weeklyOrderReward(language,','weeklyOrderDestinationLabel(language,'])
 assert.ok(s.includes(text),file+' lacks '+text);
 assert.ok(s.includes('onOpenWeeklyOrder(')||s.includes('onOpenOrder('),file+' authoritative destination still needed');
 const ast=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(ast.parseDiagnostics.length,0,file+' must parse as JSX');
}
console.log('PASS: 42 weekly-contract display templates, 10 regional seed story pairs, dynamic names, canonical destinations and both Quest layouts');
