import {useMemo} from 'react';
import type {Language} from './languages';
import {useGameLanguage} from './GameLanguageProvider';
import {formatLocalizedNumber,interpolateTranslation,type TranslationParams} from './translator';
import type {LiveOpsEventStatus} from '../core/party-social';
import type {PartyWeeklyTier} from '../core/party-weekly-tiers';

/** Fixed Party Weekly and Party Event UI copy, ordered DE / ES / NL / IT / FR / RU / TR.
 * Server event names, user-entered Party names, activity tags, identity values and
 * unknown server eligibility reasons are deliberately not translated.
 */
export const partyProgressUiRows={
 "WEEKLY PARTY": ["WÖCHENTLICHE GRUPPE","GRUPO SEMANAL","WEKELIJKSE GROEP","GRUPPO SETTIMANALE","GROUPE HEBDOMADAIRE","ЕЖЕНЕДЕЛЬНАЯ ГРУППА","HAFTALIK GRUP"],
 "Week ended": ["Woche beendet","Semana terminada","Week afgelopen","Settimana conclusa","Semaine terminée","Неделя завершена","Hafta sona erdi"],
 "{count}h left": ["Noch {count} Std.","Quedan {count} h","Nog {count} uur","Restano {count} ore","Encore {count} h","Осталось {count} ч","{count} sa kaldı"],
 "{tier} reached": ["{tier} erreicht","Nivel {tier} alcanzado","{tier} bereikt","Raggiunto: {tier}","Palier {tier} atteint","Достигнут уровень «{tier}»","{tier} seviyesine ulaşıldı"],
 "Adventure together": ["Gemeinsam auf Abenteuer","Aventuras en equipo","Samen op avontuur","Avventure insieme","À l'aventure ensemble","Приключения вместе","Birlikte maceraya atıl"],
 "{hours} shared hours": ["{hours} gemeinsame Stunden","{hours} horas compartidas","{hours} gezamenlijke uren","{hours} ore condivise","{hours} heures partagées","Общих часов: {hours}","{hours} ortak saat"],
 "Next: {tier}": ["Nächstes Ziel: {tier}","Siguiente: {tier}","Volgende: {tier}","Prossimo: {tier}","Suivant : {tier}","Далее: {tier}","Sonraki: {tier}"],
 "All tiers reached": ["Alle Stufen erreicht","Todos los niveles alcanzados","Alle niveaus bereikt","Tutti i livelli raggiunti","Tous les paliers atteints","Все уровни достигнуты","Tüm kademelere ulaşıldı"],
 "Party progress · {tier}": ["Gruppenfortschritt · {tier}","Progreso del grupo · {tier}","Groepsvoortgang · {tier}","Progresso del gruppo · {tier}","Progression du groupe · {tier}","Прогресс группы · {tier}","Grup ilerlemesi · {tier}"],
 "Claim {gold} gold": ["{gold} Gold abholen","Reclamar {gold} de oro","{gold} goud claimen","Riscatta {gold} oro","Récupérer {gold} pièces d'or","Получить {gold} золота","{gold} altın al"],
 "Combat and gathering count equally. 1 hour = 1,000 points. Resets Monday, 00:00 UTC.": ["Kampf und Sammeln zählen gleich. 1 Stunde = 1.000 Punkte. Zurücksetzung montags um 00:00 UTC.","El combate y la recolección cuentan igual. 1 hora = 1000 puntos. Se reinicia el lunes a las 00:00 UTC.","Vechten en verzamelen tellen even zwaar. 1 uur = 1.000 punten. Reset op maandag om 00.00 UTC.","Combattimento e raccolta valgono uguale. 1 ora = 1.000 punti. Ripristino lunedì alle 00:00 UTC.","Combat et récolte comptent autant. 1 h = 1 000 points. Réinitialisation lundi à 00 h UTC.","Бои и сбор дают одинаковый вклад. 1 час = 1 000 очков. Сброс в понедельник в 00:00 UTC.","Savaş ve toplama eşit sayılır. 1 saat = 1.000 puan. Pazartesi 00.00 UTC'de sıfırlanır."],
 "Your contribution · {tier}": ["Dein Beitrag · {tier}","Tu contribución · {tier}","Jouw bijdrage · {tier}","Il tuo contributo · {tier}","Votre contribution · {tier}","Ваш вклад · {tier}","Katkın · {tier}"],
 "Your contribution": ["Dein Beitrag","Tu contribución","Jouw bijdrage","Il tuo contributo","Votre contribution","Ваш вклад","Katkın"],
 "Contribute 8% of each tier’s target to qualify. Rewards are per player.": ["Trage für die Belohnung 8 % jedes Stufenziels bei. Belohnungen gelten pro Spieler.","Aporta el 8 % del objetivo de cada nivel para optar a la recompensa. Cada jugador recibe su premio.","Draag 8% van elk niveaudoel bij om in aanmerking te komen. Beloningen zijn per speler.","Contribuisci all'8% di ogni obiettivo per qualificarti. Le ricompense sono individuali.","Contribuez à 8 % de l'objectif de chaque palier. Les récompenses sont individuelles.","Для награды внесите 8 % от цели каждого уровня. Награда выдаётся каждому игроку отдельно.","Ödüle hak kazanmak için her kademe hedefinin %8'ine katkı sağla. Ödüller oyuncu başınadır."],
 "Claimed": ["Abgeholt","Reclamado","Geclaimd","Riscattato","Récupéré","Получено","Alındı"],
 "Ready to claim": ["Abholbereit","Listo para reclamar","Klaar om te claimen","Pronto da riscattare","Prêt à récupérer","Можно забрать","Alınmaya hazır"],
 "Reward pending": ["Belohnung ausstehend","Recompensa pendiente","Beloning in afwachting","Ricompensa in attesa","Récompense en attente","Награда ожидается","Ödül bekleniyor"],
 "More contribution needed": ["Mehr Beitrag nötig","Falta contribución","Meer bijdrage nodig","Serve più contributo","Contribution insuffisante","Нужно больше вклада","Daha fazla katkı gerekli"],
 "Not reached": ["Noch nicht erreicht","No alcanzado","Niet bereikt","Non raggiunto","Non atteint","Не достигнуто","Ulaşılmadı"],
 "{gold} total": ["{gold} insgesamt","{gold} en total","{gold} totaal","{gold} totali","{gold} au total","Всего: {gold}","Toplam {gold}"],
 "{points} personal points left": ["Noch {points} persönliche Punkte","Faltan {points} puntos personales","Nog {points} persoonlijke punten","Mancano {points} punti personali","Encore {points} points personnels","Личных очков осталось: {points}","{points} kişisel puan kaldı"],
 "Claim each tier as you earn it. Keep contributing for bigger rewards.": ["Hole jede Stufenbelohnung ab und sammle weiter für größere Prämien.","Reclama cada nivel al alcanzarlo. Sigue aportando para obtener mejores recompensas.","Claim elk niveau zodra je het verdient. Blijf bijdragen voor grotere beloningen.","Riscatta ogni livello raggiunto. Continua a contribuire per premi migliori.","Récupérez chaque palier atteint et continuez pour de meilleures récompenses.","Забирайте награды по мере достижения уровней. Продолжайте помогать группе ради лучших наград.","Ulaştığın her kademenin ödülünü al. Daha büyük ödüller için katkıya devam et."],
 "Bronze": ["Bronze","Bronce","Brons","Bronzo","Bronze","Бронза","Bronz"],
 "Silver": ["Silber","Plata","Zilver","Argento","Argent","Серебро","Gümüş"],
 "Gold": ["Gold","Oro","Goud","Oro","Or","Золото","Altın"],
 "Platinum": ["Platin","Platino","Platina","Platino","Platine","Платина","Platin"],
 "Temporary Party Events appear here when a live-ops window is active. Weekly Party Contracts continue normally.": ["Zeitlich begrenzte Gruppenevents erscheinen hier während eines laufenden Events. Wöchentliche Gruppenverträge laufen weiter.","Los eventos temporales del grupo aparecen aquí mientras estén activos. Los contratos semanales continúan normalmente.","Tijdelijke groepsevenementen verschijnen hier wanneer ze actief zijn. Wekelijkse groepscontracten gaan gewoon door.","Gli eventi temporanei del gruppo appaiono qui quando sono attivi. I contratti settimanali continuano normalmente.","Les événements temporaires du groupe s'affichent ici pendant leur période active. Les contrats hebdomadaires continuent normalement.","Временные события группы появятся здесь, когда начнутся. Еженедельные контракты продолжаются как обычно.","Geçici Grup Etkinlikleri aktif olduklarında burada görünür. Haftalık Grup Sözleşmeleri normal şekilde devam eder."],
 "LIVE PARTY EVENT · {status}": ["GRUPPENEVENT · {status}","EVENTO DE GRUPO · {status}","GROEPSEVENEMENT · {status}","EVENTO DEL GRUPPO · {status}","ÉVÉNEMENT DE GROUPE · {status}","СОБЫТИЕ ГРУППЫ · {status}","GRUP ETKİNLİĞİ · {status}"],
 "scheduled": ["geplant","programado","gepland","programmato","programmé","запланировано","planlandı"],
 "active": ["aktiv","activo","actief","attivo","actif","активно","etkin"],
 "settling": ["Auswertung läuft","calculando","wordt verwerkt","in calcolo","calcul en cours","подведение итогов","hesaplanıyor"],
 "finalized": ["abgeschlossen","finalizado","afgerond","concluso","finalisé","итоги подведены","sonuçlandı"],
 "archived": ["archiviert","archivado","gearchiveerd","archiviato","archivé","в архиве","arşivlendi"],
 "overview": ["Übersicht","resumen","overzicht","panoramica","aperçu","обзор","genel bakış"],
 "milestones": ["Meilensteine","hitos","mijlpalen","traguardi","paliers","этапы","aşamalar"],
 "party": ["Gruppe","grupo","groep","gruppo","groupe","группа","grup"],
 "Next personal milestone · {points}": ["Nächster eigener Meilenstein · {points}","Próximo hito personal · {points}","Volgende persoonlijke mijlpaal · {points}","Prossimo traguardo personale · {points}","Prochain palier personnel · {points}","Следующий личный этап · {points}","Sonraki kişisel aşama · {points}"],
 "Next Party milestone · {points}": ["Nächster Gruppenmeilenstein · {points}","Próximo hito del grupo · {points}","Volgende groepsmijlpaal · {points}","Prossimo traguardo del gruppo · {points}","Prochain palier du groupe · {points}","Следующий этап группы · {points}","Sonraki grup aşaması · {points}"],
 "Today: {current} / {cap} credited points": ["Heute: {current} / {cap} angerechnete Punkte","Hoy: {current} / {cap} puntos acreditados","Vandaag: {current} / {cap} meegetelde punten","Oggi: {current} / {cap} punti conteggiati","Aujourd'hui : {current} / {cap} points comptabilisés","Сегодня зачтено: {current} / {cap} очков","Bugün sayılan puan: {current} / {cap}"],
 "Party ranking qualification: {reasons}": ["Gruppen-Ranglistenberechtigung: {reasons}","Requisitos para el ranking de grupo: {reasons}","Voorwaarden voor groepsranglijst: {reasons}","Requisiti per la classifica di gruppo: {reasons}","Conditions de classement du groupe : {reasons}","Условия рейтинга группы: {reasons}","Grup sıralama koşulları: {reasons}"],
 "{points} points": ["{points} Punkte","{points} puntos","{points} punten","{points} punti","{points} points","Очков: {points}","{points} puan"],
 "Current Party": ["Aktuelle Gruppe","Grupo actual","Huidige groep","Gruppo attuale","Groupe actuel","Текущая группа","Mevcut grup"],
 "Meaningful contributor": ["Aktiv beigetragen","Contribución suficiente","Actieve bijdrager","Contributo valido","Contribution suffisante","Вклад учтён","Yeterli katkı"],
 "Once you reach the event binding threshold for a Party, switching Parties cannot move your ranking contribution to a second Party during the same event.": ["Sobald dein Beitrag an eine Gruppe gebunden ist, kannst du ihn im selben Event nicht in eine andere Gruppe übertragen.","Una vez vinculada tu contribución a un grupo, cambiar de grupo no la trasladará a otro durante el mismo evento.","Zodra je bijdrage aan een groep is gekoppeld, kun je die tijdens hetzelfde evenement niet naar een andere groep meenemen.","Una volta legato il contributo a un gruppo, cambiando gruppo non potrai trasferirlo durante lo stesso evento.","Une fois votre contribution liée à un groupe, changer de groupe ne la transfère pas pendant le même événement.","После закрепления вклада за группой его нельзя перенести в другую группу во время того же события.","Katkın bir gruba bağlandıktan sonra aynı etkinlikte başka bir gruba aktarılamaz."],
 "global": ["Global","global","wereldwijd","globale","mondial","общий","genel"],
 "friends": ["Freunde","amigos","vrienden","amici","amis","друзья","arkadaşlar"],
 "guild": ["Gilde","gremio","gilde","gilda","guilde","гильдия","lonca"],
 "Your Party · #{rank}": ["Deine Gruppe · #{rank}","Tu grupo · #{rank}","Jouw groep · #{rank}","Il tuo gruppo · #{rank}","Votre groupe · #{rank}","Ваша группа · №{rank}","Grubun · #{rank}"],
 "{count} contributors · top {percent}%": ["{count} Mitwirkende · Top {percent} %","{count} participantes · top {percent}%","{count} bijdragers · top {percent}%","{count} contributori · top {percent}%","{count} contributeurs · top {percent} %","Участников: {count} · лучшие {percent}%","{count} katkıcı · ilk %{percent}"],
 "Rank rewards are prestige-heavy. Friends and Guild views preserve the same global rank instead of creating easier private reward ladders.": ["Rangbelohnungen sind vor allem Prestige. Freunde- und Gildenansichten zeigen denselben globalen Rang, keine eigene Rangliste.","Las recompensas de rango son principalmente de prestigio. Las vistas de amigos y gremio mantienen la clasificación global.","Rangbeloningen draaien vooral om prestige. Vrienden- en gildeweergaven tonen dezelfde wereldrang, zonder aparte beloningsladder.","Le ricompense in classifica sono soprattutto di prestigio. Amici e gilda mostrano lo stesso rango globale.","Les récompenses du classement sont surtout prestigieuses. Les vues Amis et Guilde conservent le même rang mondial.","Рейтинговые награды в основном престижные. Вкладки друзей и гильдии показывают общий рейтинг, не отдельные списки наград.","Sıralama ödülleri çoğunlukla prestij içindir. Arkadaş ve Lonca görünümleri aynı küresel sırayı gösterir."],
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string]>;
export type PartyProgressUiKey=keyof typeof partyProgressUiRows;
const languageIndex:Partial<Record<Language,number>>={de:0,es:1,nl:2,it:3,fr:4,ru:5,tr:6};
export function partyProgressUiText(language:Language,key:PartyProgressUiKey,params:TranslationParams={}):string{
 const index=languageIndex[language];
 return interpolateTranslation(index===undefined?key:partyProgressUiRows[key][index],params);
}
export function usePartyProgressUiText(){
 const language=useGameLanguage();
 return useMemo(()=>(key:PartyProgressUiKey,params?:TranslationParams)=>partyProgressUiText(language,key,params),[language]);
}
const tierKeys:Record<PartyWeeklyTier,PartyProgressUiKey>={bronze:'Bronze',silver:'Silver',gold:'Gold',platinum:'Platinum'};
export function partyWeeklyTierText(language:Language,tier:PartyWeeklyTier):string{
 return partyProgressUiText(language,tierKeys[tier]);
}
export function partyEventStatusText(language:Language,status:LiveOpsEventStatus):string{
 return partyProgressUiText(language,status);
}
export function partyProgressNumber(language:Language,value:number,options?:Intl.NumberFormatOptions):string{
 return formatLocalizedNumber(language,value,options);
}
