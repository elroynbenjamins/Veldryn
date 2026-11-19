/**
 * Unmounted Boss 2.0 presentation catalogue. Only translated, fixed IDs are
 * shown; never render client-authored casts, RNG, stat coefficients or rewards.
 * Server must authenticate and verify the persisted snapshot first.
 */
export const BOSS_V2_PREVIEW_PUBLIC_ENABLED=false as const;
export const BOSS_V2_CAST_IDS=[
 'ROOT_V2_LIVING_BARK','BELL_V2_SOUL_CURSE','BELL_V2_VEIL_MIRROR',
 'SOLAR_V2_SUNFALL','SPHINX_V2_MIRAGE',
 'BELLBEAST_V2_SHATTER','CANTOR_V2_DISSONANCE',
] as const;
export type BossV2CastId=typeof BOSS_V2_CAST_IDS[number];
export type BossV2Locale='en'|'es'|'de'|'ru'|'tr';
type CounterType='shield'|'curse'|'interrupt';
const COUNTER_TYPE:Readonly<Record<BossV2CastId,CounterType>>={
 ROOT_V2_LIVING_BARK:'shield',BELL_V2_SOUL_CURSE:'curse',
 BELL_V2_VEIL_MIRROR:'shield',SOLAR_V2_SUNFALL:'interrupt',
 SPHINX_V2_MIRAGE:'shield',BELLBEAST_V2_SHATTER:'interrupt',
 CANTOR_V2_DISSONANCE:'interrupt',
};
type Words={
 title:string;phase:string;interruptible:string;uninterruptible:string;
 upcoming:string;remaining:string;resolving:string;complete:string;legacyMoves:string;
 casts:Record<BossV2CastId,readonly [string,string]>;
 responses:Record<CounterType,readonly [string,string]>;
};
const LANG:Record<BossV2Locale,Words>={
 en:{
  title:'Boss mechanics',phase:'Phase',interruptible:'Interruptible',
  uninterruptible:'Cannot interrupt',upcoming:'Watch for',remaining:'Cast remaining',
  resolving:'Cast resolving',complete:'Latest phase',
  legacyMoves:'Existing boss attacks and phases still apply.',
  casts:{
   ROOT_V2_LIVING_BARK:['Living Bark','Roots harden around the boss.'],
   BELL_V2_SOUL_CURSE:['Soul Curse','The bell marks its next target.'],
   BELL_V2_VEIL_MIRROR:['Veil Mirror','A mirror forms around the bell.'],
   SOLAR_V2_SUNFALL:['Sunfall','The buried sun begins to flare.'],
   SPHINX_V2_MIRAGE:['Mirage Veil','Reflections gather around the Sphinx.'],
   BELLBEAST_V2_SHATTER:['Glacial Shatter','The Bellbeast prepares a heavy strike.'],
   CANTOR_V2_DISSONANCE:['Deep Dissonance','The Cantor begins a dissonant chorus.'],
  },
  responses:{
   shield:['Break the shield with steady attacks.','Save a strong hit for the next opening.'],
   curse:['Ward or cleanse the weakening curse.','Stay defensive until the effect expires.'],
   interrupt:['Interrupt the cast if you can.','Guard, recover, and time your healing if you cannot.'],
  },
 },
 es:{
  title:'Mecánicas del jefe',phase:'Fase',interruptible:'Se puede interrumpir',
  uninterruptible:'No se puede interrumpir',upcoming:'Presta atención a',
  remaining:'Tiempo de lanzamiento',resolving:'Resolviendo lanzamiento',complete:'Última fase',
  legacyMoves:'Los ataques y fases anteriores del jefe siguen activos.',
  casts:{
   ROOT_V2_LIVING_BARK:['Corteza viviente','Las raíces endurecen al jefe.'],
   BELL_V2_SOUL_CURSE:['Maldición del alma','La campana marca a su próximo objetivo.'],
   BELL_V2_VEIL_MIRROR:['Espejo del velo','Un espejo rodea la campana.'],
   SOLAR_V2_SUNFALL:['Caída solar','El sol enterrado empieza a brillar.'],
   SPHINX_V2_MIRAGE:['Velo de espejismos','Aparecen reflejos en torno a la esfinge.'],
   BELLBEAST_V2_SHATTER:['Fractura glacial','La bestia prepara un fuerte golpe.'],
   CANTOR_V2_DISSONANCE:['Disonancia profunda','El cantor comienza un coro disonante.'],
  },
  responses:{
   shield:['Rompe el escudo con ataques constantes.','Reserva un golpe fuerte para la próxima apertura.'],
   curse:['Protege o disipa la maldición.','Defiéndete hasta que termine el efecto.'],
   interrupt:['Interrumpe el lanzamiento si puedes.','Bloquea, recupérate y cura a tiempo si no puedes.'],
  },
 },
 de:{
  title:'Bossmechaniken',phase:'Phase',interruptible:'Unterbrechbar',
  uninterruptible:'Nicht unterbrechbar',upcoming:'Achte auf',
  remaining:'Verbleibende Zauberzeit',resolving:'Zauber wird ausgelöst',complete:'Letzte Phase',
  legacyMoves:'Bisherige Bossangriffe und Phasen bleiben aktiv.',
  casts:{
   ROOT_V2_LIVING_BARK:['Lebende Rinde','Wurzeln verhärten den Boss.'],
   BELL_V2_SOUL_CURSE:['Seelenfluch','Die Glocke markiert ihr nächstes Ziel.'],
   BELL_V2_VEIL_MIRROR:['Schleierspiegel','Ein Spiegel umhüllt die Glocke.'],
   SOLAR_V2_SUNFALL:['Sonnensturz','Die vergrabene Sonne beginnt zu glühen.'],
   SPHINX_V2_MIRAGE:['Trugbildschleier','Spiegelbilder sammeln sich um die Sphinx.'],
   BELLBEAST_V2_SHATTER:['Gletscherbruch','Das Glockenbiest holt zu einem schweren Schlag aus.'],
   CANTOR_V2_DISSONANCE:['Tiefe Dissonanz','Der Kantor stimmt einen schiefen Chor an.'],
  },
  responses:{
   shield:['Durchbrich den Schild mit stetigen Treffern.','Spare einen starken Treffer für das nächste Zeitfenster.'],
   curse:['Schütze dich oder entferne den Fluch.','Verteidige dich, bis der Effekt endet.'],
   interrupt:['Unterbrich den Zauber, wenn möglich.','Sonst blocken, erholen und rechtzeitig heilen.'],
  },
 },
 ru:{
  title:'Механики босса',phase:'Фаза',interruptible:'Можно прервать',
  uninterruptible:'Нельзя прервать',upcoming:'Ожидайте',
  remaining:'Осталось до применения',resolving:'Применение умения',complete:'Последняя фаза',
  legacyMoves:'Прежние атаки и фазы босса остаются активными.',
  casts:{
   ROOT_V2_LIVING_BARK:['Живая кора','Корни укрепляют защиту босса.'],
   BELL_V2_SOUL_CURSE:['Проклятие души','Колокол отмечает следующую цель.'],
   BELL_V2_VEIL_MIRROR:['Зеркало завесы','Колокол окружает зеркальная завеса.'],
   SOLAR_V2_SUNFALL:['Падение солнца','Погребённое солнце разгорается.'],
   SPHINX_V2_MIRAGE:['Завеса миражей','Вокруг сфинкса собираются отражения.'],
   BELLBEAST_V2_SHATTER:['Ледяной раскол','Зверь готовит мощный удар.'],
   CANTOR_V2_DISSONANCE:['Глубокий диссонанс','Певец начинает мрачный хор.'],
  },
  responses:{
   shield:['Пробивайте щит регулярными атаками.','Приберегите сильный удар для следующего окна.'],
   curse:['Защититесь или снимите проклятие.','Обороняйтесь, пока эффект не исчезнет.'],
   interrupt:['Прервите умение, если можете.','Иначе защититесь, восстановитесь и вовремя лечитесь.'],
  },
 },
 tr:{
  title:'Boss mekanikleri',phase:'Aşama',interruptible:'Kesilebilir',
  uninterruptible:'Kesilemez',upcoming:'Dikkat et',remaining:'Kalan kullanım süresi',
  resolving:'Yetenek gerçekleşiyor',complete:'Son aşama',
  legacyMoves:'Önceki boss saldırıları ve aşamaları da etkin.',
  casts:{
   ROOT_V2_LIVING_BARK:['Canlı Kabuk','Kökler bossun etrafında sertleşiyor.'],
   BELL_V2_SOUL_CURSE:['Ruh Laneti','Çan sonraki hedefini işaretliyor.'],
   BELL_V2_VEIL_MIRROR:['Perde Aynası','Çanın çevresinde bir ayna oluşuyor.'],
   SOLAR_V2_SUNFALL:['Güneş Düşüşü','Gömülü güneş parlamaya başlıyor.'],
   SPHINX_V2_MIRAGE:['Serap Perdesi','Sfenksin çevresinde yansımalar beliriyor.'],
   BELLBEAST_V2_SHATTER:['Buzul Parçalanması','Çan canavarı ağır bir darbeye hazırlanıyor.'],
   CANTOR_V2_DISSONANCE:['Derin Uyumsuzluk','Kantor uyumsuz bir ezgiye başlıyor.'],
  },
  responses:{
   shield:['Düzenli saldırılarla kalkanı kır.','Güçlü saldırını sonraki açık için sakla.'],
   curse:['Lanetten korun veya onu temizle.','Etki bitene kadar savunmada kal.'],
   interrupt:['Mümkünse yeteneği kes.','Kesemiyorsan savun, toparlan ve zamanında iyileş.'],
  },
 },
};
export const bossV2Locale=(raw:string):BossV2Locale=>{
 const value=raw.toLowerCase().split(/[-_]/)[0];
 return (['en','es','de','ru','tr'] as string[]).includes(value)
  ?value as BossV2Locale:'en';
};
export function bossV2Words(locale:string){return LANG[bossV2Locale(locale)];}
export function bossV2LocalizedCast(id:string,locale:string){
 if(!(BOSS_V2_CAST_IDS as readonly string[]).includes(id))return null;
 const key=id as BossV2CastId,words=bossV2Words(locale);
 const [name,tell]=words.casts[key];
 const [counter,fallback]=words.responses[COUNTER_TYPE[key]];
 return {name,tell,counter,fallback};
}
