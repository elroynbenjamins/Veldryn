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
 ['Guild Bank',guildBankUiRows,guildBankUiText,88],
 ['Guild Token Shop',guildTokenShopUiRows,guildTokenShopUiText,89],
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
const shopController=fs.readFileSync(path.join(base,'OnlineGuildTokenShopPanel.tsx'),'utf8');
for(const token of [
 'useGuildBankUiText()', "ui('Deposit needs confirmation')", 'ui("Retry saved deposit")',
 "ui('Only materials required by published Construction or released Guild Skills can be deposited. Donations cannot be withdrawn.')",
 "ui('This donation is permanent and cannot be withdrawn. Guild Construction or Guild Skills can spend it separately.')",
 "ui('Deposits are permanent. Only Guild systems may allocate these supplies; members cannot withdraw or transfer them.')",
 "ui('Enter a whole number between 1 and {max}.'", "ui('Up to {max} more can be deposited.",
 "ui('{amount} {resource} · Retry the saved receipt. Do not create a second donation.'",
 "ui('Donate quantity {amount}'",
 'depositOnlineGuildBank(input)', 'discardPendingGuildBankDeposit()', 'Number.isSafeInteger(amount)',
 'amount<=1000000', 'amount<=depositCapacity(selected)', 'onPress={()=>void deposit({resourceId:selected,amount})}',
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
console.log('PASS: Guild Bank (88) and Token Shop (89) templates x seven target languages, exact interpolated values and server-validated transactions');
