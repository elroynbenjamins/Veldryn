const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
const root=path.resolve(__dirname,'..');
function compile(mod,filename){
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}
 }).outputText;
 mod._compile(code,filename);
}
require.extensions['.ts']=compile;
require.extensions['.tsx']=compile;
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {partyProgressUiRows,partyProgressUiText,partyWeeklyTierText,partyEventStatusText,partyProgressNumber}=require('../src/i18n/party-progress-ui.ts');
const languages=['de','es','nl','it','fr','ru','tr'];
assert.deepEqual(SUPPORTED_LANGUAGES,['en',...languages]);
assert.equal(Object.keys(partyProgressUiRows).length,51,'Maintain 51 reviewed Party progress messages');
const fields=value=>[...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(x=>x[1]).sort();
for(const [source,translations] of Object.entries(partyProgressUiRows)){
 assert.equal(translations.length,7,'Missing one locale for '+source);
 const params=Object.fromEntries(fields(source).map(key=>[key,'ITEM_$&_'+key]));
 const interpolation=source.replace(/\{(\w+)\}/g,(_,key)=>params[key]??'{'+key+'}');
 assert.equal(partyProgressUiText('en',source,params),interpolation,'English interpolation drift: '+source);
 for(const [idx,language] of languages.entries()){
  assert.ok(translations[idx]&&translations[idx].trim(),'Empty '+language+': '+source);
  assert.deepEqual(fields(translations[idx]),fields(source),language+' placeholder drift: '+source);
  assert.equal(partyProgressUiText(language,source),translations[idx]);
  const translated=partyProgressUiText(language,source,params);
  for(const key of fields(source))assert.ok(translated.includes('ITEM_$&_'+key),'Lost dynamic '+key+' in '+source+' / '+language);
 }
}
for(const [tier,en] of [['bronze','Bronze'],['silver','Silver'],['gold','Gold'],['platinum','Platinum']]){
 assert.equal(partyWeeklyTierText('en',tier),en);
 assert.equal(partyWeeklyTierText('ru',tier),partyProgressUiText('ru',en));
}
for(const status of ['scheduled','active','settling','finalized','archived']){
 assert.equal(partyEventStatusText('en',status),status);
 assert.equal(partyEventStatusText('tr',status),partyProgressUiText('tr',status));
}
assert.equal(partyProgressUiText('nl','{count}h left',{count:3}),'Nog 3 uur');
assert.equal(partyProgressUiText('nl','{points} shared points left',{points:250}),'Nog 250 gezamenlijke punten nodig');
const ladder=fs.readFileSync(path.join(root,'src/components/PartyWeeklyLadder.tsx'),'utf8');
assert.ok(ladder.includes('t.targetPoints-contract.totalPoints')&&ladder.includes("st('{points} shared points left'"),'Party tiers must explain the remaining shared target as well as personal qualification');
assert.equal(partyProgressUiText('ru','Your Party · #{rank}',{rank:12}),'Ваша группа · №12');
assert.equal(partyProgressUiText('tr','Party ranking qualification: {reasons}',{reasons:'SERVER_RAW_$&'}),'Grup sıralama koşulları: SERVER_RAW_$&');
assert.equal(partyProgressNumber('nl',12345),'12.345');
assert.equal(partyProgressNumber('de',12.5,{maximumFractionDigits:1}),'12,5');
for(const [file,markers] of Object.entries({
 'PartyWeeklyLadder.tsx':['usePartyProgressUiText()','partyWeeklyTierText(language','partyProgressNumber(language','summary.claimable.map','t.rewardId'],
 'PartyEventHubPanel.tsx':["ui('LIVE PARTY EVENT · {status}'","ui('Party ranking qualification: {reasons}'","ui('{points} points'","event.name","event.shortDescription","event.rankedEligibilityMissing.map","member.displayName"],
 'PartyEventLeaderboardPanel.tsx':["ui('Your Party · #{rank}'","ui('{count} contributors · top {percent}%'","entry.partyName","board?.entries","partyProgressNumber(language"],
})){
 const source=fs.readFileSync(path.join(root,'src/components',file),'utf8');
 for(const marker of markers)assert.ok(source.includes(marker),file+' missing '+marker);
 assert.ok(!source.includes('.toLocaleString()'),file+' must use locale-aware number formatting');
}
console.log('PASS: 50 Party Weekly/Event translation templates x 7 languages, placeholders, unchanged gameplay values, locale number formats and live UI integration');
