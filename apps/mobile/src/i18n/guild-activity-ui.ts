import {useMemo} from 'react';
import type {Language} from './languages';
import {useGameLanguage} from './GameLanguageProvider';
import {interpolateTranslation,type TranslationParams} from './translator';
import {socialLabel} from './social';

/** Active Guild Quest board and Guild Activity meter copy, in DE/ES/NL/IT/FR/RU/TR order. */
export const guildActivityUiRows={
  "{completed}/{total} completed · +{activity} Activity earned": [
    "{completed}/{total} abgeschlossen · +{activity} Aktivität erhalten",
    "{completed}/{total} completadas · +{activity} de actividad",
    "{completed}/{total} voltooid · +{activity} activiteit verdiend",
    "{completed}/{total} completate · +{activity} attività ottenuta",
    "{completed}/{total} terminées · +{activity} d'activité gagnée",
    "Выполнено {completed}/{total} · +{activity} активности",
    "{completed}/{total} tamamlandı · +{activity} etkinlik"
  ],
  "{days}d left": [
    "Noch {days} T.",
    "Quedan {days} d",
    "Nog {days} d",
    "{days} g rimasti",
    "Plus que {days} j",
    "Осталось {days} д.",
    "{days}g kaldı"
  ],
  "No quests available. Check back later.": [
    "Keine Quests verfügbar. Schau später wieder vorbei.",
    "No hay misiones disponibles. Vuelve más tarde.",
    "Geen opdrachten beschikbaar. Kijk later opnieuw.",
    "Nessuna missione disponibile. Torna più tardi.",
    "Aucune quête disponible. Revenez plus tard.",
    "Заданий пока нет. Загляните позже.",
    "Şu an görev yok. Daha sonra tekrar bak."
  ],
  "5 quests per week · No rerolls.": [
    "5 Quests pro Woche · Keine Neuauswahl.",
    "5 misiones por semana · Sin cambios.",
    "5 opdrachten per week · Niet opnieuw kiezen.",
    "5 missioni a settimana · Nessun rimpiazzo.",
    "5 quêtes par semaine · Aucun renouvellement.",
    "5 заданий в неделю · Без замены.",
    "Haftada 5 görev · Yeniden seçim yok."
  ],
  "{quest} completed · +{activity} Activity units.": [
    "{quest} abgeschlossen · +{activity} Aktivitätspunkte.",
    "{quest} completada · +{activity} puntos de actividad.",
    "{quest} voltooid · +{activity} activiteitspunten.",
    "{quest} completata · +{activity} punti attività.",
    "{quest} terminée · +{activity} points d'activité.",
    "Задание «{quest}» выполнено · +{activity} очков активности.",
    "{quest} tamamlandı · +{activity} etkinlik puanı."
  ],
  "Reserve {reserve}/10%.": [
    "Reserve {reserve}/10 %.",
    "Reserva {reserve}/10 %.",
    "Reserve {reserve}/10%.",
    "Riserva {reserve}/10%.",
    "Réserve {reserve}/10 %.",
    "Резерв {reserve}/10%.",
    "Yedek {reserve}/10%."
  ],
  "{name} active · {description}": [
    "{name} aktiv · {description}",
    "{name} activo · {description}",
    "{name} actief · {description}",
    "{name} attivo · {description}",
    "{name} actif · {description}",
    "Активно: {name} · {description}",
    "{name} etkin · {description}"
  ],
  "FEATURED · ": [
    "HIGHLIGHT · ",
    "DESTACADA · ",
    "UITGELICHT · ",
    "IN EVIDENZA · ",
    "À LA UNE · ",
    "ОСОБОЕ · ",
    "ÖNE ÇIKAN · "
  ],
  "Shared guild progress": [
    "Gemeinsamer Gildenfortschritt",
    "Progreso común del gremio",
    "Gezamenlijke gildevoortgang",
    "Progressi condivisi della gilda",
    "Progression commune de guilde",
    "Общий прогресс гильдии",
    "Ortak lonca ilerlemesi"
  ],
  "No contribution recorded yet.": [
    "Noch kein Beitrag erfasst.",
    "Aún no se ha registrado contribución.",
    "Nog geen bijdrage geregistreerd.",
    "Nessun contributo registrato.",
    "Aucune contribution enregistrée.",
    "Вклад пока не зарегистрирован.",
    "Henüz katkı kaydedilmedi."
  ],
  "{count} contributor · daily contribution capped": [
    "{count} Mitwirkender · Tagesbeitrag begrenzt",
    "{count} participante · contribución diaria limitada",
    "{count} bijdrager · dagelijks maximum",
    "{count} partecipante · limite giornaliero",
    "{count} contributeur · plafond quotidien",
    "Участников: {count} · дневной лимит вклада",
    "{count} katkıcı · günlük katkı sınırlı"
  ],
  "{count} contributors · daily contribution capped": [
    "{count} Mitwirkende · Tagesbeitrag begrenzt",
    "{count} participantes · contribución diaria limitada",
    "{count} bijdragers · dagelijks maximum",
    "{count} partecipanti · limite giornaliero",
    "{count} contributeurs · plafond quotidien",
    "Участников: {count} · дневной лимит вклада",
    "{count} katkıcı · günlük katkı sınırlı"
  ],
  "+{activity} Guild Activity secured": [
    "+{activity} Gildenaktivität gesichert",
    "+{activity} de actividad de gremio asegurada",
    "+{activity} gildeactiviteit veiliggesteld",
    "+{activity} attività di gilda garantita",
    "+{activity} d'activité de guilde acquise",
    "+{activity} активности гильдии получено",
    "+{activity} Lonca Etkinliği kazanıldı"
  ],
  "+{activity} Guild Activity on completion": [
    "+{activity} Gildenaktivität bei Abschluss",
    "+{activity} de actividad de gremio al completar",
    "+{activity} gildeactiviteit bij voltooiing",
    "+{activity} attività di gilda al completamento",
    "+{activity} d'activité de guilde à la fin",
    "+{activity} активности гильдии за выполнение",
    "+{activity} Lonca Etkinliği tamamlayınca"
  ],
  "Objective breakdown · {quest}": [
    "Aufschlüsselung der Ziele · {quest}",
    "Detalle de objetivos · {quest}",
    "Doelenoverzicht · {quest}",
    "Dettaglio obiettivi · {quest}",
    "Détail des objectifs · {quest}",
    "Подробности целей · {quest}",
    "Hedef ayrıntıları · {quest}"
  ],
  "Objective breakdown": [
    "Zielübersicht",
    "Detalle de objetivos",
    "Doelenoverzicht",
    "Dettaglio obiettivi",
    "Détail des objectifs",
    "Подробности целей",
    "Hedef ayrıntıları"
  ],
  "{percent}% Guild Activity": [
    "{percent} % Gildenaktivität",
    "{percent} % de actividad de gremio",
    "{percent}% gildeactiviteit",
    "{percent}% attività di gilda",
    "{percent} % d'activité de guilde",
    "Активность гильдии: {percent}%",
    "Lonca Etkinliği %{percent}"
  ],
  "Protected today": [
    "Heute geschützt",
    "Protegida hoy",
    "Vandaag beschermd",
    "Protetto oggi",
    "Protégé aujourd'hui",
    "Сегодня защищено",
    "Bugün korumalı"
  ],
  "-{percent}% if today ends here": [
    "-{percent} % bei heutigem Stand",
    "-{percent} % si el día acaba así",
    "-{percent}% bij einde van vandaag",
    "-{percent}% se la giornata finisce così",
    "-{percent} % si la journée se termine ainsi",
    "−{percent}%, если сегодня не будет больше активности",
    "Bugün böyle biterse -%{percent}"
  ],
  "-{percent}% if inactive": [
    "-{percent} % bei Inaktivität",
    "-{percent} % por inactividad",
    "-{percent}% bij inactiviteit",
    "-{percent}% se inattivo",
    "-{percent} % en cas d'inactivité",
    "−{percent}% при бездействии",
    "Etkinlik olmazsa -%{percent}"
  ],
  "Activity Reserve {reserve}/10% · bonuses capped at 100%; reserve absorbs future decay.": [
    "Aktivitätsreserve {reserve}/10 % · Boni bis 100 %; Reserve gleicht Verfall aus.",
    "Reserva de actividad {reserve}/10 % · Bonos hasta 100 %; la reserva compensa la pérdida.",
    "Activiteitsreserve {reserve}/10% · Bonussen tot 100%; reserve vangt verval op.",
    "Riserva attività {reserve}/10% · Bonus fino al 100%; la riserva assorbe la perdita.",
    "Réserve d'activité {reserve}/10 % · Bonus plafonnés à 100 %; la réserve compense la baisse.",
    "Резерв активности {reserve}/10% · Бонусы до 100%; резерв защищает от снижения.",
    "Etkinlik Yedeği {reserve}/10% · Bonuslar %100 ile sınırlı; yedek düşüşü azaltır."
  ],
  "Next: {percent}% · {name}": [
    "Nächstes: {percent} % · {name}",
    "Siguiente: {percent} % · {name}",
    "Volgende: {percent}% · {name}",
    "Prossimo: {percent}% · {name}",
    "Suivant : {percent} % · {name}",
    "Далее: {percent}% · {name}",
    "Sıradaki: %{percent} · {name}"
  ],
  "{percent}% until {name} · {description}": [
    "Noch {percent} % bis {name} · {description}",
    "Falta {percent} % para {name} · {description}",
    "Nog {percent}% tot {name} · {description}",
    "Manca {percent}% a {name} · {description}",
    "Encore {percent} % avant {name} · {description}",
    "До «{name}» осталось {percent}% · {description}",
    "{name} için %{percent} kaldı · {description}"
  ],
  "{count}/5 milestones active": [
    "{count}/5 Meilensteine aktiv",
    "{count}/5 hitos activos",
    "{count}/5 mijlpalen actief",
    "{count}/5 traguardi attivi",
    "{count}/5 jalons actifs",
    "Активно этапов: {count}/5",
    "{count}/5 aşama etkin"
  ],
  "Less −": [
    "Weniger −",
    "Menos −",
    "Minder −",
    "Meno −",
    "Moins −",
    "Меньше −",
    "Daha az −"
  ],
  "Details +": [
    "Details +",
    "Detalles +",
    "Details +",
    "Dettagli +",
    "Détails +",
    "Подробнее +",
    "Ayrıntılar +"
  ],
  "{count} recently active member · target {units} units": [
    "{count} kürzlich aktives Mitglied · Ziel: {units} Punkte",
    "{count} miembro activo recientemente · meta: {units} puntos",
    "{count} recent actief lid · doel: {units} punten",
    "{count} membro attivo di recente · obiettivo: {units} punti",
    "{count} membre récemment actif · cible : {units} points",
    "Недавно активных участников: {count} · цель: {units} ед.",
    "Yakın zamanda etkin {count} üye · hedef {units} puan"
  ],
  "{count} recently active members · target {units} units": [
    "{count} kürzlich aktive Mitglieder · Ziel: {units} Punkte",
    "{count} miembros activos recientemente · meta: {units} puntos",
    "{count} recent actieve leden · doel: {units} punten",
    "{count} membri attivi di recente · obiettivo: {units} punti",
    "{count} membres récemment actifs · cible : {units} points",
    "Недавно активных участников: {count} · цель: {units} ед.",
    "Yakın zamanda etkin {count} üye · hedef {units} puan"
  ],
  "Guild Activity details": [
    "Details zur Gildenaktivität",
    "Detalles de actividad del gremio",
    "Details van gildeactiviteit",
    "Dettagli attività di gilda",
    "Détails de l'activité de guilde",
    "Подробности активности гильдии",
    "Lonca Etkinliği ayrıntıları"
  ],
  "Guild Quests, Muster and completed Projects sustain this meter.": [
    "Gildenquests, Muster und abgeschlossene Projekte erhalten diesen Wert.",
    "Las misiones, el recuento y los proyectos completados mantienen esta actividad.",
    "Gildeopdrachten, Muster en voltooide projecten houden deze meter op peil.",
    "Missioni, appello e progetti completati mantengono questa attività.",
    "Quêtes, rassemblement et projets terminés maintiennent cette activité.",
    "Задания гильдии, сбор и завершённые проекты поддерживают активность.",
    "Lonca Görevleri, Yoklama ve tamamlanan Projeler bu değeri korur."
  ]
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string]>;
export type GuildActivityUiKey=keyof typeof guildActivityUiRows;
const localeIndex:Partial<Record<Language,number>>={de:0,es:1,nl:2,it:3,fr:4,ru:5,tr:6};
export function guildActivityUiText(language:Language,key:GuildActivityUiKey,params:TranslationParams={}):string{
 const index=localeIndex[language];
 return interpolateTranslation(index===undefined?key:guildActivityUiRows[key][index],params);
}
/** Existing five-language Guild milestone translations stay in Social; fill RU/TR gaps only. */
export const guildMilestoneEarlyRows={
  "Gathering Momentum": [
    "Сбор ресурсов",
    "Toplama İvmesi"
  ],
  "Workshop Momentum": [
    "Производственный импульс",
    "Atölye İvmesi"
  ],
  "Learning Momentum": [
    "Импульс обучения",
    "Öğrenme İvmesi"
  ],
  "Mastery Momentum": [
    "Импульс мастерства",
    "Ustalık İvmesi"
  ],
  "Guild Momentum": [
    "Импульс гильдии",
    "Lonca İvmesi"
  ],
  "+5% gathering speed while the Guild remains active.": [
    "+5% к скорости сбора ресурсов, пока гильдия активна.",
    "Lonca etkin kaldıkça toplama hızı +%5."
  ],
  "+5% crafting and processing speed.": [
    "+5% к скорости изготовления и переработки.",
    "Üretim ve işleme hızı +%5."
  ],
  "+5% non-combat Skill XP.": [
    "+5% к опыту мирных навыков.",
    "Savaş dışı beceri XP'si +%5."
  ],
  "+5% non-combat Mastery XP.": [
    "+5% к опыту мастерства мирных навыков.",
    "Savaş dışı Ustalık XP'si +%5."
  ],
  "+5% relative rare-material chance from eligible non-combat activities.": [
    "+5% к относительному шансу редких материалов за подходящие мирные занятия.",
    "Uygun savaş dışı etkinliklerde nadir malzeme şansı göreceli +%5."
  ]
} as const satisfies Record<string,readonly [string,string]>;
export function guildMilestoneText(language:Language,source:string):string{
 const existing=socialLabel(language,source);
 if(existing!==source)return existing;
 if(language!=='ru'&&language!=='tr')return existing;
 const row=Object.prototype.hasOwnProperty.call(guildMilestoneEarlyRows,source)
  ?guildMilestoneEarlyRows[source as keyof typeof guildMilestoneEarlyRows]:undefined;
 return row?.[language==='ru'?0:1]??source;
}
export function useGuildActivityUiText(){
 const language=useGameLanguage();
 return useMemo(()=>({
  language,
  ui:(key:GuildActivityUiKey,params?:TranslationParams)=>guildActivityUiText(language,key,params),
  milestone:(source:string)=>guildMilestoneText(language,source),
 }),[language]);
}
