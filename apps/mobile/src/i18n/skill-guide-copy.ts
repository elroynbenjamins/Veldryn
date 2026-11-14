import type {Language} from './languages';

/** Complete, editor-reviewed Skill Guide copy for every supported locale. */
export const SKILL_GUIDE_IDS=["mining","woodcutting","fishing","herbalism","smithing","cooking","alchemy","tailoring","enchanting","exploration","faith","combat","companion-mastery","companion"] as const;
export type SkillGuideId=typeof SKILL_GUIDE_IDS[number];
export type SkillGuideCopy={title:string;summary:string;training:string;usage:string;tip:string};
const COPY:Record<Language,Record<SkillGuideId,readonly [string,string,string,string,string]>>={
  "en": {
    "mining": [
      "Mining",
      "Collect ore and rare minerals from deposits.",
      "Mine accessible veins to earn Mining XP.",
      "Ore powers Smithing, equipment and some Enchanting recipes.",
      "Better pickaxes improve gathering; some veins need region access."
    ],
    "woodcutting": [
      "Woodcutting",
      "Harvest wood from forests and groves.",
      "Cut trees in unlocked regions to gain XP.",
      "Logs supply equipment, tools and other crafting recipes.",
      "Use better axes and check which materials a recipe needs."
    ],
    "fishing": [
      "Fishing",
      "Catch fish in regional waters.",
      "Fish at available spots to earn Fishing XP.",
      "Fish become food and supplies through Cooking.",
      "Better rods help; higher-level catches require new regions."
    ],
    "herbalism": [
      "Herbalism",
      "Collect herbs and natural reagents.",
      "Harvest herbs and choose a gathering method.",
      "Plants support Alchemy and other crafting chains.",
      "Higher levels unlock methods and rare botanical discoveries."
    ],
    "smithing": [
      "Smithing",
      "Forge tools, gear and metal components.",
      "Process materials and craft Smithing recipes.",
      "Create weapons, equipment, tools and crafting components.",
      "Some recipes also require a blueprint, character level or knowledge."
    ],
    "cooking": [
      "Cooking",
      "Prepare food and provisions.",
      "Cook recipes using gathered ingredients.",
      "Food supports stamina and recovery in ordinary adventures.",
      "Food cannot be used in dungeons or boss encounters."
    ],
    "alchemy": [
      "Alchemy",
      "Brew potions and crafting reagents.",
      "Craft Alchemy recipes from herbs and materials.",
      "Prepare healing draughts, combat tonics and special components.",
      "Potion types have different effects and usage rules."
    ],
    "tailoring": [
      "Tailoring",
      "Craft textile gear and components.",
      "Make Tailoring recipes with the required materials.",
      "Produce class-relevant equipment and advanced gear components.",
      "Check skill, character level and material requirements."
    ],
    "enchanting": [
      "Enchanting",
      "Refine gems and magical crafting materials.",
      "Research, refine and combine gems or craft recipes.",
      "Prepare socketable gems and equipment upgrades.",
      "Gem grades, research and socket access are separate requirements."
    ],
    "exploration": [
      "Exploration",
      "Survey areas and discover new encounters.",
      "Complete scouting routes in accessible regions.",
      "Unlock routes and earn gathering and scouting speed bonuses.",
      "Some routes require character levels and previous surveys."
    ],
    "faith": [
      "Faith",
      "Practice devotion to gain useful blessings.",
      "Use Holy Water for available Faith rituals.",
      "Choose blessings for combat, gathering, production or XP.",
      "New blessings unlock at specific Faith levels."
    ],
    "combat": [
      "Combat",
      "Fight enemies and develop your class.",
      "Defeat enemies and allocate class skill XP in Combat.",
      "Character progress and class skills improve combat performance.",
      "Character level and class skill levels are separate systems."
    ],
    "companion-mastery": [
      "Companion Mastery",
      "Account-wide progression for all companions.",
      "Claim Expeditions, Trial victories and Training Ground rewards.",
      "Boost companion stats, XP earned and assist effects.",
      "Mastery is shared across characters; Training Ground upgrades are separate."
    ],
    "companion": [
      "Companion Training",
      "A Sanctuary facility, not a character skill.",
      "Upgrade the Training Ground and claim eligible training days.",
      "Give XP to idle companions without sending them into combat.",
      "Busy companions cannot collect training; the facility has three levels."
    ]
  },
  "de": {
    "mining": [
      "Bergbau",
      "Baue Erze und seltene Mineralien ab.",
      "Baue zugängliche Erzadern ab, um EP zu verdienen.",
      "Erze werden für Schmieden, Ausrüstung und manche Verzauberungen gebraucht.",
      "Bessere Spitzhacken helfen; manche Adern erfordern Regionszugang."
    ],
    "woodcutting": [
      "Holzfällen",
      "Sammle Holz aus Wäldern und Hainen.",
      "Fälle Bäume in freigeschalteten Regionen für EP.",
      "Holz wird für Ausrüstung, Werkzeuge und andere Rezepte benötigt.",
      "Nutze bessere Äxte und prüfe die benötigten Materialien."
    ],
    "fishing": [
      "Angeln",
      "Fange Fische in den Gewässern der Regionen.",
      "Angle an verfügbaren Stellen, um EP zu sammeln.",
      "Fisch wird beim Kochen zu Nahrung und Vorräten.",
      "Bessere Ruten helfen; manche Fänge brauchen neue Regionen."
    ],
    "herbalism": [
      "Kräuterkunde",
      "Sammle Kräuter und natürliche Reagenzien.",
      "Ernte Kräuter und wähle eine Sammelmethode.",
      "Pflanzen werden für Alchemie und weitere Rezepte gebraucht.",
      "Höhere Stufen schalten Methoden und seltene Funde frei."
    ],
    "smithing": [
      "Schmieden",
      "Schmiede Werkzeuge, Ausrüstung und Metallteile.",
      "Verarbeite Materialien und stelle Schmiederezepte her.",
      "Fertige Waffen, Ausrüstung, Werkzeuge und Bauteile.",
      "Manche Rezepte erfordern Baupläne, Charakterstufen oder Wissen."
    ],
    "cooking": [
      "Kochen",
      "Bereite Speisen und Reiseproviant zu.",
      "Koche Rezepte aus gesammelten Zutaten.",
      "Nahrung unterstützt Ausdauer und Erholung bei normalen Abenteuern.",
      "In Dungeons und bei Bosskämpfen kann keine Nahrung genutzt werden."
    ],
    "alchemy": [
      "Alchemie",
      "Braue Tränke und Handwerksreagenzien.",
      "Stelle Alchemierezepte mit Kräutern und Materialien her.",
      "Bereite Heiltränke, Kampftonika und besondere Komponenten zu.",
      "Trankarten haben unterschiedliche Wirkungen und Regeln."
    ],
    "tailoring": [
      "Schneiderei",
      "Stelle Stoffausrüstung und Bauteile her.",
      "Fertige Schneidereirezepte mit passenden Materialien.",
      "Erzeuge klassengebundene Ausrüstung und Komponenten für höhere Stufen.",
      "Prüfe Fertigkeitsstufe, Charakterstufe und Materialbedarf."
    ],
    "enchanting": [
      "Verzaubern",
      "Veredle Edelsteine und magische Materialien.",
      "Erforsche, veredle und kombiniere Edelsteine oder fertige Rezepte.",
      "Erzeuge einsetzbare Edelsteine und Ausrüstungsverbesserungen.",
      "Edelsteingrade, Forschung und Sockel haben eigene Voraussetzungen."
    ],
    "exploration": [
      "Erkundung",
      "Erkunde Gebiete und entdecke neue Begegnungen.",
      "Schließe Erkundungsrouten in zugänglichen Regionen ab.",
      "Schalte Wege frei und erhalte Tempo-Boni beim Sammeln und Erkunden.",
      "Manche Routen erfordern Charakterstufen und frühere Erkundungen."
    ],
    "faith": [
      "Glaube",
      "Übe Hingabe aus, um Segnungen zu erhalten.",
      "Verwende Weihwasser für verfügbare Glaubensrituale.",
      "Wähle Segnungen für Kampf, Sammeln, Produktion oder EP.",
      "Neue Segnungen werden auf bestimmten Glaubensstufen freigeschaltet."
    ],
    "combat": [
      "Kampf",
      "Bekämpfe Gegner und entwickle deine Klasse.",
      "Besiege Gegner und verteile Klassenfertigkeits-EP im Kampf.",
      "Charakterfortschritt und Klassenfertigkeiten verbessern deine Kampfkraft.",
      "Charakterstufe und Klassenfertigkeiten sind getrennte Systeme."
    ],
    "companion-mastery": [
      "Begleitermeisterschaft",
      "Kontoweiter Fortschritt für alle Begleiter.",
      "Hole Belohnungen aus Expeditionen, Prüfungen und Training ab.",
      "Verbessere Begleiterwerte, erhaltene EP und Hilfseffekte.",
      "Die Meisterschaft gilt für alle Charaktere; Gebäudeausbau ist separat."
    ],
    "companion": [
      "Begleitertraining",
      "Eine Zufluchtsanlage, keine Charakterfertigkeit.",
      "Verbessere den Trainingsplatz und hole angesammelte Trainingstage ab.",
      "Gib untätigen Begleitern EP, ohne sie kämpfen zu lassen.",
      "Beschäftigte Begleiter trainieren nicht; die Anlage hat drei Stufen."
    ]
  },
  "es": {
    "mining": [
      "Minería",
      "Extrae minerales y materiales raros de los yacimientos.",
      "Extrae de vetas accesibles para ganar EXP.",
      "Los minerales sirven para Herrería, equipo y algunos encantamientos.",
      "Mejores picos ayudan; algunas vetas requieren acceso regional."
    ],
    "woodcutting": [
      "Tala",
      "Recoge madera de bosques y arboledas.",
      "Tala árboles en regiones desbloqueadas para ganar EXP.",
      "La madera se usa en equipo, herramientas y otras recetas.",
      "Mejora el hacha y comprueba los materiales de cada receta."
    ],
    "fishing": [
      "Pesca",
      "Captura peces en las aguas de cada región.",
      "Pesca en lugares disponibles para ganar EXP.",
      "Los peces se convierten en comida y provisiones con Cocina.",
      "Mejores cañas ayudan; ciertas capturas requieren nuevas regiones."
    ],
    "herbalism": [
      "Herboristería",
      "Recolecta hierbas y reactivos naturales.",
      "Recoge hierbas y elige un método de recolección.",
      "Las plantas sirven para Alquimia y otras recetas.",
      "Los niveles altos desbloquean métodos y hallazgos raros."
    ],
    "smithing": [
      "Herrería",
      "Forja herramientas, equipo y piezas de metal.",
      "Procesa materiales y fabrica recetas de Herrería.",
      "Crea armas, equipo, herramientas y componentes.",
      "Algunas recetas exigen planos, nivel de personaje o conocimientos."
    ],
    "cooking": [
      "Cocina",
      "Prepara comida y provisiones.",
      "Cocina recetas con ingredientes recolectados.",
      "La comida ayuda con el aguante y la recuperación normal.",
      "No se puede usar comida en mazmorras ni contra jefes."
    ],
    "alchemy": [
      "Alquimia",
      "Elabora pociones y reactivos de fabricación.",
      "Fabrica recetas de Alquimia con hierbas y materiales.",
      "Prepara pociones curativas, tónicos y componentes especiales.",
      "Cada tipo de poción tiene efectos y reglas distintos."
    ],
    "tailoring": [
      "Sastrería",
      "Crea equipo textil y componentes.",
      "Fabrica recetas de Sastrería con los materiales adecuados.",
      "Produce equipo de clase y componentes avanzados.",
      "Comprueba el nivel de habilidad, personaje y materiales."
    ],
    "enchanting": [
      "Encantamiento",
      "Refina gemas y materiales mágicos.",
      "Investiga, refina y combina gemas o fabrica recetas.",
      "Prepara gemas para engarzar y mejoras de equipo.",
      "El grado de gema, la investigación y los huecos se desbloquean aparte."
    ],
    "exploration": [
      "Exploración",
      "Investiga zonas y descubre nuevos encuentros.",
      "Completa rutas de exploración en regiones accesibles.",
      "Desbloquea rutas y bonificaciones de velocidad al recolectar y explorar.",
      "Algunas rutas exigen nivel de personaje y exploraciones previas."
    ],
    "faith": [
      "Fe",
      "Practica la devoción para conseguir bendiciones.",
      "Usa Agua Bendita en los rituales disponibles.",
      "Elige bendiciones para combate, recolección, producción o EXP.",
      "Las bendiciones se desbloquean a determinados niveles de Fe."
    ],
    "combat": [
      "Combate",
      "Lucha contra enemigos y mejora tu clase.",
      "Derrota enemigos y distribuye EXP de habilidades de clase.",
      "El progreso del personaje y sus habilidades mejoran el combate.",
      "El nivel del personaje y el de las habilidades son distintos."
    ],
    "companion-mastery": [
      "Maestría de compañeros",
      "Progreso compartido para todos los compañeros de la cuenta.",
      "Reclama expediciones, victorias en pruebas y entrenamiento.",
      "Mejora estadísticas, EXP obtenida y efectos de asistencia.",
      "La maestría es de toda la cuenta; mejorar el campo es independiente."
    ],
    "companion": [
      "Entrenamiento de compañeros",
      "Una instalación del Santuario, no una habilidad del personaje.",
      "Mejora el campo de entrenamiento y reclama los días acumulados.",
      "Da EXP a los compañeros inactivos sin entrar en combate.",
      "Los compañeros ocupados no entrenan; la instalación tiene tres niveles."
    ]
  },
  "nl": {
    "mining": [
      "Mijnbouw",
      "Delf erts en zeldzame mineralen.",
      "Delf in bereikbare aders om XP te verdienen.",
      "Erts is nodig voor Smeden, uitrusting en sommige betoveringen.",
      "Betere houwelen helpen; sommige aders vereisen regiotoegang."
    ],
    "woodcutting": [
      "Houthakken",
      "Verzamel hout uit bossen en boomgaarden.",
      "Hak bomen in vrijgespeelde regio's voor XP.",
      "Hout wordt gebruikt voor uitrusting, gereedschap en recepten.",
      "Gebruik betere bijlen en bekijk de materialen per recept."
    ],
    "fishing": [
      "Vissen",
      "Vang vissen in regionale wateren.",
      "Vis op beschikbare plekken om XP te verdienen.",
      "Vis wordt via Koken omgezet in voedsel en voorraden.",
      "Betere hengels helpen; sommige vissen vragen nieuwe regio's."
    ],
    "herbalism": [
      "Kruidenkunde",
      "Verzamel kruiden en natuurlijke grondstoffen.",
      "Oogst kruiden en kies een verzamelmethode.",
      "Planten worden gebruikt voor Alchemie en andere recepten.",
      "Hogere niveaus openen methoden en zeldzame vondsten."
    ],
    "smithing": [
      "Smeden",
      "Smeed gereedschap, uitrusting en metalen onderdelen.",
      "Verwerk materialen en maak smeedrecepten voor XP.",
      "Maak wapens, uitrusting, gereedschap en onderdelen.",
      "Sommige recepten vereisen blauwdrukken, personageniveau of kennis."
    ],
    "cooking": [
      "Koken",
      "Bereid maaltijden en reisvoorraden.",
      "Kook recepten met verzamelde ingrediënten.",
      "Eten helpt bij uithoudingsvermogen en herstel tijdens gewone avonturen.",
      "Eten werkt niet in kerkers of baasgevechten."
    ],
    "alchemy": [
      "Alchemie",
      "Brouw drankjes en ambachtelijke grondstoffen.",
      "Maak alchemierecepten met kruiden en materialen.",
      "Bereid genezingsdrankjes, gevechtstonics en speciale onderdelen.",
      "Dranktypen verschillen in werking en gebruik."
    ],
    "tailoring": [
      "Kleermakerij",
      "Maak stoffen uitrusting en onderdelen.",
      "Maak kleermakerijrecepten met de juiste materialen.",
      "Vervaardig klassegebonden uitrusting en geavanceerde onderdelen.",
      "Controleer vaardigheidsniveau, personageniveau en materialen."
    ],
    "enchanting": [
      "Betoveren",
      "Verfijn edelstenen en magische materialen.",
      "Onderzoek, verfijn en combineer edelstenen of maak recepten.",
      "Maak edelstenen voor sockets en verbeter uitrusting.",
      "Edelsteengraad, onderzoek en sockets hebben aparte vereisten."
    ],
    "exploration": [
      "Verkennen",
      "Verken gebieden en ontdek nieuwe ontmoetingen.",
      "Voltooi verkenroutes in bereikbare regio's.",
      "Ontgrendel routes en bonussen voor verzamel- en verkeningssnelheid.",
      "Sommige routes vereisen personageniveau en eerdere verkenningen."
    ],
    "faith": [
      "Geloof",
      "Oefen toewijding en verkrijg zegeningen.",
      "Gebruik Heilig Water voor beschikbare rituelen.",
      "Kies zegeningen voor gevecht, verzamelen, productie of XP.",
      "Nieuwe zegeningen openen bij specifieke Geloofsniveaus."
    ],
    "combat": [
      "Gevechten",
      "Versla vijanden en ontwikkel je klasse.",
      "Versla vijanden en verdeel klassevaardigheids-XP bij Gevechten.",
      "Personagevoortgang en klassevaardigheden verbeteren je gevechten.",
      "Personageniveau en klassevaardigheidsniveaus staan los van elkaar."
    ],
    "companion-mastery": [
      "Metgezellenmeesterschap",
      "Accountbrede voortgang voor al je metgezellen.",
      "Claim expedities, beproevingen en trainingsbeloningen.",
      "Verhoog metgezellenstats, verdiende XP en hulpeffecten.",
      "Meesterschap geldt voor alle personages; het trainingsveld staat los."
    ],
    "companion": [
      "Metgezeltraining",
      "Een faciliteit in het Heiligdom, geen personagevaardigheid.",
      "Verbeter het trainingsveld en claim opgebouwde trainingsdagen.",
      "Geef inactieve metgezellen XP zonder gevechten.",
      "Bezette metgezellen trainen niet; de faciliteit heeft drie niveaus."
    ]
  },
  "it": {
    "mining": [
      "Estrazione",
      "Estrai minerali e materiali rari dai giacimenti.",
      "Estrai dai filoni disponibili per ottenere PE.",
      "I minerali servono per Forgiatura, equipaggiamento e incanti.",
      "Picconi migliori aiutano; alcuni filoni richiedono altre regioni."
    ],
    "woodcutting": [
      "Taglio del legno",
      "Raccogli legname nei boschi e nei boschetti.",
      "Abbatti alberi nelle regioni sbloccate per ottenere PE.",
      "Il legno serve per equipaggiamento, strumenti e ricette.",
      "Usa asce migliori e controlla gli ingredienti delle ricette."
    ],
    "fishing": [
      "Pesca",
      "Pesca nei corsi d'acqua delle regioni.",
      "Pesca nei punti disponibili per ottenere PE.",
      "Il pesce diventa cibo e provviste tramite Cucina.",
      "Canne migliori aiutano; alcune catture richiedono nuove regioni."
    ],
    "herbalism": [
      "Erboristeria",
      "Raccogli erbe e reagenti naturali.",
      "Raccogli erbe e scegli un metodo di raccolta.",
      "Le piante servono per Alchimia e altre ricette.",
      "Livelli superiori sbloccano metodi e ritrovamenti rari."
    ],
    "smithing": [
      "Forgiatura",
      "Forgia strumenti, equipaggiamento e parti metalliche.",
      "Lavora materiali e crea ricette di Forgiatura.",
      "Realizza armi, equipaggiamento, strumenti e componenti.",
      "Alcune ricette richiedono progetti, livello o conoscenze."
    ],
    "cooking": [
      "Cucina",
      "Prepara cibo e provviste.",
      "Cucina ricette con gli ingredienti raccolti.",
      "Il cibo aiuta resistenza e recupero nelle normali avventure.",
      "Non puoi usare cibo nei dungeon o contro i boss."
    ],
    "alchemy": [
      "Alchimia",
      "Prepara pozioni e reagenti artigianali.",
      "Crea ricette di Alchimia usando erbe e materiali.",
      "Prepara cure, tonici da combattimento e componenti speciali.",
      "Ogni tipo di pozione ha effetti e regole diversi."
    ],
    "tailoring": [
      "Sartoria",
      "Crea equipaggiamento e componenti in tessuto.",
      "Realizza ricette di Sartoria con i materiali richiesti.",
      "Produci equipaggiamento di classe e componenti avanzati.",
      "Verifica livello abilità, livello personaggio e materiali."
    ],
    "enchanting": [
      "Incantamento",
      "Raffina gemme e materiali magici.",
      "Studia, raffina e combina gemme o crea ricette.",
      "Prepara gemme da incastonare e potenziamenti dell'equipaggiamento.",
      "Grado delle gemme, ricerca e incavi hanno requisiti distinti."
    ],
    "exploration": [
      "Esplorazione",
      "Esamina luoghi e scopri nuovi incontri.",
      "Completa le esplorazioni nelle regioni raggiungibili.",
      "Sblocca percorsi e bonus alla velocità di raccolta e ricognizione.",
      "Alcuni percorsi richiedono livelli e ricognizioni precedenti."
    ],
    "faith": [
      "Fede",
      "Coltiva la devozione per ottenere benedizioni.",
      "Usa Acqua Santa per i rituali disponibili.",
      "Scegli benedizioni per combattimento, raccolta, produzione o PE.",
      "Nuove benedizioni si sbloccano a livelli precisi di Fede."
    ],
    "combat": [
      "Combattimento",
      "Affronta nemici e sviluppa la tua classe.",
      "Sconfiggi nemici e distribuisci i PE delle abilità di classe.",
      "Progressi del personaggio e abilità di classe migliorano il combattimento.",
      "Livello personaggio e abilità di classe sono separati."
    ],
    "companion-mastery": [
      "Maestria compagni",
      "Progressione condivisa da tutti i compagni dell'account.",
      "Riscatta Spedizioni, vittorie nelle Prove e ricompense di allenamento.",
      "Aumenta statistiche, PE guadagnati ed efficacia dell'assistenza.",
      "La Maestria è condivisa; il campo di allenamento è distinto."
    ],
    "companion": [
      "Allenamento compagni",
      "Una struttura del Santuario, non un'abilità del personaggio.",
      "Migliora il campo e riscuoti i giorni di allenamento maturati.",
      "Dai PE ai compagni inattivi senza combattere.",
      "I compagni impegnati non si allenano; la struttura ha tre livelli."
    ]
  },
  "fr": {
    "mining": [
      "Minage",
      "Extrayez des minerais et minéraux rares.",
      "Exploitez les filons accessibles pour gagner de l'EXP.",
      "Les minerais servent à la Forge, à l'équipement et aux enchantements.",
      "De meilleures pioches aident ; certains filons demandent l'accès à une région."
    ],
    "woodcutting": [
      "Bûcheronnage",
      "Récoltez du bois dans les forêts et les bosquets.",
      "Coupez des arbres dans les régions débloquées pour l'EXP.",
      "Le bois sert aux équipements, outils et autres recettes.",
      "Utilisez de meilleures haches et vérifiez les matériaux requis."
    ],
    "fishing": [
      "Pêche",
      "Pêchez dans les eaux des différentes régions.",
      "Pêchez aux endroits accessibles pour gagner de l'EXP.",
      "La Cuisine transforme les poissons en nourriture et provisions.",
      "De meilleures cannes aident ; certaines prises exigent d'autres régions."
    ],
    "herbalism": [
      "Herboristerie",
      "Récoltez herbes et réactifs naturels.",
      "Cueillez des herbes et choisissez une méthode de récolte.",
      "Les plantes servent à l'Alchimie et à d'autres recettes.",
      "Des niveaux supérieurs débloquent méthodes et trouvailles rares."
    ],
    "smithing": [
      "Forge",
      "Forgez outils, équipement et pièces métalliques.",
      "Transformez des matériaux et réalisez des recettes de Forge.",
      "Fabriquez armes, équipements, outils et composants.",
      "Certains plans exigent un schéma, un niveau ou des connaissances."
    ],
    "cooking": [
      "Cuisine",
      "Préparez repas et provisions.",
      "Cuisinez des recettes avec des ingrédients récoltés.",
      "La nourriture aide à l'endurance et à la récupération ordinaire.",
      "La nourriture est inutilisable en donjon et contre les boss."
    ],
    "alchemy": [
      "Alchimie",
      "Préparez potions et réactifs artisanaux.",
      "Réalisez des recettes d'Alchimie avec des herbes et matériaux.",
      "Préparez soins, toniques de combat et composants spéciaux.",
      "Chaque type de potion a des effets et règles différents."
    ],
    "tailoring": [
      "Couture",
      "Fabriquez de l'équipement textile et des composants.",
      "Réalisez des recettes de Couture avec les matériaux nécessaires.",
      "Produisez de l'équipement de classe et des composants avancés.",
      "Vérifiez niveaux de métier, de personnage et matériaux requis."
    ],
    "enchanting": [
      "Enchantement",
      "Raffinez les gemmes et les matériaux magiques.",
      "Étudiez, raffinez et combinez les gemmes ou fabriquez des recettes.",
      "Préparez des gemmes à sertir et des améliorations d'équipement.",
      "Grades, recherches et emplacements ont des conditions distinctes."
    ],
    "exploration": [
      "Exploration",
      "Explorez les lieux et découvrez de nouvelles rencontres.",
      "Terminez les itinéraires d'exploration dans les régions accessibles.",
      "Débloquez des routes et des bonus de vitesse de récolte et d'exploration.",
      "Certains itinéraires exigent un niveau et des relevés antérieurs."
    ],
    "faith": [
      "Foi",
      "Pratiquez la dévotion pour obtenir des bénédictions.",
      "Utilisez de l'Eau bénite pour les rituels disponibles.",
      "Choisissez des bénédictions pour le combat, la récolte, la production ou l'EXP.",
      "Les bénédictions se débloquent à des niveaux précis de Foi."
    ],
    "combat": [
      "Combat",
      "Affrontez des ennemis et développez votre classe.",
      "Battez des ennemis et répartissez l'EXP de compétence de classe.",
      "Le personnage et ses compétences gagnent en efficacité au combat.",
      "Niveau du personnage et compétences de classe sont distincts."
    ],
    "companion-mastery": [
      "Maîtrise des compagnons",
      "Progression commune à tous les compagnons du compte.",
      "Réclamez expéditions, victoires d'épreuves et entraînement.",
      "Renforcez statistiques, EXP gagnée et effets d'assistance.",
      "La maîtrise est partagée ; améliorer le terrain est un autre système."
    ],
    "companion": [
      "Entraînement des compagnons",
      "Une installation du Sanctuaire, pas une compétence du personnage.",
      "Améliorez le terrain et récupérez les journées d'entraînement.",
      "Donnez de l'EXP aux compagnons inactifs sans combattre.",
      "Les compagnons occupés ne s'entraînent pas ; trois niveaux existent."
    ]
  },
  "ru": {
    "mining": [
      "Горное дело",
      "Добывайте руду и редкие минералы.",
      "Разрабатывайте доступные жилы, чтобы получать опыт.",
      "Руда нужна для кузнечного дела, снаряжения и некоторых чар.",
      "Улучшайте кирки; отдельные жилы требуют доступа к региону."
    ],
    "woodcutting": [
      "Лесорубство",
      "Заготавливайте древесину в лесах и рощах.",
      "Рубите деревья в открытых регионах, чтобы получать опыт.",
      "Древесина нужна для снаряжения, инструментов и рецептов.",
      "Используйте лучшие топоры и проверяйте материалы рецептов."
    ],
    "fishing": [
      "Рыбалка",
      "Ловите рыбу в водоёмах разных регионов.",
      "Рыбачьте в доступных местах, чтобы получать опыт.",
      "Рыба превращается в еду и припасы благодаря кулинарии.",
      "Лучшие удочки помогают; для некоторых уловов нужны новые регионы."
    ],
    "herbalism": [
      "Травничество",
      "Собирайте травы и природные реагенты.",
      "Собирайте травы и выбирайте способ сбора.",
      "Растения нужны для алхимии и других рецептов.",
      "С ростом уровня открываются способы сбора и редкие находки."
    ],
    "smithing": [
      "Кузнечное дело",
      "Куйте инструменты, снаряжение и металлические детали.",
      "Обрабатывайте материалы и создавайте предметы по рецептам.",
      "Создавайте оружие, снаряжение, инструменты и компоненты.",
      "Для некоторых рецептов нужны чертежи, уровень или знания."
    ],
    "cooking": [
      "Кулинария",
      "Готовьте пищу и дорожные припасы.",
      "Готовьте блюда из собранных ингредиентов.",
      "Еда помогает с выносливостью и восстановлением в обычных приключениях.",
      "В подземельях и боях с боссами еда недоступна."
    ],
    "alchemy": [
      "Алхимия",
      "Варите зелья и создавайте реагенты.",
      "Создавайте предметы по алхимическим рецептам из трав и материалов.",
      "Готовьте лечебные зелья, боевые тоники и особые компоненты.",
      "У разных зелий разные эффекты и правила применения."
    ],
    "tailoring": [
      "Портняжное дело",
      "Создавайте тканевое снаряжение и компоненты.",
      "Изготавливайте вещи по рецептам из нужных материалов.",
      "Создавайте классовое снаряжение и компоненты высоких уровней.",
      "Проверяйте требования к навыку, персонажу и материалам."
    ],
    "enchanting": [
      "Зачарование",
      "Обрабатывайте самоцветы и магические материалы.",
      "Изучайте, улучшайте и объединяйте самоцветы.",
      "Готовьте самоцветы для гнёзд и улучшения снаряжения.",
      "Ранги самоцветов, исследования и гнёзда имеют разные условия."
    ],
    "exploration": [
      "Исследование",
      "Изучайте местность и находите новые встречи.",
      "Завершайте разведывательные маршруты в доступных регионах.",
      "Открывайте пути и бонусы к скорости сбора и разведки.",
      "Для некоторых маршрутов нужны уровень и прошлые исследования."
    ],
    "faith": [
      "Вера",
      "Совершайте обряды, чтобы получать благословения.",
      "Используйте святую воду в доступных обрядах.",
      "Выбирайте бонусы для боя, сбора, производства или опыта.",
      "Новые благословения открываются на определённых уровнях Веры."
    ],
    "combat": [
      "Бой",
      "Сражайтесь с врагами и развивайте класс.",
      "Побеждайте врагов и распределяйте опыт классовых навыков.",
      "Уровень персонажа и навыки класса улучшают боевые возможности.",
      "Уровень персонажа и уровни классовых навыков различаются."
    ],
    "companion-mastery": [
      "Мастерство спутников",
      "Общий прогресс спутников всего аккаунта.",
      "Получайте награды за экспедиции, испытания и тренировки.",
      "Усиливайте характеристики спутников, опыт и помощь в бою.",
      "Мастерство общее для персонажей, а улучшение площадки — отдельное."
    ],
    "companion": [
      "Тренировка спутников",
      "Постройка Убежища, а не навык персонажа.",
      "Улучшайте тренировочную площадку и забирайте награды за дни.",
      "Давайте опыт свободным спутникам без участия в боях.",
      "Занятые спутники не тренируются; у площадки три уровня."
    ]
  },
  "tr": {
    "mining": [
      "Madencilik",
      "Damarlardan cevher ve nadir mineraller çıkar.",
      "Erişilebilir maden damarlarında çalışarak XP kazan.",
      "Cevherler Demircilik, ekipman ve bazı büyüleme tariflerinde kullanılır.",
      "Daha iyi kazmalar faydalıdır; bazı damarlar bölge erişimi ister."
    ],
    "woodcutting": [
      "Odunculuk",
      "Ormanlardan ve korulardan odun topla.",
      "Açılmış bölgelerde ağaç keserek XP kazan.",
      "Odun; ekipman, alet ve başka tariflerde kullanılır.",
      "Baltanı geliştir ve tariflerin malzeme gereksinimlerini kontrol et."
    ],
    "fishing": [
      "Balıkçılık",
      "Bölgelerdeki sularda balık tut.",
      "Erişilebilir noktalarda balık tutarak XP kazan.",
      "Balıklar Aşçılık ile yiyecek ve erzağa dönüşür.",
      "Daha iyi oltalar yardımcı olur; bazı balıklar yeni bölgeler ister."
    ],
    "herbalism": [
      "Bitkicilik",
      "Otlar ve doğal malzemeler topla.",
      "Ot toplayıp uygun toplama yöntemini seç.",
      "Bitkiler Simya ve diğer üretim tariflerinde kullanılır.",
      "Seviye arttıkça yeni yöntemler ve nadir buluntular açılır."
    ],
    "smithing": [
      "Demircilik",
      "Alet, ekipman ve metal parçalar üret.",
      "Malzemeleri işle ve Demircilik tarifleriyle XP kazan.",
      "Silah, ekipman, alet ve üretim bileşenleri yap.",
      "Bazı tarifler plan, karakter seviyesi veya bilgi gerektirir."
    ],
    "cooking": [
      "Aşçılık",
      "Yemek ve yol erzağı hazırla.",
      "Topladığın malzemelerle tarifler yap.",
      "Yiyecekler normal maceralarda dayanıklılık ve iyileşmeyi destekler.",
      "Zindanlarda ve boss savaşlarında yiyecek kullanılamaz."
    ],
    "alchemy": [
      "Simya",
      "İksirler ve üretim malzemeleri hazırla.",
      "Otlar ve malzemelerle Simya tariflerini üret.",
      "Şifa iksirleri, savaş güçlendiricileri ve özel parçalar hazırla.",
      "İksir türlerinin etkileri ve kullanım kuralları farklıdır."
    ],
    "tailoring": [
      "Terzilik",
      "Kumaş ekipman ve üretim parçaları hazırla.",
      "Gerekli malzemelerle Terzilik tarifleri yap.",
      "Sınıfa özel ekipman ve ileri seviye parçalar üret.",
      "Beceri, karakter seviyesi ve malzeme şartlarını kontrol et."
    ],
    "enchanting": [
      "Büyüleme",
      "Mücevherleri ve büyülü malzemeleri işle.",
      "Mücevherleri araştır, geliştir ve birleştir.",
      "Yuvalara takılabilir mücevherler ve ekipman yükseltmeleri hazırla.",
      "Mücevher derecesi, araştırma ve yuvaların koşulları ayrıdır."
    ],
    "exploration": [
      "Keşif",
      "Bölgeleri araştır ve yeni karşılaşmalar bul.",
      "Ulaşılabilir bölgelerde keşif rotalarını tamamla.",
      "Yeni yollar ve toplama ile keşif hızı bonusları aç.",
      "Bazı rotalar karakter seviyesi ve önceki keşifleri gerektirir."
    ],
    "faith": [
      "İnanç",
      "Kutsamalar kazanmak için ibadet et.",
      "Mevcut ritüellerde Kutsal Su kullan.",
      "Savaş, toplama, üretim veya XP için kutsamalar seç.",
      "Yeni kutsamalar belirli İnanç seviyelerinde açılır."
    ],
    "combat": [
      "Savaş",
      "Düşmanlarla savaş ve sınıfını geliştir.",
      "Düşmanları yen ve sınıf becerisi XP'sini dağıt.",
      "Karakter gelişimi ve sınıf becerileri savaş gücünü artırır.",
      "Karakter seviyesi ile sınıf becerisi seviyeleri ayrıdır."
    ],
    "companion-mastery": [
      "Yoldaş Ustalığı",
      "Hesaptaki tüm yoldaşlar için ortak gelişim.",
      "Sefer, Sınav ve Eğitim Alanı ödüllerini al.",
      "Yoldaş özelliklerini, XP kazancını ve destek etkilerini artır.",
      "Ustalık karakterler arasında ortaktır; Eğitim Alanı ayrı gelişir."
    ],
    "companion": [
      "Yoldaş Eğitimi",
      "Sığınak tesisi; karakter becerisi değildir.",
      "Eğitim Alanı'nı yükselt ve biriken eğitim günlerini topla.",
      "Boştaki yoldaşlara savaşmadan XP kazandır.",
      "Meşgul yoldaşlar eğitilemez; tesisin üç seviyesi vardır."
    ]
  }
};
export function skillGuideCopy(language:Language,id:SkillGuideId):SkillGuideCopy{
 const [title,summary,training,usage,tip]=COPY[language][id];
 return {title,summary,training,usage,tip};
}
