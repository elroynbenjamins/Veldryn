const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=function(mod,filename){
 const output=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText;
 mod._compile(output,filename);
};
const {germanPartySurfaceCopy,germanPartySurfaceText,partyMinimumLevelLabel}=require('../src/i18n/party-surface-de.ts');

assert.equal(Object.keys(germanPartySurfaceCopy).length,9,'all authored German Party Hub guidance and missing UI labels should be covered');
for(const [english,german] of Object.entries(germanPartySurfaceCopy)){
 assert.ok(german.length>=8,'missing German wording for '+english);
 assert.notEqual(german,english,'German translation repeats source for '+english);
 assert.equal(germanPartySurfaceText('de',english),german);
 for(const other of ['en','es','nl','it','fr','ru','tr'])
  assert.equal(germanPartySurfaceText(other,english),english,'German-only copy must never leak to '+other);
}
for(const source of ['Player-created Party $&','Custom contract name','Edited server text','MY FRIENDS'])
 assert.equal(germanPartySurfaceText('de',source),source,'unrecognized or player-authored source must be preserved');

assert.equal(partyMinimumLevelLabel('de',25),'St. 25+');
for(const other of ['en','es','nl','it','fr','ru','tr'])
 assert.equal(partyMinimumLevelLabel(other,25),'Lv. 25+');

const source=fs.readFileSync(path.join(__dirname,'../src/components/PartyHubPanel.tsx'),'utf8');
const composer=fs.readFileSync(path.join(__dirname,'../src/components/PartyRecruitmentComposer.tsx'),'utf8');
const muster=fs.readFileSync(path.join(__dirname,'../src/components/OnlineGuildMusterPanel.tsx'),'utf8');
for(const token of [
 'translate={value=>socialLabel(language,germanPartySurfaceText(language,value))}',
 'germanPartySurfaceText(language,"No active weekly contract.")',
 'germanPartySurfaceText(language,"Find a Party")',
 'germanPartySurfaceText(language,"Edit Party preferences")',
 'partyMinimumLevelLabel(language,preferences.minimumLevel)',
 'title={st("Invite friends privately")}',
 'socialLabel(language,partyActivityLabel(preferences.activityLevel))',
 'socialLabel(language,contract.category??contract.focus??\'mixed\')',
 'contract.totalPoints.toLocaleString(language)',
 'contract.targetPoints.toLocaleString(language)',
])assert.ok(source.includes(token),'Party UI lost German guidance or localized control: '+token);

for(const token of [
 'locale=useGameLanguage()',
 'partyMinimumLevelLabel(locale,prefs.minimumLevel)',
 'onPublish({...draft,durationDays:1,roles:[],requiredRoleCounts:{}',
])assert.ok(composer.includes(token),'Party recruitment editor lost localization or submission guard: '+token);
for(const token of [
 'state.dailyPoints.toLocaleString(language)',
 'state.personalWeeklyPoints.toLocaleString(language)',
 'member.todayPoints.toLocaleString(language)',
 'member.weeklyPoints.toLocaleString(language)',
])assert.ok(muster.includes(token),'Guild Muster must format large point counts in selected locale: '+token);
assert.ok(muster.includes('guildMusterDailyPercent(state.dailyPoints)'),'Muster scoring must remain numeric');
assert.ok(muster.includes('guildMusterRallyPercent(state.rallyMarks,state.rallyTarget)'),'Muster Rally scoring must remain numeric');
console.log('PASS: 9 German Party guide/control strings, level labels, source guards, locale number formatting and preserved scoring');
