import type {Language} from './languages';

// Localized fixed Companion guidance and source-help labels. Names and gameplay IDs remain unchanged.
// Ordered de, es, nl, it, fr, ru, tr; unknown strings fall back to the existing catalog or English.
export const companionGuidanceRows={
  "Buy Sanctuary supplies": [
    "Sanctuary-Vorräte kaufen",
    "Comprar suministros del santuario",
    "Sanctuariumvoorraden kopen",
    "Acquista scorte del Santuario",
    "Acheter des provisions du Sanctuaire",
    "Купить припасы святилища",
    "Sığınak malzemeleri satın al"
  ],
  "5 Supplies for 250 Gold · Expedition Pens required": [
    "5 Vorräte für 250 Gold · Expeditionsgehege nötig",
    "5 suministros por 250 de oro · requiere corrales de expedición",
    "5 voorraden voor 250 goud · expeditieverblijven vereist",
    "5 scorte per 250 oro · richiesti recinti spedizione",
    "5 provisions pour 250 pièces d'or · enclos d'expédition requis",
    "5 припасов за 250 золота · нужны загоны экспедиций",
    "250 Altın karşılığı 5 malzeme · Sefer Bölmeleri gerekli"
  ],
  "Clear Companion Trial bosses": [
    "Bosse in Begleiterprüfungen besiegen",
    "Derrotar jefes de Pruebas de compañero",
    "Versla bazen in metgezelproeven",
    "Sconfiggi i boss delle Prove compagni",
    "Battre les boss des Épreuves de compagnon",
    "Побеждайте боссов Испытаний спутников",
    "Yoldaş Denemesi patronlarını yen"
  ],
  "First-clear Trial boss rewards": [
    "Erstbelohnungen für Prüfungsbosse",
    "Recompensas por primera victoria sobre jefes de Pruebas",
    "Beloningen voor eerste overwinning op proefbazen",
    "Ricompense per la prima vittoria sui boss delle Prove",
    "Récompenses de première victoire contre les boss d'Épreuve",
    "Награды за первую победу над боссами Испытаний",
    "Deneme patronlarının ilk zafer ödülleri"
  ],
  "Open the active event": [
    "Aktives Event öffnen",
    "Abrir el evento activo",
    "Open het actieve evenement",
    "Apri l'evento attivo",
    "Ouvrir l'événement en cours",
    "Открыть активное событие",
    "Etkin etkinliği aç"
  ],
  "Event companion acquisition grants a starter Bondbloom bundle": [
    "Ein Event-Begleiter gewährt ein erstes Bondbloom-Paket",
    "Conseguir un compañero de evento otorga un lote inicial de Bondbloom",
    "Een evenementmetgezel geeft een startpakket Bondbloom",
    "Ottenere un compagno evento dà un pacchetto iniziale di Bondbloom",
    "Obtenir un compagnon d'événement donne un lot initial de Bondbloom",
    "Получение спутника события даёт стартовый набор Bondbloom",
    "Etkinlik yoldaşı edinmek başlangıç Bondbloom paketi verir"
  ],
  "Available while you own an event companion": [
    "Verfügbar, solange du einen Event-Begleiter besitzt",
    "Disponible mientras tengas un compañero de evento",
    "Beschikbaar zolang je een evenementmetgezel bezit",
    "Disponibile se possiedi un compagno evento",
    "Disponible tant que vous possédez un compagnon d'événement",
    "Доступно, пока у вас есть спутник события",
    "Etkinlik yoldaşına sahipken kullanılabilir"
  ],
  "Event prestige rewards": [
    "Prestige-Belohnungen des Events",
    "Recompensas de prestigio del evento",
    "Prestigebeloningen van het evenement",
    "Ricompense prestigio evento",
    "Récompenses prestige de l'événement",
    "Престижные награды события",
    "Etkinlik prestij ödülleri"
  ],
  "Returning events can offer additional Bondbloom": [
    "Wiederkehrende Events können zusätzliches Bondbloom bieten",
    "Los eventos recurrentes pueden ofrecer más Bondbloom",
    "Terugkerende evenementen kunnen extra Bondbloom bieden",
    "Gli eventi ricorrenti possono offrire altro Bondbloom",
    "Les événements récurrents peuvent offrir plus de Bondbloom",
    "Повторные события могут дать дополнительный Bondbloom",
    "Tekrarlanan etkinlikler ek Bondbloom sunabilir"
  ],
  "Check Sanctuary Expeditions": [
    "Sanctuary-Expeditionen prüfen",
    "Revisar expediciones del santuario",
    "Bekijk sanctuariumexpedities",
    "Controlla spedizioni del Santuario",
    "Consulter les expéditions du Sanctuaire",
    "Проверить экспедиции святилища",
    "Sığınak Seferlerini kontrol et"
  ],
  "Assignment rewards or later-region companion content can provide this material": [
    "Dieses Material gibt es bei Aufträgen oder in späteren Begleiterregionen",
    "Este material se obtiene en encargos o contenido de regiones posteriores",
    "Dit materiaal komt uit opdrachten of latere metgezelregio's",
    "Materiale ottenibile da incarichi o contenuti delle regioni successive",
    "Matériau obtenu via les missions ou les régions suivantes",
    "Материал можно получить из заданий или в следующих регионах спутников",
    "Bu malzeme görevlerden veya ileri bölge yoldaş içeriklerinden çıkar"
  ],
  "Continue the campaign": [
    "Kampagne fortsetzen",
    "Continuar la campaña",
    "Ga verder met de campagne",
    "Continua la campagna",
    "Poursuivre la campagne",
    "Продолжить кампанию",
    "Hikâyeye devam et"
  ],
  "Explore Silverbrook fishing spots": [
    "Angelstellen in Silverbrook erkunden",
    "Explorar los puntos de pesca de Silverbrook",
    "Verken visplekken in Silverbrook",
    "Esplora i luoghi di pesca di Silverbrook",
    "Explorer les lieux de pêche de Silverbrook",
    "Исследуйте места рыбалки в Silverbrook",
    "Silverbrook balıkçılık noktalarını keşfet"
  ],
  "Fish each Silverbrook node at least once; the final pool unlocks at Fishing 16.": [
    "Angle mindestens einmal an jedem Silverbrook-Ort; der letzte Teich öffnet sich mit Angeln 16.",
    "Pesca una vez en cada punto de Silverbrook; el último se desbloquea en Pesca 16.",
    "Vis eenmaal op elke plek in Silverbrook; de laatste poel ontgrendelt bij Vissen 16.",
    "Pesca almeno una volta in ogni punto di Silverbrook; l'ultimo si sblocca con Pesca 16.",
    "Pêchez une fois à chaque point de Silverbrook ; le dernier s'ouvre au niveau 16 de Pêche.",
    "Порыбачьте в каждом месте Silverbrook; последний водоём откроется на Рыбалке 16.",
    "Her Silverbrook noktasında bir kez balık tut; son havuz Balıkçılık 16'da açılır."
  ],
  "Run Sanctuary Expeditions": [
    "Sanctuary-Expeditionen durchführen",
    "Realizar expediciones del santuario",
    "Voer sanctuariumexpedities uit",
    "Svolgi spedizioni del Santuario",
    "Effectuer des expéditions du Sanctuaire",
    "Отправляйте экспедиции святилища",
    "Sığınak Seferlerine çık"
  ],
  "Improve Expedition teams": [
    "Expeditionsteams verbessern",
    "Mejorar los equipos de expedición",
    "Verbeter expeditieteams",
    "Migliora le squadre spedizione",
    "Améliorer les équipes d'expédition",
    "Улучшайте команды экспедиций",
    "Sefer takımlarını geliştir"
  ],
  "Complete its Special Companion Challenge": [
    "Besondere Begleiterherausforderung abschließen",
    "Completar su desafío especial de compañero",
    "Voltooi de speciale metgezeluitdaging",
    "Completa la sua Sfida speciale compagno",
    "Terminer son défi spécial de compagnon",
    "Завершите особое испытание спутника",
    "Özel Yoldaş Mücadelesini tamamla"
  ],
  "All unlock requirements are complete.": [
    "Alle Freischaltbedingungen erfüllt.",
    "Todos los requisitos de desbloqueo están completos.",
    "Alle ontgrendelvereisten zijn voltooid.",
    "Tutti i requisiti di sblocco sono completati.",
    "Toutes les conditions de déblocage sont remplies.",
    "Все условия разблокировки выполнены.",
    "Tüm kilit açma koşulları tamamlandı."
  ],
  "Mastered": [
    "Gemeistert",
    "Dominado",
    "Beheerst",
    "Padroneggiato",
    "Maîtrisé",
    "Освоено",
    "Ustalaşıldı"
  ],
  "Complete mastery requirements": [
    "Meisterschaftsbedingungen erfüllen",
    "Completar requisitos de maestría",
    "Voltooi meesterschapsvereisten",
    "Completa i requisiti di maestria",
    "Remplir les conditions de maîtrise",
    "Выполните условия мастерства",
    "Ustalık gereksinimlerini tamamla"
  ],
  "Recruit companion": [
    "Begleiter rekrutieren",
    "Reclutar compañero",
    "Metgezel rekruteren",
    "Recluta compagno",
    "Recruter un compagnon",
    "Нанять спутника",
    "Yoldaş al"
  ],
  "Recruited": [
    "Rekrutiert",
    "Reclutado",
    "Gerekruteerd",
    "Reclutato",
    "Recruté",
    "Нанят",
    "Alındı"
  ],
  "Permanent account unlock": [
    "Dauerhafte Kontofreischaltung",
    "Desbloqueo permanente de cuenta",
    "Permanente accountontgrendeling",
    "Sblocco permanente account",
    "Déblocage permanent du compte",
    "Постоянная разблокировка аккаунта",
    "Kalıcı hesap kilidi açma"
  ],
  "Final rarity ascension": [
    "Letzter Seltenheitsaufstieg",
    "Ascensión final de rareza",
    "Laatste zeldzaamheidsverheffing",
    "Ascensione finale della rarità",
    "Ascension finale de rareté",
    "Последнее возвышение редкости",
    "Son nadirlik yükselişi"
  ],
  "Reach Level 35 after Ascension III": [
    "Erreiche Stufe 35 nach Aufstieg III",
    "Alcanza nivel 35 tras Ascensión III",
    "Bereik niveau 35 na Verheffing III",
    "Raggiungi livello 35 dopo Ascensione III",
    "Atteignez le niveau 35 après l'Ascension III",
    "Достигните уровня 35 после Возвышения III",
    "III. Yükselişten sonra 35. seviyeye ulaş"
  ],
  "Final Prestige mastery marker": [
    "Abschlussmarke der Prestige-Meisterschaft",
    "Marca final de maestría de prestigio",
    "Laatste prestigemeesterschapsmijlpaal",
    "Traguardo finale maestria prestigio",
    "Jalon final de maîtrise prestige",
    "Финальная отметка престижного мастерства",
    "Son Prestij Ustalığı aşaması"
  ],
  "First Bond reward": [
    "Erste Bindungsbelohnung",
    "Primera recompensa de vínculo",
    "Eerste bandbeloning",
    "Prima ricompensa legame",
    "Première récompense de lien",
    "Первая награда за связь",
    "İlk Bağ ödülü"
  ],
  "Passive improvement milestone": [
    "Meilenstein für passive Verbesserung",
    "Hito de mejora pasiva",
    "Mijlpaal voor passieve verbetering",
    "Traguardo miglioramento passivo",
    "Palier d'amélioration passive",
    "Этап улучшения пассивного эффекта",
    "Pasif gelişim aşaması"
  ],
  "Continue companion progression": [
    "Begleiter weiterentwickeln",
    "Seguir progresando con el compañero",
    "Ga verder met metgezelvoortgang",
    "Continua la progressione del compagno",
    "Poursuivre la progression du compagnon",
    "Продолжить развитие спутника",
    "Yoldaş gelişimine devam et"
  ]
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string]>;

const indexByLanguage:Partial<Record<Language,number>>={de:0,es:1,nl:2,it:3,fr:4,ru:5,tr:6};
export function companionGuidanceText(language:Language,source:string):string|undefined{
 const row=Object.prototype.hasOwnProperty.call(companionGuidanceRows,source)
  ? companionGuidanceRows[source as keyof typeof companionGuidanceRows]:undefined;
 if(!row)return undefined;
 const index=indexByLanguage[language];
 return index===undefined?source:row[index];
}
