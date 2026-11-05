const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('../node_modules/typescript');
const app=path.resolve(__dirname,'..');
const root=path.resolve(app,'../..');
const sourceFile=path.join(app,'src/i18n/seasonal-dungeon-effects.ts');
const compiled=ts.transpileModule(fs.readFileSync(sourceFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod=new Module(sourceFile,module);mod.filename=sourceFile;mod.paths=Module._nodeModulePaths(path.dirname(sourceFile));mod._compile(compiled,sourceFile);
const {SEASONAL_MECHANIC_ROWS,SEASONAL_OBJECTIVE_ROWS,localizedSeasonalDungeonPreviewCopy,localizedSeasonalDungeonRouteRisk,localizedSeasonalDungeonRouteReward}=mod.exports;
const languages=['en','de','es','nl','it','fr','ru','tr'];
const backend=fs.readFileSync(path.join(root,'backend/src/server/expeditions/content/event-expeditions.ts'),'utf8');
let verified=0;
for(const [kind,rows] of [['mechanic',SEASONAL_MECHANIC_ROWS],['objective',SEASONAL_OBJECTIVE_ROWS]]){
 for(const [id,row] of Object.entries(rows)){
  assert.ok(backend.includes(kind+':{id:\''+id+'\',label:\''+row.label+'\',description:\''+row.description+'\''),'Backend authored copy drift: '+id);
  const view={label:row.label,description:row.description,serverId:id,count:3};
  assert.equal(localizedSeasonalDungeonPreviewCopy('en',view),view,'English preview must be untouched');
  for(const [index,language] of languages.slice(1).entries()){
   const result=localizedSeasonalDungeonPreviewCopy(language,view);
   assert.equal(result.label,row.labels[index],id+': '+language);
   assert.equal(result.description,row.descriptions[index],id+': '+language);
   assert.equal(result.serverId,id);assert.equal(result.count,3);
   assert.ok(result.label.trim()&&result.description.trim());
   const reward=localizedSeasonalDungeonRouteReward(language,row.label+' +3 · New server consequence · '+row.label+' -2');
   assert.equal(reward,row.labels[index]+' +3 · New server consequence · '+row.labels[index]+' -2','Mixed route rewards '+id+' '+language);
  }
  assert.equal(localizedSeasonalDungeonPreviewCopy('nl',{...view,description:'Server updated details'}).description,'Server updated details');
  assert.equal(localizedSeasonalDungeonPreviewCopy('de',{...view,label:'Server updated label'}).label,'Server updated label');
  verified++;
 }
}
assert.equal(verified,16,'All eight seasonal mechanics and eight objectives must be checked');
for(const language of languages){
 assert.equal(localizedSeasonalDungeonRouteRisk(language,'Risk 1.25'),(language==='en'?'Risk':{de:'Risiko',es:'Riesgo',nl:'Risico',it:'Rischio',fr:'Risque',ru:'Риск',tr:'Risk'}[language])+' 1.25');
 for(const unknown of ['Risk high','Risk -2','RISK 2','Risk 3 (elite)','Unknown risk'])assert.equal(localizedSeasonalDungeonRouteRisk(language,unknown),unknown);
 for(const unknown of ['New reward +3','Champion Favor +3?','Champion Favor +3 · unreviewed outcome']) {
  const expected=unknown==='Champion Favor +3 · unreviewed outcome'&&language!=='en'
   ?SEASONAL_MECHANIC_ROWS.champion_favor.labels[languages.indexOf(language)-1]+' +3 · unreviewed outcome':unknown;
  assert.equal(localizedSeasonalDungeonRouteReward(language,unknown),expected);
 }
}
const browse=fs.readFileSync(path.join(app,'src/components/coop/CoopDungeonBrowser.tsx'),'utf8');
const routes=fs.readFileSync(path.join(app,'src/components/coop/DungeonRouteChoices.tsx'),'utf8');
for(const marker of [
 'localizedSeasonalDungeonPreviewCopy(language,event.mechanic)',
 'localizedSeasonalDungeonPreviewCopy(language,event.objective)',
 'localizedMechanic?.label','localizedMechanic?.description',
 'localizedObjective?.label','localizedObjective?.description',
 'seasonalDungeonRoomTitle(language,item)',
])assert.ok(browse.includes(marker),'Missing seasonal preview wiring: '+marker);
for(const marker of [
 'localizedSeasonalDungeonRouteRisk(language,option.risk)',
 'localizedSeasonalDungeonRouteReward(language,option.reward)',
 "ui('Route {title}: {risk}; {reward}. {extra}{action}'",
 '>{translatedRisk}</Text>','>{translatedReward}</Text>',
])assert.ok(routes.includes(marker),'Missing route UI / accessibility wiring: '+marker);
console.log('PASS: 16 authoritative seasonal preview entries x 8 languages, numeric route risk/reward parity, strict fallbacks and UI/a11y wiring');
