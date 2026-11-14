const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
const app=path.resolve(__dirname,'..');
require.extensions['.ts']=function(mod,file){
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText;
 mod._compile(compiled,file);
};
const {
 germanSocialManagementCopy,germanSocialManagementText,germanSocialManagementFormat
}=require('../src/i18n/social-management-de.ts');
const keys=Object.keys(germanSocialManagementCopy);
assert.equal(keys.length,40,'German Guild action and recruitment review coverage changed');
const placeholders=value=>[...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(x=>x[1]).sort();
for(const english of keys){
 const german=germanSocialManagementCopy[english];
 assert.ok(typeof german==='string'&&german.trim(),'untranslated key '+english);
 assert.deepEqual(placeholders(german),placeholders(english),'placeholder drift for '+english);
 assert.equal(germanSocialManagementText('de',english),german,'German runtime mismatch '+english);
 for(const language of ['en','es','nl','it','fr','ru','tr'])
  assert.equal(germanSocialManagementText(language,english),english,'German leaked into '+language+': '+english);
}
assert.equal(germanSocialManagementText('de','Custom player text $&'),'Custom player text $&');
assert.equal(germanSocialManagementFormat('de','Remove {name}?',{name:'Semux $&'}),'Semux $& entfernen?');
assert.equal(germanSocialManagementFormat('en','Remove {name}?',{name:'Semux $&'}),'Remove Semux $&?');
assert.equal(germanSocialManagementFormat('de','Give leadership to {name}?',{name:'Erebus'}),'Gildenleitung an Erebus übertragen?');
assert.equal(germanSocialManagementFormat('de','Current · {objective}',{objective:'User-created task $&'}),'Aktuell · User-created task $&');
assert.equal(germanSocialManagementFormat('de','Current · {objective}'),'Aktuell · {objective}','unknown interpolations should remain visible');
assert.equal(germanSocialManagementText('de','LFG + LFM'),'LFG + LFM','game abbreviations remain stable');

const read=file=>fs.readFileSync(path.join(app,'src/components',file),'utf8');
const member=read('GuildMemberActionSheet.tsx'),filters=read('RecruitmentFiltersPanel.tsx'),listing=read('RecruitmentListing.tsx');
for(const marker of [
 'guildMemberManagement(actorRole,current.role,current.account_id===actorAccountId)',
 'if(!permission)return',
 'onAction(current,kind)',
 'germanSocialManagementFormat(language,active.kind',
 'title={display(action.title)} detail={display(action.detail)}',
 'socialLabel(language,current.role.charAt(0).toUpperCase()+current.role.slice(1))',
 'joinedLabel(current.joined_at,language)',
 'date.toLocaleDateString(language',
 'accessibilityLabel={title}',
 'numberOfLines={3} style={s.actionDetail}',
])assert.ok(member.includes(marker),'Guild member actions lost localized display or permission safeguard: '+marker);
for(const marker of [
 'const display=(source:string)=>germanSocialManagementText(language,source)',
 'label={display("QUICK MATCH")}',
 'label={display(label)}',
 'label={partyMode?display("ACTIVITY LEVEL"):st("PACE")}',
 'socialLabel(language,focus)',
 'socialLabel(language,role)',
 'display(tagFieldLabel[key])+display(\' · comma separated\')',
 'recruitmentTags(event.nativeEvent.text)',
 'onChange({...value,...patch})',
 'requireOpenPartySpot:!value.requireOpenPartySpot',
])assert.ok(filters.includes(marker),'Recruitment filter logic or localization missing: '+marker);
for(const marker of [
 "language==='de'?socialExpiry(language,card.expiresAtMs,nowMs):recruitmentTimeLabel(card.expiresAtMs,nowMs)",
 'display(\'posted by\')',
 "germanSocialManagementFormat(language,'Current · {objective}',{objective:card.currentObjective})",
 '{card.title}',
 '{card.body}',
 '{tag}',
 'card.focus',
])assert.ok(listing.includes(marker),'Recruitment listing lost display safety or locale handling: '+marker);
console.log('PASS: 40 German social-management/recruitment strings, locale fallback, safe dynamic values and UI wiring');
