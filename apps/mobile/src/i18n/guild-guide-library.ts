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
// The Guide Library and the section ? buttons share the same translated names.
export const guildGuideTitles:Readonly<Record<string,readonly string[]>>={
 'Home':['Gildenstart','Inicio del gremio','Gildehome','Home della gilda','Accueil de guilde','Главная гильдии','Lonca Ana Sayfası'],
 'Activities/Muster':['Muster & Rallye','Muster y Rally','Muster & Rally','Muster e Rally','Muster et Rally','Сбор и ралли','Toplanma ve Ralli'],
 'Activities/Quests':['Gildenquests','Misiones del gremio','Gildequests','Missioni della gilda','Quêtes de guilde','Задания гильдии','Lonca Görevleri'],
 'PvE':['Raid-Tor','Puerta de incursiones','Raidpoort','Portale incursioni','Portail des raids','Врата рейдов','Baskın Kapısı'],
 'Progress/Projects':['Gildenprojekte','Proyectos del gremio','Gildeprojecten','Progetti di gilda','Projets de guilde','Проекты гильдии','Lonca Projeleri'],
 'Progress/Skills':['Gildenfähigkeiten','Habilidades del gremio','Gildevaardigheden','Abilità della gilda','Compétences de guilde','Навыки гильдии','Lonca Yetenekleri'],
 'Hall/Bank':['Gildenbank','Banco del gremio','Gildebank','Banca della gilda','Banque de guilde','Банк гильдии','Lonca Bankası'],
 'Hall/Construction':['Gildenbau','Construcción del gremio','Gildebouw','Costruzione della gilda','Construction de guilde','Строительство гильдии','Lonca İnşaatı'],
 'Hall/Shop':['Gildentoken-Shop','Tienda de fichas del gremio','Gildetokenwinkel','Negozio gettoni di gilda','Boutique de jetons de guilde','Магазин жетонов гильдии','Lonca Jeton Mağazası'],
 'Roster':['Gildenmitglieder','Miembros del gremio','Gildeleden','Membri della gilda','Membres de la guilde','Участники гильдии','Lonca Üyeleri'],
 'Chat':['Gildenchat','Chat del gremio','Gildechat','Chat della gilda','Discussion de guilde','Чат гильдии','Lonca Sohbeti'],
 'Manage':['Gilde verwalten','Gestionar gremio','Gilde beheren','Gestisci la gilda','Gérer la guilde','Управление гильдией','Loncayı Yönet'],
 'Appearance':['Gildendesign','Apariencia del gremio','Gilde-uiterlijk','Aspetto della gilda','Apparence de guilde','Оформление гильдии','Lonca Görünümü'],
};
export function guildGuideSectionTitle(language:Language,section:string,fallback:string):string{
 const index=languages.indexOf(language as typeof languages[number]);
 return index<0?fallback:guildGuideTitles[section]?.[index]??fallback;
}
export type GuildGuideLibraryLabel=keyof typeof libraryLabels;
export function guildGuideLibraryText(language:Language,key:GuildGuideLibraryLabel):string{
 const index=languages.indexOf(language as typeof languages[number]);
 return index<0?key:libraryLabels[key][index]??key;
}
