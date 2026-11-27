import type {Language} from './languages';
import type {PartyChatPreviewCardV113} from '../core/party-chat-card-preview-v113';
import type {PartyChatCardLabelsV113} from '../components/PartyChatActionCardPreviewV113';
import type {PartyActiveRequestLabelsV115} from '../components/PartyActiveRequestsPanelPreviewV115';

/** Preview-only copy. Each row is EN, DE, ES, NL, IT, FR, RU, TR.
 * No translated player names, user chat bodies or guessed contract labels.
 * The future host supplies localized canonical option titles and summaries.
 */
const order=['en','de','es','nl','it','fr','ru','tr'] as const;
type Row=readonly [string,string,string,string,string,string,string,string];
export const partyChatPreviewRowsV117={
 tank:['Tank','Tank','Tanque','Tank','Tank','Tank','Танк','Tank'],
 damage:['Damage','Schaden','Daño','Schade','Danno','Dégâts','Урон','Hasar'],
 support:['Support','Unterstützung','Apoyo','Ondersteuning','Supporto','Soutien','Поддержка','Destek'],
 pending:['Pending','Offen','Pendiente','In afwachting','In attesa','En attente','Ожидает','Bekliyor'],
 completed:['Completed','Abgeschlossen','Completado','Voltooid','Completato','Terminé','Завершено','Tamamlandı'],
 declined:['Declined','Abgelehnt','Rechazado','Afgewezen','Rifiutato','Refusé','Отклонено','Reddedildi'],
 cancelled:['Cancelled','Abgebrochen','Cancelado','Geannuleerd','Annullato','Annulé','Отменено','İptal edildi'],
 expired:['Expired','Abgelaufen','Caducado','Verlopen','Scaduto','Expiré','Истекло','Süresi doldu'],
 stale:['Outdated','Veraltet','Desactualizado','Verouderd','Non aggiornato','Obsolète','Устарело','Güncel değil'],
 announcement:['Announcement','Mitteilung','Anuncio','Melding','Annuncio','Annonce','Объявление','Duyuru'],
 accept:['Accept','Annehmen','Aceptar','Accepteren','Accetta','Accepter','Принять','Kabul et'],
 decline:['Decline','Ablehnen','Rechazar','Afwijzen','Rifiuta','Refuser','Отклонить','Reddet'],
 ready:['Ready','Bereit','Listo','Klaar','Pronto','Prêt','Готов','Hazır'],
 not_ready:['Not ready','Nicht bereit','No estoy listo','Niet klaar','Non pronto','Pas prêt','Не готов','Hazır değil'],
 vote:['Vote','Abstimmen','Votar','Stemmen','Vota','Voter','Голосовать','Oy ver'],
 accepted:['Accepted','Angenommen','Aceptado','Geaccepteerd','Accettato','Accepté','Принято','Kabul edildi'],
 awaiting:['Awaiting','Ausstehend','En espera','In afwachting','In attesa','En attente','Ожидание','Beklemede'],
 countdown:['{time} remaining','Noch {time}','Quedan {time}','Nog {time}','Restano {time}','Reste {time}','Осталось {time}','Kalan {time}'],
 votes:['{count}/{total} votes','{count}/{total} Stimmen','{count}/{total} votos','{count}/{total} stemmen','{count}/{total} voti','{count}/{total} votes','Голоса: {count}/{total}','Oy: {count}/{total}'],
 confirmations:['{count}/{total} confirmed','{count}/{total} bestätigt','{count}/{total} confirmados','{count}/{total} bevestigd','{count}/{total} confermati','{count}/{total} confirmés','Подтверждено: {count}/{total}','Onay: {count}/{total}'],
 readiness:['{count}/{total} ready','{count}/{total} bereit','{count}/{total} listos','{count}/{total} klaar','{count}/{total} pronti','{count}/{total} prêts','Готовы: {count}/{total}','Hazır: {count}/{total}'],
 active:['Active Party Requests','Offene Gruppenanfragen','Solicitudes del grupo','Actieve groepsverzoeken','Richieste del gruppo','Demandes du groupe','Запросы группы','Etkin grup istekleri'],
 empty:['No active requests','Keine offenen Anfragen','No hay solicitudes activas','Geen actieve verzoeken','Nessuna richiesta attiva','Aucune demande active','Нет активных запросов','Etkin istek yok'],
 refreshing:['Checking requests…','Anfragen werden geprüft…','Comprobando solicitudes…','Verzoeken controleren…','Verifica richieste…','Vérification des demandes…','Проверка запросов…','İstekler kontrol ediliyor…'],
 show:['Show','Anzeigen','Mostrar','Tonen','Mostra','Afficher','Показать','Göster'],
 hide:['Hide','Ausblenden','Ocultar','Verbergen','Nascondi','Masquer','Скрыть','Gizle'],
 count:['To answer: {count} · Waiting: {waiting}','Antworten: {count} · Warten: {waiting}','Por responder: {count} · En espera: {waiting}','Reageren: {count} · Wachten: {waiting}','Da rispondere: {count} · In attesa: {waiting}','À répondre : {count} · En attente : {waiting}','Ответить: {count} · Ожидают: {waiting}','Yanıt: {count} · Bekleyen: {waiting}'],
 more:['Show more ({count})','Mehr anzeigen ({count})','Ver más ({count})','Meer tonen ({count})','Mostra altro ({count})','Voir plus ({count})','Показать ещё ({count})','Daha fazla ({count})'],
 role_swap:['Role Swap','Rollentausch','Intercambio de roles','Rolwissel','Scambio di ruoli','Échange de rôles','Обмен ролями','Rol değişimi'],
 contract_vote:['Weekly Party Focus','Wochenfokus der Gruppe','Prioridad semanal del grupo','Wekelijkse groepsfocus','Priorità settimanale del gruppo','Priorité hebdomadaire du groupe','Цель группы на неделю','Haftalık grup odağı'],
 event_vote:['Party Event Vote','Gruppenevent-Abstimmung','Votación del evento','Groepsevenement: stemming','Voto evento del gruppo','Vote de l’événement de groupe','Голосование события группы','Grup etkinliği oylaması'],
 group_readiness:['Readiness Check','Bereitschaftsabfrage','Comprobación de disponibilidad','Gereedheidscontrole','Verifica disponibilità','Vérification de disponibilité','Проверка готовности','Hazırlık kontrolü'],
 recruitment_request:['Recruitment Request','Beitrittsanfrage','Solicitud de ingreso','Toetredingsverzoek','Richiesta di adesione','Demande d’adhésion','Заявка на вступление','Katılım isteği'],
 shared_achievement:['Party Milestone','Gruppenmeilenstein','Hito del grupo','Groepsmijlpaal','Traguardo del gruppo','Jalon du groupe','Достижение группы','Grup başarısı'],
} satisfies Record<string,Row>;
type Key=keyof typeof partyChatPreviewRowsV117;
export function partyChatPreviewTextV117(language:Language,key:Key,params:Readonly<Record<string,string|number>>={}){
 const index=order.indexOf(language);
 const row=partyChatPreviewRowsV117[key];
 const message=row[index]??row[0];
 return message.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,(token,name:string)=>
  Object.prototype.hasOwnProperty.call(params,name)?String(params[name]):token);
}
export function partyChatPreviewLabelsV117(language:Language):{cards:PartyChatCardLabelsV113;panel:PartyActiveRequestLabelsV115}{
 const t=(key:Key,params:Readonly<Record<string,string|number>>={})=>partyChatPreviewTextV117(language,key,params);
 const count=(key:'votes'|'confirmations'|'readiness',n:number,total:number)=>t(key,{count:n,total});
 return {cards:{
  roles:{tank:t('tank'),damage:t('damage'),support:t('support')},
  statuses:{pending:t('pending'),completed:t('completed'),declined:t('declined'),cancelled:t('cancelled'),
   expired:t('expired'),stale:t('stale'),announcement:t('announcement')},
  actions:{accept:t('accept'),decline:t('decline'),ready:t('ready'),not_ready:t('not_ready'),vote:t('vote')},
  accepted:t('accepted'),awaiting:t('awaiting'),ready:t('ready'),notReady:t('not_ready'),
  expiresIn:seconds=>{const safe=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;
   return t('countdown',{time:Math.floor(safe/60)+':'+String(safe%60).padStart(2,'0')});},
  votes:(n,total)=>count('votes',n,total),confirmations:(n,total)=>count('confirmations',n,total),
  readiness:(n,total)=>count('readiness',n,total),
 },panel:{title:t('active'),empty:t('empty'),refreshing:t('refreshing'),show:t('show'),hide:t('hide'),
  count:(n,waiting)=>t('count',{count:n,waiting}),more:n=>t('more',{count:n})}};
}
export function partyChatPreviewTitleV117(language:Language,kind:PartyChatPreviewCardV113['kind']){
 return partyChatPreviewTextV117(language,kind);
}
