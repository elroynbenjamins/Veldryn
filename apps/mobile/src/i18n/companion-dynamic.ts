import type {Language} from './languages';

/** Authored dynamic Companion guidance. Names and numbers are interpolated without translation. */
export const companionDynamicRows={
  "{skill} · level {level}": [
    "{skill} · Stufe {level}",
    "{skill} · nivel {level}",
    "{skill} · niveau {level}",
    "{skill} · livello {level}",
    "{skill} · niveau {level}",
    "{skill} · уровень {level}",
    "{skill} · seviye {level}"
  ],
  "Raise Monster Mastery to {amount}.": [
    "Erhöhe die Monsterbeherrschung auf {amount}.",
    "Aumenta la maestría de monstruos a {amount}.",
    "Verhoog de monsterbeheersing naar {amount}.",
    "Porta la maestria mostri a {amount}.",
    "Augmentez la maîtrise des monstres à {amount}.",
    "Повысьте мастерство над монстрами до {amount}.",
    "Canavar Ustalığını {amount} seviyesine yükselt."
  ],
  "Train {skill}": [
    "{skill} trainieren",
    "Entrenar {skill}",
    "Train {skill}",
    "Allena {skill}",
    "Entraîner {skill}",
    "Развивать {skill}",
    "{skill} becerisini geliştir"
  ],
  "Reach skill level {amount}.": [
    "Erreiche Fertigkeitsstufe {amount}.",
    "Alcanza el nivel {amount} de habilidad.",
    "Bereik vaardigheidsniveau {amount}.",
    "Raggiungi il livello abilità {amount}.",
    "Atteignez le niveau de compétence {amount}.",
    "Достигните {amount}-го уровня навыка.",
    "Beceri seviyesinde {amount} düzeyine ulaş."
  ],
  "Challenge {name}": [
    "{name} herausfordern",
    "Desafiar a {name}",
    "Daag {name} uit",
    "Sfida {name}",
    "Défier {name}",
    "Бросить вызов {name}",
    "{name} ile mücadele et"
  ],
  "Defeat it {amount} time.": [
    "Besiege den Gegner {amount}-mal.",
    "Derrótalo {amount} vez.",
    "Versla deze vijand {amount} keer.",
    "Sconfiggilo {amount} volta.",
    "Battez-le {amount} fois.",
    "Победите противника {amount} раз.",
    "Onu {amount} kez yen."
  ],
  "Defeat it {amount} times.": [
    "Besiege den Gegner {amount}-mal.",
    "Derrótalo {amount} veces.",
    "Versla deze vijand {amount} keer.",
    "Sconfiggilo {amount} volte.",
    "Battez-le {amount} fois.",
    "Победите противника {amount} раз.",
    "Onu {amount} kez yen."
  ],
  "Complete {amount} assignments in {region}.": [
    "Schließe {amount} Aufträge in {region} ab.",
    "Completa {amount} encargos en {region}.",
    "Voltooi {amount} opdrachten in {region}.",
    "Completa {amount} incarichi in {region}.",
    "Terminez {amount} missions dans {region}.",
    "Выполните {amount} заданий в регионе {region}.",
    "{region} bölgesinde {amount} görev tamamla."
  ],
  "Earn S grade on {amount} regional Sanctuary assignments.": [
    "Erreiche Rang S bei {amount} regionalen Sanctuary-Aufträgen.",
    "Consigue rango S en {amount} encargos regionales del santuario.",
    "Behaal rang S bij {amount} regionale sanctuariumopdrachten.",
    "Ottieni il grado S in {amount} incarichi regionali del Santuario.",
    "Obtenez le rang S dans {amount} missions régionales du Sanctuaire.",
    "Получите оценку S в {amount} региональных заданиях святилища.",
    "{amount} bölgesel Sığınak görevinde S derecesi kazan."
  ],
  "Raise {name} Bond": [
    "Bindung von {name} erhöhen",
    "Aumentar el vínculo de {name}",
    "Verhoog de band van {name}",
    "Aumenta il legame di {name}",
    "Augmenter le lien de {name}",
    "Повысить связь с {name}",
    "{name} ile Bağ seviyesini artır"
  ],
  "Reach Bond {amount} with {name}.": [
    "Erreiche Bindung {amount} mit {name}.",
    "Alcanza vínculo {amount} con {name}.",
    "Bereik band {amount} met {name}.",
    "Raggiungi Legame {amount} con {name}.",
    "Atteignez le lien {amount} avec {name}.",
    "Достигните связи {amount} со спутником {name}.",
    "{name} ile Bağ {amount} seviyesine ulaş."
  ],
  "Progress {amount} required.": [
    "Fortschritt {amount} erforderlich.",
    "Se requiere progreso {amount}.",
    "Voortgang {amount} vereist.",
    "Richiesto progresso {amount}.",
    "Progression {amount} requise.",
    "Требуется прогресс {amount}.",
    "{amount} ilerleme gerekli."
  ],
  "{complete}/{total} requirements complete": [
    "{complete}/{total} Bedingungen erfüllt",
    "{complete}/{total} requisitos completados",
    "{complete}/{total} vereisten voltooid",
    "{complete}/{total} requisiti completati",
    "{complete}/{total} conditions remplies",
    "Выполнено условий: {complete}/{total}",
    "{complete}/{total} koşul tamamlandı"
  ],
  "{percent}% recruitment progress": [
    "{percent} % Rekrutierungsfortschritt",
    "{percent} % de progreso de reclutamiento",
    "{percent}% rekruteringsvoortgang",
    "{percent}% avanzamento reclutamento",
    "{percent} % de progression du recrutement",
    "Прогресс найма: {percent}%",
    "İşe alım ilerlemesi: %{percent}"
  ],
  " · Technique choice unlock": [
    " · Technikauswahl freigeschaltet",
    " · Se desbloquea la elección de técnica",
    " · Techniekkeuze ontgrendeld",
    " · Scelta tecnica sbloccata",
    " · Choix de technique débloqué",
    " · Открывается выбор приёма",
    " · Teknik seçimi açılır"
  ],
  "Level cap {level} · Technique choice unlock": [
    "Stufenlimit {level} · Technikauswahl freigeschaltet",
    "Límite de nivel {level} · Se desbloquea la elección de técnica",
    "Niveaulimiet {level} · Techniekkeuze ontgrendeld",
    "Limite livello {level} · Scelta tecnica sbloccata",
    "Niveau maximal {level} · Choix de technique débloqué",
    "Предел уровня {level} · Открывается выбор приёма",
    "Seviye sınırı {level} · Teknik seçimi açılır"
  ],
  "Final rarity ascension · Technique choice unlock": [
    "Letzter Seltenheitsaufstieg · Technikauswahl freigeschaltet",
    "Ascensión final de rareza · Se desbloquea la elección de técnica",
    "Laatste zeldzaamheidsverheffing · Techniekkeuze ontgrendeld",
    "Ascensione finale della rarità · Scelta tecnica sbloccata",
    "Ascension finale de rareté · Choix de technique débloqué",
    "Последнее возвышение редкости · Открывается выбор приёма",
    "Son nadirlik yükselişi · Teknik seçimi açılır"
  ],
  "Prestige Mastery": [
    "Prestige-Meisterschaft",
    "Maestría de prestigio",
    "Prestigemeesterschap",
    "Maestria prestigio",
    "Maîtrise prestige",
    "Престижное мастерство",
    "Prestij Ustalığı"
  ],
  "Profile identity reward": [
    "Belohnung für Profilidentität",
    "Recompensa de identidad de perfil",
    "Beloning voor profielidentiteit",
    "Ricompensa identità profilo",
    "Récompense d'identité du profil",
    "Награда за оформление профиля",
    "Profil kimliği ödülü"
  ],
  "Profile title milestone": [
    "Meilenstein für Profiltitel",
    "Hito de título del perfil",
    "Mijlpaal voor profieltitel",
    "Traguardo titolo profilo",
    "Palier de titre de profil",
    "Этап получения титула профиля",
    "Profil unvanı aşaması"
  ],
  "Bond Trait · {name}": [
    "Bindungsmerkmal · {name}",
    "Rasgo de vínculo · {name}",
    "Bandeigenschap · {name}",
    "Tratto legame · {name}",
    "Trait de lien · {name}",
    "Черта связи · {name}",
    "Bağ Özelliği · {name}"
  ],
  "Claim Bond {level} reward": [
    "Bindungsbelohnung {level} abholen",
    "Reclamar recompensa de vínculo {level}",
    "Claim bandbeloning {level}",
    "Riscatta ricompensa Legame {level}",
    "Récupérer la récompense de lien {level}",
    "Забрать награду за связь {level}",
    "Bağ {level} ödülünü al"
  ],
  "Companion portrait · {name}": [
    "Begleiterporträt · {name}",
    "Retrato de compañero · {name}",
    "Metgezelportret · {name}",
    "Ritratto compagno · {name}",
    "Portrait de compagnon · {name}",
    "Портрет спутника · {name}",
    "Yoldaş portresi · {name}"
  ],
  "Companion title · {name}": [
    "Begleitertitel · {name}",
    "Título de compañero · {name}",
    "Metgezeltitel · {name}",
    "Titolo compagno · {name}",
    "Titre de compagnon · {name}",
    "Титул спутника · {name}",
    "Yoldaş unvanı · {name}"
  ],
  "Profile badge · {name}": [
    "Profilabzeichen · {name}",
    "Insignia de perfil · {name}",
    "Profielbadge · {name}",
    "Distintivo profilo · {name}",
    "Badge de profil · {name}",
    "Значок профиля · {name}",
    "Profil rozeti · {name}"
  ],
  "Profile background · {name}": [
    "Profilhintergrund · {name}",
    "Fondo de perfil · {name}",
    "Profielachtergrond · {name}",
    "Sfondo profilo · {name}",
    "Fond de profil · {name}",
    "Фон профиля · {name}",
    "Profil arka planı · {name}"
  ],
  "Profile border · {name}": [
    "Profilrahmen · {name}",
    "Marco de perfil · {name}",
    "Profielrand · {name}",
    "Bordo profilo · {name}",
    "Bordure de profil · {name}",
    "Рамка профиля · {name}",
    "Profil çerçevesi · {name}"
  ],
  "Title · {name}": [
    "Titel · {name}",
    "Título · {name}",
    "Titel · {name}",
    "Titolo · {name}",
    "Titre · {name}",
    "Титул · {name}",
    "Unvan · {name}"
  ],
  "Companion Essence milestone": [
    "Meilenstein für Begleiteressenz",
    "Hito de esencia de compañero",
    "Mijlpaal voor metgezelessentie",
    "Traguardo Essenza compagno",
    "Palier d'essence de compagnon",
    "Этап получения эссенции спутника",
    "Yoldaş Özü aşaması"
  ],
  "In Trial": [
    "In Prüfung",
    "En Prueba",
    "In proef",
    "In Prova",
    "En Épreuve",
    "В Испытании",
    "Denemede"
  ],
  "Expedition complete": [
    "Expedition abgeschlossen",
    "Expedición completada",
    "Expeditie voltooid",
    "Spedizione completata",
    "Expédition terminée",
    "Экспедиция завершена",
    "Sefer tamamlandı"
  ],
  "On Expedition": [
    "Auf Expedition",
    "En expedición",
    "Op expeditie",
    "In spedizione",
    "En expédition",
    "В экспедиции",
    "Seferde"
  ],
  "Own 5 Combat Companions.": [
    "Besitze 5 Kampfgefährten.",
    "Posee 5 compañeros de combate.",
    "Bezit 5 gevechtsmetgezellen.",
    "Possiedi 5 compagni da combattimento.",
    "Possédez 5 compagnons de combat.",
    "Получите 5 боевых спутников.",
    "5 savaş yoldaşına sahip ol."
  ],
  "Own 15 Combat Companions.": [
    "Besitze 15 Kampfgefährten.",
    "Posee 15 compañeros de combate.",
    "Bezit 15 gevechtsmetgezellen.",
    "Possiedi 15 compagni da combattimento.",
    "Possédez 15 compagnons de combat.",
    "Получите 15 боевых спутников.",
    "15 savaş yoldaşına sahip ol."
  ],
  "Own 24 Combat Companions.": [
    "Besitze 24 Kampfgefährten.",
    "Posee 24 compañeros de combate.",
    "Bezit 24 gevechtsmetgezellen.",
    "Possiedi 24 compagni da combattimento.",
    "Possédez 24 compagnons de combat.",
    "Получите 24 боевых спутников.",
    "24 savaş yoldaşına sahip ol."
  ],
  "Own 3 Prestige Combat Companions.": [
    "Besitze 3 Prestige-Kampfgefährten.",
    "Posee 3 compañeros de combate de prestigio.",
    "Bezit 3 prestige-gevechtsmetgezellen.",
    "Possiedi 3 compagni da combattimento prestigio.",
    "Possédez 3 compagnons de combat prestige.",
    "Получите 3 престижных боевых спутников.",
    "3 Prestij savaş yoldaşına sahip ol."
  ],
  "Own 5 annual Event Companions.": [
    "Besitze 5 jährliche Event-Begleiter.",
    "Posee 5 compañeros de eventos anuales.",
    "Bezit 5 jaarlijkse evenementmetgezellen.",
    "Possiedi 5 compagni degli eventi annuali.",
    "Possédez 5 compagnons des événements annuels.",
    "Получите 5 спутников ежегодных событий.",
    "5 yıllık etkinlik yoldaşına sahip ol."
  ],
  "Own 3 companions earned from special Companion challenges.": [
    "Besitze 3 Begleiter aus besonderen Begleiterherausforderungen.",
    "Posee 3 compañeros obtenidos en desafíos especiales.",
    "Bezit 3 metgezellen uit speciale metgezeluitdagingen.",
    "Possiedi 3 compagni ottenuti da sfide speciali.",
    "Possédez 3 compagnons gagnés dans des défis spéciaux.",
    "Получите 3 спутников из особых испытаний.",
    "Özel Yoldaş mücadelelerinden kazanılan 3 yoldaşa sahip ol."
  ]
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string]>;

const languageIndex:Partial<Record<Language,number>>={de:0,es:1,nl:2,it:3,fr:4,ru:5,tr:6};
const placeholder=/^\{([a-zA-Z][a-zA-Z0-9_]*)\}$/;
const escapeRegex=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const templates=Object.entries(companionDynamicRows).map(([source,translations])=>{
 const names:string[]=[];
 const pieces=source.split(/(\{[a-zA-Z][a-zA-Z0-9_]*\})/g).filter(Boolean);
 const regex=pieces.map(part=>{const param=placeholder.exec(part);if(param){names.push(param[1]);return '(.+?)';}return escapeRegex(part);}).join('');
 return {source,translations,names,matcher:new RegExp('^'+regex+'$')};
});
/** Match complete authored strings only. Fallback on unknown text and unlisted names. */
export function companionDynamicText(language:Language,source:string):string|undefined{
 for(const template of templates){
  const match=template.matcher.exec(source);if(!match)continue;
  const index=languageIndex[language];if(index===undefined)return source;
  const values=Object.fromEntries(template.names.map((name,i)=>[name,match[i+1]]));
  return template.translations[index].replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,(token,name:string)=>
    Object.prototype.hasOwnProperty.call(values,name)?values[name]:token);
 }
 return undefined;
}
