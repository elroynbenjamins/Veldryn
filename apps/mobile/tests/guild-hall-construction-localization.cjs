const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=function(mod,filename){
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 mod._compile(code,filename);
};
require.extensions['.tsx']=require.extensions['.ts'];
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {guildHallUiRows,guildHallUiText}=require('../src/i18n/guild-hall-ui.ts');
const {guildConstructionUiRows,guildConstructionUiText}=require('../src/i18n/guild-construction-ui.ts');
const locales=['de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],['en',...locales]);
const placeholders=value=>[...value.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
for(const [catalog,translate,expected] of [[guildHallUiRows,guildHallUiText,76],[guildConstructionUiRows,guildConstructionUiText,51]]){
 assert.equal(Object.keys(catalog).length,expected,'review translation catalog when labels change');
 for(const [en,translations] of Object.entries(catalog)){
  assert.equal(translations.length,7);
  assert.equal(translate('en',en),en);
  for(const [i,locale] of locales.entries()){
   assert.ok(translations[i]&&translations[i].trim(),locale+': '+en);
   assert.deepEqual(placeholders(translations[i]),placeholders(en),locale+': '+en);
   assert.equal(translate(locale,en),translations[i],locale+': '+en);
   const parameters=Object.fromEntries(placeholders(en).map(p=>[p,'CHECK_'+p]));
   for(const p of placeholders(en))assert.ok(translate(locale,en,parameters).includes('CHECK_'+p),locale+' lost '+p);
  }
 }
}
assert.equal(guildHallUiText('nl','{count} Hall Progress to Level {level}',{count:125,level:4}),'Nog 125 halvoortgang tot niveau 4');
assert.equal(guildHallUiText('ru','Updated {date}',{date:'21:35'}),'Обновлено 21:35');
assert.equal(guildConstructionUiText('nl','{resource} · Need {needed} · Bank {bank}',{resource:'Gold $&',needed:300,bank:50}),'Gold $& · Nodig 300 · Bank 50');
assert.equal(guildConstructionUiText('ru','Set funding amount to {amount}',{amount:100}),'Установить количество: 100');
const root=path.resolve(__dirname,'../src/components');
const hall=fs.readFileSync(path.join(root,'OnlineGuildHallPanel.tsx'),'utf8');
const construction=fs.readFileSync(path.join(root,'OnlineGuildConstructionPanel.tsx'),'utf8');
const notice=fs.readFileSync(path.join(root,'OnlineGuildNoticeBoardPanel.tsx'),'utf8');
for(const token of ["useGuildHallUiText()",'ui("Guild Hall sections")',"ui('Guild Lv {level} · {benefit}'","ui('Shop quality unlocked: {quality}. Construction does not award free items.'","ui('Back to Construction')","ui('Hall Level {level} required · '","ui('Guild Token earnings')"])assert.ok(hall.includes(token),'Guild Hall not wired: '+token);
for(const token of ["useGuildConstructionUiText()","ui('Allocate Guild Bank materials?')","ui('Allocate {amount} {resource} to {upgrade}? This Guild Bank allocation cannot be reversed.'","ui('Discard pending donation?')",'ui("Donation amount")',"ui('Set funding amount to {amount}'","ui('Donate {resource} to {upgrade}'","donateOnlineGuildConstruction(input)","Number.isSafeInteger(donationAmount)","donationAmount<=remaining","donationAmount<=bankAmount"])assert.ok(construction.includes(token),'Construction safety or translation missing: '+token);
for(const token of ["updatedLabel(board.updatedAt,language,ui)","ui('Updated {date}'","error||ui('Join a Guild to view its member-only Notice Board.')","{board.body}","updateGuildNoticeBoard(clean)"])assert.ok(notice.includes(token),'Notice missing: '+token);
assert.ok(hall.includes('{trophy.label}')&&hall.includes('>{def.name}</Text>'),'Unreviewed names must remain verbatim');
console.log('PASS: 76 Hall and 51 Construction keys in seven locales, safe placeholders and existing donation authorization');
