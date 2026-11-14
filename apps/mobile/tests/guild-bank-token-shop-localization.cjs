const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=function(mod,filename){
 const output=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}
 }).outputText;
 mod._compile(output,filename);
};
require.extensions['.tsx']=require.extensions['.ts'];
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {guildBankUiRows,guildBankUiText}=require('../src/i18n/guild-bank-ui.ts');
const {guildTokenShopUiRows,guildTokenShopUiText}=require('../src/i18n/guild-token-shop-ui.ts');
const locales=['de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],['en',...locales]);
const placeholders=value=>[...value.matchAll(/\{([a-zA-Z]\w*)\}/g)].map(m=>m[1]).sort();
for(const [name,rows,translate,expected] of [
 ['Guild Bank',guildBankUiRows,guildBankUiText,104],
 ['Guild Token Shop',guildTokenShopUiRows,guildTokenShopUiText,90],
]){
 assert.equal(Object.keys(rows).length,expected,name+': reviewed key count changed');
 for(const [english,translations] of Object.entries(rows)){
  assert.equal(translations.length,7,english+': every locale required');
  assert.equal(translate('en',english),english);
  const args=Object.fromEntries(placeholders(english).map(key=>[key,'SENTINEL_$&_'+key]));
  for(const [i,locale] of locales.entries()){
   assert.ok(translations[i]&&translations[i].trim(),locale+': missing '+english);
   assert.deepEqual(placeholders(translations[i]),placeholders(english),locale+': placeholder mismatch '+english);
   assert.equal(translate(locale,english),translations[i],locale+' runtime mismatch '+english);
   for(const key of placeholders(english))assert.ok(translate(locale,english,args).includes('SENTINEL_$&_'+key),locale+' modified source value '+key);
  }
 }
}
assert.equal(guildBankUiText('nl','{stored} stored · {more} more to deposit',{stored:10,more:15}),'10 opgeslagen · 15 nog storten');
assert.equal(guildBankUiText('ru','Donate quantity {amount}',{amount:50}),'Размер взноса: 50');
assert.equal(guildBankUiText('tr','Retry saved deposit'),'Kaydedilen yatırmayı yeniden dene');
assert.equal(guildTokenShopUiText('nl','{earned} / {cap} earned this week',{earned:90,cap:250}),'Deze week verdiend: 90 / 250');
assert.equal(guildTokenShopUiText('ru','Unlock for {amount} Guild Tokens',{amount:400}),'Открыть за 400 жетонов гильдии');
assert.equal(guildTokenShopUiText('tr','+{amount} bonus Guild Tokens earned!',{amount:25}),'+25 bonus Lonca Jetonu kazanıldı!');
const base=path.resolve(__dirname,'../src/components');
const bank=fs.readFileSync(path.join(base,'OnlineGuildBankPanel.tsx'),'utf8');
const shop=fs.readFileSync(path.join(base,'GuildTokenShopView.tsx'),'utf8');
assert.ok(bank.includes("state==='Upcoming'")&&bank.includes("ui('{count} needed later'")&&bank.includes("ui('✓ Covered')"),'Future construction shortages must not display as covered');
assert.ok(bank.includes('const accessibleGrid=windowWidth<430||fontScale>=1.25')&&bank.includes('roomyGrid&&s.roomySlot'),'Bank must give material cards more space with large fonts or narrow screens');
assert.ok(bank.includes('fontScale>=1.25?2:1')&&bank.includes('roomyGrid&&s.modalStatsWrap'),'Bank tabs and donation confirmation statistics must remain readable with large text');
const shopController=fs.readFileSync(path.join(base,'OnlineGuildTokenShopPanel.tsx'),'utf8');
for(const token of [
 'useGuildBankUiText()', "ui('Deposit needs confirmation')", 'ui("Retry saved deposit")',
 "ui('Only materials required by published Construction or released Guild Skills can be deposited. Donations cannot be withdrawn.')",
 "ui('This donation is permanent and cannot be withdrawn. Guild Construction or Guild Skills can spend it separately.')",
 "ui('Deposits are permanent. Only Guild systems may allocate these supplies; members cannot withdraw or transfer them.')",
 "ui('Enter a whole number between 1 and {max}.'", "ui('Up to {max} can be donated now.",
 "ui('{amount} {resource} · Retry the saved receipt. Do not create a second donation.'",
 "ui('Donate quantity {amount}'",
 'depositOnlineGuildBank(input)', 'discardPendingGuildBankDeposit()', 'Number.isSafeInteger(amount)',
 'amount<=maxDeposit(selected)', 'maxDeposit=(id:string)', 'onPress={()=>void deposit({resourceId:selected,amount})}',
])assert.ok(bank.includes(token),'Guild Bank lost localized copy or authoritative deposit guard: '+token);
for(const token of [
 'useGuildTokenShopUiText()', 'ui("Guild Token Shop sections")', "ui('{count} rewards'",
 "ui('Need {amount} more Guild Tokens'", "ui('Unlock for {amount} Guild Tokens'",
 "ui('Permanent account unlock · One purchase')", "ui('Daily and weekly rewards count toward your {cap}-token weekly earning cap.'",
 "ui('+{amount} Guild Tokens · {status}'", "ui('Event bonuses')",
 'reviewedDescriptions.find(text=>text===source)',
 "const lock=owned?", "onBuy(card.id)", "onWeekly(reward.kind)", "onEvent(reward.eventId,reward.milestonePercent)",
 'disabled={spendBlocked||!eligible(card)}'
])assert.ok(shop.includes(token),'Guild Shop lost translated UI or server-backed purchase/claim: '+token);
for(const token of [
 'purchaseOnlineGuildTokenReward(id)', 'claimOnlineGuildWeeklyTokens(kind)',
 'claimOnlineGuildEventBonus(id,percent)', 'syncRequired.current',
 "ui('Reward confirmed. Refresh to sync your balance and collection before continuing.')",
 "ui('Unable to confirm Guild reward. Refresh before trying again.')",
])assert.ok(shopController.includes(token),'Guild Shop client safety or localized result missing: '+token);
assert.ok(shop.includes('name:companion.name,description:companion.description'),'Unverified companion descriptions must remain source-authored');
assert.ok(shop.includes('name:card.title'),'Unknown server offer names must remain unchanged');

// German construction material names are guarded by stable IDs and exact source copy.
const {germanGuildBankResources,guildBankResourceName,guildBankResourceShortName}=require('../src/i18n/guild-bank-ui.ts');
assert.equal(Object.keys(germanGuildBankResources).length,8,'all released Guild crafting material IDs must be covered');
for(const [id,row] of Object.entries(germanGuildBankResources)){
 assert.ok(row.full&&row.short&&row.source,'review complete copy for '+id);
 assert.equal(guildBankResourceName('de',id,row.source),row.full);
 assert.equal(guildBankResourceShortName('de',id,row.full),row.short);
 for(const locale of SUPPORTED_LANGUAGES.filter(language=>language!=='de'))
  assert.equal(guildBankResourceName(locale,id,row.source),row.source,'do not change other-language names');
 assert.equal(guildBankResourceName('de',id,'Server-renamed '+row.source),'Server-renamed '+row.source,'unverified source must pass through');
}
assert.equal(guildBankResourceName('de','user_authored','Custom timber $&'),'Custom timber $&');
assert.equal(guildBankResourceName('de','gold','Gold'),'Gold');
assert.equal(guildBankResourceShortName('en','GUILD_REINFORCED_TIMBER','Reinforced Timber Bundle'),'Timber Bundle');
assert.ok(bank.includes('guildBankResourceName(language,id,english)'),'Guild Bank must use locale-guarded material names');
assert.ok(bank.includes('guildBankResourceShortName(language,id,resourceTitle(id))'),'compact bank tiles must use localized labels');
assert.ok(bank.includes('guildUpgradeComponentName(id)??'), 'English material search must continue to work');
assert.ok(!bank.includes('.toLocaleString()'),'Guild Bank must group all numbers according to selected language');

console.log('PASS: Guild Bank (104) and Token Shop (90) templates x seven target languages, exact interpolated values and server-validated transactions');
