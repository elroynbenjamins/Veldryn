/** Hidden Synchronization UI strings, in SUPPORTED_LANGUAGES order. */
import {SUPPORTED_LANGUAGES,type Language} from './languages';
import {interpolateTranslation,LANGUAGE_LOCALES} from './translator';
import type {CoopSynchronizationValueKind} from '../core/coop-synchronization';
type LocaleRow=readonly [string,string,string,string,string,string,string,string];
export const synchronizationUiRows={
 title:["Class Synchronization","Klassensynchronisation","Sincronización de clases","Klassesynchronisatie","Sincronizzazione di classe","Synchronisation de classes","Синхронизация классов","Sınıf senkronizasyonu"],
 partyWide:["Party-wide","Gruppenweit","Todo el grupo","Groepsbreed","Tutto il gruppo","Tout le groupe","На всю группу","Tüm takım"],
 noProgression:["Instant · No leveling required","Sofort · Keine Stufen nötig","Instantánea · Sin niveles","Direct · Geen levels nodig","Istantanea · Nessun livello","Instantanée · Aucun niveau requis","Сразу · Без прокачки","Anında · Seviye gerekmez"],
 active:["{count} active","{count} aktiv","{count} activas","{count} actief","{count} attive","{count} actives","Активно: {count}","{count} etkin"],
 fullStrength:["Full strength","Volle Stärke","Potencia completa","Volledige kracht","Piena potenza","Pleine puissance","Полная сила","Tam güç"],
 scaledStrength:["{scale} per link","{scale} pro Verbindung","{scale} por vínculo","{scale} per link","{scale} per legame","{scale} par lien","{scale} на связь","Bağ başına {scale}"],
 empty:["No active class links.","Keine aktiven Klassenverbindungen.","Sin vínculos de clase activos.","Geen actieve klassekoppelingen.","Nessun legame attivo.","Aucun lien de classe actif.","Нет активных связей классов.","Etkin sınıf bağı yok."],
 unavailable:["Bonuses unavailable.","Boni nicht verfügbar.","Bonificaciones no disponibles.","Bonussen niet beschikbaar.","Bonus non disponibili.","Bonus indisponibles.","Бонусы недоступны.","Bonuslar kullanılamıyor."],
 note:["No effect on Combat Power or matchmaking.","Kein Einfluss auf Kampfkraft oder Gruppensuche.","No afecta al poder de combate ni al emparejamiento.","Geen invloed op gevechtskracht of matchmaking.","Nessun effetto su potenza o abbinamento.","Sans effet sur la puissance de combat ni le matchmaking.","Не влияет на боевую мощь и подбор группы.","Savaş gücünü veya eşleştirmeyi etkilemez."],
 combinedCap:["Combined cap","Gemeinsames Limit","Límite combinado","Gezamenlijke limiet","Limite combinato","Plafond cumulé","Общий предел","Birleşik sınır"],
 combinedBonuses:["Party bonuses","Gruppenboni","Bonificaciones del grupo","Groepsbonussen","Bonus del gruppo","Bonus du groupe","Бонусы группы","Takım bonusları"],
 showDetails:["View details","Details anzeigen","Ver detalles","Details bekijken","Mostra dettagli","Voir les détails","Подробнее","Ayrıntıları göster"],
 hideDetails:["Hide details","Details ausblenden","Ocultar detalles","Details verbergen","Nascondi dettagli","Masquer les détails","Свернуть","Ayrıntıları gizle"],
 moreBonuses:["+{count} more","+{count} weitere","+{count} más","+{count} meer","+{count} altri","+{count} autres","Ещё {count}","+{count} daha"],
 review:["Synchronization · 2.0 review","Synchronisation · 2.0 Vorschau","Sincronización · Vista 2.0","Synchronisatie · 2.0-preview","Sincronizzazione · Anteprima 2.0","Synchronisation · Aperçu 2.0","Синхронизация · Обзор 2.0","Senkronizasyon · 2.0 önizleme"],
 pp:["pp","Pp.","pp","pp","pp","pts","п. п.","yp"],
} as const satisfies Record<string,LocaleRow>;

export const synchronizationStatRows={
 healing_received_pct:["Healing received","Erhaltene Heilung","Curación recibida","Ontvangen genezing","Cure ricevute","Soins reçus","Получаемое исцеление","Alınan iyileştirme"],
 shield_strength_pct:["Shield strength","Schildstärke","Fuerza de escudo","Schildsterkte","Forza scudo","Puissance des boucliers","Прочность щитов","Kalkan gücü"],
 damage_reduction_pct:["Damage reduction","Schadensreduktion","Reducción de daño","Schadevermindering","Riduzione danni","Réduction des dégâts","Снижение урона","Hasar azaltma"],
 dot_strength_pct:["Damage over time","Schaden über Zeit","Daño periódico","Schade over tijd","Danni nel tempo","Dégâts sur la durée","Периодический урон","Süreli hasar"],
 lifesteal_strength_pct:["Lifesteal strength","Lebensraubstärke","Fuerza de robo de vida","Levensroofsterkte","Forza furto vitale","Puissance du vol de vie","Сила вампиризма","Can çalma gücü"],
 damage_vs_debuffed_pct:["Damage vs debuffed foes","Schaden gegen geschwächte Gegner","Daño a enemigos debilitados","Schade tegen verzwakte vijanden","Danni a nemici indeboliti","Dégâts aux ennemis affaiblis","Урон по ослабленным врагам","Zayıflatılmış düşmana hasar"],
 armor_pct:["Armor","Rüstung","Armadura","Pantser","Armatura","Armure","Броня","Zırh"],
 ward_strength_pct:["Ward strength","Magieschutzstärke","Fuerza de protección mágica","Magische bescherming","Forza protezione magica","Puissance de protection magique","Сила магической защиты","Büyü koruması gücü"],
 crit_chance_pp:["Critical chance","Kritische Trefferchance","Probabilidad crítica","Kritieke kans","Probabilità critico","Chance critique","Шанс крит. удара","Kritik vuruş şansı"],
 crit_damage_pct:["Critical damage","Kritischer Schaden","Daño crítico","Kritieke schade","Danno critico","Dégâts critiques","Критический урон","Kritik hasar"],
 accuracy_pct:["Accuracy","Genauigkeit","Precisión","Nauwkeurigheid","Precisione","Précision","Точность","İsabet"],
 physical_damage_pct:["Physical damage","Physischer Schaden","Daño físico","Fysieke schade","Danno fisico","Dégâts physiques","Физический урон","Fiziksel hasar"],
 execute_damage_pct:["Damage vs foes below 25% HP","Schaden gegen Gegner unter 25 % LP","Daño a enemigos con menos del 25 % de PV","Schade tegen vijanden onder 25% HP","Danni a nemici sotto il 25% PV","Dégâts aux ennemis sous 25 % PV","Урон по врагам с ОЗ ниже 25%","%25 can altındaki düşmana hasar"],
 healing_done_pct:["Healing done","Verursachte Heilung","Curación realizada","Uitgevoerde genezing","Cure effettuate","Soins prodigués","Исходящее исцеление","Yapılan iyileştirme"],
 resource_generation_pct:["Resource generation","Ressourcenerzeugung","Generación de recursos","Generatie van hulpbronnen","Generazione risorse","Génération de ressources","Получение ресурсов","Kaynak üretimi"],
 harmful_effect_resist_pct:["Harmful effect resistance","Widerstand gegen negative Effekte","Resistencia a efectos nocivos","Weerstand tegen negatieve effecten","Resistenza effetti nocivi","Résistance aux effets néfastes","Сопротивление вредным эффектам","Zararlı etki direnci"],
 armor_penetration_pct:["Armor penetration","Rüstungsdurchdringung","Penetración de armadura","Pantserpenetratie","Penetrazione armatura","Pénétration d’armure","Пробивание брони","Zırh delme"],
 haste_pct:["Haste","Tempo","Celeridad","Haast","Celerità","Hâte","Скорость действий","Hız"],
 evasion_rating_pct:["Evasion rating","Ausweichwertung","Índice de evasión","Ontwijkingswaarde","Indice evasione","Score d’esquive","Рейтинг уклонения","Kaçınma puanı"],
 damage_vs_shielded_pct:["Damage vs shielded foes","Schaden gegen Gegner mit Schild","Daño a enemigos con escudo","Schade tegen vijanden met schild","Danni a nemici con scudo","Dégâts aux ennemis protégés","Урон по врагам со щитом","Kalkanlı düşmana hasar"],
 low_hp_damage_pct:["Damage while below 50% HP","Schaden bei unter 50 % LP","Daño con menos del 50 % de PV","Schade bij minder dan 50% HP","Danni sotto il 50% PV","Dégâts sous 50 % PV","Урон при ОЗ ниже 50%","Can %50 altındayken hasar"],
 interrupt_recovery_pct:["Enemy recovery after interrupt","Gegnerische Erholung nach Unterbrechung","Recuperación enemiga tras interrupción","Vijandelijk herstel na onderbreking","Recupero nemico dopo interruzione","Récupération ennemie après interruption","Восстановление врага после прерывания","Kesinti sonrası düşman toparlanması"],
 penetration_pct:["Penetration","Durchdringung","Penetración","Penetratie","Penetrazione","Pénétration","Пробивание","Delme"],
} as const satisfies Record<string,LocaleRow>;

export const synchronizationLinkRows={
 radiant_covenant:["Radiant Covenant","Strahlender Bund","Pacto radiante","Stralend verbond","Patto radioso","Pacte radieux","Сияющий завет","Işıltılı antlaşma"],
 umbral_covenant:["Umbral Covenant","Schattenbund","Pacto umbrío","Schaduwverbond","Patto d’ombra","Pacte d’ombre","Теневой завет","Gölge antlaşması"],
 runebound_pact:["Runebound Pact","Runenbund","Pacto rúnico","Runenpact","Patto runico","Pacte runique","Рунный пакт","Rün antlaşması"],
 predators_instinct:["Predator's Instinct","Raubtierinstinkt","Instinto depredador","Roofdierinstinct","Istinto predatore","Instinct du prédateur","Инстинкт хищника","Avcı içgüdüsü"],
 bloodbound_fury:["Bloodbound Fury","Blutgebundene Wut","Furia de sangre","Bloedwoede","Furia di sangue","Fureur de sang","Кровавая ярость","Kan öfkesi"],
 mystic_harmony:["Mystic Harmony","Mystische Harmonie","Armonía mística","Mystieke harmonie","Armonia mistica","Harmonie mystique","Мистическая гармония","Mistik uyum"],
 steel_vanguard:["Steel Vanguard","Stahlvorhut","Vanguardia de acero","Stalen voorhoede","Avanguardia d’acciaio","Avant-garde d’acier","Стальной авангард","Çelik öncü"],
 guardians_vigil:["Guardian's Vigil","Wacht des Hüters","Vigilia del guardián","Wacht van de hoeder","Veglia del guardiano","Veille du gardien","Дозор хранителя","Muhafız nöbeti"],
 sacred_bulwark:["Sacred Bulwark","Heiliges Bollwerk","Baluarte sagrado","Heilig bolwerk","Baluardo sacro","Rempart sacré","Священный бастион","Kutsal siper"],
 unbroken_fortress:["Unbroken Fortress","Ungebrochene Festung","Fortaleza inquebrantable","Ongebroken vesting","Fortezza indomita","Forteresse invaincue","Несокрушимая крепость","Yıkılmaz kale"],
 divine_pursuit:["Divine Pursuit","Göttliche Verfolgung","Persecución divina","Goddelijke achtervolging","Inseguimento divino","Poursuite divine","Божественная погоня","İlahi takip"],
 sanctified_hunt:["Sanctified Hunt","Geheiligte Jagd","Caza santificada","Geheiligde jacht","Caccia consacrata","Chasse sanctifiée","Освящённая охота","Kutsanmış av"],
 twilight_accord:["Twilight Accord","Zwielichtabkommen","Acuerdo crepuscular","Schemerakkoord","Accordo del crepuscolo","Accord du crépuscule","Сумеречный договор","Alacakaranlık anlaşması"],
 crimson_veil:["Crimson Veil","Purpurschleier","Velo carmesí","Karmozijnen sluier","Velo cremisi","Voile écarlate","Багровая вуаль","Kızıl perde"],
 marked_for_death:["Marked for Death","Zum Tod gezeichnet","Marcado para morir","Ten dode gemarkeerd","Marchiato a morte","Marqué pour la mort","Метка смерти","Ölüm işareti"],
 shattering_force:["Shattering Force","Zerschmetternde Kraft","Fuerza devastadora","Verpletterende kracht","Forza dirompente","Force fracassante","Сокрушительная сила","Parçalayıcı güç"],
 ruinous_assault:["Ruinous Assault","Verderblicher Angriff","Asalto ruinoso","Verwoestende aanval","Assalto rovinoso","Assaut destructeur","Губительная атака","Yıkıcı saldırı"],
 phantom_curse:["Phantom Curse","Phantomfluch","Maldición fantasmal","Spookvloek","Maledizione spettrale","Malédiction spectrale","Призрачное проклятие","Hayalet laneti"],
} as const satisfies Record<string,LocaleRow>;

export type SynchronizationUiKey=keyof typeof synchronizationUiRows;
export type SynchronizationStatKey=keyof typeof synchronizationStatRows;
export type SynchronizationLinkKey=keyof typeof synchronizationLinkRows;
function localized(language:Language,row:LocaleRow):string{
 return row[SUPPORTED_LANGUAGES.indexOf(language)]??row[0];
}
export function synchronizationUiText(language:Language,key:SynchronizationUiKey,params:Record<string,string|number>={}):string{
 return interpolateTranslation(localized(language,synchronizationUiRows[key]),params);
}
export function synchronizationStatText(language:Language,key:SynchronizationStatKey):string{
 return localized(language,synchronizationStatRows[key]);
}
export function synchronizationLinkText(language:Language,key:SynchronizationLinkKey):string{
 return localized(language,synchronizationLinkRows[key]);
}
export function createSynchronizationLabels(language:Language){
 const number=new Intl.NumberFormat(LANGUAGE_LOCALES[language],{maximumFractionDigits:2,signDisplay:'always'});
 const percent=new Intl.NumberFormat(LANGUAGE_LOCALES[language],{style:'percent',maximumFractionDigits:2,signDisplay:'always'});
 const plainPercent=new Intl.NumberFormat(LANGUAGE_LOCALES[language],{style:'percent',maximumFractionDigits:0});
 const ui=(key:SynchronizationUiKey,params?:Record<string,string|number>)=>synchronizationUiText(language,key,params);
 return {
  title:ui('title'),partyWide:ui('partyWide'),noProgression:ui('noProgression'),
  active:(count:number)=>ui('active',{count}),fullStrength:ui('fullStrength'),
  scaledStrength:(scale:number)=>ui('scaledStrength',{scale:plainPercent.format(scale/100)}),
  empty:ui('empty'),unavailable:ui('unavailable'),note:ui('note'),combinedCap:ui('combinedCap'),
  capLine:(label:string,raw:string,effective:string)=>label+': '+raw+' → '+effective,
  combinedBonuses:ui('combinedBonuses'),showDetails:ui('showDetails'),hideDetails:ui('hideDetails'),
  moreBonuses:(count:number)=>ui('moreBonuses',{count}),
  formatValue:(bps:number,kind:CoopSynchronizationValueKind)=>kind==='percentage_points'
   ?number.format(bps/100)+' '+ui('pp'):percent.format(bps/10000),
 };
}
