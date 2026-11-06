import type {Language} from './languages';
import {SUPPORTED_LANGUAGES} from './languages';
import type {WeeklyOrder} from '../core/weekly-orders-v41';
import {weeklyOrderDestination} from '../core/weekly-order-integrations-v41';
import {WORLD_ZONES} from '../content/world-map';
import {interpolateTranslation,type TranslationParams} from './translator';

/** Only presentational weekly-order copy. Never translate a stored order, target ID,
 * item, monster or action name. Seven-language columns: DE/ES/NL/IT/FR/RU/TR. */
type SevenLanguages=readonly [string,string,string,string,string,string,string];
export const weeklyOrderCopyRows={
  "Defeat {name}": [
    "Besiege {name}",
    "Derrota a {name}",
    "Versla {name}",
    "Sconfiggi {name}",
    "Vainquez {name}",
    "Победите {name}",
    "{name} yen"
  ],
  "Oathglass Bounty: {name}": [
    "Oathglass-Kopfgeld: {name}",
    "Recompensa Oathglass: {name}",
    "Oathglass-premie: {name}",
    "Taglia Oathglass: {name}",
    "Prime Oathglass : {name}",
    "Награда Oathglass: {name}",
    "Oathglass Ödülü: {name}"
  ],
  "Hunt {name}": [
    "Jage {name}",
    "Cazar a {name}",
    "Jaag op {name}",
    "Caccia {name}",
    "Chasser {name}",
    "Охотиться на {name}",
    "{name} avla"
  ],
  "Open {name} in {zone}.": [
    "Öffne {name} in {zone}.",
    "Abre {name} en {zone}.",
    "Open {name} in {zone}.",
    "Apri {name} in {zone}.",
    "Ouvrez {name} dans {zone}.",
    "Откройте {name} в {zone}.",
    "{zone} bölgesinde {name} aç."
  ],
  "Work {name}": [
    "Bearbeite {name}",
    "Trabajar en {name}",
    "Werk aan {name}",
    "Lavora a {name}",
    "Travailler sur {name}",
    "Выполнять {name}",
    "{name} üzerinde çalış"
  ],
  "Open the exact {name} activity for this Work Order.": [
    "Öffne die Aktivität {name} für diesen Arbeitsauftrag.",
    "Abre la actividad {name} para este encargo.",
    "Open de activiteit {name} voor deze werkopdracht.",
    "Apri l'attività {name} per questo incarico.",
    "Ouvrez l'activité {name} pour cet ordre de travail.",
    "Откройте действие {name} для этого рабочего заказа.",
    "Bu iş emri için {name} etkinliğini aç."
  ],
  "Craft {name}": [
    "Stelle {name} her",
    "Fabricar {name}",
    "Maak {name}",
    "Crea {name}",
    "Fabriquer {name}",
    "Создать {name}",
    "{name} üret"
  ],
  "Open the exact {name} recipe for this Work Order.": [
    "Öffne das Rezept {name} für diesen Arbeitsauftrag.",
    "Abre la receta {name} para este encargo.",
    "Open het recept {name} voor deze werkopdracht.",
    "Apri la ricetta {name} per questo incarico.",
    "Ouvrez la recette {name} pour cet ordre de travail.",
    "Откройте рецепт {name} для этого рабочего заказа.",
    "Bu iş emri için {name} tarifini aç."
  ],
  "Open Skills and continue {name}.": [
    "Öffne Fertigkeiten und setze {name} fort.",
    "Abre Habilidades y continúa con {name}.",
    "Open Vaardigheden en ga verder met {name}.",
    "Apri Abilità e continua {name}.",
    "Ouvrez Compétences et poursuivez {name}.",
    "Откройте навыки и продолжите {name}.",
    "Beceriler'i aç ve {name} ile devam et."
  ],
  "Open region": [
    "Region öffnen",
    "Abrir región",
    "Regio openen",
    "Apri regione",
    "Ouvrir la région",
    "Открыть регион",
    "Bölgeyi aç"
  ],
  "Open weekly boss": [
    "Wochenboss öffnen",
    "Abrir jefe semanal",
    "Weekbaas openen",
    "Apri boss settimanale",
    "Ouvrir le boss hebdomadaire",
    "Открыть еженедельного босса",
    "Haftalık bossu aç"
  ],
  "Combat and gathering in {region} advance this Regional Problem.": [
    "Kampf und Sammeln in {region} bringen dieses Regionsproblem voran.",
    "Combatir y recolectar en {region} hace avanzar este problema regional.",
    "Vechten en verzamelen in {region} bevordert dit regioprobleem.",
    "Combattimento e raccolta a {region} fanno avanzare questo problema regionale.",
    "Combattre et récolter dans {region} fait progresser ce problème régional.",
    "Бои и сбор ресурсов в {region} продвигают решение региональной проблемы.",
    "{region} bölgesinde savaşmak ve toplamak bu bölgesel sorunu ilerletir."
  ],
  "Defeat the Fallen Knight once this UTC week to complete the Oathglass Bounty. Up to three rewarded rematches are available; only the first is required for this Contract.": [
    "Besiege den Fallen Knight einmal in dieser UTC-Woche für das Oathglass-Kopfgeld. Bis zu drei belohnte Rückkämpfe sind möglich; für diesen Auftrag reicht der erste.",
    "Derrota al Fallen Knight una vez esta semana UTC para completar la recompensa Oathglass. Hay hasta tres revanchas con premio, pero solo se requiere la primera.",
    "Versla de Fallen Knight eenmaal deze UTC-week voor de Oathglass-premie. Er zijn maximaal drie beloonde herkansingen; alleen de eerste telt voor dit contract.",
    "Sconfiggi il Fallen Knight una volta questa settimana UTC per la taglia Oathglass. Puoi ottenere fino a tre rivincite premiate, ma ne serve solo una per il contratto.",
    "Vainquez le Fallen Knight une fois cette semaine UTC pour obtenir la prime Oathglass. Trois revanches récompensées sont possibles ; une seule est nécessaire pour ce contrat.",
    "Победите Fallen Knight один раз за эту неделю UTC, чтобы выполнить заказ Oathglass. Доступно до трёх повторных боёв с наградами, но для контракта нужен только первый.",
    "Oathglass ödülü için Fallen Knight'ı bu UTC haftasında bir kez yen. En fazla üç ödüllü tekrar maç var; sözleşme için yalnızca ilki gerekli."
  ],
  "{region} Relief Cache": [
    "Hilfsvorrat von {region}",
    "Alijo de ayuda de {region}",
    "Hulpvoorraad van {region}",
    "Scorta di soccorso di {region}",
    "Cache de secours de {region}",
    "Тайник помощи {region}",
    "{region} Yardım Zulası"
  ],
  "Oathglass Bounty Cache": [
    "Oathglass-Kopfgeldvorrat",
    "Alijo de recompensa Oathglass",
    "Oathglass-premiekist",
    "Scorta della taglia Oathglass",
    "Cache de prime Oathglass",
    "Тайник награды Oathglass",
    "Oathglass Ödül Zulası"
  ],
  "Hunt Order reward": [
    "Belohnung für Jagdauftrag",
    "Recompensa de caza",
    "Beloning jachtopdracht",
    "Ricompensa ordine di caccia",
    "Récompense de chasse",
    "Награда за охоту",
    "Av Görevi Ödülü"
  ],
  "Work Order reward": [
    "Belohnung für Arbeitsauftrag",
    "Recompensa de encargo",
    "Beloning werkopdracht",
    "Ricompensa ordine di lavoro",
    "Récompense d'ordre de travail",
    "Награда за работу",
    "İş Emri Ödülü"
  ],
  "Regional Problem reward": [
    "Belohnung für Regionsproblem",
    "Recompensa por problema regional",
    "Beloning regioprobleem",
    "Ricompensa problema regionale",
    "Récompense de problème régional",
    "Награда за региональную проблему",
    "Bölgesel Sorun Ödülü"
  ],
  "Weekly Orders completion reward": [
    "Wochenaufträge-Abschlussbelohnung",
    "Recompensa por completar los encargos semanales",
    "Beloning voor voltooide weekopdrachten",
    "Ricompensa completamento incarichi settimanali",
    "Récompense de fin des missions hebdomadaires",
    "Награда за все еженедельные задания",
    "Haftalık Görevleri Tamamlama Ödülü"
  ],
  "Broken Wardstones": [
    "Zerbrochene Schutzsteine",
    "Piedras protectoras rotas",
    "Gebroken wachtstenen",
    "Pietre protettive infrante",
    "Pierres de garde brisées",
    "Разрушенные обереги",
    "Kırık Koruma Taşları"
  ],
  "Old roadside wards are flickering out. Thin the creatures pressing against them and gather what the wardens need to rebuild the line.": [
    "Alte Schutzzeichen am Weg verblassen. Vertreibe die bedrängenden Kreaturen und sammle Material für die Wächter, um die Linie zu erneuern.",
    "Los antiguos sellos del camino se apagan. Reduce las criaturas que los atacan y reúne materiales para que los guardianes refuercen la defensa.",
    "Oude afweerstenen langs de weg doven uit. Verjaag de wezens die erop afkomen en verzamel materialen waarmee de wachters de linie herstellen.",
    "Le antiche protezioni stradali si spengono. Riduci le creature che le assediano e raccogli materiali per aiutare i guardiani a ripristinare la linea.",
    "Les anciennes protections au bord des routes s'éteignent. Repoussez les créatures et rassemblez de quoi aider les gardiens à rétablir la ligne.",
    "Старые дорожные обереги угасают. Разгоните наступающих существ и соберите материалы, нужные стражам для восстановления защиты.",
    "Eski yol mühürleri sönüyor. Üzerlerine gelen yaratıkları azalt ve muhafızların savunmayı onarması için gerekenleri topla."
  ],
  "Burrowwake": [
    "Aufruhr unter den Feldern",
    "Revuelta de las madrigueras",
    "Onrust in de holen",
    "Risveglio delle tane",
    "Réveil des terriers",
    "Пробуждение нор",
    "Yuva Uyanışı"
  ],
  "Something below the fields is driving vermin and boars toward the farms. Keep the roads clear while locals reinforce the homesteads.": [
    "Etwas unter den Feldern treibt Ungeziefer und Wildschweine zu den Höfen. Halte die Straßen frei, während die Bewohner ihre Häuser sichern.",
    "Algo bajo los campos empuja alimañas y jabalíes hacia las granjas. Mantén libres los caminos mientras los aldeanos refuerzan sus hogares.",
    "Iets onder de velden jaagt ongedierte en everzwijnen naar de boerderijen. Houd de wegen vrij terwijl de bewoners hun erven versterken.",
    "Qualcosa sotto i campi spinge parassiti e cinghiali verso le fattorie. Tieni libere le strade mentre gli abitanti rinforzano le case.",
    "Quelque chose sous les champs pousse vermine et sangliers vers les fermes. Gardez les routes libres pendant que les habitants renforcent leurs maisons.",
    "Нечто под полями гонит вредителей и кабанов к фермам. Держите дороги свободными, пока жители укрепляют дома.",
    "Tarlaların altındaki bir şey haşereleri ve yaban domuzlarını çiftliklere sürüklüyor. Köylüler evlerini güçlendirirken yolları açık tut."
  ],
  "Riverlights at Dusk": [
    "Flusslichter in der Dämmerung",
    "Luces del río al anochecer",
    "Rivierlichten in de schemering",
    "Luci sul fiume al crepuscolo",
    "Lueurs du fleuve au crépuscule",
    "Речные огни на закате",
    "Alacakaranlıkta Nehir Işıkları"
  ],
  "Unnatural lights are drifting against the current. Patrol the banks and gather from the river while ferrymen trace the source.": [
    "Unnatürliche Lichter treiben gegen den Strom. Patrouilliere am Ufer und sammle am Fluss, während die Fährleute den Ursprung suchen.",
    "Luces extrañas avanzan contra la corriente. Patrulla las orillas y recolecta en el río mientras los barqueros investigan su origen.",
    "Onnatuurlijke lichten drijven tegen de stroom in. Patrouilleer langs de oevers en verzamel bij de rivier terwijl de veerlieden de bron zoeken.",
    "Luci innaturali risalgono la corrente. Pattuglia le rive e raccogli risorse dal fiume mentre i traghettatori cercano l'origine.",
    "Des lumières étranges remontent le courant. Patrouillez sur les berges et récoltez près du fleuve pendant que les passeurs enquêtent.",
    "Странные огни движутся против течения. Патрулируйте берега и собирайте ресурсы у реки, пока перевозчики ищут источник.",
    "Doğal olmayan ışıklar akıntıya karşı sürükleniyor. Kayıkçılar kaynağı ararken kıyıları devriye gez ve nehirde kaynak topla."
  ],
  "The Drowned Toll": [
    "Der versunkene Zoll",
    "El peaje sumergido",
    "De verdronken tol",
    "Il pedaggio sommerso",
    "Le péage englouti",
    "Затонувшая пошлина",
    "Batık Geçiş Ücreti"
  ],
  "A bell is sounding beneath Silverbrook after sunset. Keep the crossings open while the village searches the flooded foundations.": [
    "Nach Sonnenuntergang läutet unter Silverbrook eine Glocke. Halte die Übergänge offen, während das Dorf überflutete Fundamente absucht.",
    "Una campana suena bajo Silverbrook al anochecer. Mantén abiertos los pasos mientras la aldea busca entre los cimientos inundados.",
    "Na zonsondergang klinkt er een bel onder Silverbrook. Houd de overgangen open terwijl het dorp de overstroomde fundamenten onderzoekt.",
    "Dopo il tramonto suona una campana sotto Silverbrook. Mantieni aperti i passaggi mentre il villaggio cerca tra le fondamenta allagate.",
    "Une cloche résonne sous Silverbrook après le coucher du soleil. Gardez les passages ouverts pendant les recherches dans les fondations noyées.",
    "После заката под Silverbrook звонит колокол. Сохраняйте переправы открытыми, пока жители исследуют затопленные фундаменты.",
    "Gün batınca Silverbrook'un altından çan sesi geliyor. Köylüler su basmış temelleri araştırırken geçitleri açık tut."
  ],
  "Thornwake": [
    "Dornen erwachen",
    "Despertar de las espinas",
    "Doornontwaken",
    "Risveglio dei rovi",
    "Éveil des ronces",
    "Пробуждение шипов",
    "Diken Uyanışı"
  ],
  "Briar growth is choking marked trails overnight. Hunt the things nesting in it and gather through Ironwood to push the growth back.": [
    "Dornen überwuchern über Nacht markierte Pfade. Jage die Kreaturen in den Hecken und sammle in Ironwood, um das Gestrüpp zurückzudrängen.",
    "Las zarzas invaden senderos marcados durante la noche. Caza lo que anida en ellas y recolecta en Ironwood para detener su avance.",
    "Doornstruiken verstikken 's nachts gemarkeerde paden. Jaag op de wezens erin en verzamel in Ironwood om de groei terug te dringen.",
    "I rovi soffocano i sentieri segnati durante la notte. Caccia le creature al loro interno e raccogli a Ironwood per respingere la crescita.",
    "Les ronces étouffent les sentiers balisés pendant la nuit. Chassez les créatures qui y nichent et récoltez à Ironwood pour les repousser.",
    "За ночь терновник перекрывает отмеченные тропы. Охотьтесь на существ в зарослях и собирайте ресурсы в Ironwood, чтобы сдержать рост.",
    "Dikenli çalılar geceleri işaretli yolları kaplıyor. İçlerindeki yaratıkları avla ve büyümeyi durdurmak için Ironwood'da kaynak topla."
  ],
  "Wolves at the Rune Trees": [
    "Wölfe an den Runenbäumen",
    "Lobos entre los árboles rúnicos",
    "Wolven bij de runenbomen",
    "Lupi tra gli alberi runici",
    "Loups près des arbres runiques",
    "Волки у рунных деревьев",
    "Rün Ağaçlarındaki Kurtlar"
  ],
  "Predators are circling the oldest oath-marked trees. Wardens need the surrounding paths secured before they can investigate the runes.": [
    "Raubtiere umkreisen die ältesten Bäume mit Eidzeichen. Die Wächter müssen die Pfade sichern, bevor sie die Runen untersuchen können.",
    "Depredadores rondan los árboles más antiguos marcados con juramentos. Los guardianes necesitan caminos seguros para investigar las runas.",
    "Roofdieren cirkelen rond de oudste bomen met eedtekens. De wachters moeten eerst de paden veiligstellen om de runen te onderzoeken.",
    "I predatori circondano gli alberi più antichi segnati dal giuramento. I guardiani devono proteggere i sentieri prima di studiare le rune.",
    "Des prédateurs rôdent près des plus vieux arbres marqués de serments. Les gardiens doivent sécuriser les sentiers avant d'étudier les runes.",
    "Хищники кружат у древнейших деревьев со знаками клятвы. Стражам нужны безопасные тропы, прежде чем исследовать руны.",
    "Yırtıcılar en eski yemin işaretli ağaçların çevresinde dolaşıyor. Muhafızlar rünleri incelemeden önce yollar güvenli olmalı."
  ],
  "The Bell Below": [
    "Die Glocke in der Tiefe",
    "La campana de las profundidades",
    "De bel in de diepte",
    "La campana nelle profondità",
    "La cloche des profondeurs",
    "Колокол под землёй",
    "Derindeki Çan"
  ],
  "The abandoned mine bell is ringing again. Clear the upper tunnels and work the surviving veins while scouts descend toward the sound.": [
    "Die Glocke der verlassenen Mine läutet erneut. Räume die oberen Stollen frei und baue noch brauchbare Adern ab, während Späher dem Klang folgen.",
    "La campana de la mina abandonada vuelve a sonar. Despeja los túneles superiores y trabaja las vetas restantes mientras los exploradores bajan hacia el sonido.",
    "De bel van de verlaten mijn luidt weer. Maak de bovenste tunnels vrij en win uit de overgebleven aders terwijl verkenners het geluid volgen.",
    "La campana della miniera abbandonata suona ancora. Libera le gallerie superiori e lavora le vene rimaste mentre gli esploratori scendono verso il suono.",
    "La cloche de la mine abandonnée sonne encore. Dégagez les galeries supérieures et exploitez les veines restantes pendant que les éclaireurs descendent vers le son.",
    "Колокол заброшенной шахты снова звонит. Очистите верхние тоннели и добывайте руду, пока разведчики спускаются на звук.",
    "Terk edilmiş madenin çanı yine çalıyor. Gözcüler sesi takip ederken üst tünelleri temizle ve kalan damarları işlet."
  ],
  "Runebound Collapse": [
    "Runengebundener Einsturz",
    "Derrumbe rúnico",
    "Runengebonden instorting",
    "Crollo runico",
    "Effondrement runique",
    "Рунный обвал",
    "Rünlü Çöküş"
  ],
  "A sealed gallery has broken open and runic debris is destabilizing nearby shafts. Keep the tunnels usable while crews shore them up.": [
    "Eine versiegelte Galerie ist aufgebrochen und Runentrümmer gefährden die Schächte. Halte die Tunnel nutzbar, während Arbeiter sie abstützen.",
    "Una galería sellada se ha abierto y restos rúnicos desestabilizan los pozos cercanos. Mantén transitables los túneles mientras los equipos los refuerzan.",
    "Een afgesloten gang is opengebroken en runepuin maakt nabijgelegen schachten instabiel. Houd de tunnels bruikbaar terwijl ploegen ze stutten.",
    "Una galleria sigillata si è aperta e detriti runici rendono instabili i pozzi vicini. Mantieni i tunnel utilizzabili mentre le squadre li rinforzano.",
    "Une galerie scellée s'est ouverte et des débris runiques fragilisent les puits voisins. Gardez les tunnels praticables pendant que les équipes les étayent.",
    "Запечатанная галерея вскрылась, а рунные обломки угрожают соседним шахтам. Сохраняйте тоннели проходимыми, пока рабочие укрепляют опоры.",
    "Mühürlü bir galeri açıldı ve rünik enkaz yakındaki şaftları sarsıyor. Ekipler desteklerken tünelleri kullanılabilir tut."
  ],
  "Oathbound Patrols": [
    "Eidgebundene Patrouillen",
    "Patrullas de los juramentados",
    "Eedgebonden patrouilles",
    "Pattuglie del giuramento",
    "Patrouilles assermentées",
    "Патрули клятвенных",
    "Yeminli Devriyeler"
  ],
  "Dead soldiers are marching the royal road in disciplined groups. Break their patrol routes before travelers are cut off from Asterfall.": [
    "Tote Soldaten marschieren in geordneten Trupps über die Königsstraße. Unterbrich ihre Patrouillen, bevor Reisende von Asterfall abgeschnitten werden.",
    "Soldados muertos marchan en grupos disciplinados por el camino real. Rompe sus patrullas antes de que los viajeros queden aislados de Asterfall.",
    "Dode soldaten marcheren in strakke formaties over de koningsweg. Doorbreek hun patrouilles voordat reizigers van Asterfall worden afgesneden.",
    "Soldati morti marciano in gruppi disciplinati sulla strada reale. Interrompi i pattugliamenti prima che i viaggiatori restino isolati da Asterfall.",
    "Des soldats morts marchent en formation sur la route royale. Brisez leurs patrouilles avant qu'elles n'isolent les voyageurs d'Asterfall.",
    "Мёртвые солдаты строем идут по королевской дороге. Разбейте их патрули, пока путники не оказались отрезаны от Asterfall.",
    "Ölü askerler kral yolunda düzenli birlikler hâlinde yürüyor. Yolcular Asterfall'dan kopmadan devriyelerini dağıt."
  ],
  "Lanterns Without Bearers": [
    "Laternen ohne Träger",
    "Faroles sin portadores",
    "Lantaarns zonder dragers",
    "Lanterne senza portatori",
    "Lanternes sans porteurs",
    "Фонари без носителей",
    "Taşıyıcısız Fenerler"
  ],
  "Unattended lanterns are appearing farther down the fogline each night. Hold the road while scouts map where the lights are leading.": [
    "Unbewachte Laternen erscheinen jede Nacht tiefer in der Nebelzone. Halte die Straße, während Späher ihrem Licht folgen.",
    "Cada noche aparecen faroles abandonados más allá de la línea de niebla. Defiende el camino mientras los exploradores rastrean las luces.",
    "Elke nacht verschijnen onbeheerde lantaarns verder in de mist. Houd de weg veilig terwijl verkenners de lichten volgen.",
    "Ogni notte appaiono lanterne incustodite sempre più in là nella nebbia. Difendi la strada mentre gli esploratori seguono le luci.",
    "Chaque nuit, des lanternes sans porteur apparaissent plus loin dans la brume. Tenez la route pendant que les éclaireurs suivent les lueurs.",
    "Каждую ночь всё дальше в тумане появляются брошенные фонари. Удерживайте дорогу, пока разведчики идут по следу огней.",
    "Her gece sisin daha ilerisinde sahipsiz fenerler beliriyor. Gözcüler ışıkların izini sürerken yolu savun."
  ]
} as const satisfies Record<string,SevenLanguages>;
export function weeklyOrderText(language:Language,key:string,params:TranslationParams={}):string{
 const col=SUPPORTED_LANGUAGES.indexOf(language)-1;
 const row=Object.prototype.hasOwnProperty.call(weeklyOrderCopyRows,key)
  ?weeklyOrderCopyRows[key as keyof typeof weeklyOrderCopyRows]:undefined;
 return interpolateTranslation(row&&col>=0?row[col]:key,params);
}
export function weeklyOrderTitle(language:Language,order:WeeklyOrder):string{
 if(order.kind==='hunt'&&order.targetId==='FALLEN_KNIGHT'&&order.title===`Oathglass Bounty: ${order.source.label}`)
  return weeklyOrderText(language,'Oathglass Bounty: {name}',{name:order.source.label});
 if(order.kind==='hunt'&&order.title===`Defeat ${order.source.label}`)
  return weeklyOrderText(language,'Defeat {name}',{name:order.source.label});
 return weeklyOrderText(language,order.title);
}
export function weeklyOrderBrief(language:Language,order:WeeklyOrder):string|undefined{
 return order.brief===undefined?undefined:weeklyOrderText(language,order.brief);
}
export function weeklyOrderReward(language:Language,order:WeeklyOrder):string{
 if(order.kind==='regional'&&order.reward.label===`${order.source.label} Relief Cache`)
  return weeklyOrderText(language,'{region} Relief Cache',{region:order.source.label});
 return weeklyOrderText(language,order.reward.label);
}
/** Guard original destination strings: underlying navigation receives the original
 * destination object, and changed/unrecognized descriptions remain unchanged. */
export function weeklyOrderDestinationLabel(language:Language,order:WeeklyOrder,field:'button'|'detail'):string{
 const destination=weeklyOrderDestination(order);
 const original=destination[field];
 if(order.kind==='hunt'){
  const name=order.source.label,zone=destination.kind==='combat'?destination.zoneName:'';
  if(original===`Hunt ${name}`)return weeklyOrderText(language,'Hunt {name}',{name});
  if(original===`Open ${name} in ${zone}.`)return weeklyOrderText(language,'Open {name} in {zone}.',{name,zone});
 }else if(order.kind==='profession'){
  const name=order.source.label;
  const formats=[
   ['Work {name}',`Work ${name}`],
   ['Craft {name}',`Craft ${name}`],
   ['Open the exact {name} activity for this Work Order.',`Open the exact ${name} activity for this Work Order.`],
   ['Open the exact {name} recipe for this Work Order.',`Open the exact ${name} recipe for this Work Order.`],
   ['Open Skills and continue {name}.',`Open Skills and continue ${name}.`],
  ] as const;
  for(const [template,source] of formats)if(original===source)return weeklyOrderText(language,template,{name});
 }else if(order.kind==='regional'){
  const region=WORLD_ZONES.find(zone=>zone.id===order.regionId)?.name??order.source.label;
  if(original===`Combat and gathering in ${region} advance this Regional Problem.`)
   return weeklyOrderText(language,'Combat and gathering in {region} advance this Regional Problem.',{region});
 }
 return weeklyOrderText(language,original);
}
