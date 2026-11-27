import type {Language} from './languages';
/** Hidden V2 UI labels only; authored quest narrative is a separate translation pass. */
const locales=['de','es','nl','it','fr','ru','tr'] as const;
export const storyJournal2Rows={
  "Adventurer's Journal": [
    "Abenteurertagebuch",
    "Diario de aventuras",
    "Avonturiersdagboek",
    "Diario dell'avventuriero",
    "Journal d’aventure",
    "Журнал искателя приключений",
    "Macera Günlüğü"
  ],
  "Story": [
    "Geschichte",
    "Historia",
    "Verhaal",
    "Storia",
    "Histoire",
    "Сюжет",
    "Hikâye"
  ],
  "Quests": [
    "Quests",
    "Misiones",
    "Missies",
    "Missioni",
    "Quêtes",
    "Задания",
    "Görevler"
  ],
  "Challenges": [
    "Herausforderungen",
    "Desafíos",
    "Uitdagingen",
    "Sfide",
    "Défis",
    "Испытания",
    "Mücadeleler"
  ],
  "Records": [
    "Chronik",
    "Registros",
    "Archief",
    "Registri",
    "Archives",
    "Записи",
    "Kayıtlar"
  ],
  "Ready": [
    "Bereit",
    "Listo",
    "Klaar",
    "Pronto",
    "Prêt",
    "Готово",
    "Hazır"
  ],
  "In progress": [
    "In Arbeit",
    "En curso",
    "Bezig",
    "In corso",
    "En cours",
    "В процессе",
    "Sürüyor"
  ],
  "Available": [
    "Verfügbar",
    "Disponible",
    "Beschikbaar",
    "Disponibile",
    "Disponible",
    "Доступно",
    "Mevcut"
  ],
  "Locked": [
    "Gesperrt",
    "Bloqueado",
    "Vergrendeld",
    "Bloccato",
    "Verrouillé",
    "Закрыто",
    "Kilitli"
  ],
  "Completed": [
    "Abgeschlossen",
    "Completado",
    "Voltooid",
    "Completato",
    "Terminé",
    "Завершено",
    "Tamamlandı"
  ],
  "Current": [
    "Aktuell",
    "Actual",
    "Huidig",
    "Attuale",
    "Actuel",
    "Текущие",
    "Güncel"
  ],
  "All": [
    "Alle",
    "Todas",
    "Alles",
    "Tutte",
    "Tout",
    "Все",
    "Tümü"
  ],
  "Campaign progress": [
    "Storyfortschritt",
    "Progreso de campaña",
    "Verhaalvoortgang",
    "Progresso campagna",
    "Progression de campagne",
    "Прогресс кампании",
    "Hikâye ilerlemesi"
  ],
  "Search & filters": [
    "Suche & Filter",
    "Buscar y filtrar",
    "Zoeken en filteren",
    "Ricerca e filtri",
    "Recherche et filtres",
    "Поиск и фильтры",
    "Arama ve filtreler"
  ],
  "Hide filters": [
    "Filter ausblenden",
    "Ocultar filtros",
    "Filters verbergen",
    "Nascondi filtri",
    "Masquer les filtres",
    "Скрыть фильтры",
    "Filtreleri gizle"
  ],
  "Search quests": [
    "Quests suchen",
    "Buscar misiones",
    "Missies zoeken",
    "Cerca missioni",
    "Rechercher des quêtes",
    "Поиск заданий",
    "Görev ara"
  ],
  "All zones": [
    "Alle Gebiete",
    "Todas las zonas",
    "Alle gebieden",
    "Tutte le zone",
    "Toutes les zones",
    "Все зоны",
    "Tüm bölgeler"
  ],
  "Active": [
    "Aktiv",
    "Activo",
    "Actief",
    "Attivo",
    "Actif",
    "Активно",
    "Etkin"
  ],
  "No matching quests.": [
    "Keine passenden Quests.",
    "No hay misiones coincidentes.",
    "Geen passende missies.",
    "Nessuna missione trovata.",
    "Aucune quête correspondante.",
    "Задания не найдены.",
    "Eşleşen görev yok."
  ],
  "View quest": [
    "Quest ansehen",
    "Ver misión",
    "Missie bekijken",
    "Vedi missione",
    "Voir la quête",
    "Открыть задание",
    "Görevi gör"
  ],
  "Pin quest": [
    "Quest anheften",
    "Fijar misión",
    "Missie vastzetten",
    "Fissa missione",
    "Épingler la quête",
    "Закрепить задание",
    "Görevi sabitle"
  ],
  "Unpin quest": [
    "Quest lösen",
    "Desfijar misión",
    "Missie losmaken",
    "Sblocca missione",
    "Désépingler la quête",
    "Открепить задание",
    "Sabitlemeyi kaldır"
  ],
  "Pin": [
    "Anheften",
    "Fijar",
    "Vastzetten",
    "Fissa",
    "Épingler",
    "Закрепить",
    "Sabitle"
  ],
  "Unpin": [
    "Lösen",
    "Desfijar",
    "Losmaken",
    "Rimuovi",
    "Désépingler",
    "Открепить",
    "Kaldır"
  ],
  "Read story": [
    "Geschichte lesen",
    "Leer historia",
    "Verhaal lezen",
    "Leggi storia",
    "Lire l'histoire",
    "Читать историю",
    "Hikâyeyi oku"
  ],
  "Hide story": [
    "Geschichte ausblenden",
    "Ocultar historia",
    "Verhaal verbergen",
    "Nascondi storia",
    "Masquer l'histoire",
    "Скрыть историю",
    "Hikâyeyi gizle"
  ],
  "Proposed rewards": [
    "Belohnungsentwurf",
    "Recompensas propuestas",
    "Voorgestelde beloningen",
    "Ricompense proposte",
    "Récompenses proposées",
    "Предлагаемые награды",
    "Önerilen ödüller"
  ],
  "Reward ready": [
    "Belohnung bereit",
    "Recompensa lista",
    "Beloning klaar",
    "Ricompensa pronta",
    "Récompense prête",
    "Награда готова",
    "Ödül hazır"
  ],
  "Review rewards": [
    "Belohnungen ansehen",
    "Ver recompensas",
    "Beloningen bekijken",
    "Vedi ricompense",
    "Voir les récompenses",
    "Посмотреть награды",
    "Ödülleri gör"
  ],
  "Find encounter": [
    "Gegner finden",
    "Buscar enemigo",
    "Vijand vinden",
    "Trova nemico",
    "Trouver l’ennemi",
    "Найти противника",
    "Düşmanı bul"
  ],
  "Find gathering spot": [
    "Sammelstelle finden",
    "Buscar lugar de recolección",
    "Verzamelplek vinden",
    "Trova risorse",
    "Trouver un lieu de récolte",
    "Найти место сбора",
    "Toplama noktası bul"
  ],
  "Choose gathering spot": [
    "Sammelstelle wählen",
    "Elegir lugar de recolección",
    "Kies verzamelplek",
    "Scegli luogo di raccolta",
    "Choisir un lieu de récolte",
    "Выбрать место сбора",
    "Toplama noktası seç"
  ],
  "Choose scout": [
    "Späher wählen",
    "Elegir explorador",
    "Kies verkenner",
    "Scegli esploratore",
    "Choisir un éclaireur",
    "Выбрать разведчика",
    "İzci seç"
  ],
  "View scouting": [
    "Erkundung ansehen",
    "Ver exploración",
    "Verkenning bekijken",
    "Vedi esplorazione",
    "Voir l'exploration",
    "Открыть разведку",
    "Keşfi gör"
  ],
  "View report": [
    "Bericht ansehen",
    "Ver informe",
    "Rapport bekijken",
    "Vedi rapporto",
    "Voir le rapport",
    "Открыть отчёт",
    "Raporu gör"
  ],
  "View requirements": [
    "Anforderungen ansehen",
    "Ver requisitos",
    "Vereisten bekijken",
    "Vedi requisiti",
    "Voir les conditions",
    "Посмотреть требования",
    "Gereksinimleri gör"
  ],
  "View prerequisite": [
    "Voraussetzung ansehen",
    "Ver requisito previo",
    "Vorige missie bekijken",
    "Vedi prerequisito",
    "Voir le prérequis",
    "Посмотреть условие",
    "Ön koşulu gör"
  ],
  "Open equipment": [
    "Ausrüstung öffnen",
    "Abrir equipo",
    "Uitrusting openen",
    "Apri equipaggiamento",
    "Ouvrir l'équipement",
    "Открыть снаряжение",
    "Ekipmanı aç"
  ],
  "Open world": [
    "Welt öffnen",
    "Abrir mundo",
    "Wereld openen",
    "Apri mondo",
    "Ouvrir le monde",
    "Открыть мир",
    "Dünyayı aç"
  ],
  "Open activity": [
    "Aktivität öffnen",
    "Abrir actividad",
    "Activiteit openen",
    "Apri attività",
    "Ouvrir l'activité",
    "Открыть занятие",
    "Etkinliği aç"
  ],
  "View completed quest": [
    "Abgeschlossene Quest ansehen",
    "Ver misión completada",
    "Voltooide missie bekijken",
    "Vedi missione completata",
    "Voir la quête terminée",
    "Открыть завершённое задание",
    "Tamamlanan görevi gör"
  ],
  "Daily": [
    "Täglich",
    "Diario",
    "Dagelijks",
    "Giornaliero",
    "Quotidien",
    "День",
    "Günlük"
  ],
  "Weekly": [
    "Wöchentlich",
    "Semanal",
    "Wekelijks",
    "Settimanale",
    "Hebdomadaire",
    "Неделя",
    "Haftalık"
  ],
  "Monthly": [
    "Monatlich",
    "Mensual",
    "Maandelijks",
    "Mensile",
    "Mensuel",
    "Месяц",
    "Aylık"
  ],
  "Monthly milestones": [
    "Monatsziele",
    "Hitos mensuales",
    "Maandmijlpalen",
    "Traguardi mensili",
    "Paliers mensuels",
    "Месячные этапы",
    "Aylık hedefler"
  ],
  "Quest points": [
    "Questpunkte",
    "Puntos de misión",
    "Missiepunten",
    "Punti missione",
    "Points de quête",
    "Очки заданий",
    "Görev puanları"
  ],
  "Progress": [
    "Fortschritt",
    "Progreso",
    "Voortgang",
    "Progresso",
    "Progression",
    "Прогресс",
    "İlerleme"
  ],
  "Achievements & titles": [
    "Erfolge & Titel",
    "Logros y títulos",
    "Prestaties en titels",
    "Obiettivi e titoli",
    "Succès et titres",
    "Достижения и титулы",
    "Başarılar ve unvanlar"
  ],
  "Exploration discoveries": [
    "Entdeckungen",
    "Descubrimientos",
    "Ontdekkingen",
    "Scoperte",
    "Découvertes",
    "Открытия",
    "Keşifler"
  ],
  "Discovered lore": [
    "Entdeckte Geschichten",
    "Historias descubiertas",
    "Ontdekte verhalen",
    "Storie scoperte",
    "Récits découverts",
    "Найденные предания",
    "Keşfedilen hikâyeler"
  ],
  "Challenges unavailable. Refresh to continue.": [
    "Herausforderungen nicht verfügbar. Aktualisieren.",
    "Desafíos no disponibles. Actualiza.",
    "Uitdagingen niet beschikbaar. Vernieuw.",
    "Sfide non disponibili. Aggiorna.",
    "Défis indisponibles. Actualisez.",
    "Испытания недоступны. Обновите.",
    "Mücadeleler kullanılamıyor. Yenile."
  ],
  "No challenges in this period.": [
    "Keine Herausforderungen in diesem Zeitraum.",
    "No hay desafíos en este periodo.",
    "Geen uitdagingen in deze periode.",
    "Nessuna sfida in questo periodo.",
    "Aucun défi pour cette période.",
    "Нет испытаний за этот период.",
    "Bu dönemde mücadele yok."
  ],
  "Discoveries unavailable. Refresh to continue.": [
    "Entdeckungen nicht verfügbar. Aktualisieren.",
    "Descubrimientos no disponibles. Actualiza.",
    "Ontdekkingen niet beschikbaar. Vernieuw.",
    "Scoperte non disponibili. Aggiorna.",
    "Découvertes indisponibles. Actualisez.",
    "Открытия недоступны. Обновите.",
    "Keşifler kullanılamıyor. Yenile."
  ]
} as const;
export function storyJournal2Text(language:Language,key:string,fallback:(key:string)=>string=(key=>key)):string{
 const index=locales.findIndex(l=>l===language);if(language==='en')return key;
 const row=storyJournal2Rows[key as keyof typeof storyJournal2Rows];return index>=0&&row?row[index]??fallback(key):fallback(key);
}
