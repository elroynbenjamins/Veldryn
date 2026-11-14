const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');

require.extensions['.ts']=(module,filename)=>module._compile(
 ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 }).outputText,filename
);

const {TURKISH_COVERAGE}=require('../src/i18n/turkish-coverage.ts');
const {EARLY_LOCALE_ROWS,earlyLocaleText}=require('../src/i18n/early-locales.ts');
const {createSourceTranslator}=require('../src/i18n/source-catalog.ts');
const {createTranslator}=require('../src/i18n/translator.ts');
const {socialEarlyRows}=require('../src/i18n/social-early-coverage.ts');
const keys=Object.keys(TURKISH_COVERAGE);
assert.ok(keys.length>=3638,'Turkish core coverage should retain the 3638-string baseline');

const placeholders=text=>[...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)]
 .map(match=>match[1]).sort();
const i18nDir=path.resolve(__dirname,'../src/i18n');
const coveredSources=['navigation.ts','app-shell.ts','account.ts','companions.ts',
 'gameplay.ts','profile.ts','social.ts','battle.ts','creation.ts','progression.ts'];
const sourceKeys=new Set();
for(const file of coveredSources){
 const content=fs.readFileSync(path.join(i18nDir,file),'utf8');
 const tree=ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true);
 assert.equal(tree.parseDiagnostics.length,0,file+' parses without errors');
 function visit(node){
  if(ts.isPropertyAssignment(node)&&ts.isStringLiteral(node.name)&&ts.isArrayLiteralExpression(node.initializer)){
   sourceKeys.add(node.name.text);
  }
  ts.forEachChild(node,visit);
 }
 visit(tree);
}

for(const [english,turkish] of Object.entries(TURKISH_COVERAGE)){
 assert.ok(english.trim()&&turkish.trim(),'Empty Turkish translation: '+english);
 assert.ok(!Object.hasOwn(EARLY_LOCALE_ROWS,english),'Duplicate early translation: '+english);
 assert.ok(!Object.hasOwn(socialEarlyRows,english),'Do not override pre-existing Social Turkish translation: '+english);
 assert.deepEqual(placeholders(turkish),placeholders(english),'Placeholder mismatch: '+english);
 assert.equal(earlyLocaleText('tr',english),turkish,'Turkish runtime lookup: '+english);
 assert.ok(sourceKeys.has(english),'Missing authored source catalog key: '+english);
}

assert.equal(earlyLocaleText('ru','Secured'),undefined,'Do not change Russian fallbacks');
assert.equal(earlyLocaleText('de','Secured'),undefined,'Do not affect completed locales');
assert.equal(earlyLocaleText('tr','Combat Power'),'Savaş gücü','Keep established Turkish translations');
assert.equal(earlyLocaleText('tr','Unknown server detail'),undefined,'Unknown player/server data stays untranslated');

const sourceTranslator=createSourceTranslator({
 'No companions unlocked yet.':['DE','ES','NL','IT','FR']
});
assert.equal(sourceTranslator('tr','No companions unlocked yet.'),'Henüz yoldaş açılmadı.');
assert.equal(sourceTranslator('en','No companions unlocked yet.'),'No companions unlocked yet.');

const keyed=createTranslator({
 en:{'Weekly rewards ready to claim: {count}':'Weekly rewards ready to claim: {count}'},
 tr:{'Weekly rewards ready to claim: {count}':'Wrong catalog fallback'}
});
assert.equal(keyed('tr','Weekly rewards ready to claim: {count}',{count:3}),
 'Alınmaya hazır haftalık ödüller: 3');
assert.equal(keyed('en','Weekly rewards ready to claim: {count}',{count:3}),
 'Weekly rewards ready to claim: 3');

const remaining=[...sourceKeys].filter(key=>!Object.hasOwn(TURKISH_COVERAGE,key)
 &&!Object.hasOwn(EARLY_LOCALE_ROWS,key)&&!Object.hasOwn(socialEarlyRows,key)).length;
assert.equal(earlyLocaleText('tr','PROFILE HIGHLIGHTS'),'PROFİLDE ÖNE ÇIKANLAR');
assert.equal(earlyLocaleText('tr','Social updates'),'Sosyal güncellemeler');
assert.equal(earlyLocaleText('tr','COMPANION EXPEDITIONS'),'YOLDAŞ SEFERLERİ');
assert.equal(earlyLocaleText('tr','Claim daily gift'),'Günlük hediyeyi al');
assert.equal(earlyLocaleText('tr','YOUR CONTRIBUTION'),'KATKIN');
assert.equal(earlyLocaleText('tr','WEEKLY PARTY'),'HAFTALIK GRUP');
assert.equal(earlyLocaleText('tr','Find players'),'Oyuncu bul');
assert.equal(earlyLocaleText('tr','Blocked players · {count}'),'Engellenen oyuncular · {count}');
assert.equal(earlyLocaleText('tr','Companion Trial team ready'),'Yoldaş Denemesi takımı hazır');
assert.equal(earlyLocaleText('tr','1 Tank · 2 Damage · 1 Support'),'1 Tank · 2 Hasar · 1 Destek');
assert.equal(earlyLocaleText('tr','Auto-eat below {percent}% HP'),'Can %{percent} altındayken otomatik ye');
assert.equal(earlyLocaleText('tr','No event is active'),'Etkin etkinlik yok');
assert.equal(earlyLocaleText('tr','PET COLLECTION'),'EVCİL HAYVAN KOLEKSİYONU');
assert.equal(earlyLocaleText('tr','ADVENTURER\'S JOURNAL'),'MACERACI GÜNCESİ');
assert.equal(earlyLocaleText('tr',"Activity queue"),"Etkinlik kuyruğu");
assert.equal(earlyLocaleText('tr',"This region has no unfinished Contract Board work this week."),"Bu bölgede bu hafta tamamlanmamış Sözleşme Panosu işi yok.");
assert.equal(earlyLocaleText('tr',"Guild Projects"),"Lonca Projeleri");
assert.equal(earlyLocaleText('tr',"COMBAT SKILL XP SPLIT"),"SAVAŞ BECERİSİ XP DAĞILIMI");
assert.equal(earlyLocaleText('tr',"Idle Rule"),"Boşta Kalma Kuralı");
assert.equal(earlyLocaleText('tr',"Show chat"),"Sohbeti göster");
assert.equal(earlyLocaleText('tr',"Affinity"),"Uyum");
assert.equal(earlyLocaleText('tr',"Monster mastery"),"Canavar ustalığı");
assert.equal(earlyLocaleText('tr',"Choose the required number of companions."),"Gerekli sayıda yoldaş seç.");
assert.equal(earlyLocaleText('tr',"Activity queue"),"Etkinlik kuyruğu");
assert.equal(earlyLocaleText('tr',"STORAGE MANAGEMENT"),"DEPO YÖNETİMİ");
assert.equal(earlyLocaleText('tr',"SET BONUS ACTIVATED"),"SET BONUSU ETKİNLEŞTİRİLDİ");
assert.equal(earlyLocaleText('tr',"No items to show"),"Gösterilecek eşya yok");
assert.equal(earlyLocaleText('tr',"Current character boosts"),"Mevcut karakter güçlendirmeleri");
assert.equal(earlyLocaleText('tr',"CHARACTER DELETION CONFIRMATION"),"KARAKTER SİLME ONAYI");
assert.equal(earlyLocaleText('tr',"YOUR STANDING"),"SIRALAMADAKİ YERİN");
assert.equal(earlyLocaleText('tr',"Join a Party to use Party Chat. World and Guild chat remain available in the chat overlay."),"Grup Sohbetini kullanmak için bir Gruba katıl. Dünya ve Lonca sohbetleri sohbet penceresinde kullanılabilir.");
assert.equal(earlyLocaleText('tr',"Guild Chat requires online services. No simulated chat is shown."),"Lonca Sohbeti çevrimiçi hizmet gerektirir. Sahte sohbet gösterilmez.");
assert.equal(earlyLocaleText('tr',"Optimize a completed loadout"),"Tamamlanmış donanımı iyileştir");
assert.equal(earlyLocaleText('tr',"Open sockets on {slot}"),"{slot} üzerindeki yuvaları aç");
assert.equal(earlyLocaleText('tr',"Highest Contract contribution"),"En yüksek Sözleşme katkısı");
assert.equal(earlyLocaleText('tr',"PERSONAL BEST"),"KİŞİSEL REKOR");
assert.equal(earlyLocaleText('tr',"A title earned through an exceptional companion collection."),"Olağanüstü yoldaş koleksiyonuyla kazanılan unvan.");
console.log('PASS: '+keys.length+' Turkish strings, catalog keys, placeholders, and runtime fallbacks. '
 +'Remaining source-key candidates in audited catalogs: '+remaining+'.');
