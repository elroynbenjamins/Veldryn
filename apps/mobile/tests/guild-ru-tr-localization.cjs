const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(module,filename)=>module._compile(
 ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText,filename);
const {GUILD_TUTORIAL_STEPS,guildTutorialContext}=require('../src/core/guild-tutorial.ts');
const {guildTutorialText}=require('../src/i18n/guild-tutorial.ts');
const {guildTutorialEarlyRows,guildTutorialEarlySteps,GUILD_TUTORIAL_LEGACY_STEP_INDEX}=require('../src/i18n/guild-tutorial-early-locales.ts');
const fields=['title','body','tip','action'];
assert.equal(GUILD_TUTORIAL_STEPS.length,5,'Current Guild tutorial must keep its five destinations');
assert.equal(GUILD_TUTORIAL_LEGACY_STEP_INDEX.length,GUILD_TUTORIAL_STEPS.length,'Guild walkthrough translation must cover every active step');
assert.ok(GUILD_TUTORIAL_LEGACY_STEP_INDEX.every(row=>row<guildTutorialEarlySteps.length),'Every active step must map to a translated walkthrough row');
assert.equal(Object.keys(guildTutorialEarlyRows).length,25,'All Guild guide controls and context should be translated');
for(const [index,step] of GUILD_TUTORIAL_STEPS.entries()){
 for(const [localeIndex,language] of ['ru','tr'].entries()){
  for(const [fieldIndex,field] of fields.entries()){
   const expected=guildTutorialEarlySteps[GUILD_TUTORIAL_LEGACY_STEP_INDEX[index]][localeIndex][fieldIndex];
   assert.ok(expected&&expected.trim(),language+' empty Guild '+index+' '+field);
   assert.equal(guildTutorialText(language,step[field]),expected,language+' Guild '+index+' '+field);
  }
 }
}
for(const [key,values] of Object.entries(guildTutorialEarlyRows)){
 for(const [index,language] of ['ru','tr'].entries()){
  assert.ok(values[index].trim(),language+' missing Guild guide control: '+key);
  assert.equal(guildTutorialText(language,key),values[index],language+' Guild guide control: '+key);
 }
}
for(const destination of ['Home','Chat','Muster','Quests','Projects','PvE','Hall']){
 for(const role of ['member','officer','leader']){
  const message=guildTutorialContext(destination,role);
  for(const language of ['ru','tr'])assert.notEqual(guildTutorialText(language,message),message,language+' untranslated context: '+destination+'/'+role);
 }
}
assert.equal(guildTutorialText('en',GUILD_TUTORIAL_STEPS[0].title),GUILD_TUTORIAL_STEPS[0].title,'English source unchanged');
assert.equal(guildTutorialText('ru','PLAYER_CUSTOM_GUILD'),'PLAYER_CUSTOM_GUILD','Never translate player-entered text');
assert.equal(guildTutorialText('tr','PLAYER_CUSTOM_GUILD'),'PLAYER_CUSTOM_GUILD','Never translate player-entered text');
assert.notEqual(guildTutorialText('de',GUILD_TUTORIAL_STEPS[0].title),GUILD_TUTORIAL_STEPS[0].title,'Preserve the existing German tutorial');
console.log('PASS: 5 Guild tutorial steps and 25 controls/context labels in Russian and Turkish');
