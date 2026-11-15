import type {Language} from './languages';
import {SUPPORTED_LANGUAGES} from './languages';
import {interpolateTranslation,type TranslationParams} from './translator';
import {progressionText} from './progression';

/** Fixed, authored Journal UI copy. Unknown/server-provided content falls back through
 * the existing progression catalog and then English, without translating dynamic values.
 * Columns: de, es, nl, it, fr, ru, tr. */
type SevenLocales=readonly [string,string,string,string,string,string,string];
export const questJournalUiRows={
  "Open Sunscar": ["Sunscar öffnen","Abrir Sunscar","Sunscar openen","Apri Sunscar","Ouvrir Sunscar","Открыть Sunscar","Sunscar'ı aç"],
  "Regional story leads continue in the World.": ["Die regionale Geschichte geht in der Welt weiter.","Las pistas de la historia regional continúan en el Mundo.","Regionale verhaalsporen gaan verder in de Wereld.","Gli indizi della storia regionale continuano nel Mondo.","Les pistes de l'histoire régionale se poursuivent dans le Monde.","Региональные сюжетные следы продолжаются в разделе «Мир».","Bölgesel hikâye ipuçları Dünya bölümünde devam ediyor."],
  "Follow the oathglass signal into Sunscar.": ["Folge dem Oathglass-Signal nach Sunscar.","Sigue la señal del Oathglass hasta Sunscar.","Volg het Oathglass-signaal naar Sunscar.","Segui il segnale del Oathglass fino a Sunscar.","Suivez le signal du Oathglass jusqu’à Sunscar.","Следуйте сигналу Oathglass в Sunscar.","Oathglass sinyalini Sunscar'a kadar izle."],
  "NEXT FRONTIER": ["NÄCHSTE GRENZE","SIGUIENTE FRONTERA","VOLGEND GRENSGEBIED","PROSSIMA FRONTIERA","PROCHAINE FRONTIÈRE","НОВЫЙ РУБЕЖ","SONRAKİ SINIR"],
  "ACT PROGRESS": ["AKTFORTSCHRITT","PROGRESO DEL ACTO","VOORTGANG AKTE","PROGRESSO ATTO","PROGRESSION DE L'ACTE","ПРОГРЕСС АКТА","PERDE İLERLEMESİ"],
  "STORY PROGRESS": ["STORYFORTSCHRITT","PROGRESO DE LA HISTORIA","VERHAALVOORTGANG","PROGRESSO STORIA","PROGRESSION DE L'HISTOIRE","ПРОГРЕСС ИСТОРИИ","HİKÂYE İLERLEMESİ"],
  "The Asterfall chronicle is complete": ["Die Chronik von Asterfall ist abgeschlossen","La crónica de Asterfall está completa","De kroniek van Asterfall is voltooid","La cronaca di Asterfall è completa","La chronique d’Asterfall est terminée","Хроника Астерфолла завершена","Asterfall Güncesi tamamlandı"],
  "The road leads onward to Sunscar.": ["Der Weg führt weiter nach Sunscar.","El camino continúa hacia Sunscar.","De weg leidt verder naar Sunscar.","La strada prosegue verso Sunscar.","La route mène désormais à Sunscar.","Дорога ведёт дальше, в Sunscar.","Yol Sunscar'a uzanıyor."],
  "THE CHRONICLE": ["DIE CHRONIK","LA CRÓNICA","DE KRONIEK","LA CRONACA","LA CHRONIQUE","ХРОНИКА","GÜNCE"],
  "Recovered clues": ["Entdeckte Hinweise","Pistas recuperadas","Gevonden aanwijzingen","Indizi recuperati","Indices retrouvés","Найденные улики","Bulunan ipuçları"],
  "Read recovered pages": ["Gefundene Seiten lesen","Leer páginas recuperadas","Gevonden pagina's lezen","Leggi le pagine recuperate","Lire les pages retrouvées","Читать найденные страницы","Bulunan sayfaları oku"],
  "Hide recovered pages": ["Gefundene Seiten verbergen","Ocultar páginas recuperadas","Gevonden pagina's verbergen","Nascondi le pagine recuperate","Masquer les pages retrouvées","Скрыть найденные страницы","Bulunan sayfaları gizle"],
  "No clues recovered yet. Claim story rewards to uncover the old oath.": ["Noch keine Hinweise gefunden. Hole Storybelohnungen ab, um den alten Eid zu enträtseln.","Aún no hay pistas. Reclama recompensas de la historia para descubrir el antiguo juramento.","Nog geen aanwijzingen gevonden. Claim verhaalbeloningen om de oude eed te ontrafelen.","Nessun indizio trovato. Riscatta le ricompense della storia per scoprire l'antico giuramento.","Aucun indice retrouvé. Récupérez les récompenses de l'histoire pour percer l'ancien serment.","Пока нет найденных улик. Получайте награды сюжета, чтобы раскрыть древнюю клятву.","Henüz ipucu bulunmadı. Eski yemini çözmek için hikâye ödüllerini al."],
  "NEW DISCOVERY": ["NEUE ENTDECKUNG","NUEVO DESCUBRIMIENTO","NIEUWE ONTDEKKING","NUOVA SCOPERTA","NOUVELLE DÉCOUVERTE","НОВАЯ НАХОДКА","YENİ KEŞİF"],
  "Complete earlier chapters to read this story page.": ["Schließe frühere Kapitel ab, um diese Storyseite zu lesen.","Completa los capítulos anteriores para leer esta página de historia.","Voltooi eerdere hoofdstukken om deze verhaalpagina te lezen.","Completa i capitoli precedenti per leggere questa pagina di storia.","Terminez les chapitres précédents pour lire cette page de l'histoire.","Завершите предыдущие главы, чтобы прочитать эту страницу истории.","Bu hikâye sayfasını okumak için önceki bölümleri tamamla."],
  "CHAPTER": ["KAPITEL","CAPÍTULO","HOOFDSTUK","CAPITOLO","CHAPITRE","ГЛАВА","BÖLÜM"],
  "Could not claim reward. Please try again.": [
    "Belohnung konnte nicht abgeholt werden. Bitte erneut versuchen.",
    "No se pudo reclamar la recompensa. Inténtalo de nuevo.",
    "Beloning claimen mislukt. Probeer het opnieuw.",
    "Impossibile riscattare la ricompensa. Riprova.",
    "Impossible de récupérer la récompense. Réessayez.",
    "Не удалось получить награду. Повторите попытку.",
    "Ödül alınamadı. Tekrar dene."
  ],
  "Quest Journal": [
    "Questtagebuch",
    "Diario de misiones",
    "Missiedagboek",
    "Diario delle missioni",
    "Journal des quêtes",
    "Журнал заданий",
    "Görev Günlüğü"
  ],
  "Your next chapter, story progress and rewards.": [
    "Dein nächstes Kapitel, der Fortschritt und die Belohnungen.",
    "Tu siguiente capítulo, progreso y recompensas.",
    "Je volgende hoofdstuk, voortgang en beloningen.",
    "Il prossimo capitolo, i progressi e le ricompense.",
    "Votre prochain chapitre, votre progression et vos récompenses.",
    "Следующая глава, прогресс истории и награды.",
    "Sonraki bölümün, hikâye ilerlemen ve ödüllerin."
  ],
  "Weekly Contracts": [
    "Wochenaufträge",
    "Contratos semanales",
    "Weekcontracten",
    "Contratti settimanali",
    "Contrats hebdomadaires",
    "Еженедельные контракты",
    "Haftalık Sözleşmeler"
  ],
  "Weekly assignments and automatic reward processing.": [
    "Wöchentliche Aufträge mit automatischer Belohnungsvergabe.",
    "Encargos semanales con entrega automática de recompensas.",
    "Wekelijkse opdrachten met automatische beloningsverwerking.",
    "Incarichi settimanali con assegnazione automatica delle ricompense.",
    "Missions hebdomadaires et attribution automatique des récompenses.",
    "Еженедельные задания с автоматической выдачей наград.",
    "Haftalık görevler ve otomatik ödül dağıtımı."
  ],
  "Your daily, weekly and monthly class objectives.": [
    "Deine täglichen, wöchentlichen und monatlichen Klassenziele.",
    "Tus objetivos de clase diarios, semanales y mensuales.",
    "Je dagelijkse, wekelijkse en maandelijkse klassedoelen.",
    "I tuoi obiettivi di classe giornalieri, settimanali e mensili.",
    "Vos objectifs de classe quotidiens, hebdomadaires et mensuels.",
    "Ежедневные, еженедельные и ежемесячные цели класса.",
    "Günlük, haftalık ve aylık sınıf hedeflerin."
  ],
  "Dismiss": [
    "Schließen",
    "Descartar",
    "Sluiten",
    "Chiudi",
    "Fermer",
    "Закрыть",
    "Kapat"
  ],
  "REWARDS SECURED": [
    "BELOHNUNGEN ERHALTEN",
    "RECOMPENSAS OBTENIDAS",
    "BELONINGEN ONTVANGEN",
    "RICOMPENSE OTTENUTE",
    "RÉCOMPENSES OBTENUES",
    "НАГРАДЫ ПОЛУЧЕНЫ",
    "ÖDÜLLER ALINDI"
  ],
  "The story continues": [
    "Die Geschichte geht weiter",
    "La historia continúa",
    "Het verhaal gaat verder",
    "La storia continua",
    "L'histoire continue",
    "История продолжается",
    "Hikâye Devam Ediyor"
  ],
  "CURRENT OBJECTIVE": [
    "AKTUELLES ZIEL",
    "OBJETIVO ACTUAL",
    "HUIDIG DOEL",
    "OBIETTIVO ATTUALE",
    "OBJECTIF ACTUEL",
    "ТЕКУЩАЯ ЦЕЛЬ",
    "MEVCUT HEDEF"
  ],
  "Claim rewards": [
    "Belohnungen abholen",
    "Reclamar recompensas",
    "Beloningen claimen",
    "Riscatta ricompense",
    "Récupérer les récompenses",
    "Получить награды",
    "Ödülleri al"
  ],
  "View objective": [
    "Ziel ansehen",
    "Ver objetivo",
    "Doel bekijken",
    "Visualizza obiettivo",
    "Voir l'objectif",
    "Посмотреть цель",
    "Hedefi görüntüle"
  ],
  "STORY CHAPTERS": [
    "STORYKAPITEL",
    "CAPÍTULOS DE HISTORIA",
    "VERHAALHOOFDSTUKKEN",
    "CAPITOLI DELLA STORIA",
    "CHAPITRES DE L'HISTOIRE",
    "ГЛАВЫ ИСТОРИИ",
    "HİKÂYE BÖLÜMLERİ"
  ],
  "total": [
    "gesamt",
    "en total",
    "totaal",
    "totali",
    "au total",
    "всего",
    "toplam"
  ],
  "Search chapters…": [
    "Kapitel suchen…",
    "Buscar capítulos…",
    "Hoofdstukken zoeken…",
    "Cerca capitoli…",
    "Rechercher des chapitres…",
    "Поиск глав…",
    "Bölüm ara…"
  ],
  "Change the filter or search to see more chapters.": [
    "Filter oder Suche ändern, um weitere Kapitel zu sehen.",
    "Cambia el filtro o la búsqueda para ver más capítulos.",
    "Wijzig het filter of de zoekopdracht om meer hoofdstukken te zien.",
    "Cambia il filtro o la ricerca per vedere altri capitoli.",
    "Modifiez le filtre ou la recherche pour voir d'autres chapitres.",
    "Измените фильтр или запрос, чтобы найти другие главы.",
    "Daha fazla bölüm görmek için filtreyi veya aramayı değiştir."
  ],
  "WEEKLY CONTRACT BOARD": [
    "WOCHENAUFTRÄGE",
    "TABLÓN DE CONTRATOS SEMANALES",
    "BORD VOOR WEEKCONTRACTEN",
    "BACHECA DEI CONTRATTI SETTIMANALI",
    "TABLEAU DES CONTRATS HEBDOMADAIRES",
    "ДОСКА ЕЖЕНЕДЕЛЬНЫХ КОНТРАКТОВ",
    "HAFTALIK SÖZLEŞME PANOSU"
  ],
  "Assignments complete": [
    "Aufträge abgeschlossen",
    "Encargos completados",
    "Opdrachten voltooid",
    "Incarichi completati",
    "Missions terminées",
    "Задания выполнены",
    "Görevler Tamamlandı"
  ],
  "rewards pending processing": [
    "Belohnungen werden verarbeitet",
    "recompensas pendientes de procesar",
    "beloningen worden verwerkt",
    "ricompense in elaborazione",
    "récompenses en cours de traitement",
    "наград ожидают обработки",
    "ödül işlenmeyi bekliyor"
  ],
  "Your focused weekly job expired. Showing the latest board.": [
    "Dein ausgewählter Wochenauftrag ist abgelaufen. Die aktuelle Übersicht wird angezeigt.",
    "Tu encargo semanal seleccionado ha caducado. Se muestra el tablón actual.",
    "Je geselecteerde weekopdracht is verlopen. Het nieuwste bord wordt getoond.",
    "L'incarico settimanale selezionato è scaduto. Ecco la bacheca aggiornata.",
    "Votre mission hebdomadaire sélectionnée a expiré. Voici le tableau actuel.",
    "Выбранное еженедельное задание истекло. Показана новая доска.",
    "Seçili haftalık görev sona erdi. Güncel pano gösteriliyor."
  ],
  "RECOMMENDED NEXT": [
    "ALS NÄCHSTES EMPFOHLEN",
    "SIGUIENTE RECOMENDACIÓN",
    "VOLGENDE AANBEVOLEN",
    "CONSIGLIATO ORA",
    "PROCHAINE ÉTAPE CONSEILLÉE",
    "РЕКОМЕНДУЕТСЯ ДАЛЬШЕ",
    "SONRAKİ ÖNERİ"
  ],
  "View job": [
    "Auftrag ansehen",
    "Ver encargo",
    "Opdracht bekijken",
    "Vedi incarico",
    "Voir la mission",
    "Посмотреть задание",
    "Görevi görüntüle"
  ],
  "WEEKLY ASSIGNMENTS": [
    "WOCHENAUFTRÄGE",
    "ENCARGOS SEMANALES",
    "WEEKOPDRACHTEN",
    "INCARICHI SETTIMANALI",
    "MISSIONS HEBDOMADAIRES",
    "ЕЖЕНЕДЕЛЬНЫЕ ЗАДАНИЯ",
    "HAFTALIK GÖREVLER"
  ],
  "Automatic rewards": [
    "Automatische Belohnungen",
    "Recompensas automáticas",
    "Automatische beloningen",
    "Ricompense automatiche",
    "Récompenses automatiques",
    "Автоматические награды",
    "Otomatik Ödüller"
  ],
  "Finish every posting for the full weekly board completion reward. Contract rewards are processed automatically.": [
    "Schließe alle Aufträge für die volle Wochenprämie ab. Vertragsbelohnungen werden automatisch vergeben.",
    "Completa todos los encargos para obtener la recompensa semanal completa. Las recompensas se entregan automáticamente.",
    "Voltooi alle opdrachten voor de volledige weekbeloning. Contractbeloningen worden automatisch verwerkt.",
    "Completa tutti gli incarichi per la ricompensa settimanale completa. Le ricompense vengono assegnate automaticamente.",
    "Terminez toutes les missions pour obtenir la récompense hebdomadaire complète. Les contrats sont récompensés automatiquement.",
    "Выполните все задания, чтобы получить полную недельную награду. Награды за контракты выдаются автоматически.",
    "Tam haftalık pano ödülünü almak için tüm görevleri bitir. Sözleşme ödülleri otomatik verilir."
  ],
  "Break the Last Oath": [
    "Den letzten Eid brechen",
    "Romper el último juramento",
    "Breek de laatste eed",
    "Spezzare l'ultimo giuramento",
    "Briser le dernier serment",
    "Разорвать последнюю клятву",
    "Son Yemini Boz"
  ],
  "Up to three rewarded rematch victories per UTC week. Earn Oathglass and bonus boss materials.": [
    "Bis zu drei belohnte Rückkämpfe pro UTC-Woche. Erhalte Oathglass und zusätzliche Bossmaterialien.",
    "Hasta tres victorias de revancha con recompensa por semana UTC. Consigue Oathglass y materiales extra del jefe.",
    "Maximaal drie beloonde herkansingen per UTC-week. Verdien Oathglass en extra baasmaterialen.",
    "Fino a tre rivincite premiate per settimana UTC. Ottieni Oathglass e materiali bonus del boss.",
    "Jusqu'à trois victoires de revanche récompensées par semaine UTC. Gagnez de l'Oathglass et des matériaux de boss bonus.",
    "До трёх повторных побед с наградами за неделю UTC. Получайте Oathglass и дополнительные материалы босса.",
    "UTC haftası başına en fazla üç ödüllü tekrar zaferi. Oathglass ve ek boss malzemeleri kazan."
  ],
  "CLASS OBJECTIVES": [
    "KLASSENZIELE",
    "OBJETIVOS DE CLASE",
    "KLASSENDOELEN",
    "OBIETTIVI DI CLASSE",
    "OBJECTIFS DE CLASSE",
    "ЦЕЛИ КЛАССА",
    "SINIF HEDEFLERİ"
  ],
  "CHALLENGE LIST": [
    "HERAUSFORDERUNGEN",
    "LISTA DE DESAFÍOS",
    "UITDAGINGEN",
    "ELENCO SFIDE",
    "LISTE DES DÉFIS",
    "СПИСОК ИСПЫТАНИЙ",
    "MÜCADELE LİSTESİ"
  ],
  "daily": [
    "täglich",
    "diarios",
    "dagelijks",
    "giornalieri",
    "quotidiens",
    "ежедневно",
    "günlük"
  ],
  "weekly": [
    "wöchentlich",
    "semanales",
    "wekelijks",
    "settimanali",
    "hebdomadaires",
    "еженедельно",
    "haftalık"
  ],
  "monthly": [
    "monatlich",
    "mensuales",
    "maandelijks",
    "mensili",
    "mensuels",
    "ежемесячно",
    "aylık"
  ],
  "REWARDS COLLECTED": [
    "BELOHNUNGEN ABGEHOLT",
    "RECOMPENSAS RECOGIDAS",
    "BELONINGEN OPGEHAALD",
    "RICOMPENSE RISCATTATE",
    "RÉCOMPENSES RÉCUPÉRÉES",
    "НАГРАДЫ ЗАБРАНЫ",
    "ÖDÜLLER TOPLANDI"
  ],
  "STORY CHAPTER": [
    "STORYKAPITEL",
    "CAPÍTULO DE HISTORIA",
    "VERHAALHOOFDSTUK",
    "CAPITOLO DELLA STORIA",
    "CHAPITRE DE L'HISTOIRE",
    "ГЛАВА ИСТОРИИ",
    "HİKÂYE BÖLÜMÜ"
  ],
  "WEEKLY CONTRACT": [
    "WOCHENAUFTRAG",
    "CONTRATO SEMANAL",
    "WEEKCONTRACT",
    "CONTRATTO SETTIMANALE",
    "CONTRAT HEBDOMADAIRE",
    "ЕЖЕНЕДЕЛЬНЫЙ КОНТРАКТ",
    "HAFTALIK SÖZLEŞME"
  ],
  "CLASS CHALLENGE": [
    "KLASSENHERAUSFORDERUNG",
    "DESAFÍO DE CLASE",
    "KLASSE-UITDAGING",
    "SFIDA DI CLASSE",
    "DÉFI DE CLASSE",
    "ИСПЫТАНИЕ КЛАССА",
    "SINIF MÜCADELESİ"
  ],
  "Reward collected · the next objective is ready when unlocked.": [
    "Belohnung erhalten · das nächste Ziel erscheint nach der Freischaltung.",
    "Recompensa recogida · el siguiente objetivo estará listo al desbloquearse.",
    "Beloning opgehaald · het volgende doel is beschikbaar na ontgrendeling.",
    "Ricompensa riscattata · il prossimo obiettivo sarà disponibile dopo lo sblocco.",
    "Récompense récupérée · le prochain objectif sera prêt une fois débloqué.",
    "Награда получена · следующая цель появится после открытия.",
    "Ödül alındı · sonraki hedef kilidi açılınca hazır olacak."
  ],
  "The server will verify your progress before granting this reward.": [
    "Der Server prüft deinen Fortschritt, bevor die Belohnung vergeben wird.",
    "El servidor verificará tu progreso antes de conceder la recompensa.",
    "De server controleert je voortgang voordat de beloning wordt toegekend.",
    "Il server verificherà i tuoi progressi prima di assegnare la ricompensa.",
    "Le serveur vérifiera votre progression avant d'accorder la récompense.",
    "Сервер проверит прогресс перед выдачей награды.",
    "Sunucu, ödülü vermeden önce ilerlemeni doğrulayacak."
  ],
  "Claim submitted · waiting for confirmation…": [
    "Anfrage gesendet · Bestätigung wird erwartet…",
    "Solicitud enviada · esperando confirmación…",
    "Claim ingediend · wachten op bevestiging…",
    "Richiesta inviata · in attesa di conferma…",
    "Demande envoyée · en attente de confirmation…",
    "Запрос отправлен · ожидание подтверждения…",
    "Ödül isteği gönderildi · onay bekleniyor…"
  ],
  "Read chapter story": [
    "Kapitelgeschichte lesen",
    "Leer la historia del capítulo",
    "Hoofdstukverhaal lezen",
    "Leggi la storia del capitolo",
    "Lire l'histoire du chapitre",
    "Читать историю главы",
    "Bölüm hikâyesini oku"
  ],
  "Rewards process automatically once the server confirms completion; no claim button is needed.": [
    "Nach Serverbestätigung werden Belohnungen automatisch vergeben; ein Abholen ist nicht nötig.",
    "Las recompensas se entregan automáticamente tras la confirmación del servidor; no es necesario reclamarlas.",
    "Na serverbevestiging worden beloningen automatisch verwerkt; claimen is niet nodig.",
    "Le ricompense vengono assegnate automaticamente dopo la conferma del server; non occorre riscattarle.",
    "Les récompenses sont attribuées automatiquement après confirmation du serveur ; aucune récupération manuelle n'est nécessaire.",
    "После подтверждения сервера награды выдаются автоматически; забирать их вручную не нужно.",
    "Sunucu tamamlandığını onaylayınca ödüller otomatik verilir; ayrıca almana gerek yok."
  ],
  "Reward preview": [
    "Belohnungsvorschau",
    "Vista previa de recompensa",
    "Voorbeeld beloning",
    "Anteprima ricompensa",
    "Aperçu de la récompense",
    "Предпросмотр награды",
    "Ödül Önizlemesi"
  ],
  "✓ Reward already collected": [
    "✓ Belohnung bereits abgeholt",
    "✓ Recompensa ya recogida",
    "✓ Beloning al opgehaald",
    "✓ Ricompensa già riscattata",
    "✓ Récompense déjà récupérée",
    "✓ Награда уже получена",
    "✓ Ödül zaten alındı"
  ],
  "✓ Objective complete · reward processing automatically": [
    "✓ Ziel abgeschlossen · Belohnung wird automatisch vergeben",
    "✓ Objetivo completado · recompensa en proceso automático",
    "✓ Doel voltooid · beloning wordt automatisch verwerkt",
    "✓ Obiettivo completato · ricompensa in elaborazione automatica",
    "✓ Objectif terminé · attribution automatique de la récompense",
    "✓ Цель выполнена · награда обрабатывается автоматически",
    "✓ Hedef tamamlandı · ödül otomatik işleniyor"
  ],
  "Continue": [
    "Weiter",
    "Continuar",
    "Verder",
    "Continua",
    "Continuer",
    "Продолжить",
    "Devam et"
  ],
  "Waiting for server confirmation…": [
    "Warten auf Serverbestätigung…",
    "Esperando confirmación del servidor…",
    "Wachten op serverbevestiging…",
    "In attesa della conferma del server…",
    "En attente de confirmation du serveur…",
    "Ожидание подтверждения сервера…",
    "Sunucu onayı bekleniyor…"
  ],
  "PROCESSING": [
    "WIRD VERARBEITET",
    "PROCESANDO",
    "WORDT VERWERKT",
    "IN ELABORAZIONE",
    "EN COURS",
    "ОБРАБОТКА",
    "İŞLENİYOR"
  ],
  "{title}, {status}, {current} of {max}": [
    "{title}, {status}, {current} von {max}",
    "{title}, {status}, {current} de {max}",
    "{title}, {status}, {current} van {max}",
    "{title}, {status}, {current} su {max}",
    "{title}, {status}, {current} sur {max}",
    "{title}, {status}, {current} из {max}",
    "{title}, {status}, {max} içinden {current}"
  ]
} as const satisfies Record<string,SevenLocales>;

export function questJournalText(language:Language,source:string,params:TranslationParams={}):string{
 const i=SUPPORTED_LANGUAGES.indexOf(language)-1;
 const translated=Object.prototype.hasOwnProperty.call(questJournalUiRows,source)&&i>=0
  ?questJournalUiRows[source as keyof typeof questJournalUiRows][i]
  :progressionText(language,source);
 return interpolateTranslation(translated??source,params);
}
