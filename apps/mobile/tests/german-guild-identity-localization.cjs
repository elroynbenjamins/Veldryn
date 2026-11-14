const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
const app=path.resolve(__dirname,'..');
require.extensions['.ts']=function(mod,filename){
 const out=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText;
 mod._compile(out,filename);
};
const {germanGuildIdentityCopy,guildIdentityText}=require('../src/i18n/guild-identity-de.ts');
const keys=['YOUR GUILD','Guild details unavailable','Loading your Guild…','Retry Guild details'];
assert.deepEqual(Object.keys(germanGuildIdentityCopy).sort(),keys.sort());
for(const english of keys){
 assert.ok(germanGuildIdentityCopy[english].length>6);
 assert.notEqual(germanGuildIdentityCopy[english],english);
 assert.equal(guildIdentityText('de',english),germanGuildIdentityCopy[english]);
 for(const language of ['en','es','nl','it','fr','ru','tr'])
  assert.equal(guildIdentityText(language,english),english);
}
assert.equal(guildIdentityText('de','Player-written Guild $&'),'Player-written Guild $&');
const identity=fs.readFileSync(path.join(app,'src/components/GuildMemberIdentity.tsx'),'utf8');
for(const marker of [
 "const language=useGameLanguage(),de=(value:string)=>guildIdentityText(language,value);",
 'de("YOUR GUILD")',
 "de('Guild details unavailable')",
 "de('Loading your Guild…')",
 'de("Retry Guild details")',
])assert.ok(identity.includes(marker),'Guild identity UI localization missing: '+marker);
const roster=fs.readFileSync(path.join(app,'src/components/GuildMemberRosterPanel.tsx'),'utf8');
for(const marker of [
 'socialLabel(language,formatGuildRole(m.role)).toLocaleUpperCase(language)',
 'm.contributionThisWeek.toLocaleString(language)',
])assert.ok(roster.includes(marker),'Guild roster localization missing: '+marker);
const social=fs.readFileSync(path.join(app,'src/i18n/social.ts'),'utf8');
for(const label of ['Leader','Officer','Member']){
 assert.ok(social.includes('"'+label+'":'),'Guild role localization missing: '+label);
}
console.log('PASS: 4 authored German Guild identity states and Guild roster role/number localization');
