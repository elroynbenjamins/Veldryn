import {useMemo} from 'react';
import type {Language} from './languages';
import {useGameLanguage} from './GameLanguageProvider';
import {interpolateTranslation,type TranslationParams} from './translator';

/** Fixed Guild Project, Decree, Hub and member metadata, in DE/ES/NL/IT/FR/RU/TR order.
 * Never pass player-authored messages or unverified server-provided text through this catalog.
 */
export const guildFlowUiRows={
  "GUILD · LEVEL {level}": ["GILDE · STUFE {level}","GREMIO · NIVEL {level}","GILDE · NIVEAU {level}","GILDA · LIVELLO {level}","GUILDE · NIVEAU {level}","ГИЛЬДИЯ · УРОВЕНЬ {level}","LONCA · SEVİYE {level}"],
  "{members}/{cap} members · {slots} Project slot": ["{members}/{cap} Mitglieder · {slots} Projektplatz","{members}/{cap} miembros · {slots} espacio de proyecto","{members}/{cap} leden · {slots} projectplek","{members}/{cap} membri · {slots} spazio progetto","{members}/{cap} membres · {slots} emplacement de projet","Участники: {members}/{cap} · ячеек проектов: {slots}","{members}/{cap} üye · {slots} proje yuvası"],
  "{members}/{cap} members · {slots} Project slots": ["{members}/{cap} Mitglieder · {slots} Projektplätze","{members}/{cap} miembros · {slots} espacios de proyecto","{members}/{cap} leden · {slots} projectplekken","{members}/{cap} membri · {slots} spazi progetto","{members}/{cap} membres · {slots} emplacements de projet","Участники: {members}/{cap} · ячеек проектов: {slots}","{members}/{cap} üye · {slots} proje yuvası"],
  "No bulletin posted.": ["Kein Aushang vorhanden.","No hay anuncios publicados.","Nog geen mededeling geplaatst.","Nessun avviso pubblicato.","Aucune annonce publiée.","Объявлений пока нет.","Henüz duyuru yok."],
  "{count} active": ["{count} aktiv","{count} activos","{count} actief","{count} attivi","{count} actifs","Активных: {count}","{count} etkin"],
  "No active Guild Projects. Open Projects to review the next shared goal.": ["Keine aktiven Gildenprojekte. Öffne Projekte, um das nächste gemeinsame Ziel zu sehen.","No hay proyectos activos. Abre Proyectos para ver el siguiente objetivo común.","Geen actieve gildeprojecten. Open Projecten voor het volgende gezamenlijke doel.","Nessun progetto attivo. Apri Progetti per vedere il prossimo obiettivo comune.","Aucun projet actif. Ouvrez Projets pour voir le prochain objectif commun.","Активных проектов нет. Откройте «Проекты», чтобы выбрать следующую общую цель.","Etkin Lonca Projesi yok. Sıradaki ortak hedef için Projeler'i aç."],
  "{count} effort points": ["{count} Einsatzpunkte","{count} puntos de esfuerzo","{count} inspanningspunten","{count} punti impegno","{count} points d'effort","Очки вклада: {count}","{count} çaba puanı"],
  "overview": ["Übersicht","resumen","overzicht","panoramica","aperçu","обзор","genel bakış"],
  "projects": ["Projekte","proyectos","projecten","progetti","projets","проекты","projeler"],
  "members": ["Mitglieder","miembros","leden","membri","membres","участники","üyeler"],
  "activity": ["Aktivität","actividad","activiteit","attività","activité","активность","etkinlik"],
  "decrees": ["Erlasse","decretos","decreten","decreti","décrets","указы","kararnameler"],
  "{count}/{total} slots": ["{count}/{total} Plätze","{count}/{total} espacios","{count}/{total} plekken","{count}/{total} posti","{count}/{total} emplacements","Ячейки: {count}/{total}","{count}/{total} yuva"],
  "{count} choices": ["{count} Optionen","{count} opciones","{count} keuzes","{count} opzioni","{count} choix","Вариантов: {count}","{count} seçenek"],
  "Members recommend a Project. An authorized Guild role can start one; the server may auto-start the top-voted option if leadership is inactive.": ["Mitglieder empfehlen Projekte. Berechtigte Gildenrollen können eines starten; bei inaktiver Führung kann das meistgewählte automatisch beginnen.","Los miembros recomiendan proyectos. Un cargo autorizado puede iniciarlos; si los líderes están inactivos, puede comenzar el más votado.","Leden bevelen projecten aan. Een bevoegde gilderol kan er een starten; bij inactieve leiding kan de populairste keuze automatisch starten.","I membri consigliano progetti. Un ruolo autorizzato può avviarne uno; se i capi sono inattivi, può partire il più votato.","Les membres recommandent des projets. Un rôle autorisé peut en lancer un ; en cas d'inactivité des dirigeants, le plus voté peut démarrer.","Участники рекомендуют проекты. Уполномоченный член гильдии может начать проект; при неактивном руководстве может автоматически начаться самый популярный.","Üyeler proje önerir. Yetkili bir Lonca rolü projeyi başlatabilir; yönetim etkin değilse en çok oy alan proje otomatik başlayabilir."],
  "Slot {slot}": ["Platz {slot}","Espacio {slot}","Plek {slot}","Spazio {slot}","Emplacement {slot}","Ячейка {slot}","Yuva {slot}"],
  "{count} vote": ["{count} Stimme","{count} voto","{count} stem","{count} voto","{count} vote","Голосов: {count}","{count} oy"],
  "{count} votes": ["{count} Stimmen","{count} votos","{count} stemmen","{count} voti","{count} votes","Голосов: {count}","{count} oy"],
  "GUILD PROJECT · {focus}": ["GILDENPROJEKT · {focus}","PROYECTO DE GREMIO · {focus}","GILDEPROJECT · {focus}","PROGETTO DI GILDA · {focus}","PROJET DE GUILDE · {focus}","ПРОЕКТ ГИЛЬДИИ · {focus}","LONCA PROJESİ · {focus}"],
  "{count}/{minimum} meaningful contributors": ["{count}/{minimum} aktive Mitwirkende","{count}/{minimum} participantes con aportes","{count}/{minimum} actieve bijdragers","{count}/{minimum} contributori effettivi","{count}/{minimum} contributeurs actifs","Активных участников: {count}/{minimum}","{count}/{minimum} etkin katkıcı"],
  "Today {current}/{cap}": ["Heute {current}/{cap}","Hoy {current}/{cap}","Vandaag {current}/{cap}","Oggi {current}/{cap}","Aujourd'hui {current}/{cap}","Сегодня {current}/{cap}","Bugün {current}/{cap}"],
  "{count} tracked": ["{count} erfasst","{count} registrados","{count} bijgehouden","{count} registrati","{count} suivis","Учтено: {count}","{count} takip ediliyor"],
  "reward eligible": ["belohnungsberechtigt","con derecho a recompensa","beloningsgerechtigd","idoneo alla ricompensa","éligible à la récompense","награда доступна","ödül almaya uygun"],
  "active": ["aktiv","activo","actief","attivo","actif","активен","etkin"],
  "completed": ["abgeschlossen","completado","voltooid","completato","terminé","завершён","tamamlandı"],
  "expired": ["abgelaufen","caducado","verlopen","scaduto","expiré","истёк","süresi doldu"],
  "cancelled": ["abgebrochen","cancelado","geannuleerd","annullato","annulé","отменён","iptal edildi"],
  "Completing the weekly Guild Project opens a decree choice. Only one Guild Decree is active at once and all bonuses remain under existing Guild/global caps.": ["Ein abgeschlossenes wöchentliches Gildenprojekt eröffnet die Erlasswahl. Nur ein Erlass kann aktiv sein; alle Boni bleiben innerhalb der geltenden Grenzen.","Completar el proyecto semanal permite elegir un decreto. Solo puede estar activo uno a la vez y sus bonificaciones respetan los límites.","Het voltooien van het wekelijkse gildeproject opent de decreetkeuze. Er kan maar één decreet actief zijn; alle bonussen blijven binnen de limieten.","Completare il progetto settimanale sblocca la scelta del decreto. Può esserne attivo solo uno alla volta e i bonus rispettano i limiti.","Terminer le projet hebdomadaire permet de choisir un décret. Un seul décret peut être actif et tous les bonus restent plafonnés.","Завершение еженедельного проекта открывает выбор указа. Одновременно действует один указ; бонусы не превышают установленных пределов.","Haftalık Lonca Projesini tamamlamak kararname seçimini açar. Aynı anda yalnızca biri etkin olabilir; tüm bonuslar sınırları aşmaz."],
  "A completed eligible weekly Project can open the next decree window.": ["Ein abgeschlossenes, gültiges Wochenprojekt kann die nächste Erlasswahl öffnen.","Un proyecto semanal completado y válido puede abrir la siguiente elección de decreto.","Een voltooid en geldig weekproject kan de volgende decreetkeuze openen.","Un progetto settimanale idoneo completato può aprire la prossima scelta di decreto.","Un projet hebdomadaire admissible terminé peut ouvrir le prochain choix de décret.","Завершённый подходящий недельный проект может открыть следующий выбор указа.","Tamamlanan uygun haftalık Proje bir sonraki kararname seçimini açabilir."],
  "until {date}": ["bis {date}","hasta {date}","tot {date}","fino al {date}","jusqu'au {date}","до {date}","{date} tarihine kadar"],
  "{count} weekly contribution": ["{count} Wochenbeitrag","{count} de contribución semanal","{count} wekelijkse bijdrage","{count} contributo settimanale","{count} de contribution hebdomadaire","Вклад за неделю: {count}","Haftalık katkı: {count}"],
  "online": ["online","en línea","online","online","en ligne","в сети","çevrimiçi"],
  "recent": ["kürzlich aktiv","activo recientemente","onlangs actief","attivo di recente","actif récemment","был недавно","yakın zamanda etkin"],
  "offline": ["offline","desconectado","offline","offline","hors ligne","не в сети","çevrimdışı"],
  "Combat": ["Kampf","Combate","Gevecht","Combattimento","Combat","Бой","Savaş"],
  "Skilling": ["Fertigkeiten","Habilidades","Vaardigheden","Abilità","Compétences","Навыки","Beceriler"],
  "Mixed": ["Gemischt","Mixto","Gemengd","Misto","Mixte","Смешанный","Karma"],
  "Development": ["Ausbau","Desarrollo","Ontwikkeling","Sviluppo","Développement","Развитие","Gelişim"],
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string]>;
export type GuildFlowUiKey=keyof typeof guildFlowUiRows;
const index:Partial<Record<Language,number>>={de:0,es:1,nl:2,it:3,fr:4,ru:5,tr:6};
export function guildFlowUiText(language:Language,key:GuildFlowUiKey,params:TranslationParams={}):string{
 const i=index[language];
 return interpolateTranslation(i===undefined?key:guildFlowUiRows[key][i],params);
}
export function useGuildFlowUiText(){
 const language=useGameLanguage();
 return useMemo(()=>(key:GuildFlowUiKey,params?:TranslationParams)=>guildFlowUiText(language,key,params),[language]);
}
