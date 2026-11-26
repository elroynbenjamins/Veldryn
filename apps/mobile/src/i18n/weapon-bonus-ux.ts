import {SUPPORTED_LANGUAGES,type Language} from './languages';
import type {WeaponBonusStat} from '../core/weapon-bonus-rolls';

/** Dedicated eight-locale copy so this small UX refinement does not duplicate
 * existing keys in the large gameplay text catalog. */
const ROWS={
  possible:['Possible bonus stats','Mögliche Bonuswerte','Posibles bonus','Mogelijke bonusstats','Bonus possibili','Bonus possibles','Возможные бонусы','Olası bonuslar'],
  possibleCount:['possible stats','mögliche Werte','bonus posibles','mogelijke stats','bonus possibili','bonus possibles','возможных бонусов','olası bonus'],
  oneOrTwo:['1 bonus · Epic+: 2','1 Bonus · Episch+: 2','1 bonus · Épico+: 2','1 bonus · Episch+: 2','1 bonus · Epico+: 2','1 bonus · Épique+ : 2','1 бонус · эпическое+: 2','1 bonus · Destansı+: 2'],
  twoCount:['2 bonuses','2 Boni','2 bonus','2 bonussen','2 bonus','2 bonus','2 бонуса','2 bonus'],
  single:['Common–Rare: 1 bonus · Epic+: 2','Gewöhnlich–Selten: 1 Bonus · Episch+: 2','Común–Raro: 1 bonus · Épico+: 2','Gewoon–Zeldzaam: 1 bonus · Episch+: 2','Comune–Raro: 1 bonus · Epico+: 2','Commun–Rare : 1 bonus · Épique+ : 2','Обычное–редкое: 1 бонус · эпическое+: 2','Yaygın–Nadir: 1 bonus · Destansı+: 2'],
  double:['2 different bonuses at every rarity','2 verschiedene Boni bei jeder Seltenheit','2 bonus distintos en cada rareza','2 verschillende bonussen bij elke zeldzaamheid','2 bonus diversi per ogni rarità','2 bonus distincts à chaque rareté','2 разных бонуса любой редкости','Her nadirlikte 2 farklı bonus'],
  shared:['Same possible bonuses for every class.','Gleiche mögliche Boni für alle Klassen.','Los mismos bonus posibles para todas las clases.','Dezelfde mogelijke bonussen voor elke klasse.','Gli stessi bonus possibili per ogni classe.','Les mêmes bonus possibles pour toutes les classes.','Одинаковые бонусы для всех классов.','Tüm sınıflar için aynı olası bonuslar.'],
  claim:['Rarity, quality and bonuses roll when you claim the craft.','Seltenheit, Qualität und Boni werden beim Abholen gewürfelt.','Rareza, calidad y bonus se generan al recoger el objeto.','Zeldzaamheid, kwaliteit en bonussen worden bepaald bij ophalen.','Rarità, qualità e bonus vengono generati al ritiro.','Rareté, qualité et bonus sont tirés à la récupération.','Редкость, качество и бонусы определяются при получении.','Nadirlik, kalite ve bonuslar üretimi teslim alırken belirlenir.'],
  current:['Current','Aktuell','Actual','Huidig','Attuale','Actuel','Текущее','Mevcut'],
  candidate:['New','Neu','Nuevo','Nieuw','Nuovo','Nouveau','Новое','Yeni'],
  differences:['Bonus changes','Bonusänderungen','Cambios de bonus','Bonusverschillen','Variazioni bonus','Évolution des bonus','Изменение бонусов','Bonus değişimleri'],
  points:['Changes shown in percentage points (pp).','Änderungen in Prozentpunkten (pp).','Cambios en puntos porcentuales (pp).','Verschillen in procentpunten (pp).','Variazioni in punti percentuali (pp).','Variations en points de pourcentage (pp).','Изменения в процентных пунктах (pp).','Değişimler yüzde puanı (pp) cinsindendir.'],
  maxHp:['Max HP','Max. LP','PV máx.','Max. HP','PS max','PV max','Макс. ОЗ','Maks. HP'],
  armor:['Armor','Rüstung','Armadura','Pantser','Armatura','Armure','Броня','Zırh'],
  tenacity:['Tenacity','Zähigkeit','Tenacidad','Vasthoudendheid','Tenacia','Ténacité','Стойкость','Direnç'],
  critRate:['Crit Rate','Krit.-Chance','Prob. crítico','Kritkans','Prob. critico','Taux critique','Шанс крита','Kritik şansı'],
  haste:['Haste','Tempo','Celeridad','Snelheid','Rapidità','Célérité','Скорость','Hız'],
  accuracy:['Accuracy','Trefferchance','Precisión','Nauwkeurigheid','Precisione','Précision','Точность','İsabet'],
  potency:['Potency','Wirksamkeit','Potencia','Potentie','Potenza','Puissance','Мощность','Etki gücü'],
  evasion:['Evasion','Ausweichen','Evasión','Ontwijking','Schivata','Esquive','Уклонение','Kaçınma'],
  critDamage:['Crit Damage','Krit. Schaden','Daño crítico','Kritieke schade','Danno critico','Dégâts critiques','Крит. урон','Kritik hasarı'],
  abilityDamage:['Ability Damage','Fähigkeitsschaden','Daño de habilidad','Vaardigheidsschade','Danno abilità','Dégâts des capacités','Урон умений','Yetenek hasarı'],
  healingPower:['Healing Power','Heilkraft','Potencia curativa','Genezingskracht','Potere curativo','Puissance de soins','Сила исцеления','İyileştirme gücü'],
  ward:['Ward','Schutz','Protección','Bescherming','Protezione','Protection','Защита','Koruma'],
  penetration:['Penetration','Durchdringung','Penetración','Penetratie','Penetrazione','Pénétration','Пробивание','Delme'],
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string,string]>;

export type WeaponBonusUiKey=keyof typeof ROWS;
export function weaponBonusUiText(language:Language,key:WeaponBonusUiKey):string{
  const index=SUPPORTED_LANGUAGES.indexOf(language);
  return ROWS[key][index>=0?index:0];
}
export function weaponBonusStatText(language:Language,stat:WeaponBonusStat):string{
  return weaponBonusUiText(language,stat);
}
