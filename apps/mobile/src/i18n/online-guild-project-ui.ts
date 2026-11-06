import {useMemo} from 'react';
import type {Language} from './languages';
import {useGameLanguage} from './GameLanguageProvider';
import {interpolateTranslation,type TranslationParams} from './translator';

/** Fixed active Online Guild Projects UI; numbers and server-authored project text remain authoritative. */
export const onlineGuildProjectUiRows={
  "Guild Projects": ["Gildenprojekte","Proyectos del gremio","Gildeprojecten","Progetti di gilda","Projets de guilde","Проекты гильдии","Lonca Projeleri"],
  "Join a Guild to view shared weekly progress.": ["Tritt einer Gilde bei, um den Wochenfortschritt zu sehen.","Únete a un gremio para ver el progreso semanal compartido.","Word lid van een gilde om de wekelijkse voortgang te bekijken.","Unisciti a una gilda per vedere i progressi settimanali.","Rejoignez une guilde pour voir la progression hebdomadaire.","Вступите в гильдию, чтобы увидеть общий недельный прогресс.","Haftalık ortak ilerlemeyi görmek için bir loncaya katıl."],
  "GUILD COOPERATION": ["GILDENZUSAMMENARBEIT","COOPERACIÓN DEL GREMIO","GILDESAMENWERKING","COOPERAZIONE DI GILDA","ENTRAIDE DE GUILDE","СОТРУДНИЧЕСТВО ГИЛЬДИИ","LONCA İŞ BİRLİĞİ"],
  "Weekly Projects": ["Wochenprojekte","Proyectos semanales","Weekprojecten","Progetti settimanali","Projets hebdomadaires","Еженедельные проекты","Haftalık Projeler"],
  "SHARED": ["GEMEINSAM","COMPARTIDO","GEZAMENLIJK","CONDIVISO","PARTAGÉ","ОБЩЕЕ","ORTAK"],
  "No active Guild Project": ["Kein aktives Gildenprojekt","No hay proyectos de gremio activos","Geen actief gildeproject","Nessun progetto di gilda attivo","Aucun projet de guilde actif","Активных проектов гильдии нет","Etkin Lonca Projesi yok"],
  "Vote below to choose the next project.": ["Stimme unten über das nächste Projekt ab.","Vota abajo para elegir el próximo proyecto.","Stem hieronder op het volgende project.","Vota qui sotto per scegliere il prossimo progetto.","Votez ci-dessous pour choisir le prochain projet.","Проголосуйте ниже за следующий проект.","Sonraki projeyi seçmek için aşağıdan oy ver."],
  "Next weekly project": ["Nächstes Wochenprojekt","Próximo proyecto semanal","Volgend weekproject","Prossimo progetto settimanale","Prochain projet hebdomadaire","Следующий недельный проект","Sonraki haftalık proje"],
  "One vote per member": ["Eine Stimme pro Mitglied","Un voto por miembro","Eén stem per lid","Un voto per membro","Un vote par membre","Один голос на участника","Üye başına bir oy"],
  "Recent Guild progress": ["Letzter Gildenfortschritt","Progreso reciente del gremio","Recente gildevoortgang","Progressi recenti della gilda","Progression récente de guilde","Недавний прогресс гильдии","Son lonca ilerlemesi"],
  "Recent Guild activity": ["Letzte Gildenaktivität","Actividad reciente del gremio","Recente gildeactiviteit","Attività recente di gilda","Activité récente de guilde","Недавняя активность гильдии","Son lonca etkinliği"],
  "{completed} completed · {events} events": ["{completed} abgeschlossen · {events} Ereignisse","{completed} completados · {events} eventos","{completed} voltooid · {events} gebeurtenissen","{completed} completati · {events} eventi","{completed} terminés · {events} événements","Завершено: {completed} · событий: {events}","{completed} tamamlandı · {events} etkinlik"],
  "REWARD": ["BELOHNUNG","RECOMPENSA","BELONING","RICOMPENSA","RÉCOMPENSE","НАГРАДА","ÖDÜL"],
  "Refreshing…": ["Wird aktualisiert…","Actualizando…","Vernieuwen…","Aggiornamento…","Actualisation…","Обновление…","Yenileniyor…"],
  "Refresh Projects": ["Projekte aktualisieren","Actualizar proyectos","Projecten vernieuwen","Aggiorna progetti","Actualiser les projets","Обновить проекты","Projeleri yenile"],
  "VOTED": ["ABGESTIMMT","VOTADO","GESTEMD","VOTATO","VOTE ENREGISTRÉ","ГОЛОС УЧТЁН","OY VERİLDİ"],
  "Voting closes {date}": ["Abstimmung endet {date}","Votación cierra {date}","Stemmen sluit {date}","Votazione fino al {date}","Fin du vote : {date}","Голосование до {date}","Oylama bitişi: {date}"],
  "Your vote": ["Deine Stimme","Tu voto","Jouw stem","Il tuo voto","Votre vote","Ваш голос","Senin oyun"],
  "Vote": ["Abstimmen","Votar","Stemmen","Vota","Voter","Голосовать","Oy ver"],
  "Start project": ["Projekt starten","Iniciar proyecto","Project starten","Avvia progetto","Lancer le projet","Начать проект","Projeyi başlat"],
  "Project contributions: {name}": ["Projektbeiträge: {name}","Aportes al proyecto: {name}","Projectbijdragen: {name}","Contributi al progetto: {name}","Contributions au projet : {name}","Вклад в проект: {name}","Proje katkıları: {name}"],
  "Show or hide contributions from Guild members": ["Gildenbeiträge ein- oder ausblenden","Mostrar u ocultar aportes de los miembros","Toon of verberg bijdragen van gildeleden","Mostra o nascondi i contributi dei membri","Afficher ou masquer les contributions des membres","Показать или скрыть вклад участников гильдии","Lonca üyelerinin katkılarını göster veya gizle"],
  "Weekly": ["Wöchentlich","Semanal","Wekelijks","Settimanale","Hebdomadaire","Еженедельный","Haftalık"],
  "Development": ["Ausbau","Desarrollo","Ontwikkeling","Sviluppo","Développement","Развитие","Gelişim"],
  "Event": ["Ereignis","Evento","Evenement","Evento","Événement","Событие","Etkinlik"],
  "DONE": ["FERTIG","HECHO","KLAAR","FATTO","TERMINÉ","ГОТОВО","TAMAM"],
  "ACTIVE": ["AKTIV","ACTIVO","ACTIEF","ATTIVO","ACTIF","АКТИВНО","ETKİN"],
  "Resource goals": ["Ressourcenziele","Objetivos de recursos","Grondstofdoelen","Obiettivi risorse","Objectifs de ressources","Цели по ресурсам","Kaynak hedefleri"],
  "Guild progress": ["Gildenfortschritt","Progreso del gremio","Gildevoortgang","Progresso gilda","Progression de guilde","Прогресс гильдии","Lonca ilerlemesi"],
  "{count}/{minimum} contributors": ["{count}/{minimum} Mitwirkende","{count}/{minimum} participantes","{count}/{minimum} bijdragers","{count}/{minimum} contributori","{count}/{minimum} contributeurs","Участники: {count}/{minimum}","{count}/{minimum} katkıcı"],
  "Hide contribution ▴": ["Beiträge ausblenden ▴","Ocultar aportes ▴","Bijdragen verbergen ▴","Nascondi contributi ▴","Masquer les contributions ▴","Скрыть вклад ▴","Katkıları gizle ▴"],
  "Contribution ▾": ["Beiträge ▾","Aportes ▾","Bijdragen ▾","Contributi ▾","Contributions ▾","Вклад ▾","Katkılar ▾"],
  "Weekly reset: Monday at 00:00 UTC": ["Wochenreset: Montag, 00:00 UTC","Reinicio semanal: lunes a las 00:00 UTC","Wekelijkse reset: maandag 00.00 UTC","Reset settimanale: lunedì alle 00:00 UTC","Réinitialisation : lundi à 00 h UTC","Сброс: понедельник, 00:00 UTC","Haftalık sıfırlama: Pazartesi 00.00 UTC"],
  "Your contribution": ["Dein Beitrag","Tu aporte","Jouw bijdrage","Il tuo contributo","Votre contribution","Ваш вклад","Senin katkın"],
  "QUALIFIED": ["BERECHTIGT","APTO","GESLAAGD","IDONEO","ÉLIGIBLE","УСЛОВИЯ ВЫПОЛНЕНЫ","HAK KAZANDI"],
  "/ {count} needed": ["/ {count} benötigt","/ se necesitan {count}","/ {count} nodig","/ {count} richiesti","/ {count} requis","/ нужно {count}","/ {count} gerekli"],
  "Shared contribution": ["Gemeinsamer Beitrag","Aporte compartido","Gezamenlijke bijdrage","Contributo condiviso","Contribution commune","Общий вклад","Ortak katkı"],
  "Weekly projects start automatically every Monday. No vote is needed.": ["Wochenprojekte starten jeden Montag automatisch. Keine Abstimmung nötig.","Los proyectos semanales empiezan automáticamente cada lunes. No hay votación.","Weekprojecten beginnen elke maandag automatisch. Stemmen is niet nodig.","I progetti settimanali iniziano automaticamente ogni lunedì. Non serve votare.","Les projets hebdomadaires démarrent automatiquement le lundi. Aucun vote nécessaire.","Еженедельные проекты начинаются автоматически по понедельникам. Голосование не требуется.","Haftalık projeler her pazartesi otomatik başlar. Oylama gerekmez."],
  "{amount} Gold · Guild Bank reward": ["{amount} Gold · Gildenbank-Belohnung","{amount} de oro · Recompensa para el banco del gremio","{amount} goud · Beloning voor de gildebank","{amount} oro · Ricompensa per la banca di gilda","{amount} pièces d'or · Récompense pour la banque de guilde","{amount} золота · Награда в банк гильдии","{amount} Altın · Lonca Bankası ödülü"],
  "Claim Guild Bank Gold": ["Gold für die Gildenbank einfordern","Reclamar oro para el banco del gremio","Goud voor de gildebank claimen","Riscatta oro per la banca di gilda","Réclamer l'or pour la banque de guilde","Получить золото в банк гильдии","Lonca Bankası Altınını al"],
  "Daily cap: 2,400 effort · Max 50% per member (Guilds of 2+) · 300 effort for Guild Bank reward · Claim within 7 days.": ["Tageslimit: 2.400 Einsatzpunkte · Max. 50 % pro Mitglied (ab 2) · 300 Punkte für die Gildenbank · In 7 Tagen einfordern.","Límite diario: 2400 puntos · Máx. 50 % por miembro (2+) · 300 puntos para el banco del gremio · Reclama en 7 días.","Daglimiet: 2.400 inzet · Max. 50% per lid (2+) · 300 inzet voor de gildebank · Claim binnen 7 dagen.","Limite giornaliero: 2.400 punti · Max. 50% per membro (2+) · 300 punti per la banca di gilda · Riscatta entro 7 giorni.","Plafond quotidien : 2 400 points · 50 % max. par membre (2+) · 300 points pour la banque de guilde · À réclamer sous 7 jours.","Дневной лимит: 2 400 очков · Максимум 50% на участника (от 2) · 300 очков для банка · Получить за 7 дней.","Günlük sınır: 2.400 puan · Üye başına en fazla %50 (2+) · Lonca Bankası için 300 puan · 7 günde al."],
  "500 Gold · Personal reward": ["500 Gold · Persönliche Belohnung","500 de oro · Recompensa personal","500 goud · Persoonlijke beloning","500 oro · Ricompensa personale","500 pièces d'or · Récompense personnelle","500 золота · Личная награда","500 Altın · Kişisel ödül"],
  "Already claimed": ["Bereits abgeholt","Ya reclamado","Al geclaimd","Già riscattato","Déjà récupérée","Уже получено","Zaten alındı"],
  "Ready if eligible": ["Bei Berechtigung abholbar","Disponible si cumples los requisitos","Beschikbaar bij voldoende bijdrage","Disponibile se idoneo","Disponible si éligible","Доступно при выполнении условий","Şartlar sağlanırsa alınabilir"],
  "Available after Guild completion": ["Nach Gildenabschluss verfügbar","Disponible al completar el gremio","Beschikbaar na voltooiing door gilde","Disponibile a progetto completato","Disponible après la réussite de la guilde","Доступно после завершения гильдией","Lonca tamamladıktan sonra alınabilir"],
  "Guild receives": ["Gilde erhält","El gremio recibe","Gilde ontvangt","La gilda riceve","La guilde reçoit","Гильдия получает","Lonca kazanır"],
  "200 Hall progress": ["200 Hall-Fortschritt","200 de progreso de sala","200 halvoortgang","200 punti progresso sala","200 points de progression du hall","200 очков развития зала","200 Salon ilerlemesi"],
  "Contribute now": ["Jetzt beitragen","Contribuir ahora","Nu bijdragen","Contribuisci ora","Contribuer","Внести вклад","Şimdi katkıda bulun"],
  "ANY ACTIVITY": ["JEDE AKTIVITÄT","CUALQUIER ACTIVIDAD","ELKE ACTIVITEIT","OGNI ATTIVITÀ","TOUTE ACTIVITÉ","ЛЮБАЯ АКТИВНОСТЬ","HER ETKİNLİK"],
  "Open {title} to contribute": ["{title} öffnen, um beizutragen","Abre {title} para contribuir","Open {title} om bij te dragen","Apri {title} per contribuire","Ouvrir {title} pour contribuer","Открыть {title}, чтобы внести вклад","Katkı için {title} aç"],
  "Combat": ["Kampf","Combate","Gevecht","Combattimento","Combat","Бой","Savaş"],
  "Gather": ["Sammeln","Recolectar","Verzamelen","Raccolta","Récolte","Сбор","Toplama"],
  "Craft": ["Herstellen","Fabricar","Maken","Creazione","Fabrication","Создание","Üretim"],
  "20 / active minute": ["20 / aktive Minute","20 / minuto activo","20 / actieve minuut","20 / minuto attivo","20 / minute active","20 / активную минуту","20 / etkin dakika"],
  "5 / crafted item": ["5 / hergestelltes Stück","5 / objeto fabricado","5 / gemaakt voorwerp","5 / oggetto creato","5 / objet fabriqué","5 / созданный предмет","5 / üretilen eşya"],
  "Combat/Gathering: 20 effort/min · Crafting: 5/item.": ["Kampf/Sammeln: 20 Punkte/Min. · Herstellen: 5/Stück.","Combate/recolección: 20 puntos/min · Fabricación: 5/objeto.","Gevecht/verzamelen: 20 punten/min · Maken: 5/stuk.","Combattimento/raccolta: 20 punti/min · Creazione: 5/oggetto.","Combat/récolte : 20 pts/min · Fabrication : 5/objet.","Бой/сбор: 20 очков/мин · Создание: 5/предмет.","Savaş/toplama: 20 puan/dk · Üretim: 5/eşya."],
  "Claiming…": ["Wird abgeholt…","Reclamando…","Claimen…","Riscatto in corso…","Récupération…","Получение…","Alınıyor…"],
  "Claim 500 Gold": ["500 Gold abholen","Reclamar 500 de oro","Claim 500 goud","Riscatta 500 oro","Récupérer 500 pièces d'or","Получить 500 золота","500 Altın al"],
  "Reward claimed": ["Belohnung abgeholt","Recompensa reclamada","Beloning geclaimd","Ricompensa riscattata","Récompense récupérée","Награда получена","Ödül alındı"],
  "Personal contribution threshold not met": ["Persönlichen Mindestbeitrag nicht erreicht","No alcanzaste el aporte personal mínimo","Persoonlijke minimuminzet niet gehaald","Contributo personale minimo non raggiunto","Seuil de contribution personnelle non atteint","Недостаточный личный вклад","Kişisel katkı eşiğine ulaşılmadı"],
  "Reward claim period ended": ["Abholfrist abgelaufen","Plazo de recompensa terminado","Claimperiode verlopen","Periodo di riscatto terminato","Délai de récupération expiré","Срок получения награды истёк","Ödül alma süresi doldu"],
  "Member contribution": ["Mitgliederbeiträge","Aportes de miembros","Ledenbijdragen","Contributi dei membri","Contributions des membres","Вклад участников","Üye katkısı"],
  "{count} members": ["{count} Mitglieder","{count} miembros","{count} leden","{count} membri","{count} membres","Участники: {count}","{count} üye"],
  "No effort yet": ["Noch keine Punkte","Sin puntos aún","Nog geen punten","Nessun punto ancora","Aucun point pour le moment","Пока нет очков","Henüz puan yok"],
  "contributor": ["Mitwirkender","participante","bijdrager","contributore","contributeur","участник","katkıcı"],
  "{count} effort": ["{count} Einsatzpunkte","{count} puntos","{count} punten","{count} punti","{count} points","Очков: {count}","{count} puan"],
  "No Guild members found.": ["Keine Gildenmitglieder gefunden.","No se encontraron miembros.","Geen gildeleden gevonden.","Nessun membro trovato.","Aucun membre trouvé.","Участники гильдии не найдены.","Lonca üyesi bulunamadı."],
  "Ends {date}": ["Endet {date}","Termina {date}","Eindigt {date}","Termina il {date}","Se termine le {date}","Завершится {date}","Bitiş: {date}"],
  "View reward eligibility.": ["Belohnungsberechtigung ansehen.","Ver requisitos de recompensa.","Bekijk beloningsvoorwaarden.","Vedi requisiti della ricompensa.","Voir les conditions de récompense.","Посмотреть условия награды.","Ödül koşullarını gör."],
  "Daily cap: 2,400 effort · Max 50% per member (Guilds of 2+) · 300 effort for 500 Gold · Claim within 7 days.": ["Tageslimit: 2.400 Punkte · Max. 50 % pro Mitglied (ab 2 Mitgliedern) · 300 Punkte für 500 Gold · Innerhalb von 7 Tagen abholen.","Límite diario: 2400 puntos · Máx. 50% por miembro (gremios de 2+) · 300 puntos para 500 de oro · Reclama en 7 días.","Daglimiet: 2.400 punten · Max. 50% per lid (gildes met 2+) · 300 punten voor 500 goud · Claim binnen 7 dagen.","Limite giornaliero: 2.400 punti · Max 50% per membro (gilde da 2+) · 300 punti per 500 oro · Riscatta entro 7 giorni.","Plafond quotidien : 2 400 points · 50 % max. par membre (guildes de 2+) · 300 points pour 500 pièces d'or · 7 jours pour réclamer.","Дневной лимит: 2 400 очков · Не более 50% на участника (гильдии от 2 человек) · 300 очков за 500 золота · Получить за 7 дней.","Günlük sınır: 2.400 puan · Üye başına en fazla %50 (2+ üyeli loncalar) · 500 Altın için 300 puan · 7 gün içinde al."],
  "Combat: {count}": ["Kampf: {count}","Combate: {count}","Gevecht: {count}","Combattimento: {count}","Combat : {count}","Бой: {count}","Savaş: {count}"],
  "Skilling: {count}": ["Fertigkeiten: {count}","Habilidades: {count}","Vaardigheden: {count}","Abilità: {count}","Compétences : {count}","Навыки: {count}","Beceri: {count}"],
  "Gather {count}": ["Sammeln {count}","Recolección {count}","Verzamelen {count}","Raccolta {count}","Récolte {count}","Сбор {count}","Toplama {count}"],
  "Craft {count}": ["Herstellen {count}","Fabricación {count}","Maken {count}","Creazione {count}","Fabrication {count}","Создание {count}","Üretim {count}"],
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string]>;
export type OnlineGuildProjectUiKey=keyof typeof onlineGuildProjectUiRows;
const index:Partial<Record<Language,number>>={de:0,es:1,nl:2,it:3,fr:4,ru:5,tr:6};
export function onlineGuildProjectUiText(language:Language,key:OnlineGuildProjectUiKey,params:TranslationParams={}):string{
 const i=index[language];
 return interpolateTranslation(i===undefined?key:onlineGuildProjectUiRows[key][i],params);
}
export function useOnlineGuildProjectUiText(){
 const language=useGameLanguage();
 return useMemo(()=>(key:OnlineGuildProjectUiKey,params?:TranslationParams)=>onlineGuildProjectUiText(language,key,params),[language]);
}
