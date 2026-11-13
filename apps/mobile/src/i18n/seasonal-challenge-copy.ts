import type {Language} from './languages';
import {SUPPORTED_LANGUAGES} from './languages';
import type {SeasonalQuest} from '../core/seasonal-quests';
import {interpolateTranslation,type TranslationParams} from './translator';

/** Authored challenge names, rarity/cache labels and exact objective templates.
 * Unknown server/custom text stays unchanged. DE/ES/NL/IT/FR/RU/TR columns. */
type SevenLanguages=readonly [string,string,string,string,string,string,string];
export const seasonalChallengeRows={
  "Kitchen Duties": ["Küchenaufträge","Encargos de cocina","Keukenopdrachten","Incarichi di cucina","Tâches de cuisine","Кухонные поручения","Mutfak Görevleri"],
  "Alchemist Orders": ["Alchemistenaufträge","Encargos de alquimia","Alchemieopdrachten","Ordini alchemici","Commandes d'alchimie","Заказы алхимика","Simya Siparişleri"],
  "Forge Work": ["Schmiedearbeit","Trabajo de forja","Smeedwerk","Lavori di forgia","Travail de forge","Кузнечные работы","Demirci İşleri"],
  "Tailoring Commission": ["Schneiderauftrag","Encargo de sastrería","Kleermakersopdracht","Commissione di sartoria","Commande de couture","Заказ портного","Terzilik Siparişi"],
  "Enchanter Practice": ["Verzauberungsübung","Práctica de encantamiento","Betoveringsoefening","Esercizio di incantamento","Pratique d'enchantement","Практика зачарования","Büyüleme Çalışması"],
  "Boss Hunt": ["Bossjagd","Caza de jefes","Bazenjacht","Caccia ai boss","Chasse aux boss","Охота на боссов","Boss Avı"],
  "Salvage Workshop": ["Wiederverwertungswerkstatt","Taller de reciclaje","Ontmantelwerkplaats","Laboratorio di recupero","Atelier de récupération","Мастерская разборки","Söküm Atölyesi"],
  "Equipment Improvements": ["Ausrüstungsverbesserungen","Mejoras de equipo","Uitrustingsverbeteringen","Miglioramenti dell'equipaggiamento","Améliorations d'équipement","Улучшения снаряжения","Ekipman İyileştirmeleri"],
  "Masterwork Commission": ["Meisterwerkauftrag","Encargo de obra maestra","Meesterwerkopdracht","Commissione da maestro","Commande de maître","Заказ на шедевр","Ustalık Siparişi"],
  "Companion Expeditions": ["Gefährtenexpeditionen","Expediciones de compañeros","Metgezelexpedities","Spedizioni dei compagni","Expéditions des compagnons","Экспедиции спутников","Yoldaş Seferleri"],
  "Trial Victories": ["Prüfungssiege","Victorias en pruebas","Proefoverwinningen","Vittorie nelle prove","Victoires aux épreuves","Победы в испытаниях","Deneme Zaferleri"],
  "Complete {n} Cooking recipes this period.": ["Schließe in diesem Zeitraum {n} Kochrezepte ab.","Completa {n} recetas de cocina durante este período.","Voltooi in deze periode {n} kookrecepten.","Completa {n} ricette di cucina in questo periodo.","Réalisez {n} recettes de cuisine pendant cette période.","Приготовьте {n} блюд за этот период.","Bu dönemde {n} yemek tarifi tamamla."],
  "Complete {n} Alchemy recipes this period.": ["Schließe in diesem Zeitraum {n} Alchemierezepte ab.","Completa {n} recetas de alquimia durante este período.","Voltooi in deze periode {n} alchemierecepten.","Completa {n} ricette di alchimia in questo periodo.","Réalisez {n} recettes d'alchimie pendant cette période.","Создайте {n} алхимических составов за этот период.","Bu dönemde {n} simya tarifi tamamla."],
  "Complete {n} Smithing recipes this period.": ["Schließe in diesem Zeitraum {n} Schmiederezepte ab.","Completa {n} recetas de herrería durante este período.","Voltooi in deze periode {n} smeedrecepten.","Completa {n} ricette di forgiatura in questo periodo.","Réalisez {n} recettes de forge pendant cette période.","Выполните {n} кузнечных рецептов за этот период.","Bu dönemde {n} demircilik tarifi tamamla."],
  "Complete {n} Tailoring recipes this period.": ["Schließe in diesem Zeitraum {n} Schneiderrezepte ab.","Completa {n} recetas de sastrería durante este período.","Voltooi in deze periode {n} kleermakersrecepten.","Completa {n} ricette di sartoria in questo periodo.","Réalisez {n} recettes de couture pendant cette période.","Выполните {n} портновских рецептов за этот период.","Bu dönemde {n} terzilik tarifi tamamla."],
  "Complete {n} Enchanting recipes this period.": ["Schließe in diesem Zeitraum {n} Verzauberungsrezepte ab.","Completa {n} recetas de encantamiento durante este período.","Voltooi in deze periode {n} betoveringsrecepten.","Completa {n} ricette di incantamento in questo periodo.","Réalisez {n} recettes d'enchantement pendant cette période.","Выполните {n} рецептов зачарования за этот период.","Bu dönemde {n} büyüleme tarifi tamamla."],
  "Defeat {n} bosses this period.": ["Besiege in diesem Zeitraum {n} Bosse.","Derrota a {n} jefes durante este período.","Versla in deze periode {n} bazen.","Sconfiggi {n} boss in questo periodo.","Vainquez {n} boss pendant cette période.","Победите {n} боссов за этот период.","Bu dönemde {n} boss yen."],
  "Salvage {n} equipment items this period.": ["Zerlege in diesem Zeitraum {n} Ausrüstungsgegenstände.","Desmantela {n} piezas de equipo durante este período.","Ontmantel in deze periode {n} uitrustingsstukken.","Smantella {n} pezzi di equipaggiamento in questo periodo.","Démontez {n} pièces d'équipement pendant cette période.","Разберите {n} предметов снаряжения за этот период.","Bu dönemde {n} ekipman parçasını sök."],
  "Successfully upgrade equipment {n} times this period.": ["Verbessere in diesem Zeitraum {n}-mal erfolgreich Ausrüstung.","Mejora equipo con éxito {n} veces durante este período.","Verbeter in deze periode {n} keer succesvol uitrusting.","Migliora con successo l'equipaggiamento {n} volte in questo periodo.","Améliorez l'équipement {n} fois avec succès pendant cette période.","Успешно улучшите снаряжение {n} раз за этот период.","Bu dönemde ekipmanı {n} kez başarıyla yükselt."],
  "Craft {n} Tier 3 or higher equipment pieces this period.": ["Stelle in diesem Zeitraum {n} Ausrüstungsteile der Stufe 3 oder höher her.","Fabrica {n} piezas de equipo de nivel 3 o superior durante este período.","Maak in deze periode {n} uitrustingsstukken van tier 3 of hoger.","Crea {n} pezzi di equipaggiamento di grado 3 o superiore in questo periodo.","Fabriquez {n} équipements de palier 3 ou supérieur pendant cette période.","Создайте {n} предметов снаряжения тира 3 или выше за этот период.","Bu dönemde 3. kademe veya üstü {n} ekipman üret."],
  "Claim {n} completed companion expeditions this period.": ["Hole in diesem Zeitraum {n} abgeschlossene Gefährtenexpeditionen ab.","Reclama {n} expediciones de compañeros completadas durante este período.","Claim in deze periode {n} voltooide metgezelexpedities.","Riscatta {n} spedizioni dei compagni completate in questo periodo.","Récupérez {n} expéditions de compagnons terminées pendant cette période.","Заберите награды за {n} завершённых экспедиций спутников.","Bu dönemde tamamlanan {n} yoldaş seferinin ödülünü al."],
  "Win {n} Companion Trial floors this period.": ["Gewinne in diesem Zeitraum {n} Ebenen der Gefährtenprüfung.","Gana {n} pisos de pruebas de compañeros durante este período.","Win in deze periode {n} verdiepingen van metgezelproeven.","Vinci {n} piani delle prove dei compagni in questo periodo.","Remportez {n} étages des épreuves des compagnons pendant cette période.","Победите на {n} этажах испытаний спутников за этот период.","Bu dönemde Yoldaş Denemelerinde {n} kat kazan."],
  "COOKING": ["KOCHEN","COCINA","KOKEN","CUCINA","CUISINE","КУЛИНАРИЯ","YEMEK"],
  "ALCHEMY": ["ALCHEMIE","ALQUIMIA","ALCHEMIE","ALCHIMIA","ALCHIMIE","АЛХИМИЯ","SİMYA"],
  "SMITHING": ["SCHMIEDEN","HERRERÍA","SMEDEN","FORGIATURA","FORGE","КУЗНЕЧНОЕ ДЕЛО","DEMİRCİLİK"],
  "TAILORING": ["SCHNEIDEREI","SASTRERÍA","KLEERMAKERIJ","SARTORIA","COUTURE","ПОРТНОЕ ДЕЛО","TERZİLİK"],
  "ENCHANTING": ["VERZAUBERN","ENCANTAMIENTO","BETOVEREN","INCANTAMENTO","ENCHANTEMENT","ЗАЧАРОВАНИЕ","BÜYÜLEME"],
  "SALVAGE": ["ZERLEGEN","DESMANTELAR","ONTMANTELEN","SMANTELLARE","DÉMONTAGE","РАЗБОРКА","SÖKÜM"],
  "UPGRADE": ["VERBESSERN","MEJORAR","VERBETEREN","MIGLIORARE","AMÉLIORATION","УЛУЧШЕНИЕ","YÜKSELTME"],
  "HIGH_TIER_CRAFT": ["MEISTERWERK","OBRA MAESTRA","MEESTERWERK","LAVORO MAESTRO","OUVRAGE DE MAÎTRE","МАСТЕРСКАЯ РАБОТА","USTALIK ÜRETİMİ"],
  "EXPEDITION": ["EXPEDITION","EXPEDICIÓN","EXPEDITIE","SPEDIZIONE","EXPÉDITION","ЭКСПЕДИЦИЯ","SEFER"],
  "TRIAL": ["PRÜFUNG","PRUEBA","PROEF","PROVA","ÉPREUVE","ИСПЫТАНИЕ","DENEME"],
  "Festival Service": ["Festdienst","Servicio del festival","Festivalwerk","Servizio del festival","Service du festival","Служба на празднике","Festival Hizmeti"],
  "Claim {n} completed event objective this period.": ["Hole in diesem Zeitraum {n} abgeschlossene Eventaufgabe ab.","Reclama {n} objetivo de evento completado durante este período.","Claim in deze periode {n} voltooid evenementdoel.","Riscatta {n} obiettivo evento completato in questo periodo.","Récupérez {n} objectif d'événement terminé pendant cette période.","Заберите награду за {n} выполненное задание события за этот период.","Bu dönemde tamamlanan {n} etkinlik hedefinin ödülünü al."],
  "EVENT": ["EVENT","EVENTO","EVENEMENT","EVENTO","ÉVÉNEMENT","СОБЫТИЕ","ETKİNLİK"],
  "Field Patrol": ["Feldpatrouille","Patrulla de campo","Veldpatrouille","Pattuglia sul campo","Patrouille de terrain","Полевой патруль","Saha Devriyesi"],
  "Gathering Run": ["Sammelrunde","Ruta de recolección","Verzamelronde","Giro di raccolta","Tournée de récolte","Сбор ресурсов","Toplama Turu"],
  "Crafting Orders": ["Handwerksaufträge","Encargos de fabricación","Productieopdrachten","Ordini di creazione","Commandes d'artisanat","Заказы на изготовление","Üretim Siparişleri"],
  "Trail Survey": ["Wegerkundung","Exploración de senderos","Padverkenning","Esplorazione dei sentieri","Reconnaissance des sentiers","Разведка троп","Patika Keşfi"],
  "Faith Practice": ["Glaubenspraxis","Práctica de fe","Geloofsoefening","Pratica della fede","Pratique de la foi","Практика веры","İnanç İbadeti"],
  "Complete {n} Faith practices this period.": ["Schließe in diesem Zeitraum {n} Glaubensübungen ab.","Completa {n} prácticas de fe durante este período.","Voltooi in deze periode {n} geloofsoefeningen.","Completa {n} pratiche di fede durante questo periodo.","Effectuez {n} pratiques de foi pendant cette période.","Заверши {n} молитвенных практик за этот период.","Bu dönemde {n} inanç ibadeti tamamla."],
  "FAITH": ["GLAUBE","FE","GELOOF","FEDE","FOI","ВЕРА","İNANÇ"],
  "Hold the Line": [
    "Die Stellung halten",
    "Mantener la línea",
    "Houd de linie",
    "Tenere la linea",
    "Tenir la ligne",
    "Держать строй",
    "Hattı Koru"
  ],
  "Iron Ration": [
    "Eiserne Ration",
    "Ración de hierro",
    "IJzeren rantsoen",
    "Razione di ferro",
    "Ration de fer",
    "Железный паёк",
    "Demir Tayın"
  ],
  "Marching Vigil": [
    "Wache auf dem Marsch",
    "Vigilia en marcha",
    "Wacht tijdens de mars",
    "Veglia in marcia",
    "Veille en marche",
    "Походный дозор",
    "Yürüyüş Nöbeti"
  ],
  "Roadwarden Survey": [
    "Straßenwächter-Erkundung",
    "Exploración del guardián del camino",
    "Verkenning van de wegwachter",
    "Ricognizione del guardiano della strada",
    "Reconnaissance du garde-route",
    "Разведка дорожного стража",
    "Yol Muhafızı Keşfi"
  ],
  "Light the Way": [
    "Den Weg erleuchten",
    "Iluminar el camino",
    "Verlicht de weg",
    "Illuminare la via",
    "Éclairer la voie",
    "Осветить путь",
    "Yolu Aydınlat"
  ],
  "Mercy in Motion": [
    "Gnade in Bewegung",
    "Misericordia en marcha",
    "Genade in beweging",
    "Misericordia in movimento",
    "Miséricorde en marche",
    "Милосердие в движении",
    "Hareket Halinde Merhamet"
  ],
  "Dawn Patrol": [
    "Morgenpatrouille",
    "Patrulla del alba",
    "Dageraadpatrouille",
    "Pattuglia dell'alba",
    "Patrouille de l'aube",
    "Рассветный дозор",
    "Şafak Devriyesi"
  ],
  "Safe Passage": [
    "Sicherer Durchgang",
    "Paso seguro",
    "Veilige doorgang",
    "Passaggio sicuro",
    "Passage sûr",
    "Безопасный проход",
    "Güvenli Geçiş"
  ],
  "Predator’s Circuit": [
    "Jagdroute des Räubers",
    "Ruta del depredador",
    "Jachtroute van de rover",
    "Percorso del predatore",
    "Circuit du prédateur",
    "Путь хищника",
    "Avcının Rotası"
  ],
  "Edge of Mastery": [
    "An der Schwelle zur Meisterschaft",
    "Al borde de la maestría",
    "Op de grens van meesterschap",
    "Sul filo della maestria",
    "Au seuil de la maîtrise",
    "На грани мастерства",
    "Ustalığın Eşiğinde"
  ],
  "The Long Hunt": [
    "Die lange Jagd",
    "La larga cacería",
    "De lange jacht",
    "La lunga caccia",
    "La longue chasse",
    "Долгая охота",
    "Uzun Av"
  ],
  "Forward Scout": [
    "Vorhut-Erkundung",
    "Explorador de vanguardia",
    "Voorhoedeverkenner",
    "Ricognitore d'avanguardia",
    "Éclaireur d'avant-garde",
    "Разведчик авангарда",
    "Öncü Gözcü"
  ],
  "Steel Discipline": [
    "Stählerne Disziplin",
    "Disciplina de acero",
    "Stalen discipline",
    "Disciplina d'acciaio",
    "Discipline d'acier",
    "Стальная дисциплина",
    "Çelik Disiplini"
  ],
  "Unbroken Wall": [
    "Ungebrochene Mauer",
    "Muro inquebrantable",
    "Ongebroken muur",
    "Muro incrollabile",
    "Mur inébranlable",
    "Несокрушимая стена",
    "Yıkılmaz Duvar"
  ],
  "Chain of Command": [
    "Befehlskette",
    "Cadena de mando",
    "Bevelsketen",
    "Catena di comando",
    "Chaîne de commandement",
    "Цепь командования",
    "Komuta Zinciri"
  ],
  "Sunlamp Offering": [
    "Opfergabe der Sonnenlaterne",
    "Ofrenda de la lámpara solar",
    "Offer van de zonnelamp",
    "Offerta della lampada solare",
    "Offrande de la lampe solaire",
    "Дар солнечному светильнику",
    "Güneş Lambasına Sunu"
  ],
  "Cartographer’s Eye": [
    "Auge des Kartografen",
    "Ojo del cartógrafo",
    "Oog van de cartograaf",
    "Occhio del cartografo",
    "Œil du cartographe",
    "Глаз картографа",
    "Haritacının Gözü"
  ],
  "Break Their Line": [
    "Ihre Reihen durchbrechen",
    "Romper sus filas",
    "Doorbreek hun linie",
    "Spezzare le loro file",
    "Briser leurs rangs",
    "Прорвать их строй",
    "Saflarını Kır"
  ],
  "Runic Survey": [
    "Runen-Erkundung",
    "Reconocimiento rúnico",
    "Runenverkenning",
    "Ricognizione runica",
    "Reconnaissance runique",
    "Рунная разведка",
    "Rünik Keşif"
  ],
  "Steps Unseen": [
    "Unsichtbare Schritte",
    "Pasos invisibles",
    "Ongeziene stappen",
    "Passi invisibili",
    "Pas invisibles",
    "Незримые шаги",
    "Görünmeyen Adımlar"
  ],
  "Stone and Storm": [
    "Stein und Sturm",
    "Piedra y tormenta",
    "Steen en storm",
    "Pietra e tempesta",
    "Pierre et tempête",
    "Камень и буря",
    "Taş ve Fırtına"
  ],
  "Defeat {n} monsters this period.": [
    "Besiege in diesem Zeitraum {n} Monster.",
    "Derrota a {n} monstruos durante este período.",
    "Versla in deze periode {n} monsters.",
    "Sconfiggi {n} mostri in questo periodo.",
    "Vainquez {n} monstres pendant cette période.",
    "Победите {n} монстров за этот период.",
    "Bu dönemde {n} canavar yen."
  ],
  "Complete {n} gathering actions this period.": [
    "Schließe in diesem Zeitraum {n} Sammelaktionen ab.",
    "Completa {n} acciones de recolección durante este período.",
    "Voltooi in deze periode {n} verzamelacties.",
    "Completa {n} azioni di raccolta in questo periodo.",
    "Effectuez {n} actions de récolte pendant cette période.",
    "Выполните {n} действий по сбору за этот период.",
    "Bu dönemde {n} toplama işlemi tamamla."
  ],
  "Complete {n} crafts this period.": [
    "Stelle in diesem Zeitraum {n} Gegenstände her.",
    "Realiza {n} fabricaciones durante este período.",
    "Voltooi in deze periode {n} vervaardigingen.",
    "Completa {n} creazioni in questo periodo.",
    "Réalisez {n} fabrications pendant cette période.",
    "Создайте {n} предметов за этот период.",
    "Bu dönemde {n} üretim tamamla."
  ],
  "Complete {n} exploration route actions this period.": [
    "Schließe in diesem Zeitraum {n} Erkundungsaktionen ab.",
    "Completa {n} acciones de ruta de exploración durante este período.",
    "Voltooi in deze periode {n} verkenningsrouteacties.",
    "Completa {n} azioni sui percorsi di esplorazione in questo periodo.",
    "Effectuez {n} actions d'itinéraire d'exploration pendant cette période.",
    "Выполните {n} действий на маршрутах разведки за этот период.",
    "Bu dönemde {n} keşif rotası işlemi tamamla."
  ],
  "Field cache": [
    "Feldvorrat",
    "Alijo de campo",
    "Veldvoorraad",
    "Scorta da campo",
    "Cache de terrain",
    "Полевой тайник",
    "Arazi Zulası"
  ],
  "Explorer cache": [
    "Entdeckervorrat",
    "Alijo del explorador",
    "Verkennersvoorraad",
    "Scorta dell'esploratore",
    "Cache d'explorateur",
    "Тайник разведчика",
    "Kâşif Zulası"
  ],
  "Aster cache": [
    "Aster-Vorrat",
    "Alijo de Aster",
    "Astervoorraad",
    "Scorta di Aster",
    "Cache d'Aster",
    "Тайник Астера",
    "Aster Zulası"
  ],
  "Oathbound cache": [
    "Eidgebundener Vorrat",
    "Alijo de los juramentados",
    "Eedgebonden voorraad",
    "Scorta del giuramento",
    "Cache des assermentés",
    "Тайник клятвенных",
    "Yemine Bağlı Zula"
  ],
  "Crown cache": [
    "Kronenvorrat",
    "Alijo de la corona",
    "Kroonvoorraad",
    "Scorta della corona",
    "Cache de la couronne",
    "Королевский тайник",
    "Taç Zulası"
  ],
  "Common": [
    "Gewöhnlich",
    "Común",
    "Gewoon",
    "Comune",
    "Commun",
    "Обычный",
    "Yaygın"
  ],
  "Uncommon": [
    "Ungewöhnlich",
    "Poco común",
    "Ongewoon",
    "Non comune",
    "Peu commun",
    "Необычный",
    "Sıradışı"
  ],
  "Rare": [
    "Selten",
    "Raro",
    "Zeldzaam",
    "Raro",
    "Rare",
    "Редкий",
    "Nadir"
  ],
  "Epic": [
    "Episch",
    "Épico",
    "Episch",
    "Epico",
    "Épique",
    "Эпический",
    "Destansı"
  ],
  "Legendary": [
    "Legendär",
    "Legendario",
    "Legendarisch",
    "Leggendario",
    "Légendaire",
    "Легендарный",
    "Efsanevi"
  ],
  "COMBAT": [
    "KAMPF",
    "COMBATE",
    "GEVECHT",
    "COMBATTIMENTO",
    "COMBAT",
    "БОЙ",
    "SAVAŞ"
  ],
  "GATHERING": [
    "SAMMELN",
    "RECOLECCIÓN",
    "VERZAMELEN",
    "RACCOLTA",
    "RÉCOLTE",
    "СБОР",
    "TOPLAMA"
  ],
  "CRAFTING": [
    "HERSTELLUNG",
    "FABRICACIÓN",
    "VERVAARDIGEN",
    "CREAZIONE",
    "FABRICATION",
    "СОЗДАНИЕ",
    "ÜRETİM"
  ],
  "EXPLORATION": [
    "ERKUNDUNG",
    "EXPLORACIÓN",
    "VERKENNING",
    "ESPLORAZIONE",
    "EXPLORATION",
    "РАЗВЕДКА",
    "KEŞİF"
  ],
  "EQUIPMENT": [
    "AUSRÜSTUNG",
    "EQUIPO",
    "UITRUSTING",
    "EQUIPAGGIAMENTO",
    "ÉQUIPEMENT",
    "СНАРЯЖЕНИЕ",
    "EKİPMAN"
  ],
  "BOSS": [
    "BOSS",
    "JEFE",
    "BAAS",
    "BOSS",
    "BOSS",
    "БОСС",
    "BOSS"
  ],
  "CACHE CLAIMED": [
    "VORRAT ABGEHOLT",
    "ALIJO RECOGIDO",
    "VOORRAAD GECLAIMD",
    "SCORTA RISCATTATA",
    "CACHE RÉCUPÉRÉE",
    "ТАЙНИК ПОЛУЧЕН",
    "ZULA ALINDI"
  ]
} as const satisfies Record<string,SevenLanguages>;

export function seasonalChallengeText(language:Language,source:string,params:TranslationParams={}):string{
 const index=SUPPORTED_LANGUAGES.indexOf(language)-1;
 const row=Object.prototype.hasOwnProperty.call(seasonalChallengeRows,source)
  ?seasonalChallengeRows[source as keyof typeof seasonalChallengeRows]:undefined;
 return interpolateTranslation(index>=0&&row?row[index]:source,params);
}
export function seasonalChallengeName(language:Language,quest:Pick<SeasonalQuest,'name'>):string{
 return seasonalChallengeText(language,quest.name);
}
const objectiveTemplate:Partial<Record<SeasonalQuest['tag'],string>>={
 combat:'Defeat {n} monsters this period.',
 gathering:'Complete {n} gathering actions this period.',
 crafting:'Complete {n} crafts this period.',
 exploration:'Complete {n} exploration route actions this period.',
 faith:'Complete {n} Faith practices this period.',
 cooking:'Complete {n} Cooking recipes this period.',
 alchemy:'Complete {n} Alchemy recipes this period.',
 smithing:'Complete {n} Smithing recipes this period.',
 tailoring:'Complete {n} Tailoring recipes this period.',
 enchanting:'Complete {n} Enchanting recipes this period.',
 boss:'Defeat {n} bosses this period.',
 salvage:'Salvage {n} equipment items this period.',
 upgrade:'Successfully upgrade equipment {n} times this period.',
 high_tier_craft:'Craft {n} Tier 3 or higher equipment pieces this period.',
 expedition:'Claim {n} completed companion expeditions this period.',
 trial:'Win {n} Companion Trial floors this period.',
 event:'Claim {n} completed event objective this period.',
};
export function seasonalChallengeDescription(language:Language,quest:Pick<SeasonalQuest,'description'|'required'|'tag'>):string{
 const template=objectiveTemplate[quest.tag];
 // Only translate the live deterministic generator's exact text. Preserve changed
 // authored/server descriptions, counts, monster names and unknown tags verbatim.
 return template&&quest.description===template.replace('{n}',String(quest.required))
  ?seasonalChallengeText(language,template,{n:quest.required})
  :quest.description;
}
