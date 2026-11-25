import type {Language} from './languages';
import {SUPPORTED_LANGUAGES} from './languages';
import {createTranslator,interpolateTranslation,type TranslationParams} from './translator';
import {accountText} from './account';

/** New player-facing copy in Roadmap, Market Inbox and badges. Columns DE/ES/NL/IT/FR/RU/TR.
 * Only fixed product-authored UI strings belong here; never translate player or server content. */
export const recentScreenTranslationRows = {
  "Sovereign of the Stars": ["Herrscher der Sterne","Soberano de las estrellas","Heerser der sterren","Sovrano delle stelle","Souverain des étoiles","Владыка звёзд","Yıldızların Hükümdarı"],
  "Dragon Sovereign": ["Drachenherrscher","Soberano de los dragones","Drakenheerser","Sovrano dei draghi","Souverain des dragons","Владыка драконов","Ejderha Hükümdarı"],
  "Monarch of the Deep": ["Monarch der Tiefe","Monarca de las profundidades","Vorst van de diepte","Monarca degli abissi","Monarque des profondeurs","Монарх глубин","Derinliklerin Hükümdarı"],
  "Beyond Existence": ["Jenseits der Existenz","Más allá de la existencia","Voorbij het bestaan","Oltre l'esistenza","Au-delà de l'existence","За пределами бытия","Varoluşun Ötesinde"],
  "Ascendant collection entitlement.": ["Berechtigung für die Ascendant-Sammlung.","Derecho a la colección Ascendant.","Recht op de Ascendant-collectie.","Diritto alla collezione Ascendant.","Droit à la collection Ascendant.","Право на коллекцию Ascendant.","Ascendant koleksiyonu hakkı."],
  "Ascendant badge from the Celestial Sovereign collection.": ["Ascendant-Abzeichen aus der Sammlung Celestial Sovereign.","Insignia Ascendant de la colección Celestial Sovereign.","Ascendant-badge uit de Celestial Sovereign-collectie.","Distintivo Ascendant della collezione Celestial Sovereign.","Badge Ascendant de la collection Celestial Sovereign.","Значок Ascendant из коллекции Celestial Sovereign.","Celestial Sovereign koleksiyonundan Ascendant rozeti."],
  "Ascendant badge from the Draconic Dominion collection.": ["Ascendant-Abzeichen aus der Sammlung Draconic Dominion.","Insignia Ascendant de la colección Draconic Dominion.","Ascendant-badge uit de Draconic Dominion-collectie.","Distintivo Ascendant della collezione Draconic Dominion.","Badge Ascendant de la collection Draconic Dominion.","Значок Ascendant из коллекции Draconic Dominion.","Draconic Dominion koleksiyonundan Ascendant rozeti."],
  "Ascendant badge from the Abyssal Majesty collection.": ["Ascendant-Abzeichen aus der Sammlung Abyssal Majesty.","Insignia Ascendant de la colección Abyssal Majesty.","Ascendant-badge uit de Abyssal Majesty-collectie.","Distintivo Ascendant della collezione Abyssal Majesty.","Badge Ascendant de la collection Abyssal Majesty.","Значок Ascendant из коллекции Abyssal Majesty.","Abyssal Majesty koleksiyonundan Ascendant rozeti."],
  "Ascendant badge from the Paradox Eternal collection.": ["Ascendant-Abzeichen aus der Sammlung Paradox Eternal.","Insignia Ascendant de la colección Paradox Eternal.","Ascendant-badge uit de Paradox Eternal-collectie.","Distintivo Ascendant della collezione Paradox Eternal.","Badge Ascendant de la collection Paradox Eternal.","Значок Ascendant из коллекции Paradox Eternal.","Paradox Eternal koleksiyonundan Ascendant rozeti."],
  // Saturday 10:00 local-time charge reminder.
  "Saturday dungeon reminder": ["Dungeon-Erinnerung am Samstag","Recordatorio de mazmorra del sábado","Kerkermelding op zaterdag","Promemoria dungeon del sabato","Rappel de donjon du samedi","Напоминание о подземелье в субботу","Cumartesi zindan hatırlatıcısı"],
  "Remind me at 10:00 AM local time on Saturday when dungeon charges and enhanced rewards remain.": ["Erinnere mich samstags um 10:00 Uhr Ortszeit, wenn noch Dungeon-Versuche oder verbesserte Belohnungen übrig sind.","Avísame los sábados a las 10:00, hora local, si aún me quedan intentos de mazmorra o recompensas mejoradas.","Herinner me zaterdag om 10.00 uur lokale tijd als ik nog kerkerpogingen of verbeterde beloningen heb.","Ricordamelo sabato alle 10:00 ora locale se restano cariche dungeon o ricompense migliorate.","Rappelle-moi le samedi à 10 h, heure locale, s’il me reste des charges de donjon ou des récompenses améliorées.","Напоминайте мне по субботам в 10:00 по местному времени, если остались попытки подземелья или улучшенные награды.","Cumartesi günü yerel saatle 10.00'da zindan hakkım veya geliştirilmiş ödüllerim kaldığında beni hatırlat."],
  "Queue, mastery & rewards": ["Warteschlange, Meisterschaft & Belohnungen","Cola, maestría y recompensas","Wachtrij, meesterschap en beloningen","Coda, maestria e ricompense","File d’attente, maîtrise et récompenses","Очередь, мастерство и награды","Kuyruk, ustalık ve ödüller"],
  // One-page audio customization (DE, ES, NL, IT, FR, RU, TR).
  "Preview theme": ["Thema anhören","Escuchar tema","Muziek beluisteren","Ascolta il tema","Écouter le thème","Прослушать тему","Temayı Dinle"],
  "Music & Audio": ["Musik & Audio","Música y audio","Muziek & audio","Musica e audio","Musique et audio","Музыка и звук","Müzik ve Ses"],
  "Choose a theme or mute individual areas.": ["Wähle ein Musikthema oder schalte einzelne Bereiche stumm.","Elige un tema o silencia zonas individuales.","Kies een muziekthema of demp afzonderlijke onderdelen.","Scegli un brano o disattiva la musica in singole aree.","Choisissez un thème ou coupez le son de certaines zones.","Выберите тему или отключите музыку в отдельных областях.","Bir tema seçin veya belirli alanların müziğini kapatın."],
  "Regions": ["Regionen","Regiones","Regio's","Regioni","Régions","Регионы","Bölgeler"],
  "Activities": ["Aktivitäten","Actividades","Activiteiten","Attività","Activités","Занятия","Etkinlikler"],
  "Town & Menus": ["Stadt & Menüs","Ciudad y menús","Stad en menu's","Città e menu","Ville et menus","Город и меню","Şehir ve Menüler"],
  "Dungeons & Co-op": ["Dungeons & Koop","Mazmorras y cooperativo","Kerkers en co-op","Dungeon e cooperativa","Donjons et coop","Подземелья и совместная игра","Zindanlar ve Eşli Oyun"],
  "Boss battles": ["Bosskämpfe","Batallas contra jefes","Baasgevechten","Scontri con boss","Combats de boss","Бои с боссами","Boss Savaşları"],
  "World boss encounters": ["Weltbosskämpfe","Encuentros con jefes mundiales","Wereldbaasgevechten","Scontri con boss mondiali","Combats de boss mondiaux","Бои с мировыми боссами","Dünya Bossu Savaşları"],
  "Default theme": ["Standardthema","Tema predeterminado","Standaardmuziek","Tema predefinito","Thème par défaut","Тема по умолчанию","Varsayılan Tema"],
  "Change theme": ["Thema ändern","Cambiar tema","Muziek wijzigen","Cambia tema","Changer de thème","Сменить тему","Temayı Değiştir"],
  "Music for {area}": ["Musik für {area}","Música de {area}","Muziek voor {area}","Musica per {area}","Musique pour {area}","Музыка для {area}","{area} müziği"],
  "Music volume Off mutes every area. Your individual choices are kept.": ["Bei Musik Aus bleiben alle Bereiche stumm. Deine Auswahl bleibt gespeichert.","Al apagar la música, se silencian todas las zonas. Tus elecciones se conservan.","Met Muziek uit zijn alle gebieden stil. Je keuzes blijven bewaard.","Disattivando la musica, tutte le aree sono mute. Le tue scelte restano salvate.","Musique désactivée coupe le son de toutes les zones. Vos choix sont conservés.","Отключение музыки заглушает все области. Ваши настройки сохраняются.","Müzik kapalıyken tüm alanlar sessizdir. Seçimleriniz korunur."],
  "Each area uses its own theme unless you choose another.": ["Jeder Bereich spielt sein eigenes Thema, sofern du kein anderes wählst.","Cada zona usa su propio tema salvo que elijas otro.","Elk gebied speelt standaard zijn eigen muziek, tenzij je iets anders kiest.","Ogni area usa il proprio tema, a meno che tu non ne scelga un altro.","Chaque zone utilise son thème, sauf si vous en choisissez un autre.","Каждая область использует свою тему, если не выбрана другая.","Başka bir tema seçilmedikçe her alan kendi müziğini kullanır."],
  "Restore area defaults": ["Bereichsmusik zurücksetzen","Restablecer música de las zonas","Gebiedsmuziek herstellen","Ripristina musica delle aree","Réinitialiser la musique des zones","Сбросить музыку областей","Alan Müziğini Sıfırla"],
  // Supply Journey 2.0 (DE, ES, NL, IT, FR, RU, TR).
  "ACCOUNT / DAILY REWARDS": ["KONTO / TÄGLICHE BELOHNUNGEN", "CUENTA / RECOMPENSAS DIARIAS", "ACCOUNT / DAGELIJKSE BELONINGEN", "ACCOUNT / RICOMPENSE GIORNALIERE", "COMPTE / RÉCOMPENSES QUOTIDIENNES", "АККАУНТ / ЕЖЕДНЕВНЫЕ НАГРАДЫ", "HESAP / GÜNLÜK ÖDÜLLER"],
  "Supply Journey": ["Vorratsreise", "Viaje de suministros", "Voorraadreis", "Viaggio delle provviste", "Voyage des provisions", "Путь припасов", "Erzak Yolculuğu"],
  "One claim per UTC day. Missed days pause, never reset, the journey.": ["Eine Abholung pro UTC-Tag. Verpasste Tage pausieren die Reise, sie wird nie zurückgesetzt.", "Un reclamo por día UTC. Los días perdidos pausan el viaje, nunca lo reinician.", "Eén claim per UTC-dag. Gemiste dagen pauzeren de reis, ze wordt nooit gereset.", "Un riscatto per giorno UTC. I giorni persi mettono in pausa il viaggio, senza mai azzerarlo.", "Une récupération par jour UTC. Les jours manqués mettent le voyage en pause, sans jamais le réinitialiser.", "Одна награда за день по UTC. Пропущенные дни ставят путь на паузу, но никогда не сбрасывают его.", "UTC gününe bir alım. Kaçırılan günler yolculuğu duraklatır, asla sıfırlamaz."],
  "Reward Path": ["Belohnungspfad", "Ruta de recompensas", "Beloningspad", "Percorso ricompense", "Chemin des récompenses", "Путь наград", "Ödül Yolu"],
  "Boost Vault": ["Boost-Tresor", "Cámara de potenciadores", "Boostkluis", "Caveau dei potenziamenti", "Coffre des bonus", "Хранилище усилений", "Takviye Kasası"],
  "Journey {cycle}": ["Reise {cycle}", "Viaje {cycle}", "Reis {cycle}", "Viaggio {cycle}", "Voyage {cycle}", "Путь {cycle}", "Yolculuk {cycle}"],
  "Supply Journey progress": ["Fortschritt der Vorratsreise", "Progreso del viaje de suministros", "Voortgang voorraadreis", "Progressi del viaggio delle provviste", "Progression du voyage des provisions", "Прогресс пути припасов", "Erzak Yolculuğu ilerlemesi"],
  "{count}/28 rewards claimed": ["{count}/28 Belohnungen abgeholt", "{count}/28 recompensas reclamadas", "{count}/28 beloningen geclaimd", "{count}/28 ricompense riscattate", "{count}/28 récompenses récupérées", "Получено наград: {count}/28", "{count}/28 ödül alındı"],
  "CH. {number}": ["KAP. {number}", "CAP. {number}", "HFST. {number}", "CAP. {number}", "CH. {number}", "ГЛ. {number}", "BÖL. {number}"],
  "Chapter {chapter}": ["Kapitel {chapter}", "Capítulo {chapter}", "Hoofdstuk {chapter}", "Capitolo {chapter}", "Chapitre {chapter}", "Глава {chapter}", "Bölüm {chapter}"],
  "Day {day}": ["Tag {day}", "Día {day}", "Dag {day}", "Giorno {day}", "Jour {day}", "День {day}", "Gün {day}"],
  "Select a day to inspect its reward. Milestone days are marked with a diamond.": ["Wähle einen Tag, um seine Belohnung anzusehen. Meilensteintage sind mit einer Raute markiert.", "Selecciona un día para ver su recompensa. Los días de hito están marcados con un rombo.", "Kies een dag om de beloning te bekijken. Mijlpaaldagen zijn gemarkeerd met een ruit.", "Seleziona un giorno per vederne la ricompensa. I giorni traguardo sono segnati con un rombo.", "Sélectionne un jour pour voir sa récompense. Les jours d’étape sont marqués d’un losange.", "Выберите день, чтобы посмотреть награду. Ключевые дни отмечены ромбом.", "Ödülünü görmek için bir gün seç. Dönüm noktası günleri bir elmasla işaretlidir."],
  "DAY {day} REWARD": ["BELOHNUNG TAG {day}", "RECOMPENSA DEL DÍA {day}", "BELONING DAG {day}", "RICOMPENSA GIORNO {day}", "RÉCOMPENSE DU JOUR {day}", "НАГРАДА ДНЯ {day}", "{day}. GÜN ÖDÜLÜ"],
  "COLLECTED": ["ERHALTEN", "OBTENIDO", "ONTVANGEN", "OTTENUTO", "OBTENU", "ПОЛУЧЕНО", "ALINDI"],
  "AVAILABLE": ["VERFÜGBAR", "DISPONIBLE", "BESCHIKBAAR", "DISPONIBILE", "DISPONIBLE", "ДОСТУПНО", "MEVCUT"],
  "PREVIEW": ["VORSCHAU", "VISTA PREVIA", "VOORBEELD", "ANTEPRIMA", "APERÇU", "ПРЕДПРОСМОТР", "ÖNİZLEME"],
  "Supply Blessing": ["Vorratssegen", "Bendición de suministros", "Voorraadzegen", "Benedizione delle provviste", "Bénédiction des provisions", "Благословение припасов", "Erzak Kutsaması"],
  "Choose one enhanced buff to store": ["Wähle einen verstärkten Buff zum Speichern", "Elige una mejora potenciada para guardar", "Kies één versterkte buff om op te slaan", "Scegli un potenziamento migliorato da conservare", "Choisis un bonus renforcé à conserver", "Выберите одно усиленное улучшение для хранения", "Saklamak için güçlendirilmiş bir takviye seç"],
  "Stored until activated · time drains only during eligible activity": ["Gespeichert bis zur Aktivierung · Zeit läuft nur bei passender Aktivität ab", "Guardado hasta activarlo · el tiempo solo corre durante actividades válidas", "Bewaard tot activering · tijd loopt alleen tijdens geschikte activiteit", "Conservato fino all’attivazione · il tempo scorre solo durante le attività idonee", "Conservé jusqu’à activation · le temps ne s’écoule que pendant une activité éligible", "Хранится до активации · время тратится только во время подходящих занятий", "Etkinleştirilene kadar saklanır · süre yalnızca uygun etkinlik sırasında azalır"],
  "CHOOSE YOUR BLESSING": ["WÄHLE DEINEN SEGEN", "ELIGE TU BENDICIÓN", "KIES JE ZEGEN", "SCEGLI LA TUA BENEDIZIONE", "CHOISIS TA BÉNÉDICTION", "ВЫБЕРИТЕ БЛАГОСЛОВЕНИЕ", "KUTSAMANI SEÇ"],
  "Claim Supply Blessing": ["Vorratssegen abholen", "Reclamar bendición de suministros", "Voorraadzegen claimen", "Riscatta la benedizione delle provviste", "Récupérer la bénédiction des provisions", "Получить благословение припасов", "Erzak Kutsamasını al"],
  "Claim Today’s Supply": ["Heutige Vorräte abholen", "Reclamar el suministro de hoy", "Voorraad van vandaag claimen", "Riscatta le provviste di oggi", "Récupérer les provisions du jour", "Получить сегодняшние припасы", "Bugünün erzakını al"],
  "Reward banked account-wide.": ["Belohnung kontoweit gespeichert.", "Recompensa guardada para toda la cuenta.", "Beloning accountbreed opgeslagen.", "Ricompensa conservata per tutto l’account.", "Récompense conservée pour tout le compte.", "Награда сохранена для всего аккаунта.", "Ödül hesap genelinde saklandı."],
  "Reward Collected": ["Belohnung erhalten", "Recompensa obtenida", "Beloning ontvangen", "Ricompensa ottenuta", "Récompense obtenue", "Награда получена", "Ödül alındı"],
  "View Current Claim": ["Aktuelle Abholung ansehen", "Ver reclamo actual", "Huidige claim bekijken", "Vedi riscatto attuale", "Voir la récupération actuelle", "Посмотреть текущую награду", "Güncel alımı görüntüle"],
  "Chapter Milestones": ["Kapitel-Meilensteine", "Hitos del capítulo", "Hoofdstukmijlpalen", "Traguardi del capitolo", "Étapes du chapitre", "Ключевые награды глав", "Bölüm Dönüm Noktaları"],
  "DAY {day}": ["TAG {day}", "DÍA {day}", "DAG {day}", "GIORNO {day}", "JOUR {day}", "ДЕНЬ {day}", "GÜN {day}"],
  "Open Boost Vault": ["Boost-Tresor öffnen", "Abrir cámara de potenciadores", "Boostkluis openen", "Apri caveau dei potenziamenti", "Ouvrir le coffre des bonus", "Открыть хранилище усилений", "Takviye Kasasını aç"],
  "Five activity bonuses, saved across all your characters.": ["Fünf Aktivitätsboni, für alle deine Charaktere gespeichert.", "Cinco bonificaciones de actividad, guardadas para todos tus personajes.", "Vijf activiteitsbonussen, opgeslagen voor al je personages.", "Cinque bonus attività, conservati per tutti i tuoi personaggi.", "Cinq bonus d’activité, conservés pour tous tes personnages.", "Пять бонусов занятий, сохранённых для всех ваших персонажей.", "Tüm karakterlerin için saklanan beş etkinlik bonusu."],
  "active": ["aktiv", "activo", "actief", "attivo", "actif", "активно", "etkin"],
  "saved": ["gespeichert", "guardado", "opgeslagen", "conservato", "conservé", "сохранено", "saklı"],
  "left": ["übrig", "restante", "resterend", "rimanente", "restant", "осталось", "kaldı"],
  "No active boost": ["Kein aktiver Boost", "Sin potenciador activo", "Geen actieve boost", "Nessun potenziamento attivo", "Aucun bonus actif", "Нет активного усиления", "Etkin takviye yok"],
  "queued": ["in Warteschlange", "en cola", "in wachtrij", "in coda", "en file", "в очереди", "sırada"],
  "best": ["beste", "mejor", "beste", "migliore", "meilleur", "лучшее", "en iyi"],
  "Activate strongest saved": ["Stärksten gespeicherten aktivieren", "Activar el más fuerte guardado", "Sterkste opgeslagen activeren", "Attiva il più forte conservato", "Activer le plus puissant conservé", "Активировать самое сильное сохранённое", "En güçlü saklananı etkinleştir"],
  "No saved boosts": ["Keine gespeicherten Boosts", "Sin potenciadores guardados", "Geen opgeslagen boosts", "Nessun potenziamento conservato", "Aucun bonus conservé", "Нет сохранённых усилений", "Saklı takviye yok"],
  "activated or queued.": ["aktiviert oder eingereiht.", "activado o en cola.", "geactiveerd of in de wachtrij gezet.", "attivato o messo in coda.", "activé ou mis en file.", "активировано или поставлено в очередь.", "etkinleştirildi veya sıraya alındı."],
  "Back to Reward Path": ["Zurück zum Belohnungspfad", "Volver a la ruta de recompensas", "Terug naar het beloningspad", "Torna al percorso ricompense", "Retour au chemin des récompenses", "Назад к пути наград", "Ödül Yoluna dön"],
  "HOW SUPPLY BUFFS WORK": ["SO FUNKTIONIEREN VORRATS-BUFFS", "CÓMO FUNCIONAN LAS MEJORAS DE SUMINISTROS", "ZO WERKEN VOORRAADBUFFS", "COME FUNZIONANO I POTENZIAMENTI DELLE PROVVISTE", "FONCTIONNEMENT DES BONUS DE PROVISIONS", "КАК РАБОТАЮТ УСИЛЕНИЯ ПРИПАСОВ", "ERZAK TAKVİYELERİ NASIL ÇALIŞIR"],
  "Activity time, strongest bonus and stacking": ["Aktivitätszeit, stärkster Bonus und Stapeln", "Tiempo de actividad, bonificación más fuerte y acumulación", "Activiteitstijd, sterkste bonus en stapelen", "Tempo di attività, bonus più forte e cumulabilità", "Temps d’activité, bonus le plus fort et cumul", "Время занятий, сильнейший бонус и наложение", "Etkinlik süresi, en güçlü bonus ve birikme"],
  "Only the strongest Supply buff of a category applies. Weaker active buffs pause while a stronger one runs, then resume.": ["Pro Kategorie gilt nur der stärkste Vorrats-Buff. Schwächere aktive Buffs pausieren, solange ein stärkerer läuft, und laufen danach weiter.", "Solo se aplica la mejora de suministros más fuerte de cada categoría. Las mejoras activas más débiles se pausan mientras corre una más fuerte y luego continúan.", "Per categorie geldt alleen de sterkste voorraadbuff. Zwakkere actieve buffs pauzeren zolang een sterkere loopt en gaan daarna verder.", "Si applica solo il potenziamento delle provviste più forte di ogni categoria. Quelli attivi più deboli si mettono in pausa mentre ne è attivo uno più forte, poi riprendono.", "Seul le bonus de provisions le plus fort d’une catégorie s’applique. Les bonus actifs plus faibles se mettent en pause pendant qu’un plus fort est actif, puis reprennent.", "В каждой категории действует только сильнейшее усиление припасов. Более слабые активные усиления приостанавливаются, пока идёт сильное, а затем продолжаются.", "Her kategoride yalnızca en güçlü Erzak takviyesi uygulanır. Daha zayıf etkin takviyeler, güçlü olan sürerken duraklar ve sonra devam eder."],
  "Supply buffs affect account-wide stored bonuses but use a shared timer across characters. Different categories can run together.": ["Vorrats-Buffs sind kontoweit gespeichert, nutzen aber einen gemeinsamen Timer für alle Charaktere. Verschiedene Kategorien können gleichzeitig laufen.", "Las mejoras de suministros se guardan para toda la cuenta, pero usan un temporizador compartido entre personajes. Distintas categorías pueden funcionar a la vez.", "Voorraadbuffs worden accountbreed opgeslagen, maar gebruiken een gedeelde timer voor alle personages. Verschillende categorieën kunnen tegelijk lopen.", "I potenziamenti delle provviste sono conservati per tutto l’account, ma usano un timer condiviso tra i personaggi. Categorie diverse possono essere attive insieme.", "Les bonus de provisions sont conservés pour tout le compte, mais utilisent un minuteur partagé entre les personnages. Des catégories différentes peuvent fonctionner en même temps.", "Усиления припасов хранятся для всего аккаунта, но используют общий таймер для всех персонажей. Разные категории могут действовать одновременно.", "Erzak takviyeleri hesap genelinde saklanır ancak karakterler arasında ortak bir sayaç kullanır. Farklı kategoriler birlikte çalışabilir."],
  "Event boosts, candy, pets and independent bonuses still stack according to their own rules.": ["Event-Boosts, Süßigkeiten, Haustiere und unabhängige Boni stapeln weiterhin nach ihren eigenen Regeln.", "Los potenciadores de eventos, los caramelos, las mascotas y las bonificaciones independientes siguen acumulándose según sus propias reglas.", "Eventboosts, snoep, huisdieren en onafhankelijke bonussen stapelen nog steeds volgens hun eigen regels.", "I potenziamenti degli eventi, le caramelle, gli animali e i bonus indipendenti si cumulano ancora secondo le proprie regole.", "Les bonus d’événement, les bonbons, les familiers et les bonus indépendants se cumulent toujours selon leurs propres règles.", "Усиления событий, сладости, питомцы и независимые бонусы по-прежнему складываются по своим правилам.", "Etkinlik takviyeleri, şekerler, evcil hayvanlar ve bağımsız bonuslar kendi kurallarına göre birikmeye devam eder."],
  "Gathering Speed covers mining, woodcutting, fishing and herbalism. Crafting Speed accelerates timed processing, alchemy and Equipment Forge jobs; instant recipes have no waiting time to shorten.": ["Sammeltempo gilt für Bergbau, Holzfällen, Angeln und Kräuterkunde. Herstellungstempo beschleunigt zeitgesteuerte Verarbeitung, Alchemie und Aufträge der Ausrüstungsschmiede; Sofortrezepte haben keine Wartezeit zum Verkürzen.", "La velocidad de recolección cubre minería, tala, pesca y herboristería. La velocidad de fabricación acelera el procesamiento con tiempo, la alquimia y los trabajos de la forja de equipo; las recetas instantáneas no tienen espera que acortar.", "Verzamelsnelheid geldt voor mijnbouw, houthakken, vissen en kruidenkunde. Maaksnelheid versnelt getimede verwerking, alchemie en opdrachten in de uitrustingssmederij; directe recepten hebben geen wachttijd om te verkorten.", "La velocità di raccolta vale per estrazione, taglio della legna, pesca ed erboristeria. La velocità di creazione accelera la lavorazione a tempo, l’alchimia e i lavori della forgia dell’equipaggiamento; le ricette istantanee non hanno attese da ridurre.", "La vitesse de récolte couvre le minage, la coupe de bois, la pêche et l’herboristerie. La vitesse de fabrication accélère la transformation chronométrée, l’alchimie et les travaux de la forge d’équipement ; les recettes instantanées n’ont pas d’attente à réduire.", "Скорость сбора действует на добычу руды, рубку леса, рыбалку и травничество. Скорость ремесла ускоряет обработку по таймеру, алхимию и заказы кузницы снаряжения; у мгновенных рецептов нет ожидания, которое можно сократить.", "Toplama Hızı madencilik, odunculuk, balıkçılık ve şifalı bitkiciliği kapsar. Üretim Hızı zamanlı işlemeyi, simyayı ve Ekipman Demirhanesi işlerini hızlandırır; anlık tariflerde kısaltılacak bekleme süresi yoktur."],
  "Forge jobs across all slots share one Crafting Speed timer. When timed alchemy or processing runs at the same time, it takes priority and Forge uses its regular speed, preventing double consumption.": ["Schmiedeaufträge in allen Plätzen teilen sich einen Herstellungstempo-Timer. Läuft gleichzeitig zeitgesteuerte Alchemie oder Verarbeitung, hat diese Vorrang und die Schmiede arbeitet im normalen Tempo, damit nichts doppelt verbraucht wird.", "Los trabajos de forja de todas las ranuras comparten un temporizador de velocidad de fabricación. Si a la vez hay alquimia o procesamiento con tiempo, estos tienen prioridad y la forja usa su velocidad normal, evitando un doble consumo.", "Smederijopdrachten in alle plekken delen één maaksnelheidstimer. Loopt er tegelijk getimede alchemie of verwerking, dan heeft die voorrang en werkt de smederij op normale snelheid, zodat niets dubbel wordt verbruikt.", "I lavori di forgia di tutti gli slot condividono un unico timer della velocità di creazione. Se nello stesso momento è attiva alchimia o lavorazione a tempo, questa ha la priorità e la forgia usa la velocità normale, evitando un doppio consumo.", "Les travaux de forge de tous les emplacements partagent un seul minuteur de vitesse de fabrication. Si une alchimie ou une transformation chronométrée tourne en même temps, elle est prioritaire et la forge utilise sa vitesse normale, ce qui évite une double consommation.", "Заказы кузницы во всех ячейках используют один общий таймер скорости ремесла. Если одновременно идёт алхимия или обработка по таймеру, она в приоритете, а кузница работает с обычной скоростью, чтобы время не тратилось дважды.", "Tüm yuvalardaki demirhane işleri tek bir Üretim Hızı sayacını paylaşır. Aynı anda zamanlı simya veya işleme çalışıyorsa öncelik onundur ve demirhane normal hızını kullanır; böylece çift tüketim önlenir."],
  "Combat Speed applies to ordinary idle hunts, not dungeon, boss or PvP cooldowns. Supply buffs do not extend Offline Reserve.": ["Kampftempo gilt für normale Idle-Jagden, nicht für Dungeon-, Boss- oder PvP-Abklingzeiten. Vorrats-Buffs verlängern die Offline-Reserve nicht.", "La velocidad de combate se aplica a las cacerías inactivas normales, no a los tiempos de espera de mazmorras, jefes o JcJ. Las mejoras de suministros no amplían la reserva sin conexión.", "Gevechtssnelheid geldt voor gewone idle-jachten, niet voor afkoeltijden van kerkers, bazen of PvP. Voorraadbuffs verlengen de offline reserve niet.", "La velocità di combattimento vale per le normali cacce inattive, non per i tempi di ricarica di dungeon, boss o PvP. I potenziamenti delle provviste non estendono la riserva offline.", "La vitesse de combat s’applique aux chasses inactives ordinaires, pas aux temps de recharge des donjons, des boss ou du JcJ. Les bonus de provisions ne prolongent pas la réserve hors ligne.", "Скорость боя действует на обычную автоохоту, но не на перезарядку подземелий, боссов или PvP. Усиления припасов не продлевают офлайн-запас.", "Savaş Hızı sıradan boşta avlara uygulanır; zindan, boss veya PvP bekleme sürelerine uygulanmaz. Erzak takviyeleri Çevrimdışı Rezervi uzatmaz."],
  "SUPPLY JOURNEY": ["VORRATSREISE", "VIAJE DE SUMINISTROS", "VOORRAADREIS", "VIAGGIO DELLE PROVVISTE", "VOYAGE DES PROVISIONS", "ПУТЬ ПРИПАСОВ", "ERZAK YOLCULUĞU"],
  "{count} account-wide boosts saved": ["{count} kontoweite Boosts gespeichert", "{count} potenciadores guardados para toda la cuenta", "{count} accountbrede boosts opgeslagen", "{count} potenziamenti conservati per tutto l’account", "{count} bonus conservés pour tout le compte", "Сохранено усилений для аккаунта: {count}", "{count} hesap geneli takviye saklandı"],
  "Manage Supply Journey": ["Vorratsreise verwalten", "Gestionar viaje de suministros", "Voorraadreis beheren", "Gestisci viaggio delle provviste", "Gérer le voyage des provisions", "Управлять путём припасов", "Erzak Yolculuğunu yönet"],
  // Device sound settings (DE, ES, NL, IT, FR, RU, TR).
  "Sound": ["Ton","Sonido","Geluid","Audio","Son","Звук","Ses"],
  "Music": ["Musik","Música","Muziek","Musica","Musique","Музыка","Müzik"],
  "Sound effects": ["Soundeffekte","Efectos de sonido","Geluidseffecten","Effetti sonori","Effets sonores","Звуковые эффекты","Ses efektleri"],
  "Mute": ["Stumm","Silenciar","Dempen","Muto","Muet","Выкл.","Sessiz"],
  "Unmute": ["Ton an","Activar","Aan","Attiva","Activer","Вкл.","Aç"],
  "Low": ["Leise","Bajo","Laag","Basso","Faible","Тихо","Düşük"],
  "Medium": ["Mittel","Medio","Gemiddeld","Medio","Moyen","Средне","Orta"],
  "High": ["Laut","Alto","Hoog","Alto","Élevé","Громко","Yüksek"],
  "Sound plays only while Veldryn is open and follows your device's silent mode.": ["Ton wird nur bei geöffnetem Veldryn abgespielt und folgt dem Lautlosmodus deines Geräts.","El sonido solo se reproduce con Veldryn abierto y respeta el modo silencio de tu dispositivo.","Geluid speelt alleen terwijl Veldryn open is en volgt de stille modus van je apparaat.","L'audio viene riprodotto solo con Veldryn aperto e rispetta la modalità silenziosa del dispositivo.","Le son n'est joué que lorsque Veldryn est ouvert et respecte le mode silencieux de votre appareil.","Звук воспроизводится, только когда Veldryn открыт, и учитывает беззвучный режим устройства.","Ses yalnızca Veldryn açıkken çalar ve cihazının sessiz modunu izler."],
  // Device haptic feedback setting (DE, ES, NL, IT, FR, RU, TR).
  "Haptic feedback": ["Haptisches Feedback","Respuesta háptica","Haptische feedback","Feedback aptico","Retour haptique","Тактильная отдача","Dokunsal geri bildirim"],
  "Vibrate on big combat moments, such as boss specials and finishing blows.": ["Vibriert bei großen Kampfmomenten wie Boss-Spezialangriffen und finalen Treffern.","Vibra en los grandes momentos del combate, como los ataques especiales de jefes y los golpes finales.","Trilt bij grote gevechtsmomenten, zoals speciale aanvallen van bazen en genadeslagen.","Vibra nei grandi momenti di combattimento, come gli attacchi speciali dei boss e i colpi finali.","Vibre lors des grands moments de combat, comme les attaques spéciales des boss et les coups de grâce.","Вибрация в важные моменты боя, например при особых атаках боссов и добивающих ударах.","Boss özel saldırıları ve son vuruşlar gibi büyük savaş anlarında titreşir."],
  // Three-tab community roadmap and live release/development descriptions (DE, ES, NL, IT, FR, RU, TR).
  "Voting": ["Abstimmen","Votación","Stemmen","Votazione","Vote","Голосование","Oylama"],
  "Votes help set priorities, but do not guarantee a release date. When an idea moves into development, its votes are returned.": ["Stimmen helfen bei der Priorisierung, garantieren aber kein Veröffentlichungsdatum. Sobald eine Idee in Entwicklung geht, werden die Stimmen zurückgegeben.","Los votos ayudan a decidir prioridades, pero no garantizan una fecha de lanzamiento. Al pasar una idea a desarrollo, se devuelven sus votos.","Stemmen helpen prioriteiten bepalen, maar garanderen geen releasedatum. Zodra een idee in ontwikkeling gaat, krijg je je stemmen terug.","I voti aiutano a stabilire le priorità, ma non garantiscono una data di uscita. Quando un'idea entra in sviluppo, i voti vengono restituiti.","Les votes orientent les priorités sans garantir de date de sortie. Quand une idée passe en développement, les votes sont rendus.","Голоса помогают выбирать приоритеты, но не гарантируют дату выхода. Когда идея переходит в разработку, голоса возвращаются.","Oylar öncelikleri belirlemeye yardımcı olur ancak çıkış tarihi garantilemez. Bir fikir geliştirmeye geçtiğinde oylar iade edilir."],
  "Dungeon Expansion & Improvements": ["Dungeon-Erweiterungen und Verbesserungen","Expansión y mejoras de mazmorras","Kerkers uitbreiden en verbeteren","Espansione e migliorie dei dungeon","Extensions et améliorations des donjons","Расширение и улучшения подземелий","Zindan genişletmeleri ve iyileştirmeleri"],
  "Seasonal Event Expansion": ["Erweiterung saisonaler Events","Expansión de eventos de temporada","Uitbreiding seizoensevenementen","Espansione degli eventi stagionali","Extension des événements saisonniers","Расширение сезонных событий","Sezonluk etkinliklerin genişletilmesi"],
  "Co-op dungeons are live. We are expanding encounters, refining difficulty tiers, companion loadouts and reward presentation.": ["Koop-Dungeons sind spielbar. Wir erweitern Begegnungen und verbessern Schwierigkeitsstufen, Gefährtenausrüstung und Belohnungsanzeigen.","Las mazmorras cooperativas ya están disponibles. Ampliamos encuentros y mejoramos dificultades, equipos de compañeros y recompensas.","Coöp-kerkers zijn speelbaar. We voegen gevechten toe en verbeteren moeilijkheidsniveaus, metgezellen en de weergave van beloningen.","I dungeon cooperativi sono disponibili. Ampliamo gli incontri e perfezioniamo difficoltà, equipaggiamento dei compagni e ricompense.","Les donjons coopératifs sont disponibles. Nous développons les combats et améliorons les difficultés, les compagnons et l'affichage des récompenses.","Совместные подземелья уже доступны. Мы расширяем встречи и улучшаем уровни сложности, подбор спутников и показ наград.","Eşli zindanlar oynanabilir durumda. Karşılaşmaları genişletiyor, zorlukları, yoldaş dizilimlerini ve ödül sunumunu iyileştiriyoruz."],
  "Seasonal celebrations are live. We are adding activities, event shops, themed rewards and clearer event access.": ["Saisonale Events sind bereits spielbar. Wir ergänzen Aktivitäten, Eventshops, Themenbelohnungen und einen klareren Zugang.","Los eventos de temporada ya están disponibles. Añadimos actividades, tiendas, recompensas temáticas y un acceso más claro.","Seizoensevenementen zijn speelbaar. We voegen activiteiten, evenementenwinkels, themabeloningen en duidelijkere toegang toe.","Gli eventi stagionali sono disponibili. Aggiungiamo attività, negozi, ricompense a tema e accessi più chiari.","Les événements saisonniers sont disponibles. Nous ajoutons des activités, des boutiques, des récompenses thématiques et un accès simplifié.","Сезонные события уже доступны. Мы добавляем занятия, магазины событий, тематические награды и упрощаем доступ.","Sezonluk etkinlikler oynanabilir. Etkinlikler, mağazalar, temalı ödüller ve daha anlaşılır erişim ekliyoruz."],
  "Weekend world bosses with cooperative War Camp preparation, character-roster attacks, and contribution-based rewards. In development, not yet playable.": ["Weltbosse am Wochenende mit gemeinsamer Kriegslager-Vorbereitung, Charaktergruppen-Angriffen und beitragsbasierten Belohnungen. Noch in Entwicklung.","Jefes mundiales de fin de semana con preparación en el campamento, ataques de tus personajes y recompensas por contribución. En desarrollo.","Wereldbazen in het weekend met gezamenlijke kampvoorbereiding, aanvallen met je personages en beloningen op basis van bijdrage. Nog in ontwikkeling.","Boss mondiali nel weekend con preparazione comune, attacchi dei propri personaggi e ricompense in base al contributo. In sviluppo.","Boss mondiaux le week-end avec préparation collective, attaques de vos personnages et récompenses selon la contribution. En développement.","Мировые боссы по выходным: совместная подготовка лагеря, атаки ваших персонажей и награды за вклад. Пока в разработке.","Hafta sonu dünya bossları: ortak savaş kampı hazırlığı, karakter ekibi saldırıları ve katkıya dayalı ödüller. Henüz geliştirme aşamasında."],
  "Cooperative multi-day party events with shared preparation, objectives, boss encounters and unique rewards. In development.": ["Mehrtagige Gruppen-Events mit gemeinsamer Vorbereitung, Zielen, Bosskämpfen und besonderen Belohnungen. In Entwicklung.","Eventos cooperativos de varios días con preparación conjunta, objetivos, jefes y recompensas únicas. En desarrollo.","Meerdaagse party-evenementen met gezamenlijke voorbereiding, doelen, baasgevechten en unieke beloningen. In ontwikkeling.","Eventi di gruppo di più giorni con preparativi condivisi, obiettivi, boss e ricompense uniche. In sviluppo.","Événements de groupe sur plusieurs jours avec préparatifs, objectifs, boss et récompenses uniques. En développement.","Многодневные групповые события с общей подготовкой, целями, боссами и уникальными наградами. В разработке.","Ortak hazırlık, hedefler, boss savaşları ve özel ödüller içeren çok günlük grup etkinlikleri. Geliştirme aşamasında."],
  "Secure equipment and resource trading, with listings, purchases and returned items. Under development; trading is not live.": ["Sicherer Handel mit Ausrüstung und Ressourcen, Angeboten, Käufen und Rückgaben. In Entwicklung; Handel ist noch nicht verfügbar.","Comercio seguro de equipo y recursos con anuncios, compras y devoluciones. En desarrollo; el mercado aún no está disponible.","Veilig handelen in uitrusting en grondstoffen met aanbiedingen, aankopen en retouren. In ontwikkeling; handelen is nog niet beschikbaar.","Scambio sicuro di equipaggiamento e risorse con inserzioni, acquisti e resi. In sviluppo; gli scambi non sono ancora attivi.","Échange sécurisé d'équipements et de ressources avec annonces, achats et retours. En développement ; échanges indisponibles.","Безопасная торговля снаряжением и ресурсами с объявлениями, покупками и возвратами. В разработке; торговля ещё недоступна.","İlan, alım ve iade işlemleriyle güvenli ekipman ve kaynak ticareti. Geliştirme aşamasında; ticaret henüz açık değil."],
  "Seasonal and lifetime rankings for combat, professions, dungeons and guilds. Ranking screens and scoring are under development.": ["Saisonale und ewige Ranglisten für Kampf, Berufe, Dungeons und Gilden. Ranglisten und Wertung sind in Entwicklung.","Clasificaciones de temporada e históricas para combate, profesiones, mazmorras y gremios. Pantallas y puntuación en desarrollo.","Seizoens- en eeuwige ranglijsten voor gevechten, beroepen, kerkers en guilds. Schermen en puntentelling zijn in ontwikkeling.","Classifiche stagionali e permanenti per combattimento, professioni, dungeon e gilde. Schermate e punteggi in sviluppo.","Classements saisonniers et permanents pour combats, métiers, donjons et guildes. Écrans et scores en développement.","Сезонные и общие рейтинги боя, профессий, подземелий и гильдий. Экраны и подсчёт очков в разработке.","Savaş, meslek, zindan ve loncalar için sezonluk ve kalıcı sıralamalar. Ekranlar ve puanlama geliştiriliyor."],
  "Expand high-tier equipment with new materials, crafting recipes and distinctive bonus-stat rolls for weapons. Under development.": ["Hochstufige Ausrüstung mit neuen Materialien, Rezepten und zufälligen Bonuswerten für Waffen erweitern. In Entwicklung.","Ampliar el equipo de nivel alto con materiales, recetas y bonificaciones aleatorias de armas. En desarrollo.","Hoogwaardige uitrusting uitbreiden met nieuwe materialen, recepten en willekeurige bonusstatistieken voor wapens. In ontwikkeling.","Espandere l'equipaggiamento avanzato con materiali, ricette e statistiche bonus casuali per le armi. In sviluppo.","Développer l'équipement avancé avec matériaux, recettes et bonus de statistiques aléatoires sur les armes. En développement.","Развитие высокоуровневого снаряжения: материалы, рецепты и случайные бонусные характеристики оружия. В разработке.","Üst seviye ekipmanı yeni malzemeler, tarifler ve silahlara rastgele bonus özelliklerle genişletme. Geliştirme aşamasında."],
  "Explore cooperative dungeon runs with party roles, boss encounters, loot and Expedition Marks.": ["Erkunde Koop-Dungeons mit Gruppenrollen, Bosskämpfen, Beute und Expeditionsmarken.","Explora mazmorras cooperativas con roles de grupo, jefes, botín y marcas de expedición.","Verken coöp-kerkers met partyrollen, baasgevechten, buit en expeditiemarkeringen.","Esplora dungeon cooperativi con ruoli di gruppo, boss, bottino e Marchi spedizione.","Explorez les donjons coopératifs avec rôles de groupe, boss, butin et marques d'expédition.","Проходите совместные подземелья с ролями группы, боссами, добычей и экспедиционными знаками.","İş birliği zindanlarında grup rolleri, bosslar, ganimet ve Sefer İşaretleriyle ilerleyin."],
  "Join rotating themed celebrations with limited-time activities and event rewards.": ["Nimm an wechselnden Themenfesten mit zeitlich begrenzten Aktivitäten und Eventbelohnungen teil.","Participa en celebraciones temáticas con actividades temporales y recompensas de evento.","Doe mee aan wisselende themafeesten met tijdelijke activiteiten en evenementenbeloningen.","Partecipa a celebrazioni a tema con attività temporanee e ricompense evento.","Participez à des fêtes thématiques avec activités temporaires et récompenses d'événement.","Участвуйте в тематических праздниках с временными активностями и наградами событий.","Dönüşümlü temalı kutlamalara, sınırlı süreli etkinliklere ve ödüllere katılın."],
  "Recruit, train and ascend companions to support your character in combat.": ["Rekrutiere, trainiere und verbessere Gefährten, die deinen Charakter im Kampf unterstützen.","Recluta, entrena y asciende compañeros que apoyen a tu personaje en combate.","Rekruteer, train en laat metgezellen stijgen om je personage in gevechten te helpen.","Recluta, addestra e fai ascendere i compagni per sostenere il personaggio in combattimento.","Recrutez, entraînez et faites progresser vos compagnons pour aider votre personnage au combat.","Нанимайте, тренируйте и возвышайте спутников для поддержки персонажа в бою.","Karakterine savaşta destek olmaları için yoldaşları topla, eğit ve yükselt."],
  "Join guilds, contribute to projects, develop guild skills and earn shared rewards.": ["Tritt Gilden bei, unterstütze Projekte, verbessere Gildenfähigkeiten und verdiene gemeinsame Belohnungen.","Únete a gremios, contribuye a proyectos, mejora habilidades de gremio y consigue recompensas compartidas.","Word lid van guilds, draag bij aan projecten, verbeter guildvaardigheden en verdien gezamenlijke beloningen.","Unisciti alle gilde, contribuisci ai progetti, sviluppa abilità e ottieni ricompense condivise.","Rejoignez des guildes, contribuez aux projets, développez les compétences et gagnez des récompenses communes.","Вступайте в гильдии, участвуйте в проектах, развивайте умения и получайте общие награды.","Loncalara katıl, projelere katkı ver, lonca becerilerini geliştir ve ortak ödüller kazan."],
  "VIP badges": ["VIP-Abzeichen","Insignias VIP","VIP-badges","Distintivi VIP","Badges VIP","Значки VIP","VIP rozetleri"],

  "VIP": ["VIP","VIP","VIP","VIP","VIP","VIP","VIP"],
  "VIP+": ["VIP+","VIP+","VIP+","VIP+","VIP+","VIP+","VIP+"],
  "Unlock with VIP or VIP+ on your account.": ["Mit VIP oder VIP+ auf deinem Konto freischalten.","Desbloquéalo con VIP o VIP+ en tu cuenta.","Ontgrendel met VIP of VIP+ op je account.","Sblocca con VIP o VIP+ sul tuo account.","Débloquez avec VIP ou VIP+ sur votre compte.","Доступно с VIP или VIP+ в вашем аккаунте.","Hesabında VIP veya VIP+ ile açılır."],
  "Unlock with VIP+ on your account.": ["Mit VIP+ auf deinem Konto freischalten.","Desbloquéalo con VIP+ en tu cuenta.","Ontgrendel met VIP+ op je account.","Sblocca con VIP+ sul tuo account.","Débloquez avec VIP+ sur votre compte.","Доступно с VIP+ в вашем аккаунте.","Hesabında VIP+ ile açılır."],
  "Updates every 2 hours": [
    "Aktualisierung alle 2 Stunden",
    "Se actualiza cada 2 horas",
    "Wordt elke 2 uur bijgewerkt",
    "Aggiornamento ogni 2 ore",
    "Mis à jour toutes les 2 heures",
    "Обновляется каждые 2 часа",
    "Her 2 saatte bir güncellenir"
  ],
  "Purchases, sales and returned listings are kept here. Items stay safe until claimed.": [
    "Käufe, Verkäufe und zurückgegebene Angebote werden hier aufbewahrt. Gegenstände bleiben bis zur Abholung sicher.",
    "Aquí se guardan las compras, ventas y anuncios devueltos. Los objetos permanecen seguros hasta reclamarlos.",
    "Aankopen, verkopen en teruggekeerde aanbiedingen staan hier. Voorwerpen blijven veilig tot je ze ophaalt.",
    "Qui trovi acquisti, vendite e inserzioni restituite. Gli oggetti restano al sicuro finché non li ritiri.",
    "Retrouvez ici achats, ventes et annonces retournées. Les objets restent en sécurité jusqu'à leur récupération.",
    "Здесь хранятся покупки, продажи и возвращённые лоты. Предметы останутся в сохранности до получения.",
    "Satın alımlar, satışlar ve iade edilen ilanlar burada tutulur. Eşyalar alınana kadar güvendedir."
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
  "To claim": [
    "Abholbereit",
    "Por reclamar",
    "Op te halen",
    "Da ritirare",
    "À récupérer",
    "К получению",
    "Alınacak"
  ],
  "Item claimed.": [
    "Gegenstand abgeholt.",
    "Objeto reclamado.",
    "Voorwerp opgehaald.",
    "Oggetto ritirato.",
    "Objet récupéré.",
    "Предмет получен.",
    "Eşya alındı."
  ],
  "Inbox unavailable.": [
    "Posteingang nicht verfügbar.",
    "Bandeja de entrada no disponible.",
    "Inbox niet beschikbaar.",
    "Casella non disponibile.",
    "Boîte de réception indisponible.",
    "Входящие недоступны.",
    "Gelen kutusuna erişilemiyor."
  ],
  "Purchased": [
    "Gekauft",
    "Comprado",
    "Gekocht",
    "Acquistato",
    "Acheté",
    "Куплено",
    "Satın alındı"
  ],
  "Sold": [
    "Verkauft",
    "Vendido",
    "Verkocht",
    "Venduto",
    "Vendu",
    "Продано",
    "Satıldı"
  ],
  "Returned": [
    "Zurückgegeben",
    "Devuelto",
    "Teruggekeerd",
    "Restituito",
    "Retourné",
    "Возвращено",
    "İade edildi"
  ],
  "READY": [
    "BEREIT",
    "LISTO",
    "KLAAR",
    "PRONTO",
    "PRÊT",
    "ГОТОВО",
    "HAZIR"
  ],
  "CLAIMED": [
    "ABGEHOLT",
    "RECLAMADO",
    "OPGEHAALD",
    "RITIRATO",
    "RÉCUPÉRÉ",
    "ПОЛУЧЕНО",
    "ALINDI"
  ],
  "PAID": [
    "BEZAHLT",
    "PAGADO",
    "BETAALD",
    "PAGATO",
    "PAYÉ",
    "ОПЛАЧЕНО",
    "ÖDENDİ"
  ],
  "Gold credited": [
    "Gold gutgeschrieben",
    "Oro abonado",
    "Goud bijgeschreven",
    "Oro accreditato",
    "Or crédité",
    "Золото зачислено",
    "Altın yatırıldı"
  ],
  "Gold · Item waiting in Inbox": [
    "Gold · Gegenstand wartet im Posteingang",
    "Oro · Objeto pendiente en la bandeja",
    "Goud · Voorwerp wacht in inbox",
    "Oro · Oggetto in attesa nella casella",
    "Or · Objet en attente dans la boîte",
    "Золото · Предмет ожидает во входящих",
    "Altın · Eşya gelen kutusunda bekliyor"
  ],
  "Unsold items returned safely": [
    "Unverkaufte Gegenstände sicher zurückgegeben",
    "Objetos no vendidos devueltos de forma segura",
    "Onverkochte voorwerpen veilig teruggestuurd",
    "Oggetti invenduti restituiti in sicurezza",
    "Invendus renvoyés en sécurité",
    "Непроданные предметы безопасно возвращены",
    "Satılmayan eşyalar güvenle iade edildi"
  ],
  "Claim to Inventory": [
    "Ins Inventar abholen",
    "Reclamar al inventario",
    "Ophalen naar inventaris",
    "Ritira nell'inventario",
    "Récupérer dans l'inventaire",
    "Получить в инвентарь",
    "Envantere al"
  ],
  "Bank": [
    "Bank",
    "Banco",
    "Bank",
    "Banca",
    "Banque",
    "Банк",
    "Banka"
  ],
  "Gem Pouch": [
    "Edelsteinbeutel",
    "Bolsa de gemas",
    "Edelstenenzak",
    "Sacca gemme",
    "Sac de gemmes",
    "Сумка самоцветов",
    "Mücevher kesesi"
  ],
  "Loading market inbox…": [
    "Markt-Posteingang wird geladen…",
    "Cargando bandeja del mercado…",
    "Marktinbox laden…",
    "Caricamento messaggi del mercato…",
    "Chargement de la boîte du marché…",
    "Загрузка рыночных сообщений…",
    "Pazar gelen kutusu yükleniyor…"
  ],
  "No completed market activity yet.": [
    "Noch keine abgeschlossenen Marktaktivitäten.",
    "Aún no hay operaciones de mercado completadas.",
    "Nog geen afgeronde marktactiviteiten.",
    "Nessuna operazione di mercato completata.",
    "Aucune opération de marché terminée.",
    "Пока нет завершённых операций на рынке.",
    "Henüz tamamlanan pazar işlemi yok."
  ],
  "No market deliveries waiting.": [
    "Keine Marktlieferungen ausstehend.",
    "No hay entregas del mercado pendientes.",
    "Geen marktleveringen om op te halen.",
    "Nessuna consegna del mercato in attesa.",
    "Aucune livraison du marché en attente.",
    "Нет ожидающих рыночных доставок.",
    "Bekleyen pazar teslimatı yok."
  ],
  "Sign in to choose a player badge.": [
    "Melde dich an, um ein Spielerabzeichen auszuwählen.",
    "Inicia sesión para elegir una insignia.",
    "Log in om een spelersbadge te kiezen.",
    "Accedi per scegliere un distintivo giocatore.",
    "Connectez-vous pour choisir un badge.",
    "Войдите, чтобы выбрать значок игрока.",
    "Oyuncu rozeti seçmek için giriş yap."
  ],
  "Wear one badge beside your name, and feature up to three on your profile. Staff badges appear automatically.": [
    "Trage ein Abzeichen neben deinem Namen und zeige bis zu drei im Profil. Teamabzeichen erscheinen automatisch.",
    "Lleva una insignia junto a tu nombre y destaca hasta tres en tu perfil. Las del equipo aparecen automáticamente.",
    "Draag één badge naast je naam en toon er maximaal drie op je profiel. Teambadges verschijnen automatisch.",
    "Indossa un distintivo accanto al nome e mostrane fino a tre sul profilo. I distintivi dello staff appaiono automaticamente.",
    "Portez un badge à côté de votre nom et affichez-en trois sur votre profil. Ceux du personnel apparaissent automatiquement.",
    "Носите один значок рядом с именем и показывайте до трёх в профиле. Значки команды появляются автоматически.",
    "Adının yanında bir rozet taşı ve profilinde en fazla üçünü sergile. Yetkili rozetleri otomatik görünür."
  ],
  "BESIDE YOUR NAME": [
    "NEBEN DEINEM NAMEN",
    "JUNTO A TU NOMBRE",
    "NAAST JE NAAM",
    "ACCANTO AL NOME",
    "À CÔTÉ DU NOM",
    "РЯДОМ С ИМЕНЕМ",
    "ADININ YANINDA"
  ],
  "ON YOUR PROFILE": [
    "IN DEINEM PROFIL",
    "EN TU PERFIL",
    "OP JE PROFIEL",
    "SUL TUO PROFILO",
    "SUR VOTRE PROFIL",
    "В ПРОФИЛЕ",
    "PROFİLİNDE"
  ],
  "No badge equipped": [
    "Kein Abzeichen angelegt",
    "Ninguna insignia equipada",
    "Geen badge uitgerust",
    "Nessun distintivo equipaggiato",
    "Aucun badge équipé",
    "Значок не выбран",
    "Kuşanılmış rozet yok"
  ],
  "No badges featured yet": [
    "Noch keine Abzeichen im Profil",
    "Aún no hay insignias destacadas",
    "Nog geen badges uitgelicht",
    "Nessun distintivo in evidenza",
    "Aucun badge mis en avant",
    "Пока нет значков на витрине",
    "Henüz sergilenen rozet yok"
  ],
  "Beside your name": [
    "Neben deinem Namen",
    "Junto a tu nombre",
    "Naast je naam",
    "Accanto al nome",
    "À côté du nom",
    "Рядом с именем",
    "Adının yanında"
  ],
  "Profile showcase": [
    "Profilvitrine",
    "Vitrina del perfil",
    "Profielvitrine",
    "Vetrina del profilo",
    "Vitrine du profil",
    "Витрина профиля",
    "Profil vitrini"
  ],
  "Tap a badge to wear it beside your name in chat, parties, guilds and rankings.": [
    "Tippe auf ein Abzeichen, um es in Chats, Gruppen, Gilden und Ranglisten neben deinem Namen zu tragen.",
    "Toca una insignia para llevarla junto a tu nombre en chats, grupos, gremios y clasificaciones.",
    "Tik op een badge om die naast je naam te dragen in chats, party's, guilds en ranglijsten.",
    "Tocca un distintivo per mostrarlo accanto al nome in chat, gruppi, gilde e classifiche.",
    "Touchez un badge pour le porter près de votre nom dans les chats, groupes, guildes et classements.",
    "Нажмите на значок, чтобы носить его рядом с именем в чате, группах, гильдиях и рейтингах.",
    "Sohbette, gruplarda, loncalarda ve sıralamalarda adının yanında taşımak için bir rozete dokun."
  ],
  "Tap up to {count} badges to feature on your profile, in the order you tap them. Tap a featured badge again to remove it.": [
    "Tippe auf bis zu {count} Abzeichen, um sie in dieser Reihenfolge im Profil zu zeigen. Zum Entfernen erneut tippen.",
    "Toca hasta {count} insignias para destacarlas en tu perfil en ese orden. Tócalas de nuevo para quitarlas.",
    "Tik op maximaal {count} badges om ze in die volgorde op je profiel te tonen. Tik opnieuw om ze te verwijderen.",
    "Tocca fino a {count} distintivi per mostrarli sul profilo nell'ordine scelto. Tocca ancora per rimuoverli.",
    "Choisissez jusqu'à {count} badges pour les afficher dans l'ordre sur votre profil. Retouchez-en un pour le retirer.",
    "Выберите до {count} значков в нужном порядке для витрины профиля. Нажмите ещё раз, чтобы убрать.",
    "Profilinde dokunduğun sırayla en fazla {count} rozet sergile. Kaldırmak için tekrar dokun."
  ],
  "Supporter": [
    "Unterstützer",
    "Colaborador",
    "Supporter",
    "Sostenitore",
    "Soutien",
    "Поддержка",
    "Destekçi"
  ],
  "ACTIVE": [
    "AKTIV",
    "ACTIVO",
    "ACTIEF",
    "ATTIVO",
    "ACTIF",
    "АКТИВНО",
    "AKTİF"
  ],
  "NOT ACTIVE": [
    "NICHT AKTIV",
    "INACTIVO",
    "NIET ACTIEF",
    "NON ATTIVO",
    "INACTIF",
    "НЕАКТИВНО",
    "ETKİN DEĞİL"
  ],
  "Verified Supporter time: {days} days total": [
    "Bestätigte Unterstützerzeit: insgesamt {days} Tage",
    "Tiempo verificado como colaborador: {days} días en total",
    "Geverifieerde supportertijd: in totaal {days} dagen",
    "Tempo da sostenitore verificato: {days} giorni totali",
    "Durée de soutien vérifiée : {days} jours au total",
    "Подтверждённая поддержка: всего {days} дн.",
    "Doğrulanmış destekçi süresi: toplam {days} gün"
  ],
  "Your star evolves at 3, 6 and 12 total verified months of Supporter time.": [
    "Dein Stern entwickelt sich nach insgesamt 3, 6 und 12 bestätigten Unterstützermonaten weiter.",
    "Tu estrella evoluciona a los 3, 6 y 12 meses verificados como colaborador.",
    "Je ster evolueert na 3, 6 en 12 geverifieerde maanden als supporter.",
    "La tua stella si evolve dopo 3, 6 e 12 mesi verificati da sostenitore.",
    "Votre étoile évolue après 3, 6 et 12 mois de soutien vérifiés.",
    "Звезда улучшается после 3, 6 и 12 подтверждённых месяцев поддержки.",
    "Yıldızın toplam 3, 6 ve 12 doğrulanmış destekçi ayında gelişir."
  ],
  "Active Supporter · first star": [
    "Aktiver Unterstützer · erster Stern",
    "Colaborador activo · primera estrella",
    "Actieve supporter · eerste ster",
    "Sostenitore attivo · prima stella",
    "Soutien actif · première étoile",
    "Активная поддержка · первая звезда",
    "Aktif destekçi · ilk yıldız"
  ],
  "Verified {months}-month Supporter milestone": [
    "Bestätigter Unterstützer-Meilenstein: {months} Monate",
    "Hito de colaborador verificado: {months} meses",
    "Geverifieerde supportermijlpaal: {months} maanden",
    "Traguardo sostenitore verificato: {months} mesi",
    "Palier de soutien vérifié : {months} mois",
    "Подтверждённый рубеж поддержки: {months} мес.",
    "Doğrulanmış {months} aylık destekçi hedefi"
  ],
  "Time from separate verified subscription periods adds together. Pauses do not erase progress, and buying future months does not count early. Earlier history requires reliable billing proof.": [
    "Bestätigte Abozeiten werden addiert. Pausen löschen keinen Fortschritt, und künftige Monate zählen nicht vorab. Für ältere Zeiten ist ein verlässlicher Zahlungsnachweis nötig.",
    "Los periodos de suscripción verificados se suman. Las pausas no borran el progreso ni cuentan meses futuros por adelantado. El historial anterior requiere pruebas de pago.",
    "Geverifieerde abonnementsperiodes tellen samen. Pauzes wissen geen voortgang en toekomstige maanden tellen niet vooraf. Voor oudere periodes is betrouwbaar betaalbewijs nodig.",
    "I periodi verificati si sommano. Le pause non azzerano i progressi e i mesi futuri non contano in anticipo. Per lo storico serve una prova di pagamento affidabile.",
    "Les périodes d'abonnement vérifiées s'additionnent. Les pauses n'effacent rien et les mois futurs ne comptent pas d'avance. L'historique ancien exige une preuve de paiement fiable.",
    "Подтверждённые периоды подписки суммируются. Паузы не сбрасывают прогресс, будущие месяцы не засчитываются заранее. Для прошлых периодов нужно подтверждение оплаты.",
    "Doğrulanmış abonelik dönemleri toplanır. Aralar ilerlemeyi silmez, gelecek aylar erken sayılmaz. Eski dönemler için güvenilir ödeme kanıtı gerekir."
  ],
  "Earned badges": [
    "Verdiente Abzeichen",
    "Insignias ganadas",
    "Verdiende badges",
    "Distintivi ottenuti",
    "Badges obtenus",
    "Полученные значки",
    "Kazanılan rozetler"
  ],
  "{owned}/{total} UNLOCKED": [
    "{owned}/{total} FREIGESCHALTET",
    "{owned}/{total} DESBLOQUEADAS",
    "{owned}/{total} ONTGRENDELD",
    "{owned}/{total} SBLOCCATI",
    "{owned}/{total} DÉBLOQUÉS",
    "ОТКРЫТО {owned}/{total}",
    "{owned}/{total} AÇILDI"
  ],
  "Unlocked · account-wide": [
    "Freigeschaltet · kontoübergreifend",
    "Desbloqueada · para toda la cuenta",
    "Ontgrendeld · accountbreed",
    "Sbloccato · per tutto l'account",
    "Débloqué · pour tout le compte",
    "Открыто · для всей учётной записи",
    "Açıldı · hesap genelinde"
  ],
  "Unequip badge": [
    "Abzeichen ablegen",
    "Quitar insignia",
    "Badge afdoen",
    "Rimuovi distintivo",
    "Retirer le badge",
    "Снять значок",
    "Rozeti çıkar"
  ],
  "Clear profile badges": [
    "Profilabzeichen entfernen",
    "Quitar insignias del perfil",
    "Profielbadges wissen",
    "Rimuovi distintivi dal profilo",
    "Retirer les badges du profil",
    "Очистить значки профиля",
    "Profil rozetlerini temizle"
  ],
  "Loading earned badges…": [
    "Verdiente Abzeichen werden geladen…",
    "Cargando insignias ganadas…",
    "Verdiende badges laden…",
    "Caricamento distintivi ottenuti…",
    "Chargement des badges obtenus…",
    "Загрузка полученных значков…",
    "Kazanılan rozetler yükleniyor…"
  ],
  "LOCKED": [
    "GESPERRT",
    "BLOQUEADO",
    "VERGRENDELD",
    "BLOCCATO",
    "VERROUILLÉ",
    "ЗАКРЫТО",
    "KİLİTLİ"
  ],
  "EQUIPPED": [
    "ANGELEGT",
    "EQUIPADA",
    "UITGERUST",
    "EQUIPAGGIATO",
    "ÉQUIPÉ",
    "НАДЕТО",
    "KUŞANILDI"
  ],
  "EQUIP": [
    "ANLEGEN",
    "EQUIPAR",
    "UITRUSTEN",
    "EQUIPAGGIA",
    "ÉQUIPER",
    "НАДЕТЬ",
    "KUŞAN"
  ],
  "ON PROFILE {slot}": [
    "IM PROFIL {slot}",
    "EN PERFIL {slot}",
    "OP PROFIEL {slot}",
    "NEL PROFILO {slot}",
    "SUR PROFIL {slot}",
    "В ПРОФИЛЕ {slot}",
    "PROFİLDE {slot}"
  ],
  "FULL": [
    "VOLL",
    "LLENO",
    "VOL",
    "PIENO",
    "COMPLET",
    "ЗАПОЛНЕНО",
    "DOLU"
  ],
  "FEATURE": [
    "HERVORHEBEN",
    "DESTACAR",
    "UITLICHTEN",
    "METTI IN EVIDENZA",
    "METTRE EN AVANT",
    "ПОКАЗАТЬ",
    "SERGİLE"
  ],
  "Unequip this badge": [
    "Dieses Abzeichen ablegen",
    "Quitar esta insignia",
    "Deze badge afdoen",
    "Rimuovi questo distintivo",
    "Retirer ce badge",
    "Снять этот значок",
    "Bu rozeti çıkar"
  ],
  "Wear this badge beside your name": [
    "Dieses Abzeichen neben deinem Namen tragen",
    "Llevar esta insignia junto a tu nombre",
    "Draag deze badge naast je naam",
    "Indossa questo distintivo accanto al nome",
    "Porter ce badge près de votre nom",
    "Носить значок рядом с именем",
    "Bu rozeti adının yanında taşı"
  ],
  "Remove this badge from your profile": [
    "Dieses Abzeichen aus dem Profil entfernen",
    "Quitar esta insignia del perfil",
    "Verwijder deze badge van je profiel",
    "Rimuovi questo distintivo dal profilo",
    "Retirer ce badge du profil",
    "Убрать значок из профиля",
    "Bu rozeti profilden kaldır"
  ],
  "Remove a featured badge to make room": [
    "Entferne ein Profilabzeichen, um Platz zu schaffen",
    "Quita una insignia destacada para hacer sitio",
    "Verwijder een uitgelichte badge om ruimte te maken",
    "Rimuovi un distintivo in evidenza per liberare spazio",
    "Retirez un badge affiché pour libérer de la place",
    "Уберите один значок с витрины, чтобы освободить место",
    "Yer açmak için sergilenen bir rozeti kaldır"
  ],
  "Feature this badge on your profile": [
    "Dieses Abzeichen in deinem Profil zeigen",
    "Destacar esta insignia en tu perfil",
    "Toon deze badge op je profiel",
    "Metti questo distintivo in evidenza nel profilo",
    "Afficher ce badge sur votre profil",
    "Показать значок в профиле",
    "Bu rozeti profilinde sergile"
  ],
  "Awarded to founding players.": [
    "An Gründer-Spieler verliehen.",
    "Otorgada a jugadores fundadores.",
    "Toegekend aan oprichtende spelers.",
    "Assegnato ai giocatori fondatori.",
    "Attribué aux joueurs fondateurs.",
    "Выдаётся игрокам-основателям.",
    "Kurucu oyunculara verilir."
  ],
  "Awarded to early beta testers.": [
    "An frühe Betatester verliehen.",
    "Otorgada a los primeros probadores de la beta.",
    "Toegekend aan vroege bètatesters.",
    "Assegnato ai primi beta tester.",
    "Attribué aux premiers bêta-testeurs.",
    "Выдаётся первым бета-тестерам.",
    "Erken beta testçilerine verilir."
  ],
  "Play Veldryn for 90 days.": [
    "Spiele Veldryn 90 Tage lang.",
    "Juega a Veldryn durante 90 días.",
    "Speel Veldryn 90 dagen.",
    "Gioca a Veldryn per 90 giorni.",
    "Jouez à Veldryn pendant 90 jours.",
    "Играйте в Veldryn 90 дней.",
    "Veldryn'i 90 gün oyna."
  ],
  "Lead an active guild.": [
    "Führe eine aktive Gilde.",
    "Lidera un gremio activo.",
    "Leid een actieve guild.",
    "Guida una gilda attiva.",
    "Dirigez une guilde active.",
    "Руководите активной гильдией.",
    "Etkin bir loncaya liderlik et."
  ],
  "Awarded for outstanding community contributions.": [
    "Für herausragende Beiträge zur Community verliehen.",
    "Otorgada por contribuciones destacadas a la comunidad.",
    "Toegekend voor bijzondere bijdragen aan de community.",
    "Assegnato per contributi eccezionali alla community.",
    "Attribué pour une contribution exceptionnelle à la communauté.",
    "Выдаётся за выдающийся вклад в сообщество.",
    "Topluluğa olağanüstü katkılar için verilir."
  ],
  "Awarded for special event achievements.": [
    "Für besondere Event-Erfolge verliehen.",
    "Otorgada por logros especiales de eventos.",
    "Toegekend voor bijzondere evenementprestaties.",
    "Assegnato per traguardi speciali negli eventi.",
    "Attribué pour des exploits lors d'événements spéciaux.",
    "Выдаётся за особые достижения в событиях.",
    "Özel etkinlik başarıları için verilir."
  ],
  "Unlock with an active Supporter entitlement.": [
    "Mit aktivem Unterstützerstatus freischalten.",
    "Se desbloquea con la suscripción activa de colaborador.",
    "Ontgrendel met een actieve supporterstatus.",
    "Sblocca con lo stato di sostenitore attivo.",
    "Débloqué avec un statut de soutien actif.",
    "Открывается при активной подписке поддержки.",
    "Aktif destekçi hakkıyla açılır."
  ],
  "Unlock after 3 total verified months of Supporter.": [
    "Nach insgesamt 3 bestätigten Unterstützermonaten freischalten.",
    "Se desbloquea tras 3 meses verificados como colaborador.",
    "Ontgrendel na in totaal 3 geverifieerde supportermaanden.",
    "Sblocca dopo 3 mesi verificati da sostenitore.",
    "Débloqué après 3 mois de soutien vérifiés.",
    "Открывается после 3 подтверждённых месяцев поддержки.",
    "Toplam 3 doğrulanmış destekçi ayından sonra açılır."
  ],
  "Unlock after 6 total verified months of Supporter.": [
    "Nach insgesamt 6 bestätigten Unterstützermonaten freischalten.",
    "Se desbloquea tras 6 meses verificados como colaborador.",
    "Ontgrendel na in totaal 6 geverifieerde supportermaanden.",
    "Sblocca dopo 6 mesi verificati da sostenitore.",
    "Débloqué après 6 mois de soutien vérifiés.",
    "Открывается после 6 подтверждённых месяцев поддержки.",
    "Toplam 6 doğrulanmış destekçi ayından sonra açılır."
  ],
  "Unlock after 12 total verified months of Supporter.": [
    "Nach insgesamt 12 bestätigten Unterstützermonaten freischalten.",
    "Se desbloquea tras 12 meses verificados como colaborador.",
    "Ontgrendel na in totaal 12 geverifieerde supportermaanden.",
    "Sblocca dopo 12 mesi verificati da sostenitore.",
    "Débloqué après 12 mois de soutien vérifiés.",
    "Открывается после 12 подтверждённых месяцев поддержки.",
    "Toplam 12 doğrulanmış destekçi ayından sonra açılır."
  ],
  "Admin": ["Admin","Administrador","Beheerder","Amministratore","Administrateur","Администратор","Yönetici"],
  "Moderator": ["Moderator","Moderador","Moderator","Moderatore","Modérateur","Модератор","Moderatör"],
  "Founder": ["Gründer","Fundador","Oprichter","Fondatore","Fondateur","Основатель","Kurucu"],
  "Beta Tester": ["Betatester","Probador beta","Bètatester","Beta tester","Bêta-testeur","Бета-тестер","Beta testçisi"],
  "Veteran": ["Veteran","Veterano","Veteraan","Veterano","Vétéran","Ветеран","Emektar"],
  "Guild Leader": ["Gildenleiter","Líder del gremio","Guildleider","Capogilda","Chef de guilde","Глава гильдии","Lonca lideri"],
  "Community Champion": ["Community-Champion","Campeón de la comunidad","Communitykampioen","Campione della community","Champion de la communauté","Чемпион сообщества","Topluluk şampiyonu"],
  "Event Champion": ["Event-Champion","Campeón de eventos","Evenementkampioen","Campione evento","Champion d'événement","Чемпион события","Etkinlik şampiyonu"],
  "Supporter · 3 Months": ["Unterstützer · 3 Monate","Colaborador · 3 meses","Supporter · 3 maanden","Sostenitore · 3 mesi","Soutien · 3 mois","Поддержка · 3 месяца","Destekçi · 3 ay"],
  "Supporter · 6 Months": ["Unterstützer · 6 Monate","Colaborador · 6 meses","Supporter · 6 maanden","Sostenitore · 6 mesi","Soutien · 6 mois","Поддержка · 6 месяцев","Destekçi · 6 ay"],
  "Supporter · 12 Months": ["Unterstützer · 12 Monate","Colaborador · 12 meses","Supporter · 12 maanden","Sostenitore · 12 mesi","Soutien · 12 mois","Поддержка · 12 месяцев","Destekçi · 12 ay"],
  "Dungeons": ["Dungeons","Mazmorras","Kerkers","Dungeon","Donjons","Подземелья","Zindanlar"],
  "Co-op dungeon expeditions are live. We are expanding encounter variety, refining difficulty tiers, companion loadouts and rewards.": ["Koop-Dungeonexpeditionen sind live. Wir erweitern Begegnungsvielfalt, Schwierigkeitsstufen, Gefährtenausrüstung und Belohnungen.","Las expediciones cooperativas a mazmorras están disponibles. Ampliamos los encuentros y mejoramos las dificultades, los compañeros y las recompensas.","Coöperatieve kerkertochten zijn live. We breiden gevechten uit en verfijnen moeilijkheidsgraden, metgezeluitrustingen en beloningen.","Le spedizioni cooperative nei dungeon sono attive. Ampliamo gli incontri e perfezioniamo difficoltà, equipaggiamenti dei compagni e ricompense.","Les expéditions coopératives en donjon sont disponibles. Nous diversifions les rencontres et améliorons les paliers, les compagnons et les récompenses.","Совместные походы в подземелья уже доступны. Мы разнообразим встречи, дорабатываем сложность, выбор спутников и награды.","Eşli zindan seferleri yayında. Karşılaşmaları çeşitlendiriyor, zorluk kademelerini, yoldaş düzenlerini ve ödülleri geliştiriyoruz."],
  "Seasonal Events": ["Saisonale Events","Eventos de temporada","Seizoensevenementen","Eventi stagionali","Événements saisonniers","Сезонные события","Sezonluk etkinlikler"],
  "Expanding seasonal celebrations with event previews, limited-time activities, themed rewards and improved event access.": ["Wir erweitern saisonale Feste um Vorschauen, zeitlich begrenzte Aktivitäten, Themenbelohnungen und leichteren Zugang.","Ampliamos las celebraciones de temporada con avances, actividades temporales, recompensas temáticas y mejor acceso.","We breiden seizoensfeesten uit met voorproefjes, tijdelijke activiteiten, themabeloningen en betere toegang.","Ampliamo le feste stagionali con anteprime, attività a tempo, ricompense a tema e un accesso migliore.","Nous enrichissons les fêtes saisonnières avec des aperçus, activités limitées, récompenses à thème et un meilleur accès.","Мы расширяем сезонные праздники: предпросмотры, временные занятия, тематические награды и более удобный доступ.","Sezon kutlamalarını ön izlemeler, süreli etkinlikler, temalı ödüller ve daha kolay erişimle genişletiyoruz."],
  "Companion Refinement": ["Gefährten-Überarbeitung","Mejoras de compañeros","Verbeteringen voor metgezellen","Perfezionamento compagni","Amélioration des compagnons","Доработка спутников","Yoldaş iyileştirmeleri"],
  "Refining companion selection, role balance, training, ascension and their impact across combat and dungeons.": ["Wir verbessern Gefährtenauswahl, Rollenbalance, Training, Aufstieg und ihren Einfluss auf Kämpfe und Dungeons.","Mejoramos la elección de compañeros, el equilibrio de roles, el entrenamiento, la ascensión y su efecto en combates y mazmorras.","We verbeteren metgezelkeuze, rolbalans, training, verheffing en de invloed op gevechten en kerkers.","Perfezioniamo scelta dei compagni, bilanciamento dei ruoli, addestramento, ascensione e impatto nei combattimenti e dungeon.","Nous améliorons le choix des compagnons, l'équilibre des rôles, l'entraînement, l'ascension et leur impact en combat et donjon.","Мы дорабатываем выбор спутников, баланс ролей, тренировку, возвышение и их влияние на бои и подземелья.","Yoldaş seçimini, rol dengesini, eğitimi, yükselişi ve savaş ile zindanlara etkilerini iyileştiriyoruz."],
  "Achievements": ["Erfolge","Logros","Prestaties","Obiettivi","Succès","Достижения","Başarılar"],
  "Expand achievements with more progression milestones, challenges and meaningful rewards for player accomplishments.": ["Wir erweitern Erfolge um Fortschrittsmeilensteine, Herausforderungen und wertvolle Belohnungen.","Ampliaremos los logros con hitos de progreso, desafíos y recompensas valiosas por los méritos de los jugadores.","We breiden prestaties uit met voortgangsmijlpalen, uitdagingen en betekenisvolle beloningen.","Ampliamo gli obiettivi con nuovi traguardi, sfide e ricompense significative per i giocatori.","Nous enrichirons les succès de jalons, défis et récompenses valorisant les exploits des joueurs.","Расширим достижения новыми этапами прогресса, испытаниями и ценными наградами за успехи игроков.","Başarıları yeni ilerleme hedefleri, mücadeleler ve oyuncu kazanımları için anlamlı ödüllerle genişleteceğiz."],
  "Cosmetics": ["Kosmetische Gegenstände","Cosméticos","Cosmetica","Aspetti estetici","Cosmétiques","Косметика","Kozmetik öğeler"],
  "Expand player customization with collectible visual rewards, profile cosmetics and additional ways to show off accomplishments.": ["Wir erweitern die Anpassung mit sammelbaren Designs, Profilkosmetik und neuen Möglichkeiten, Erfolge zu zeigen.","Ampliaremos la personalización con recompensas visuales coleccionables, cosméticos de perfil y más formas de mostrar logros.","We breiden personalisatie uit met verzamelbare visuele beloningen, profielcosmetica en meer manieren om prestaties te tonen.","Ampliamo la personalizzazione con ricompense estetiche da collezionare, decorazioni del profilo e nuovi modi di mostrare i traguardi.","Nous enrichirons la personnalisation avec des récompenses visuelles à collectionner, des ornements de profil et des façons d'exposer ses exploits.","Расширим оформление персонажа: коллекционные награды, украшения профиля и новые способы показать достижения.","Koleksiyonluk görsel ödüller, profil süsleri ve başarıları sergilemenin yeni yollarıyla özelleştirmeyi genişleteceğiz."],
  "Community Rewards": ["Community-Belohnungen","Recompensas de la comunidad","Communitybeloningen","Ricompense della community","Récompenses communautaires","Награды сообщества","Topluluk ödülleri"],
  "Introduce shared community milestones and rewards that celebrate collective progress, participation and special occasions.": ["Wir führen gemeinsame Community-Meilensteine und Belohnungen für Fortschritt, Teilnahme und besondere Anlässe ein.","Introduciremos hitos y recompensas compartidos que celebren el progreso, la participación y las ocasiones especiales.","We voegen gezamenlijke communitymijlpalen en beloningen toe voor voortgang, deelname en speciale gelegenheden.","Introduciamo traguardi e ricompense condivisi per celebrare i progressi, la partecipazione e le occasioni speciali.","Nous ajouterons des jalons et récompenses communs pour célébrer la progression, la participation et les événements spéciaux.","Добавим общие цели и награды сообщества за совместный прогресс, участие и особые события.","Ortak ilerlemeyi, katılımı ve özel günleri kutlayan topluluk hedefleri ve ödülleri ekleyeceğiz."],
  "Class & Combat Refinement": ["Klassen- und Kampfüberarbeitung","Mejoras de clases y combate","Verbeteringen voor klassen en gevechten","Perfezionamento classi e combattimento","Amélioration des classes et du combat","Доработка классов и боя","Sınıf ve savaş iyileştirmeleri"],
  "Improve class identity, equipment stat scaling, combat pacing and encounter balance across progression.": ["Wir verbessern Klassenidentität, Ausrüstungsskalierung, Kampftempo und Gegnerbalance im Spielverlauf.","Mejoramos la identidad de clase, el escalado de estadísticas, el ritmo del combate y el equilibrio de los encuentros.","We verbeteren klasse-identiteit, schaling van uitrustingsstats, gevechtstempo en balans tijdens de voortgang.","Miglioriamo l'identità delle classi, la crescita delle statistiche, il ritmo dei combattimenti e il bilanciamento degli incontri.","Nous améliorons l'identité des classes, l'évolution des statistiques d'équipement, le rythme et l'équilibre des combats.","Улучшаем особенности классов, рост характеристик снаряжения, темп боёв и баланс встреч по мере прогресса.","Sınıf kimliğini, ekipman özellik ölçeklemesini, savaş temposunu ve karşılaşma dengesini geliştiriyoruz."],
  "Guild Improvements": ["Gildenverbesserungen","Mejoras de gremios","Guildverbeteringen","Miglioramenti delle gilde","Améliorations des guildes","Улучшения гильдий","Lonca iyileştirmeleri"],
  "Refine weekly projects, guild skills, progression, tutorials and cooperative guild activities.": ["Wir überarbeiten Wochenprojekte, Gildenfertigkeiten, Fortschritt, Tutorials und gemeinsame Gildenaktivitäten.","Mejoramos los proyectos semanales, habilidades, progreso, tutoriales y actividades cooperativas de gremio.","We verbeteren weekprojecten, guildvaardigheden, voortgang, handleidingen en gezamenlijke guildactiviteiten.","Perfezioniamo progetti settimanali, abilità della gilda, progressione, tutorial e attività cooperative.","Nous améliorons les projets hebdomadaires, compétences, progression, tutoriels et activités coopératives de guilde.","Дорабатываем еженедельные проекты, навыки, развитие, обучение и совместные занятия гильдий.","Haftalık projeleri, lonca becerilerini, ilerlemeyi, eğitimleri ve ortak lonca etkinliklerini geliştiriyoruz."],
  "Exploration Expansion": ["Erkundungserweiterung","Expansión de la exploración","Uitbreiding van verkenning","Espansione dell'esplorazione","Extension de l'exploration","Расширение исследования мира","Keşif genişlemesi"],
  "Expand exploration choices with more destinations, level requirements, rewards and progression.": ["Wir erweitern die Erkundung um mehr Reiseziele, Stufenvoraussetzungen, Belohnungen und Fortschritt.","Ampliaremos la exploración con más destinos, requisitos de nivel, recompensas y progresión.","We breiden verkenning uit met meer bestemmingen, levelvereisten, beloningen en voortgang.","Ampliamo l'esplorazione con più destinazioni, requisiti di livello, ricompense e progressione.","Nous enrichirons l'exploration avec plus de destinations, de niveaux requis, de récompenses et de progression.","Расширим исследование мира новыми местами, требованиями к уровню, наградами и этапами развития.","Keşfi daha fazla hedef, seviye koşulu, ödül ve ilerleme ile genişleteceğiz."],
  "New Regions & Chapters": ["Neue Regionen und Kapitel","Nuevas regiones y capítulos","Nieuwe regio's en hoofdstukken","Nuove regioni e capitoli","Nouvelles régions et chapitres","Новые регионы и главы","Yeni bölgeler ve bölümler"],
  "Continue Veldryn’s story with future regions, enemies, bosses, resources and equipment progression.": ["Wir führen Veldryns Geschichte mit neuen Regionen, Gegnern, Bossen, Ressourcen und Ausrüstung fort.","Continuaremos la historia de Veldryn con nuevas regiones, enemigos, jefes, recursos y equipo.","We zetten Veldryns verhaal voort met nieuwe regio's, vijanden, bazen, grondstoffen en uitrusting.","Continueremo la storia di Veldryn con nuove regioni, nemici, boss, risorse e progressione dell'equipaggiamento.","Nous poursuivrons l'histoire de Veldryn avec de nouvelles régions, ennemis, boss, ressources et équipements.","Продолжим историю Veldryn: новые регионы, враги, боссы, ресурсы и развитие снаряжения.","Veldryn hikâyesini yeni bölgeler, düşmanlar, boss'lar, kaynaklar ve ekipman ilerlemesiyle sürdüreceğiz."],
  "Events": ["Events","Eventos","Evenementen","Eventi","Événements","События","Etkinlikler"],
  "Companions": ["Gefährten","Compañeros","Metgezellen","Compagni","Compagnons","Спутники","Yoldaşlar"],
  "Progression": ["Fortschritt","Progresión","Voortgang","Progressione","Progression","Прогресс","İlerleme"],
  "Customization": ["Anpassung","Personalización","Aanpassen","Personalizzazione","Personnalisation","Настройка внешности","Özelleştirme"],
  "Community": ["Community","Comunidad","Community","Community","Communauté","Сообщество","Topluluk"],
  "Combat": ["Kampf","Combate","Gevecht","Combattimento","Combat","Бой","Savaş"],
  "Guilds": ["Gilden","Gremios","Guilds","Gilde","Guildes","Гильдии","Loncalar"],
  "Exploration": ["Erkundung","Exploración","Verkenning","Esplorazione","Exploration","Исследование","Keşif"],
  "World": ["Welt","Mundo","Wereld","Mondo","Monde","Мир","Dünya"],
  "Co-op": ["Koop","Cooperativo","Co-op","Cooperativa","Coopératif","Совместная игра","Eşli oyun"],
  "Echoes": ["Echos","Ecos","Echo's","Echi","Échos","Эхо","Yankılar"],
  "Regional progress unavailable": ["Regionalfortschritt nicht verfügbar","Progreso regional no disponible","Regiovoortgang niet beschikbaar","Progressi regionali non disponibili","Progression régionale indisponible","Прогресс региона недоступен","Bölgesel ilerleme kullanılamıyor"],
  "Continue regional story": ["Regionale Geschichte fortsetzen","Continuar la historia regional","Ga verder met het regioverhaal","Continua la storia regionale","Poursuivre l'histoire régionale","Продолжить историю региона","Bölge hikâyesine devam et"],
  "Complete regional side quests": ["Regionale Nebenquests abschließen","Completar las misiones secundarias regionales","Voltooi de regionale zijmissies","Completa le missioni secondarie regionali","Terminer les quêtes secondaires régionales","Завершить побочные задания региона","Bölgenin yan görevlerini tamamla"],
  "Resolve remaining Echo conditions": ["Verbleibende Echo-Bedingungen erfüllen","Resolver las condiciones de Eco restantes","Vervul de resterende Echovoorwaarden","Soddisfa le condizioni Eco rimanenti","Remplir les conditions d'Écho restantes","Выполнить оставшиеся условия Эхо","Kalan Yankı koşullarını tamamla"],
  "Complete regional co-op content": ["Regionale Koop-Inhalte abschließen","Completar el contenido cooperativo regional","Voltooi regionale co-opinhoud","Completa i contenuti cooperativi regionali","Terminer le contenu coopératif régional","Завершить совместные задания региона","Bölgesel eşli içerikleri tamamla"],
  "Fill the regional collection book": ["Regionales Sammelbuch vervollständigen","Completar el libro de colecciones regional","Vul het regionale verzamelboek","Completa il registro della collezione regionale","Compléter le registre de collection régional","Заполнить коллекционную книгу региона","Bölgesel koleksiyon defterini tamamla"],
  "Advance regional boss mastery": ["Regionale Bossmeisterschaft steigern","Mejorar la maestría de jefes regionales","Verbeter regionale baasbeheersing","Aumenta la maestria dei boss regionali","Améliorer la maîtrise des boss régionaux","Повысить мастерство сражений с боссами региона","Bölgesel boss ustalığını geliştir"],
  "Region complete": ["Region abgeschlossen","Región completada","Regio voltooid","Regione completata","Région terminée","Регион завершён","Bölge tamamlandı"],
  "Combatant": ["Kämpfer","Combatiente","Strijder","Combattente","Combattant","Боец","Savaşçı"],
  "Well-Rounded": ["Vielseitig","Polivalente","Allrounder","Versatile","Polyvalent","Универсал","Çok yönlü"],
  "Artisan": ["Handwerker","Artesano","Ambachtsman","Artigiano","Artisan","Ремесленник","Zanaatkâr"],
  "Mastery Hall": ["Meisterschaftshalle","Salón de maestría","Meesterschapshal","Sala della maestria","Hall de maîtrise","Зал мастерства","Ustalık Salonu"],
  "Pathfinder": ["Pfadfinder","Explorador","Padvinder","Esploratore","Éclaireur","Следопыт","İz bulucu"],
  "Delver": ["Tiefenforscher","Explorador de profundidades","Diepteverkenner","Esploratore di profondità","Explorateur des profondeurs","Исследователь глубин","Derinlik kâşifi"],
  "Companion Keeper": ["Gefährtenhüter","Guardián de compañeros","Metgezelhoeder","Custode dei compagni","Gardien des compagnons","Хранитель спутников","Yoldaş koruyucusu"],
  "Beast Scholar": ["Bestienkundler","Erudito de bestias","Beestengeleerde","Studioso delle bestie","Érudit des bêtes","Знаток зверей","Canavar bilgini"],
  "Orderbound": ["Ordenstreu","Ligado a la Orden","Ordegebonden","Vincolato all'Ordine","Lié à l'Ordre","Верный Ордену","Düzene bağlı"],
  "Novice": ["Anfänger","Novato","Beginner","Novizio","Novice","Новичок","Acemi"],
  "Adventurer": ["Abenteurer","Aventurero","Avonturier","Avventuriero","Aventurier","Искатель приключений","Maceracı"],
  "Master": ["Meister","Maestro","Meester","Maestro","Maître","Мастер","Usta"],
  "Grandmaster": ["Großmeister","Gran maestro","Grootmeester","Gran maestro","Grand maître","Грандмастер","Büyük usta"],
  "Market": ["Markt","Mercado","Markt","Mercato","Marché","Рынок","Pazar"],
  "Price history": ["Preisverlauf","Historial de precios","Prijsgeschiedenis","Storico prezzi","Historique des prix","История цен","Fiyat geçmişi"],
  "Completed sales · Gold per unit": ["Abgeschlossene Verkäufe · Gold pro Einheit","Ventas realizadas · Oro por unidad","Afgeronde verkopen · Goud per stuk","Vendite completate · Oro per unità","Ventes réalisées · Or par unité","Завершённые продажи · золото за единицу","Tamamlanan satışlar · Birim başına altın"],
  "d": ["T","d","d","g","j","д","g"],
  "Loading sale history…": ["Verkaufsverlauf wird geladen…","Cargando historial de ventas…","Verkoopgeschiedenis laden…","Caricamento storico vendite…","Chargement de l'historique des ventes…","Загрузка истории продаж…","Satış geçmişi yükleniyor…"],
  "Not enough completed sales yet": ["Noch nicht genug abgeschlossene Verkäufe","Todavía no hay suficientes ventas completadas","Nog niet genoeg afgeronde verkopen","Non ci sono ancora abbastanza vendite completate","Pas encore assez de ventes réalisées","Пока недостаточно завершённых продаж","Henüz yeterli tamamlanmış satış yok"],
  "Prices appear after at least three completed sales from different buyers and sellers on a day.": ["Preise werden angezeigt, wenn an einem Tag mindestens drei Verkäufe zwischen unterschiedlichen Käufern und Verkäufern abgeschlossen wurden.","Los precios aparecen tras al menos tres ventas completadas entre diferentes compradores y vendedores en un día.","Prijzen verschijnen zodra er op één dag minstens drie verkopen zijn afgerond met verschillende kopers en verkopers.","I prezzi appaiono dopo almeno tre vendite completate in un giorno tra acquirenti e venditori distinti.","Les prix apparaissent après au moins trois ventes conclues en une journée entre acheteurs et vendeurs distincts.","Цены появятся после как минимум трёх завершённых продаж за день между разными покупателями и продавцами.","Fiyatlar, bir günde farklı alıcı ve satıcılar arasında en az üç tamamlanmış satıştan sonra görünür."],
  "Selected day · Median": ["Ausgewählter Tag · Median","Día seleccionado · Mediana","Geselecteerde dag · Mediaan","Giorno selezionato · Mediana","Jour sélectionné · Médiane","Выбранный день · медиана","Seçilen gün · Medyan"],
  "Sales / Units": ["Verkäufe / Einheiten","Ventas / Unidades","Verkopen / Stuks","Vendite / Unità","Ventes / Unités","Продажи / Единицы","Satış / Adet"],
  "No verified daily price": ["Kein bestätigter Tagespreis","Sin precio diario verificado","Geen geverifieerde dagprijs","Nessun prezzo giornaliero verificato","Aucun prix journalier vérifié","Нет подтверждённой цены за день","Doğrulanmış günlük fiyat yok"],
  "Daily price range": ["Tägliche Preisspanne","Rango diario de precios","Dagelijkse prijsrange","Intervallo giornaliero dei prezzi","Fourchette de prix du jour","Дневной диапазон цен","Günlük fiyat aralığı"],
  "Only actual completed sales are shown; missing days have no price.": ["Es werden nur tatsächlich abgeschlossene Verkäufe angezeigt; Tage ohne Verkäufe haben keinen Preis.","Solo se muestran ventas realmente completadas; los días sin datos no tienen precio.","Alleen daadwerkelijk afgeronde verkopen worden getoond; dagen zonder gegevens hebben geen prijs.","Sono mostrate solo vendite effettivamente completate; i giorni senza dati non hanno un prezzo.","Seules les ventes réellement conclues sont affichées ; les jours sans données n'ont pas de prix.","Показаны только реальные завершённые продажи; для дней без данных цена не указана.","Yalnızca gerçek tamamlanan satışlar gösterilir; veri olmayan günlerin fiyatı yoktur."],
  "{date}: {price} Gold median, {sales} completed sales": ["{date}: Median {price} Gold, {sales} abgeschlossene Verkäufe","{date}: mediana de {price} de oro, {sales} ventas completadas","{date}: mediaan {price} goud, {sales} afgeronde verkopen","{date}: mediana {price} oro, {sales} vendite completate","{date} : médiane de {price} or, {sales} ventes réalisées","{date}: медиана {price} золота, завершённых продаж: {sales}","{date}: medyan {price} altın, {sales} tamamlanan satış"],
  "Development tools.": ["Entwicklerwerkzeuge.","Herramientas de desarrollo.","Ontwikkelaarshulpmiddelen.","Strumenti di sviluppo.","Outils de développement.","Инструменты разработчика.","Geliştirici araçları."],
  "Developer tools": ["Entwicklerwerkzeuge","Herramientas de desarrollo","Ontwikkelaarshulpmiddelen","Strumenti di sviluppo","Outils de développement","Инструменты разработчика","Geliştirici araçları"],
  "What's New & Updates": ["Neuigkeiten und Updates","Novedades y actualizaciones","Nieuw en updates","Novità e aggiornamenti","Nouveautés et mises à jour","Новости и обновления","Yenilikler ve güncellemeler"],
  "ACTIVITY QUEUE": ["AKTIVITÄTSWARTESCHLANGE","COLA DE ACTIVIDADES","ACTIVITEITENWACHTRIJ","CODA ATTIVITÀ","FILE D'ACTIVITÉS","ОЧЕРЕДЬ ЗАНЯТИЙ","ETKİNLİK KUYRUĞU"],
  "Manage waiting activities": ["Wartende Aktivitäten verwalten","Gestionar actividades en espera","Wachtende activiteiten beheren","Gestisci le attività in attesa","Gérer les activités en attente","Управление ожидающими занятиями","Bekleyen etkinlikleri yönet"],
  "QUICK ACTIONS": ["SCHNELLAKTIONEN","ACCIONES RÁPIDAS","SNELLE ACTIES","AZIONI RAPIDE","ACTIONS RAPIDES","БЫСТРЫЕ ДЕЙСТВИЯ","HIZLI İŞLEMLER"],
  "Your next moves": ["Deine nächsten Schritte","Tus próximos pasos","Je volgende stappen","Le tue prossime mosse","Vos prochaines actions","Ваши следующие шаги","Sonraki adımların"],
  "QUICK ACCESS": ["SCHNELLZUGRIFF","ACCESO RÁPIDO","SNELTOEGANG","ACCESSO RAPIDO","ACCÈS RAPIDE","БЫСТРЫЙ ДОСТУП","HIZLI ERİŞİM"],
  "Open Guild Hall": ["Gildenhalle öffnen","Abrir sala del gremio","Gildehal openen","Apri la sede della gilda","Ouvrir la salle de guilde","Открыть зал гильдии","Lonca Salonunu aç"],
  "Find a Guild": ["Gilde finden","Buscar gremio","Gilde zoeken","Trova una gilda","Trouver une guilde","Найти гильдию","Lonca bul"],
  "Guild Hall": ["Gildenhalle","Sala del gremio","Gildehal","Sede della gilda","Salle de guilde","Зал гильдии","Lonca Salonu"],
  "Find your Guild": ["Finde deine Gilde","Encuentra tu gremio","Vind je gilde","Trova la tua gilda","Trouvez votre guilde","Найдите свою гильдию","Loncanı bul"],
  "Projects · Guild Shop · Chat": ["Projekte · Gildenladen · Chat","Proyectos · Tienda · Chat","Projecten · Gildewinkel · Chat","Progetti · Negozio · Chat","Projets · Boutique · Chat","Проекты · Магазин · Чат","Projeler · Lonca dükkânı · Sohbet"],
  "Guild projects, events and co-op rewards": ["Gildenprojekte, Events und Koopbelohnungen","Proyectos, eventos y recompensas cooperativas","Gildeprojecten, evenementen en co-opbeloningen","Progetti di gilda, eventi e ricompense cooperative","Projets de guilde, événements et récompenses coop","Проекты гильдии, события и награды за совместную игру","Lonca projeleri, etkinlikler ve ortak oyun ödülleri"],
  "Activity queue": ["Aktivitätsliste","Cola de actividades","Activiteitenwachtrij","Coda attività","File d'activités","Очередь занятий","Etkinlik kuyruğu"],
  "{count} / {capacity} queued": ["{count} / {capacity} in Warteschlange","{count} / {capacity} en cola","{count} / {capacity} in wachtrij","{count} / {capacity} in coda","{count} / {capacity} en attente","В очереди {count} / {capacity}","Sırada {count} / {capacity}"],
  "Co-op expeditions": ["Koop-Expeditionen","Expediciones cooperativas","Co-op-expedities","Spedizioni cooperative","Expéditions coopératives","Совместные экспедиции","Ortak keşif seferleri"],
  "Contracts": ["Verträge","Contratos","Contracten","Contratti","Contrats","Контракты","Sözleşmeler"],
  "Weekly objectives": ["Wöchentliche Ziele","Objetivos semanales","Weekdoelen","Obiettivi settimanali","Objectifs hebdomadaires","Еженедельные цели","Haftalık hedefler"],
  "Forge": ["Schmiede","Forja","Smederij","Forgia","Forge","Кузница","Demirhane"],
  "Crafting & upgrades": ["Herstellung und Verbesserungen","Fabricación y mejoras","Maken en verbeteren","Creazione e miglioramenti","Fabrication et améliorations","Создание и улучшения","Üretim ve geliştirmeler"],
  "READY NOW": ["JETZT BEREIT","LISTO AHORA","NU KLAAR","PRONTO ORA","PRÊT MAINTENANT","ГОТОВО СЕЙЧАС","ŞİMDİ HAZIR"],
  "{count} actions need attention": ["{count} Aktionen benötigen Aufmerksamkeit","{count} acciones requieren atención","{count} acties vragen aandacht","{count} azioni richiedono attenzione","{count} actions nécessitent votre attention","Требуют внимания: {count}","{count} eylem ilgini bekliyor"],
  "Show fewer": ["Weniger anzeigen","Mostrar menos","Minder tonen","Mostra meno","Afficher moins","Свернуть","Daha az göster"],
  "Show {count} more": ["{count} weitere anzeigen","Mostrar {count} más","Toon nog {count}","Mostra altri {count}","Afficher {count} de plus","Показать ещё {count}","{count} tane daha göster"],
  "Your adventure": ["Dein Abenteuer","Tu aventura","Jouw avontuur","La tua avventura","Votre aventure","Ваше приключение","Maceran"],
  "Official Veldryn administrator.": ["Offizieller Veldryn-Administrator.","Administrador oficial de Veldryn.","Officiële beheerder van Veldryn.","Amministratore ufficiale di Veldryn.","Administrateur officiel de Veldryn.","Официальный администратор Veldryn.","Resmî Veldryn yöneticisi."],
  "Official Veldryn community moderator.": ["Offizieller Moderator der Veldryn-Community.","Moderador oficial de la comunidad de Veldryn.","Officiële moderator van de Veldryn-community.","Moderatore ufficiale della community di Veldryn.","Modérateur officiel de la communauté Veldryn.","Официальный модератор сообщества Veldryn.","Resmî Veldryn topluluk moderatörü."],
  "VIP membership badge.": ["Abzeichen für VIP-Mitgliedschaft.","Insignia de membresía VIP.","Badge voor VIP-lidmaatschap.","Distintivo per l'abbonamento VIP.","Badge d'adhésion VIP.","Значок VIP-участника.","VIP üyelik rozeti."],
  "VIP+ membership badge.": ["Abzeichen für VIP+-Mitgliedschaft.","Insignia de membresía VIP+.","Badge voor VIP+-lidmaatschap.","Distintivo per l'abbonamento VIP+.","Badge d'adhésion VIP+.","Значок участника VIP+.","VIP+ üyelik rozeti."],
  "Awarded for supporting Veldryn.": ["Für die Unterstützung von Veldryn verliehen.","Otorgada por apoyar Veldryn.","Toegekend voor het steunen van Veldryn.","Assegnato per aver sostenuto Veldryn.","Décerné pour votre soutien à Veldryn.","Награда за поддержку Veldryn.","Veldryn'i destekleyenlere verilir."],
  "Three verified months of Supporter membership.": ["Drei bestätigte Monate als Supporter.","Tres meses verificados como Supporter.","Drie geverifieerde maanden als Supporter.","Tre mesi verificati da Supporter.","Trois mois vérifiés d'abonnement Supporter.","Три подтверждённых месяца подписки Supporter.","Doğrulanmış üç aylık Supporter üyeliği."],
  "Six verified months of Supporter membership.": ["Sechs bestätigte Monate als Supporter.","Seis meses verificados como Supporter.","Zes geverifieerde maanden als Supporter.","Sei mesi verificati da Supporter.","Six mois vérifiés d'abonnement Supporter.","Шесть подтверждённых месяцев подписки Supporter.","Doğrulanmış altı aylık Supporter üyeliği."],
  "Twelve verified months of Supporter membership.": ["Zwölf bestätigte Monate als Supporter.","Doce meses verificados como Supporter.","Twaalf geverifieerde maanden als Supporter.","Dodici mesi verificati da Supporter.","Douze mois vérifiés d'abonnement Supporter.","Двенадцать подтверждённых месяцев подписки Supporter.","Doğrulanmış on iki aylık Supporter üyeliği."],
  "Awarded to founding players of Veldryn.": ["An die Gründungsspieler von Veldryn verliehen.","Otorgada a los jugadores fundadores de Veldryn.","Toegekend aan de eerste spelers van Veldryn.","Assegnato ai giocatori fondatori di Veldryn.","Décerné aux joueurs fondateurs de Veldryn.","Награда игрокам-основателям Veldryn.","Veldryn'in kurucu oyuncularına verilir."],
  "Recognizes 90 days of adventuring in Veldryn.": ["Für 90 Tage Abenteuer in Veldryn.","Reconoce 90 días de aventuras en Veldryn.","Voor 90 dagen avontuur in Veldryn.","Premia 90 giorni di avventure in Veldryn.","Récompense 90 jours d'aventure dans Veldryn.","За 90 дней приключений в Veldryn.","Veldryn'de 90 günlük macerayı simgeler."],
  "Recognizes leadership of an active guild.": ["Für die Leitung einer aktiven Gilde.","Reconoce el liderazgo de un gremio activo.","Voor het leiden van een actieve gilde.","Premia la guida di una gilda attiva.","Récompense la direction d'une guilde active.","За руководство активной гильдией.","Aktif bir loncaya liderlik etmeyi simgeler."],
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string]>;

export type RecentScreenKey=keyof typeof recentScreenTranslationRows;
const catalogs=Object.fromEntries(SUPPORTED_LANGUAGES.map((language,index)=>[
 language,Object.fromEntries(Object.entries(recentScreenTranslationRows).map(([source,translations])=>[source,index===0?source:translations[index-1]])),
])) as Record<Language,Record<RecentScreenKey,string>>;
const t=createTranslator<RecentScreenKey>(catalogs);

/** Prefer reviewed new screen copy, then the established account dictionary. */
export function recentScreenText(language:Language,source:string,params:TranslationParams={}):string{
 if(!Object.prototype.hasOwnProperty.call(recentScreenTranslationRows,source))
  return accountText(language,source,params);
 // This is a screen-specific, reviewed catalog. Its explicit RU/TR copy
 // must win over generic early-language fallbacks used in other contexts.
 // E.g. READY NOW on the Home screen is not READY NOW in a crafting recipe.
 if(language==='ru'||language==='tr'){
  const index=SUPPORTED_LANGUAGES.indexOf(language)-1;
  return interpolateTranslation(recentScreenTranslationRows[source as RecentScreenKey][index],params);
 }
 return t(language,source as RecentScreenKey,params);
}

/** Localize only the exact achievement-title structure authored in adventurers-journal-v42.
 * Unknown or future titles are preserved verbatim rather than rewriting player content. */
const journalAchievementBases=new Set(['Combatant','Well-Rounded','Artisan','Mastery Hall','Pathfinder','Delver','Companion Keeper','Beast Scholar','Orderbound']);
const journalAchievementTiers=new Set(['Novice','Adventurer','Veteran','Master','Grandmaster']);
export function journalAchievementDisplayTitle(language:Language,source:string):string{
 const parts=source.split(' — ');
 if(parts.length!==2||!journalAchievementBases.has(parts[0])||!journalAchievementTiers.has(parts[1]))return source;
 return recentScreenText(language,parts[0])+' — '+recentScreenText(language,parts[1]);
}
