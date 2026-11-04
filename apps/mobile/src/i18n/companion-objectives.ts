import type {Language} from './languages';

// Exact, player-visible Companion objective and regional bonus descriptions.
// English keys come from backend/src/server/companions/content.ts; proper names stay unchanged.
// Values are ordered: de, es, nl, it, fr, ru, tr.
export const companionObjectiveRows={
  "As a Damage character, complete content using a Tank Companion.": [
    "Schließe als Schadensklasse Inhalte mit einem Tank-Begleiter ab.",
    "Completa contenido con un compañero tanque usando una clase de daño.",
    "Voltooi content als schade-klasse met een tankmetgezel.",
    "Completa contenuti con un compagno tank usando una classe danno.",
    "Terminez du contenu avec un compagnon tank en classe Dégâts.",
    "Играя за класс урона, пройдите контент со спутником-танком.",
    "Hasar sınıfıyla Tank yoldaş kullanarak içerik tamamla."
  ],
  "Clear Companion Trials with one Standard, one Rare and one Elite/Prestige.": [
    "Bestehe Begleiterprüfungen mit je einem Standard-, Seltenen und Elite-/Prestige-Begleiter.",
    "Supera Pruebas con un compañero estándar, uno raro y uno élite/prestigio.",
    "Voltooi metgezelproeven met één standaard-, zeldzame en elite-/prestigemetgezel.",
    "Supera le Prove con un compagno standard, uno raro e uno élite/prestigio.",
    "Terminez des Épreuves avec un compagnon standard, rare et élite/prestige.",
    "Пройдите Испытания со спутниками обычной, редкой и элитной/престижной редкости.",
    "Yoldaş Denemelerini bir Standart, bir Nadir ve bir Elit/Prestij yoldaşla tamamla."
  ],
  "Clear Floor 10+ with Standard, Rare and Elite/Prestige represented.": [
    "Bestehe Ebene 10+ mit Standard, Selten und Elite/Prestige im Team.",
    "Supera el piso 10+ con estándar, raro y élite/prestigio en el equipo.",
    "Voltooi verdieping 10+ met standaard, zeldzaam en elite/prestige in het team.",
    "Supera il piano 10+ con standard, raro ed élite/prestigio in squadra.",
    "Terminez l'étage 10+ avec standard, rare et élite/prestige dans l'équipe.",
    "Пройдите этаж 10+ с обычным, редким и элитным/престижным спутниками.",
    "10+ katı Standart, Nadir ve Elit/Prestij yoldaşlardan oluşan takımla tamamla."
  ],
  "Clear Floor 10+ with at least one Primal and one Wild companion.": [
    "Bestehe Ebene 10+ mit mindestens einem Urzeit- und einem Wildnis-Begleiter.",
    "Supera el piso 10+ con al menos un compañero primordial y uno salvaje.",
    "Voltooi verdieping 10+ met minimaal één oer- en één wilde metgezel.",
    "Supera il piano 10+ con almeno un compagno primordiale e uno selvaggio.",
    "Terminez l'étage 10+ avec un compagnon primordial et un sauvage.",
    "Пройдите этаж 10+ с хотя бы одним первозданным и одним диким спутником.",
    "10+ katı en az bir İlkel ve bir Vahşi yoldaşla tamamla."
  ],
  "Clear Floor 10+ with at least two Ashlands companions.": [
    "Bestehe Ebene 10+ mit mindestens zwei Begleitern aus Ashlands.",
    "Supera el piso 10+ con al menos dos compañeros de Ashlands.",
    "Voltooi verdieping 10+ met minimaal twee metgezellen uit Ashlands.",
    "Supera il piano 10+ con almeno due compagni di Ashlands.",
    "Terminez l'étage 10+ avec au moins deux compagnons d'Ashlands.",
    "Пройдите этаж 10+ с хотя бы двумя спутниками из Ashlands.",
    "10+ katı en az iki Ashlands yoldaşıyla tamamla."
  ],
  "Clear Floor 10+ with at least two Frostmarch companions.": [
    "Bestehe Ebene 10+ mit mindestens zwei Begleitern aus Frostmarch.",
    "Supera el piso 10+ con al menos dos compañeros de Frostmarch.",
    "Voltooi verdieping 10+ met minimaal twee metgezellen uit Frostmarch.",
    "Supera il piano 10+ con almeno due compagni di Frostmarch.",
    "Terminez l'étage 10+ avec au moins deux compagnons de Frostmarch.",
    "Пройдите этаж 10+ с хотя бы двумя спутниками из Frostmarch.",
    "10+ katı en az iki Frostmarch yoldaşıyla tamamla."
  ],
  "Clear Floor 10+ with at least two Sunscar companions.": [
    "Bestehe Ebene 10+ mit mindestens zwei Begleitern aus Sunscar.",
    "Supera el piso 10+ con al menos dos compañeros de Sunscar.",
    "Voltooi verdieping 10+ met minimaal twee metgezellen uit Sunscar.",
    "Supera il piano 10+ con almeno due compagni di Sunscar.",
    "Terminez l'étage 10+ avec au moins deux compagnons de Sunscar.",
    "Пройдите этаж 10+ с хотя бы двумя спутниками из Sunscar.",
    "10+ katı en az iki Sunscar yoldaşıyla tamamla."
  ],
  "Clear Floor 10+ with companions from three different origins.": [
    "Bestehe Ebene 10+ mit Begleitern aus drei verschiedenen Herkunftsregionen.",
    "Supera el piso 10+ con compañeros de tres orígenes distintos.",
    "Voltooi verdieping 10+ met metgezellen uit drie verschillende regio's.",
    "Supera il piano 10+ con compagni di tre origini diverse.",
    "Terminez l'étage 10+ avec des compagnons de trois origines différentes.",
    "Пройдите этаж 10+ со спутниками из трёх разных регионов.",
    "10+ katı üç farklı kökenden gelen yoldaşlarla tamamla."
  ],
  "Clear Floor 10+ with three different Companion Affinities.": [
    "Bestehe Ebene 10+ mit drei verschiedenen Begleiter-Affinitäten.",
    "Supera el piso 10+ con tres afinidades de compañero distintas.",
    "Voltooi verdieping 10+ met drie verschillende metgezel-affiniteiten.",
    "Supera il piano 10+ con tre affinità dei compagni diverse.",
    "Terminez l'étage 10+ avec trois affinités de compagnon différentes.",
    "Пройдите этаж 10+ со спутниками трёх разных стихийных связей.",
    "10+ katı üç farklı yoldaş yakınlığıyla tamamla."
  ],
  "Clear Floor 10+ with two Asterfall companions.": [
    "Bestehe Ebene 10+ mit zwei Begleitern aus Asterfall.",
    "Supera el piso 10+ con dos compañeros de Asterfall.",
    "Voltooi verdieping 10+ met twee metgezellen uit Asterfall.",
    "Supera il piano 10+ con due compagni di Asterfall.",
    "Terminez l'étage 10+ avec deux compagnons d'Asterfall.",
    "Пройдите этаж 10+ с двумя спутниками из Asterfall.",
    "10+ katı iki Asterfall yoldaşıyla tamamla."
  ],
  "Clear Floor 15 with no Prestige companion.": [
    "Bestehe Ebene 15 ohne Prestige-Begleiter.",
    "Supera el piso 15 sin compañeros de prestigio.",
    "Voltooi verdieping 15 zonder prestigemetgezel.",
    "Supera il piano 15 senza compagni prestigio.",
    "Terminez l'étage 15 sans compagnon prestige.",
    "Пройдите этаж 15 без престижных спутников.",
    "15. katı Prestij yoldaş olmadan tamamla."
  ],
  "Clear Floor 15+ with at least one Radiant and one Umbral companion.": [
    "Bestehe Ebene 15+ mit mindestens einem Licht- und einem Schatten-Begleiter.",
    "Supera el piso 15+ con al menos un compañero radiante y uno umbrío.",
    "Voltooi verdieping 15+ met minimaal één stralende en één schaduwmetgezel.",
    "Supera il piano 15+ con almeno un compagno radiante e uno d'ombra.",
    "Terminez l'étage 15+ avec au moins un compagnon radieux et un ombral.",
    "Пройдите этаж 15+ с хотя бы одним лучезарным и одним теневым спутником.",
    "15+ katı en az bir Işıltılı ve bir Gölgeli yoldaşla tamamla."
  ],
  "Clear Floor 15+ without a Construct companion.": [
    "Bestehe Ebene 15+ ohne Konstrukt-Begleiter.",
    "Supera el piso 15+ sin compañeros constructo.",
    "Voltooi verdieping 15+ zonder constructmetgezel.",
    "Supera il piano 15+ senza compagni costrutto.",
    "Terminez l'étage 15+ sans compagnon artificiel.",
    "Пройдите этаж 15+ без спутников-конструктов.",
    "15+ katı Yapı türü yoldaş olmadan tamamla."
  ],
  "Clear Floor 15+ without any companion being defeated.": [
    "Bestehe Ebene 15+, ohne einen Begleiter zu verlieren.",
    "Supera el piso 15+ sin que derroten a ningún compañero.",
    "Voltooi verdieping 15+ zonder dat een metgezel wordt verslagen.",
    "Supera il piano 15+ senza che alcun compagno venga sconfitto.",
    "Terminez l'étage 15+ sans perdre de compagnon.",
    "Пройдите этаж 15+ без поражения ни одного спутника.",
    "15+ katı hiçbir yoldaş yenilmeden tamamla."
  ],
  "Clear Floor 20+ with Team Power at or below 3,600.": [
    "Bestehe Ebene 20+ mit Teamstärke von höchstens 3.600.",
    "Supera el piso 20+ con poder de equipo de 3600 o menos.",
    "Voltooi verdieping 20+ met teamkracht van maximaal 3.600.",
    "Supera il piano 20+ con potenza squadra pari o inferiore a 3.600.",
    "Terminez l'étage 20+ avec une puissance d'équipe de 3 600 au maximum.",
    "Пройдите этаж 20+ с силой команды не выше 3600.",
    "20+ katı 3.600 veya altı takım gücüyle tamamla."
  ],
  "Clear a Companion Trial boss with at least two Companions from the same origin.": [
    "Besiege einen Prüfungsboss mit mindestens zwei Begleitern derselben Herkunft.",
    "Derrota a un jefe de Pruebas con al menos dos compañeros del mismo origen.",
    "Versla een proefbaas met minimaal twee metgezellen uit dezelfde regio.",
    "Sconfiggi un boss delle Prove con almeno due compagni della stessa origine.",
    "Battez un boss d'Épreuve avec deux compagnons de même origine au minimum.",
    "Победите босса Испытаний с хотя бы двумя спутниками из одного региона.",
    "Bir Deneme patronunu aynı kökenden en az iki yoldaşla yen."
  ],
  "Clear a Companion Trial floor below its recommended Companion Team Power.": [
    "Bestehe eine Prüfungsebene mit weniger Teamstärke als empfohlen.",
    "Supera un piso de Pruebas con menos poder de equipo del recomendado.",
    "Voltooi een proefverdieping met minder teamkracht dan aanbevolen.",
    "Supera un piano delle Prove con potenza squadra inferiore a quella consigliata.",
    "Terminez un étage d'Épreuve avec une puissance d'équipe inférieure au conseil.",
    "Пройдите этаж Испытаний с силой команды ниже рекомендуемой.",
    "Bir Deneme katını önerilen takım gücünün altında tamamla."
  ],
  "Clear a boss using at least one Standard companion.": [
    "Besiege einen Boss mit mindestens einem Standard-Begleiter.",
    "Derrota a un jefe con al menos un compañero estándar.",
    "Versla een baas met minimaal één standaardmetgezel.",
    "Sconfiggi un boss con almeno un compagno standard.",
    "Battez un boss avec au moins un compagnon standard.",
    "Победите босса с хотя бы одним обычным спутником.",
    "Bir patronu en az bir Standart yoldaşla yen."
  ],
  "Complete 25 battles using a Standard Companion.": [
    "Bestreite 25 Kämpfe mit einem Standard-Begleiter.",
    "Completa 25 combates con un compañero estándar.",
    "Voltooi 25 gevechten met een standaardmetgezel.",
    "Completa 25 battaglie con un compagno standard.",
    "Terminez 25 combats avec un compagnon standard.",
    "Завершите 25 боёв с обычным спутником.",
    "Standart yoldaşla 25 savaş tamamla."
  ],
  "Complete Sunscar story progression.": [
    "Schließe den Sunscar-Storyfortschritt ab.",
    "Completa la historia de Sunscar.",
    "Voltooi de verhaallijn van Sunscar.",
    "Completa la storia di Sunscar.",
    "Terminez l'histoire de Sunscar.",
    "Завершите сюжетную линию Sunscar.",
    "Sunscar hikâyesini tamamla."
  ],
  "Complete a Dungeon using a Companion with Bond Level 8+.": [
    "Schließe einen Dungeon mit einem Begleiter auf Bindungsstufe 8+ ab.",
    "Completa una mazmorra con un compañero de vínculo 8+.",
    "Voltooi een kerker met een metgezel met bandniveau 8+.",
    "Completa un dungeon con un compagno di legame 8+.",
    "Terminez un donjon avec un compagnon de lien de niveau 8+.",
    "Пройдите подземелье со спутником с уровнем связи 8+.",
    "Bağ seviyesi 8+ olan bir yoldaşla zindan tamamla."
  ],
  "Defeat a boss while using a Rare-or-lower Combat Companion.": [
    "Besiege einen Boss mit einem seltenen oder gewöhnlichen Kampfgefährten.",
    "Derrota a un jefe con un compañero de combate raro o inferior.",
    "Versla een baas met een zeldzame of gewone gevechtsmetgezel.",
    "Sconfiggi un boss con un compagno da combattimento raro o inferiore.",
    "Battez un boss avec un compagnon de combat rare ou inférieur.",
    "Победите босса с боевым спутником редкой редкости или ниже.",
    "Nadir veya daha düşük nadirlikte savaş yoldaşıyla patron yen."
  ],
  "Defeat the Fallen Knight 10 times.": [
    "Besiege den Fallen Knight 10-mal.",
    "Derrota al Fallen Knight 10 veces.",
    "Versla de Fallen Knight 10 keer.",
    "Sconfiggi il Fallen Knight 10 volte.",
    "Battez le Fallen Knight 10 fois.",
    "Победите Fallen Knight 10 раз.",
    "Fallen Knight'ı 10 kez yen."
  ],
  "Defeat the Sunscar regional boss 15 times.": [
    "Besiege den Regionalboss von Sunscar 15-mal.",
    "Derrota al jefe regional de Sunscar 15 veces.",
    "Versla de regiobaas van Sunscar 15 keer.",
    "Sconfiggi il boss regionale di Sunscar 15 volte.",
    "Battez le boss régional de Sunscar 15 fois.",
    "Победите регионального босса Sunscar 15 раз.",
    "Sunscar bölge patronunu 15 kez yen."
  ],
  "Fully Master 3 Combat Companions.": [
    "Meistere 3 Kampfgefährten vollständig.",
    "Domina por completo a 3 compañeros de combate.",
    "Beheers 3 gevechtsmetgezellen volledig.",
    "Ottieni la maestria completa con 3 compagni da combattimento.",
    "Maîtrisez entièrement 3 compagnons de combat.",
    "Полностью освойте 3 боевых спутников.",
    "3 savaş yoldaşında tam ustalığa ulaş."
  ],
  "Fully Master 8 Combat Companions.": [
    "Meistere 8 Kampfgefährten vollständig.",
    "Domina por completo a 8 compañeros de combate.",
    "Beheers 8 gevechtsmetgezellen volledig.",
    "Ottieni la maestria completa con 8 compagni da combattimento.",
    "Maîtrisez entièrement 8 compagnons de combat.",
    "Полностью освойте 8 боевых спутников.",
    "8 savaş yoldaşında tam ustalığa ulaş."
  ],
  "Low-rarity mentorship: +25% Companion XP with an all-Standard bonus team.": [
    "Mentorbonus niedriger Seltenheit: +25 % Begleiter-EP mit reinem Standard-Bonusteam.",
    "Mentoría de baja rareza: +25 % EXP de compañero con equipo de bonificación estándar.",
    "Begeleiding lage zeldzaamheid: +25% metgezel-EP met een volledig standaard bonusteam.",
    "Mentore rarità bassa: +25% PE compagno con squadra bonus tutta standard.",
    "Mentorat de faible rareté : +25 % d'EXP compagnon avec une équipe bonus standard.",
    "Наставничество обычных: +25% опыта спутников с командой только из обычных.",
    "Düşük nadirlik rehberliği: Tamamen Standart bonus takımla +%25 yoldaş TP."
  ],
  "Mentorship: +15% Companion XP with the bonus team.": [
    "Mentorbonus: +15 % Begleiter-EP mit dem Bonusteam.",
    "Mentoría: +15 % EXP de compañero con el equipo de bonificación.",
    "Begeleiding: +15% metgezel-EP met het bonusteam.",
    "Mentore: +15% PE compagno con la squadra bonus.",
    "Mentorat : +15 % d'EXP compagnon avec l'équipe bonus.",
    "Наставничество: +15% опыта спутников с бонусной командой.",
    "Rehberlik: Bonus takımla +%15 yoldaş TP."
  ],
  "Prestige mentorship: +20% Companion XP and +10% Essence when a Prestige companion joins.": [
    "Prestige-Mentorbonus: +20 % Begleiter-EP und +10 % Essenz mit Prestige-Begleiter.",
    "Mentoría prestigio: +20 % EXP de compañero y +10 % esencia con un compañero prestigio.",
    "Prestigebegeleiding: +20% metgezel-EP en +10% essentie met een prestigemetgezel.",
    "Mentore prestigio: +20% PE compagno e +10% Essenza con un compagno prestigio.",
    "Mentorat prestige : +20 % d'EXP compagnon et +10 % d'essence avec un compagnon prestige.",
    "Престижное наставничество: +20% опыта спутников и +10% эссенции с престижным спутником.",
    "Prestij rehberliği: Prestij yoldaş katıldığında +%20 yoldaş TP ve +%10 Öz."
  ],
  "Reach 18 total Bond across Asterfall companions.": [
    "Erreiche insgesamt 18 Bindungsstufen mit Asterfall-Begleitern.",
    "Alcanza 18 niveles de vínculo sumados entre compañeros de Asterfall.",
    "Bereik samen bandniveau 18 met Asterfall-metgezellen.",
    "Raggiungi 18 livelli di legame totali con i compagni di Asterfall.",
    "Atteignez 18 niveaux de lien cumulés avec les compagnons d'Asterfall.",
    "Достигните суммарного уровня связи 18 у спутников Asterfall.",
    "Asterfall yoldaşlarında toplam 18 Bağ seviyesine ulaş."
  ],
  "Reach 18 total Bond across Frostmarch companions.": [
    "Erreiche insgesamt 18 Bindungsstufen mit Frostmarch-Begleitern.",
    "Alcanza 18 niveles de vínculo sumados entre compañeros de Frostmarch.",
    "Bereik samen bandniveau 18 met Frostmarch-metgezellen.",
    "Raggiungi 18 livelli di legame totali con i compagni di Frostmarch.",
    "Atteignez 18 niveaux de lien cumulés avec les compagnons de Frostmarch.",
    "Достигните суммарного уровня связи 18 у спутников Frostmarch.",
    "Frostmarch yoldaşlarında toplam 18 Bağ seviyesine ulaş."
  ],
  "Reach 18 total Bond across Sunscar companions.": [
    "Erreiche insgesamt 18 Bindungsstufen mit Sunscar-Begleitern.",
    "Alcanza 18 niveles de vínculo sumados entre compañeros de Sunscar.",
    "Bereik samen bandniveau 18 met Sunscar-metgezellen.",
    "Raggiungi 18 livelli di legame totali con i compagni di Sunscar.",
    "Atteignez 18 niveaux de lien cumulés avec les compagnons de Sunscar.",
    "Достигните суммарного уровня связи 18 у спутников Sunscar.",
    "Sunscar yoldaşlarında toplam 18 Bağ seviyesine ulaş."
  ],
  "Reach 21 total Bond across Ashlands companions.": [
    "Erreiche insgesamt 21 Bindungsstufen mit Ashlands-Begleitern.",
    "Alcanza 21 niveles de vínculo sumados entre compañeros de Ashlands.",
    "Bereik samen bandniveau 21 met Ashlands-metgezellen.",
    "Raggiungi 21 livelli di legame totali con i compagni di Ashlands.",
    "Atteignez 21 niveaux de lien cumulés avec les compagnons d'Ashlands.",
    "Достигните суммарного уровня связи 21 у спутников Ashlands.",
    "Ashlands yoldaşlarında toplam 21 Bağ seviyesine ulaş."
  ],
  "Reach Bond 10 with 12 Combat Companions.": [
    "Erreiche Bindung 10 mit 12 Kampfgefährten.",
    "Alcanza vínculo 10 con 12 compañeros de combate.",
    "Bereik band 10 met 12 gevechtsmetgezellen.",
    "Raggiungi Legame 10 con 12 compagni da combattimento.",
    "Atteignez le lien 10 avec 12 compagnons de combat.",
    "Достигните связи 10 у 12 боевых спутников.",
    "12 savaş yoldaşıyla Bağ 10'a ulaş."
  ],
  "Reach Bond 10 with 5 Combat Companions.": [
    "Erreiche Bindung 10 mit 5 Kampfgefährten.",
    "Alcanza vínculo 10 con 5 compañeros de combate.",
    "Bereik band 10 met 5 gevechtsmetgezellen.",
    "Raggiungi Legame 10 con 5 compagni da combattimento.",
    "Atteignez le lien 10 avec 5 compagnons de combat.",
    "Достигните связи 10 у 5 боевых спутников.",
    "5 savaş yoldaşıyla Bağ 10'a ulaş."
  ],
  "Reach Companion Trial Floor 20.": [
    "Erreiche Ebene 20 der Begleiterprüfung.",
    "Alcanza el piso 20 de las Pruebas de compañero.",
    "Bereik verdieping 20 van de metgezelproeven.",
    "Raggiungi il piano 20 delle Prove compagni.",
    "Atteignez l'étage 20 des Épreuves de compagnon.",
    "Достигните этажа 20 Испытаний спутников.",
    "Yoldaş Denemelerinde 20. kata ulaş."
  ],
  "Reach Companion Trial Floor 25.": [
    "Erreiche Ebene 25 der Begleiterprüfung.",
    "Alcanza el piso 25 de las Pruebas de compañero.",
    "Bereik verdieping 25 van de metgezelproeven.",
    "Raggiungi il piano 25 delle Prove compagni.",
    "Atteignez l'étage 25 des Épreuves de compagnon.",
    "Достигните этажа 25 Испытаний спутников.",
    "Yoldaş Denemelerinde 25. kata ulaş."
  ],
  "Reach Companion Trial Floor 30.": [
    "Erreiche Ebene 30 der Begleiterprüfung.",
    "Alcanza el piso 30 de las Pruebas de compañero.",
    "Bereik verdieping 30 van de metgezelproeven.",
    "Raggiungi il piano 30 delle Prove compagni.",
    "Atteignez l'étage 30 des Épreuves de compagnon.",
    "Достигните этажа 30 Испытаний спутников.",
    "Yoldaş Denemelerinde 30. kata ulaş."
  ],
  "Relic recovery: +25% base material yield with the regional bonus team.": [
    "Reliktbergung: +25 % Grundmaterialausbeute mit dem regionalen Bonusteam.",
    "Recuperación de reliquias: +25 % de materiales base con el equipo de bonificación regional.",
    "Relieken bergen: +25% basismaterialen met het regionale bonusteam.",
    "Recupero reliquie: +25% materiali base con la squadra bonus regionale.",
    "Récupération de reliques : +25 % de matériaux de base avec l'équipe bonus régionale.",
    "Поиск реликвий: +25% базовых материалов с региональной бонусной командой.",
    "Kalıntı toplama: Bölgesel bonus takımla +%25 temel malzeme verimi."
  ],
  "Resonant bonding: +30% Bond XP with the regional bonus team.": [
    "Resonanzbindung: +30 % Bindungs-EP mit dem regionalen Bonusteam.",
    "Vínculo resonante: +30 % EXP de vínculo con el equipo de bonificación regional.",
    "Resonante band: +30% band-EP met het regionale bonusteam.",
    "Legame risonante: +30% PE legame con la squadra bonus regionale.",
    "Lien résonant : +30 % d'EXP de lien avec l'équipe bonus régionale.",
    "Резонансная связь: +30% опыта связи с региональной бонусной командой.",
    "Yankılı bağ: Bölgesel bonus takımla +%30 Bağ TP."
  ],
  "Salvage expertise: +30% base material yield with the regional bonus team.": [
    "Bergungskunde: +30 % Grundmaterialausbeute mit dem regionalen Bonusteam.",
    "Pericia de recuperación: +30 % de materiales base con el equipo de bonificación regional.",
    "Bergingskunde: +30% basismaterialen met het regionale bonusteam.",
    "Maestria nel recupero: +30% materiali base con la squadra bonus regionale.",
    "Expertise de récupération : +30 % de matériaux de base avec l'équipe bonus régionale.",
    "Мастерство добычи: +30% базовых материалов с региональной бонусной командой.",
    "Kurtarma uzmanlığı: Bölgesel bonus takımla +%30 temel malzeme verimi."
  ],
  "Veteran bond: +35% Bond XP when the full Asterfall Standard trio qualifies.": [
    "Veteranenbindung: +35 % Bindungs-EP, wenn das vollständige Asterfall-Standardtrio zählt.",
    "Vínculo veterano: +35 % EXP de vínculo si cumple el trío estándar de Asterfall.",
    "Veteranenband: +35% band-EP wanneer het volledige standaardtrio uit Asterfall voldoet.",
    "Legame veterano: +35% PE legame se si qualifica il trio standard di Asterfall.",
    "Lien vétéran : +35 % d'EXP de lien si le trio standard d'Asterfall est admissible.",
    "Связь ветеранов: +35% опыта связи, если подходит вся обычная тройка Asterfall.",
    "Kıdemli bağ: Asterfall'ın üç Standart yoldaşı şartları sağladığında +%35 Bağ TP."
  ]
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string]>;

const languageIndex:Partial<Record<Language,number>>={de:0,es:1,nl:2,it:3,fr:4,ru:5,tr:6};
export function companionObjectiveText(language:Language,source:string):string|undefined{
 const row=Object.prototype.hasOwnProperty.call(companionObjectiveRows,source)
  ? companionObjectiveRows[source as keyof typeof companionObjectiveRows]:undefined;
 if(!row)return undefined;
 const index=languageIndex[language];
 return index===undefined?source:row[index];
}
