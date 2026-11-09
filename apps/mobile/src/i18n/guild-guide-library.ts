import type {Language} from './languages';

/** Small navigation vocabulary for the always-available Guild Guide library.
 * Gameplay descriptions are authored once in guild-detailed-guides.ts and can
 * be translated incrementally without changing the player-facing UI structure. */
const languages=['de','es','nl','it','fr','ru','tr'] as const;
export const libraryLabels={
 'Guild Guide':['Gildenleitfaden','Guía del gremio','Gildegids','Guida della gilda','Guide de guilde','Гид по гильдии','Lonca Rehberi'],
 'Browse guides':['Anleitungen ansehen','Ver guías','Gidsen bekijken','Esplora le guide','Parcourir les guides','Открыть руководства','Rehberlere göz at'],
 'Choose a Guild topic to learn more.':['Wähle ein Gildenthema aus.','Elige un tema del gremio.','Kies een gildeonderwerp voor meer uitleg.','Scegli un argomento della gilda.','Choisissez un sujet de guilde.','Выберите тему гильдии.','Bir lonca konusu seç.'],
 'All guides':['Alle Anleitungen','Todas las guías','Alle gidsen','Tutte le guide','Tous les guides','Все руководства','Tüm rehberler'],
 'Close Guild Guide':['Gildenleitfaden schließen','Cerrar guía del gremio','Gildegids sluiten','Chiudi guida della gilda','Fermer le guide de guilde','Закрыть гид по гильдии','Lonca rehberini kapat'],
 'Getting started':['Erste Schritte','Primeros pasos','Aan de slag','Primi passi','Bien démarrer','С чего начать','Başlarken'],
 'Activities':['Aktivitäten','Actividades','Activiteiten','Attività','Activités','Активности','Etkinlikler'],
 'Progress':['Fortschritt','Progreso','Voortgang','Progressi','Progression','Развитие','İlerleme'],
 'Hall':['Gildenhalle','Salón','Gildehal','Sala della gilda','Hall','Зал гильдии','Lonca Salonu'],
 'Community':['Gemeinschaft','Comunidad','Gemeenschap','Comunità','Communauté','Сообщество','Topluluk'],
 'Leadership':['Gildenleitung','Liderazgo','Leiding','Comando','Direction','Руководство','Liderlik'],
 'Topic':['Thema','Tema','Onderwerp','Argomento','Sujet','Тема','Konu'],
} as const;
export type GuildGuideLibraryLabel=keyof typeof libraryLabels;
export function guildGuideLibraryText(language:Language,key:GuildGuideLibraryLabel):string{
 const index=languages.indexOf(language as typeof languages[number]);
 return index<0?key:libraryLabels[key][index]??key;
}
