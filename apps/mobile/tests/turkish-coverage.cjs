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
assert.ok(keys.length>=5096,'Turkish core coverage should retain the 5096-string baseline');

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
assert.equal(earlyLocaleText('tr',"Not enough Companion Essence."),"Yeterli Yoldaş Özü yok.");
assert.equal(earlyLocaleText('tr',"Missing companion materials."),"Yoldaş malzemeleri eksik.");
assert.equal(earlyLocaleText('tr',"INVENTORY VIEW"),"ENVANTER GÖRÜNÜMÜ");
assert.equal(earlyLocaleText('tr',"OFFLINE PROGRESS"),"ÇEVRİMDIŞI İLERLEME");
assert.equal(earlyLocaleText('tr',"No recipes match your search."),"Aramanla eşleşen tarif yok.");
assert.equal(earlyLocaleText('tr',"WEEKLY PROJECT BOARD"),"HAFTALIK PROJE PANOSU");
assert.equal(earlyLocaleText('tr',"No active Guild Project"),"Etkin Lonca Projesi yok");
assert.equal(earlyLocaleText('tr',"The purchase could not be verified. Restore purchases or try again later."),"Satın alım doğrulanamadı. Satın alımları geri yükle veya daha sonra tekrar dene.");
assert.equal(earlyLocaleText('tr',"Email is not verified yet. Open the latest confirmation email, then check again."),"E-posta henüz doğrulanmadı. Son doğrulama e-postasını açıp tekrar kontrol et.");
assert.equal(earlyLocaleText('tr',"Pack Instinct: +4% damage against enemies below 35% HP."),"Sürü İçgüdüsü: Canı %35'in altındaki düşmanlara +%4 hasar.");
assert.equal(earlyLocaleText('tr',"Bond 10 improves the Djinnling’s restorative tempo."),"Bağ 10, Djinnling'in iyileştirme temposunu geliştirir.");
assert.equal(earlyLocaleText('tr',"Runic shields and interrupts. Strong protection, slower hunting."),"Rün kalkanları ve yetenek kesmeler. Güçlü koruma, daha yavaş avlanma.");
assert.equal(earlyLocaleText('tr',"Companion Sanctuary Unlocked"),"Yoldaş Sığınağı Açıldı");
assert.equal(earlyLocaleText('tr',"Shared Progress"),"Ortak İlerleme");
assert.equal(earlyLocaleText('tr',"Your party search has ended. You can safely return to the expedition menu and start again."),"Grup araman sona erdi. Sefer menüsüne dönüp güvenle tekrar başlayabilirsin.");
assert.equal(earlyLocaleText('tr',"Sign out of guest account?"),"Misafir hesabından çıkış yapılsın mı?");
assert.equal(earlyLocaleText('tr',"Forgot password"),"Şifremi unuttum");
assert.equal(earlyLocaleText('tr',"The opening exchange is the dangerous part; surviving it usually stabilizes the hunt."),"İlk çarpışma tehlikelidir; bundan sağ çıkmak avı genellikle dengeler.");
assert.equal(earlyLocaleText('tr',"Use upgraded gear, food, class progression and a comfortable readiness margin before committing."),"Başlamadan önce geliştirilmiş ekipman, yiyecek, sınıf ilerlemesi ve güvenli bir güç payı sağla.");
assert.equal(earlyLocaleText('tr',"GEM SOCKETED"),"MÜCEVHER TAKILDI");
assert.equal(earlyLocaleText('tr',"Every equipment piece has two dedicated sockets: one Stat Gem and one Effect Gem. Stat Gems improve Attack, Defense or HP; Effect Gems change combat behavior."),"Her ekipmanda iki özel yuva vardır: bir Özellik Mücevheri ve bir Etki Mücevheri. Özellik Mücevherleri Saldırı, Savunma veya Canı artırır; Etki Mücevherleri savaş davranışını değiştirir.");
assert.equal(earlyLocaleText('tr',"FIRST HUNT"),"İLK AV");
assert.equal(earlyLocaleText('tr',"Stop or claim this character’s current activity before deleting it."),"Bu karakteri silmeden önce mevcut etkinliğini durdur veya ödüllerini al.");
assert.equal(earlyLocaleText('tr',"Unable to load Guild Projects."),"Lonca Projeleri yüklenemedi.");
assert.equal(earlyLocaleText('tr',"Disband Guild?"),"Lonca dağıtılsın mı?");
assert.equal(earlyLocaleText('tr',"Save backup"),"Yedek kaydet");
assert.equal(earlyLocaleText('tr',"Google Play Billing is unavailable right now."),"Google Play ödeme sistemi şu anda kullanılamıyor.");
assert.equal(earlyLocaleText('tr',"Higher damage against enemies below 30% HP."),"Canı %30'un altındaki düşmanlara daha fazla hasar.");
assert.equal(earlyLocaleText('tr',"Rare discovery while fishing {name}"),"{name} avlarken nadir keşif");
assert.equal(earlyLocaleText('tr',"Queueing is same-region only. Stop-at-goal always keeps food/overflow safety and finishes the current cycle."),"Kuyruğa alma yalnızca aynı bölgede geçerlidir. Hedefte durma yiyecek ve depo güvenliğini korur; mevcut döngüyü tamamlar.");
assert.equal(earlyLocaleText('tr',"Clear Skies"),"Açık Gökyüzü");
assert.equal(earlyLocaleText('tr',"Weather changes in {time}"),"Hava durumu {time} içinde değişecek");
assert.equal(earlyLocaleText('tr',"Stone impact · {amount}"),"Taş darbesi · {amount}");
console.log('PASS: '+keys.length+' Turkish strings, catalog keys, placeholders, and runtime fallbacks. '
 +'Remaining source-key candidates in audited catalogs: '+remaining+'.');
