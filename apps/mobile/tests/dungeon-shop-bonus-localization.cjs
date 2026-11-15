const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');

const copy=fs.readFileSync(path.resolve(__dirname,'../src/i18n/dungeon-shop.ts'),'utf8');
const compiled=ts.transpileModule(copy,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleStub={exports:{}};
const context={
 module:moduleStub,
 exports:moduleStub.exports,
 require(id){
  if(id==='./account')return {accountText:(_language,source)=>source};
  if(id==='./translator')return {interpolateTranslation:(source,params)=>source.replace(/\{(\w+)\}/g,(_,key)=>String(params[key]??''))};
  throw new Error('Unexpected dungeon-shop presentation dependency: '+id);
 },
};
vm.runInNewContext(compiled,context,{filename:'dungeon-shop-transpiled.js',timeout:2000});
const {dungeonShopOfferSummary}=moduleStub.exports;
assert.equal(typeof dungeonShopOfferSummary,'function','presentation function is exported');
const languages=['en','de','es','nl','it','fr','ru','tr'];
const stats=['craftingSpeed','skillXp','dropChance','gatheringYield','hp','healingEffectiveness','fishingSpeed','defense','actionSpeed'];
const gatheringNames={
 en:'Gathering yield',de:'Sammelertrag',es:'Rendimiento de recolección',nl:'Verzamelopbrengst',
 it:'Resa di raccolta',fr:'Rendement de récolte',ru:'Объём сбора',tr:'Toplama verimi',
};
for(const language of languages){
 for(const stat of stats){
  const source='+ 2.50% '+stat+' equipped; +1.25% owned';
  const output=dungeonShopOfferSummary(language,source);
  assert.notEqual(output,source,'raw code label leaked for '+language+'/'+stat);
  assert.ok(!output.includes(stat)&&!output.includes('undefined'),'safe localized bonus display for '+language+'/'+stat+': '+output);
  assert.ok(output.includes(language==='en'?'2.50%':'2,50%'),'localized decimal separator for '+language+'/'+stat);
 }
 assert.ok(dungeonShopOfferSummary(language,'+ 2.50% gatheringYield equipped; +1.25% owned').includes(gatheringNames[language]),'human-friendly gathering label for '+language);
}
assert.equal(dungeonShopOfferSummary('de','3 × GEM DUST'),'3 × Edelsteinstaub','existing German material label preserved');
assert.equal(dungeonShopOfferSummary('de','2 Bondstones'),'2 Bindungssteine','existing German currency summary preserved');
assert.equal(dungeonShopOfferSummary('de','100 × MOSS FIBER · Shared Bank'),'100 × Moosfaser · Gemeinsame Bank','new crafting resource bundles preserve German localized summaries');
assert.equal(dungeonShopOfferSummary('en','Unrecognized server summary'),'Unrecognized server summary','unrecognized server text remains untouched');
assert.equal(dungeonShopOfferSummary('tr','+ 1.00% unknownBonus equipped; +0.50% owned'),'+ 1.00% unknownBonus equipped; +0.50% owned','unknown IDs must not be misidentified');
console.log('PASS Dungeon Shop: all nine bonus IDs have human-readable labels in eight languages, percentages and safe unknown fallback');
