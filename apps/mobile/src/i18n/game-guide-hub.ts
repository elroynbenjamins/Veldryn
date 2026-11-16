import {SUPPORTED_LANGUAGES,type Language} from './languages';

/** Compact guide navigation labels; content copy still uses the existing account localization pipeline. */
const labels={
 "Help & Guide": [
  "Help & Guide",
  "Hilfe & Guide",
  "Ayuda y guía",
  "Hulp & gids",
  "Aiuto e guida",
  "Aide et guide",
  "Помощь и гайды",
  "Yardım ve rehber"
 ],
 "Find a topic": [
  "Find a topic",
  "Thema suchen",
  "Buscar tema",
  "Onderwerp zoeken",
  "Cerca un argomento",
  "Rechercher un sujet",
  "Найти тему",
  "Konu ara"
 ],
 "All": [
  "All",
  "Alle",
  "Todos",
  "Alles",
  "Tutti",
  "Tout",
  "Все",
  "Tümü"
 ],
 "Basics": [
  "Basics",
  "Grundlagen",
  "Básicos",
  "Basis",
  "Basi",
  "Bases",
  "Основы",
  "Temeller"
 ],
 "Progress": [
  "Progress",
  "Fortschritt",
  "Progreso",
  "Voortgang",
  "Progressi",
  "Progression",
  "Прогресс",
  "İlerleme"
 ],
 "Social": [
  "Social",
  "Soziales",
  "Social",
  "Sociaal",
  "Sociale",
  "Social",
  "Общение",
  "Sosyal"
 ],
 "Adventures": [
  "Adventures",
  "Abenteuer",
  "Aventuras",
  "Avonturen",
  "Avventure",
  "Aventures",
  "Приключения",
  "Maceralar"
 ],
 "Unread only": [
  "Unread only",
  "Nur ungelesene",
  "Solo no leídos",
  "Alleen ongelezen",
  "Solo da leggere",
  "Non lus",
  "Только непрочитанные",
  "Sadece okunmamış"
 ],
 "Read": [
  "Read",
  "Gelesen",
  "Leído",
  "Gelezen",
  "Letto",
  "Lu",
  "Прочитано",
  "Okundu"
 ],
 "To read": [
  "To read",
  "Noch zu lesen",
  "Por leer",
  "Nog te lezen",
  "Da leggere",
  "À lire",
  "Не прочитано",
  "Okunmadı"
 ],
 "Preview": [
  "Preview",
  "Vorschau",
  "Vista previa",
  "Voorbeeld",
  "Anteprima",
  "Aperçu",
  "Просмотр",
  "Önizleme"
 ],
 "Locked": [
  "Locked",
  "Gesperrt",
  "Bloqueado",
  "Vergrendeld",
  "Bloccato",
  "Verrouillé",
  "Закрыто",
  "Kilitli"
 ],
 "Topics read": [
  "Topics read",
  "Gelesene Themen",
  "Temas leídos",
  "Gelezen onderwerpen",
  "Argomenti letti",
  "Sujets lus",
  "Прочитано тем",
  "Okunan konular"
 ],
 "Available": [
  "Available",
  "Verfügbar",
  "Disponibles",
  "Beschikbaar",
  "Disponibili",
  "Disponibles",
  "Доступно",
  "Kullanılabilir"
 ],
 "Continue reading": [
  "Continue reading",
  "Weiterlesen",
  "Seguir leyendo",
  "Verder lezen",
  "Continua a leggere",
  "Continuer",
  "Продолжить чтение",
  "Okumaya devam et"
 ],
 "Start screen tour": [
  "Start screen tour",
  "Bildschirmtour starten",
  "Iniciar recorrido",
  "Schermrondleiding",
  "Avvia il tour",
  "Démarrer la visite",
  "Начать обзор экрана",
  "Ekran turunu başlat"
 ],
 "Guides": [
  "Guides",
  "Guides",
  "Guías",
  "Gidsen",
  "Guide",
  "Guides",
  "Руководства",
  "Rehberler"
 ],
 "No matching guides": [
  "No matching guides",
  "Keine passenden Guides",
  "No hay guías coincidentes",
  "Geen passende gidsen",
  "Nessuna guida trovata",
  "Aucun guide trouvé",
  "Ничего не найдено",
  "Eşleşen rehber yok"
 ],
 "Try another search or category.": [
  "Try another search or category.",
  "Andere Suche oder Kategorie versuchen.",
  "Prueba otra búsqueda o categoría.",
  "Probeer een andere zoekterm of categorie.",
  "Prova un'altra ricerca o categoria.",
  "Essayez une autre recherche ou catégorie.",
  "Попробуйте другой запрос или категорию.",
  "Başka bir arama veya kategori deneyin."
 ],
 "How it works": [
  "How it works",
  "So funktioniert es",
  "Cómo funciona",
  "Zo werkt het",
  "Come funziona",
  "Comment ça marche",
  "Как это работает",
  "Nasıl çalışır"
 ],
 "Previous": [
  "Previous",
  "Zurück",
  "Anterior",
  "Vorige",
  "Precedente",
  "Précédent",
  "Назад",
  "Önceki"
 ],
 "Next guide": [
  "Next guide",
  "Nächster Guide",
  "Siguiente guía",
  "Volgende gids",
  "Guida successiva",
  "Guide suivant",
  "Следующий гайд",
  "Sonraki rehber"
 ],
 "Open screen": [
  "Open screen",
  "Bildschirm öffnen",
  "Abrir pantalla",
  "Scherm openen",
  "Apri schermata",
  "Ouvrir l'écran",
  "Открыть экран",
  "Ekranı aç"
 ],
 "Preview only — unlock this feature to use it.": [
  "Preview only — unlock this feature to use it.",
  "Nur Vorschau – schalte die Funktion erst frei.",
  "Solo vista previa: desbloquéala para usarla.",
  "Alleen voorbeeld — ontgrendel de functie eerst.",
  "Solo anteprima: sblocca la funzione per usarla.",
  "Aperçu uniquement — débloquez la fonction.",
  "Только просмотр — сначала откройте функцию.",
  "Yalnızca önizleme — önce özelliği açın."
 ],
 "Unlock requirement": [
  "Unlock requirement",
  "Freischaltbedingung",
  "Requisito de desbloqueo",
  "Ontgrendelvoorwaarde",
  "Requisito di sblocco",
  "Condition de déblocage",
  "Условие открытия",
  "Açma koşulu"
 ],
 "Learning library": [
  "Learning library",
  "Lernbibliothek",
  "Biblioteca de aprendizaje",
  "Leerbibliotheek",
  "Biblioteca guide",
  "Bibliothèque d'aide",
  "Библиотека гайдов",
  "Öğrenme kütüphanesi"
 ]
} as const;
export type GuideHubLabel=keyof typeof labels;
export function guideHubText(language:Language,label:GuideHubLabel):string{
 const index=SUPPORTED_LANGUAGES.indexOf(language);
 return labels[label][index]??labels[label][0];
}
