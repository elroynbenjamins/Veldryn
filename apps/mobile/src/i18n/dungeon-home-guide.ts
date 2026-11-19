import type {Language} from './languages';

/**
 * Dungeon guide shown from the Finder's header. Descriptions match the
 * server-owned Q-mode boon offers, room outcomes and reward rules.
 */
export const DUNGEON_HOME_GUIDE={
 title:'Dungeon handbook',
 body:'Choose a topic or follow the steps to learn about dungeon runs, routes, boons, artifacts and rewards.',
 topics:[
  {id:'start',title:'Getting started',body:'Select an unlocked dungeon. Solo fills the missing party roles with NPC or Echo allies; Live pairs you with other adventurers. A party has one Tank, two Damage and one Support. Choose an eligible difficulty and prepare your loadout.'},
  {id:'routes',title:'Rooms and routes',body:'Each expedition follows branching rooms toward a final boss. Battles, elites, shrines, camps, events and treasure bring different risks and rewards. In Solo you choose the route; in Live the party votes.'},
  {id:'boons',title:'What are boons?',body:'Boons are temporary run benefits. Battle Focus gives +5% party attack power for the rest of the run; Stalwart Guard gives +5% party defense. Second Wind restores 20% max HP to allies and revives downed allies.'},
  {id:'artifacts',title:'What are artifacts?',body:'Artifacts are special items found during an expedition. Their effects trigger during combat. They are run-only relics, not permanent equipment, and do not carry over to another dungeon run.'},
  {id:'supplies',title:'Supplies and survival',body:'Prepare one dungeon tonic before the first room. It lasts for the run and is consumed even if you fail. Dungeon healing potions are limited, food is disabled, and your party carries HP between rooms. Watch boss casts and objectives.'},
  {id:'rewards',title:'Rewards and marks',body:'Combat and successful clears can award Expedition Marks, equipment and regional boss loot. The Dungeon Shop offers collectibles and eligible crafting resource bundles. Reward charges and weekly bonuses are shown in dungeon details.'},
  {id:'bosses',title:'Bosses and difficulty',body:'Regional dungeons have up to three difficulty tiers with level and Combat Power requirements. Each regional dungeon has two possible bosses, each with distinct loot and a 50% appearance chance. Event dungeons have their own tiers and rewards.'},
 ],
 detail:'Boons and artifacts only affect the current dungeon run. They do not permanently increase your character power. Room outcomes are confirmed by the server.',
} as const;

/** English keys are used throughout the UI; untranslated strings fall back safely. */
const rows:Record<string,Partial<Record<Language,string>>>={
 'Dungeon handbook':{
  de:'Dungeon-Handbuch',es:'Guía de mazmorras',nl:'Kerkergids',it:'Guida ai dungeon',fr:'Guide des donjons',ru:'Руководство по подземельям',tr:'Zindan rehberi',
 },
 'Choose a topic or follow the steps to learn about dungeon runs, routes, boons, artifacts and rewards.':{
  de:'Wähle ein Thema oder folge den Schritten, um Dungeons, Routen, Segen, Artefakte und Belohnungen kennenzulernen.',
  es:'Elige un tema o sigue los pasos para conocer las mazmorras, rutas, bendiciones, artefactos y recompensas.',
  nl:'Kies een onderwerp of volg de stappen om kerkers, routes, zegeningen, artefacten en beloningen te leren kennen.',
  it:'Scegli un argomento o segui i passaggi per scoprire dungeon, percorsi, benedizioni, artefatti e ricompense.',
  fr:'Choisissez un sujet ou suivez les étapes pour découvrir les donjons, itinéraires, bénédictions, artefacts et récompenses.',
  ru:'Выберите тему или пройдите шаги, чтобы узнать о подземельях, маршрутах, благословениях, артефактах и наградах.',
  tr:'Zindanları, rotaları, lütufları, eserleri ve ödülleri öğrenmek için bir konu seç veya adımları izle.',
 },
 'Getting started':{de:'Erste Schritte',es:'Primeros pasos',nl:'Aan de slag',it:'Per iniziare',fr:'Premiers pas',ru:'С чего начать',tr:'Başlangıç'},
 'Select an unlocked dungeon. Solo fills the missing party roles with NPC or Echo allies; Live pairs you with other adventurers. A party has one Tank, two Damage and one Support. Choose an eligible difficulty and prepare your loadout.':{
  de:'Wähle einen freigeschalteten Dungeon. Im Solo-Modus füllen NPCs oder Echos fehlende Rollen; Live verbindet dich mit anderen Spielern. Eine Gruppe besteht aus einem Tank, zwei Schadensausteilern und einem Support. Wähle eine zulässige Schwierigkeit und bereite deine Ausrüstung vor.',
  es:'Elige una mazmorra desbloqueada. En Solo, los PNJ o Ecos cubren los roles vacantes; en Vivo, juegas con otros aventureros. El grupo tiene un tanque, dos personajes de daño y un apoyo. Elige una dificultad válida y prepara tu equipo.',
  nl:'Kies een ontgrendelde kerker. Solo vult ontbrekende rollen met NPC- of Echo-bondgenoten; Live koppelt je aan andere avonturiers. Een groep heeft één tank, twee schade-aanrichters en één ondersteuning. Kies een beschikbare moeilijkheid en bereid je uitrusting voor.',
  it:'Scegli un dungeon sbloccato. In Solo i PNG o gli Echi completano i ruoli mancanti; in Live giochi con altri avventurieri. Il gruppo ha un tank, due assaltatori e un supporto. Scegli una difficoltà accessibile e prepara l’equipaggiamento.',
  fr:'Choisissez un donjon débloqué. En Solo, des PNJ ou Échos complètent les rôles manquants ; en Live, vous jouez avec d’autres aventuriers. Une équipe comprend un tank, deux attaquants et un soutien. Choisissez un niveau accessible et préparez votre équipement.',
  ru:'Выберите открытое подземелье. В одиночном режиме недостающие роли займут NPC или Эхо; в режиме Live вы играете с другими. В группе один танк, два бойца и один персонаж поддержки. Выберите доступную сложность и подготовьте снаряжение.',
  tr:'Kilidi açık bir zindan seç. Solo modunda eksik rolleri NPC veya Yankı müttefikleri doldurur; Canlı modda diğer oyuncularla oynarsın. Grupta bir tank, iki hasar ve bir destek bulunur. Uygun zorluğu seçip donanımını hazırla.',
 },
 'Rooms and routes':{de:'Räume und Routen',es:'Salas y rutas',nl:'Kamers en routes',it:'Stanze e percorsi',fr:'Salles et itinéraires',ru:'Комнаты и маршруты',tr:'Odalar ve rotalar'},
 'Each expedition follows branching rooms toward a final boss. Battles, elites, shrines, camps, events and treasure bring different risks and rewards. In Solo you choose the route; in Live the party votes.':{
  de:'Jede Expedition führt durch verzweigte Räume zum Endboss. Kämpfe, Elitegegner, Schreine, Lager, Ereignisse und Schätze bieten unterschiedliche Risiken und Belohnungen. Solo wählst du die Route; Live stimmt die Gruppe ab.',
  es:'Cada expedición atraviesa salas con rutas alternativas hasta el jefe final. Combates, élites, santuarios, campamentos, eventos y tesoros ofrecen distintos riesgos y recompensas. En Solo eliges la ruta; en Vivo vota el grupo.',
  nl:'Elke expeditie volgt vertakkende kamers richting een eindbaas. Gevechten, elites, heiligdommen, kampen, gebeurtenissen en schatten hebben verschillende risico’s en beloningen. In Solo kies jij; in Live stemt de groep.',
  it:'Ogni spedizione attraversa stanze ramificate fino al boss finale. Battaglie, élite, santuari, accampamenti, eventi e tesori offrono rischi e ricompense diversi. In Solo scegli tu; in Live vota il gruppo.',
  fr:'Chaque expédition traverse des salles à embranchements jusqu’au boss final. Combats, élites, sanctuaires, camps, événements et trésors offrent divers risques et récompenses. En Solo vous choisissez ; en Live, le groupe vote.',
  ru:'Каждая экспедиция проходит по разветвлённым комнатам к финальному боссу. Бои, элитные враги, святилища, лагеря, события и сокровища дают разные риски и награды. В Solo маршрут выбираете вы, в Live группа голосует.',
  tr:'Her sefer, son patrona giden dallanan odalardan oluşur. Savaşlar, seçkin düşmanlar, tapınaklar, kamplar, etkinlikler ve hazineler farklı riskler ve ödüller sunar. Solo modunda rotayı sen seçersin; Canlı modda grup oy verir.',
 },
 'What are boons?':{de:'Was sind Segen?',es:'¿Qué son las bendiciones?',nl:'Wat zijn zegeningen?',it:'Cosa sono le benedizioni?',fr:'Que sont les bénédictions ?',ru:'Что такое благословения?',tr:'Lütuflar nedir?'},
 'Boons are temporary run benefits. Battle Focus gives +5% party attack power for the rest of the run; Stalwart Guard gives +5% party defense. Second Wind restores 20% max HP to allies and revives downed allies.':{
  de:'Segen wirken nur während des aktuellen Durchlaufs. Kampffokus gewährt der Gruppe +5 % Angriffskraft bis zum Ende; Standhafte Wache gibt +5 % Verteidigung. Zweiter Atem stellt Verbündeten 20 % ihrer maximalen LP wieder her und belebt Gefallene wieder.',
  es:'Las bendiciones son ventajas temporales. Enfoque de batalla da +5 % de ataque al grupo durante el resto de la partida; Guardia firme da +5 % de defensa. Segundo aliento restaura un 20 % de la salud máxima y revive a los aliados caídos.',
  nl:'Zegeningen zijn tijdelijke voordelen. Battle Focus geeft de groep +5% aanvalskracht voor de rest van de run; Stalwart Guard geeft +5% verdediging. Second Wind herstelt 20% van de maximale HP en wekt gevallen bondgenoten.',
  it:'Le benedizioni sono bonus temporanei. Concentrazione bellica dà +5% all’attacco del gruppo per il resto della spedizione; Guardia salda dà +5% alla difesa. Secondo vento ripristina il 20% dei PF massimi e rianima gli alleati caduti.',
  fr:'Les bénédictions offrent des bonus temporaires. Concentration donne +5 % d’attaque au groupe jusqu’à la fin ; Garde inébranlable donne +5 % de défense. Second souffle rend 20 % des PV maximum et ranime les alliés à terre.',
  ru:'Благословения дают временные бонусы. Боевой настрой повышает атаку группы на 5 % до конца забега; Стойкая защита повышает защиту на 5 %. Второе дыхание восстанавливает 20 % максимального здоровья и поднимает павших союзников.',
  tr:'Lütuflar geçici avantajlardır. Savaş Odağı kalan sefer boyunca gruba %5 saldırı gücü; Sağlam Savunma %5 savunma verir. İkinci Nefes, azami canın %20’sini yeniler ve düşen müttefikleri diriltir.',
 },
 'What are artifacts?':{de:'Was sind Artefakte?',es:'¿Qué son los artefactos?',nl:'Wat zijn artefacten?',it:'Cosa sono gli artefatti?',fr:'Que sont les artefacts ?',ru:'Что такое артефакты?',tr:'Eserler nedir?'},
 'Artifacts are special items found during an expedition. Their effects trigger during combat. They are run-only relics, not permanent equipment, and do not carry over to another dungeon run.':{
  de:'Artefakte sind besondere Gegenstände aus einer Expedition. Ihre Effekte werden im Kampf ausgelöst. Sie gelten nur für diesen Durchlauf, sind keine dauerhafte Ausrüstung und werden nicht in den nächsten Dungeon übernommen.',
  es:'Los artefactos son objetos especiales que encuentras durante una expedición. Sus efectos se activan en combate. Solo sirven en esa partida: no son equipo permanente ni pasan a la siguiente mazmorra.',
  nl:'Artefacten zijn speciale voorwerpen die je tijdens een expeditie vindt. Hun effecten activeren in gevechten. Ze gelden alleen voor die run, zijn geen permanente uitrusting en gaan niet mee naar de volgende kerker.',
  it:'Gli artefatti sono oggetti speciali trovati durante una spedizione. I loro effetti si attivano in combattimento. Valgono solo per quella spedizione, non sono equipaggiamento permanente e non si trasferiscono al dungeon successivo.',
  fr:'Les artefacts sont des objets spéciaux trouvés durant une expédition. Leurs effets se déclenchent en combat. Ils ne durent que le temps de cette tentative : ce ne sont pas des équipements permanents et ils ne sont pas conservés.',
  ru:'Артефакты — особые предметы, найденные в экспедиции. Их эффекты срабатывают в бою. Они действуют только в текущем забеге, не являются постоянным снаряжением и не переносятся в следующий забег.',
  tr:'Eserler sefer sırasında bulunan özel eşyalardır. Etkileri savaşta tetiklenir. Yalnızca mevcut seferde geçerlidir; kalıcı ekipman değildir ve sonraki zindana taşınmaz.',
 },
 'Supplies and survival':{de:'Vorräte und Überleben',es:'Suministros y supervivencia',nl:'Voorraad en overleven',it:'Scorte e sopravvivenza',fr:'Provisions et survie',ru:'Припасы и выживание',tr:'Malzemeler ve hayatta kalma'},
 'Prepare one dungeon tonic before the first room. It lasts for the run and is consumed even if you fail. Dungeon healing potions are limited, food is disabled, and your party carries HP between rooms. Watch boss casts and objectives.':{
  de:'Bereite vor dem ersten Raum ein Dungeon-Tonikum vor. Es hält den ganzen Durchlauf und wird auch bei einer Niederlage verbraucht. Heiltränke sind begrenzt, Essen ist deaktiviert, und die Gruppe behält ihre LP zwischen Räumen. Achte auf Bosszauber und Ziele.',
  es:'Prepara un tónico antes de la primera sala. Dura toda la partida y se consume aunque fracases. Las pociones curativas están limitadas, la comida está desactivada y el grupo conserva la salud entre salas. Vigila los hechizos y objetivos del jefe.',
  nl:'Bereid vóór de eerste kamer één kerkertonic voor. Die werkt de hele run en wordt ook bij mislukking verbruikt. Genezingsdrankjes zijn beperkt, voedsel werkt niet en de groep houdt HP tussen kamers. Let op spreuken en doelen van de baas.',
  it:'Prepara un tonico prima della prima stanza. Dura per tutta la spedizione e si consuma anche in caso di sconfitta. Le pozioni curative sono limitate, il cibo è disattivato e il gruppo mantiene i PF tra le stanze. Segui gli incantesimi e gli obiettivi del boss.',
  fr:'Préparez un tonique avant la première salle. Il dure toute la tentative et est consommé même en cas d’échec. Les potions sont limitées, la nourriture est désactivée et l’équipe conserve ses PV entre les salles. Surveillez les attaques annoncées et les objectifs du boss.',
  ru:'Подготовьте один тоник до первой комнаты. Он действует весь забег и расходуется даже при поражении. Лечебные зелья ограничены, еда отключена, а здоровье группы сохраняется между комнатами. Следите за приёмами и задачами босса.',
  tr:'İlk odadan önce bir zindan toniği hazırla. Sefer boyunca sürer ve başarısız olsan da tüketilir. Şifa iksirleri sınırlıdır, yiyecekler kullanılamaz ve grubun canı odalar arasında korunur. Patron yeteneklerini ve hedeflerini izle.',
 },
 'Rewards and marks':{de:'Belohnungen und Marken',es:'Recompensas y marcas',nl:'Beloningen en zegels',it:'Ricompense e marchi',fr:'Récompenses et marques',ru:'Награды и знаки',tr:'Ödüller ve nişanlar'},
 'Combat and successful clears can award Expedition Marks, equipment and regional boss loot. The Dungeon Shop offers collectibles and eligible crafting resource bundles. Reward charges and weekly bonuses are shown in dungeon details.':{
  de:'Kämpfe und erfolgreiche Abschlüsse können Expeditionsmarken, Ausrüstung und regionale Bossbeute geben. Im Dungeon-Shop gibt es Sammlerstücke und freigeschaltete Materialpakete. Belohnungsaufladungen und Wochenboni stehen in den Dungeondetails.',
  es:'Los combates y las victorias pueden otorgar marcas de expedición, equipo y botín de jefes regionales. La tienda ofrece coleccionables y lotes de materiales desbloqueados. Las cargas de recompensa y los bonos semanales aparecen en los detalles.',
  nl:'Gevechten en succesvolle runs kunnen Expeditiemarken, uitrusting en regionale baasbuit opleveren. De kerkerwinkel biedt verzamelobjecten en ontgrendelde grondstofbundels. Beloningsladingen en weekbonussen staan bij de details.',
  it:'I combattimenti e le vittorie possono dare Marchi spedizione, equipaggiamento e bottino dei boss regionali. Il negozio offre collezionabili e pacchetti di risorse sbloccati. Cariche ricompensa e bonus settimanali sono nei dettagli.',
  fr:'Les combats et les victoires peuvent donner des marques d’expédition, de l’équipement et du butin de boss régionaux. La boutique propose des objets de collection et des lots de ressources débloqués. Les charges et bonus hebdomadaires figurent dans les détails.',
  ru:'Бои и успешные прохождения могут дать знаки экспедиции, снаряжение и добычу региональных боссов. В магазине есть коллекционные предметы и открытые наборы ресурсов. Заряды наград и недельные бонусы показаны в сведениях о подземелье.',
  tr:'Savaşlar ve başarılı tamamlamalar Sefer Nişanları, ekipman ve bölgesel patron ganimeti verebilir. Zindan mağazasında koleksiyon eşyaları ve kilidi açılmış kaynak paketleri vardır. Ödül hakları ve haftalık bonuslar ayrıntılarda gösterilir.',
 },
 'Bosses and difficulty':{de:'Bosse und Schwierigkeit',es:'Jefes y dificultad',nl:'Bazen en moeilijkheid',it:'Boss e difficoltà',fr:'Boss et difficulté',ru:'Боссы и сложность',tr:'Patronlar ve zorluk'},
 'Regional dungeons have up to three difficulty tiers with level and Combat Power requirements. Each regional dungeon has two possible bosses, each with distinct loot and a 50% appearance chance. Event dungeons have their own tiers and rewards.':{
  de:'Regionale Dungeons haben bis zu drei Schwierigkeitsstufen mit Level- und Kampfkraft-Anforderungen. Jeder hat zwei mögliche Bosse mit eigener Beute und je 50 % Chance. Event-Dungeons haben eigene Stufen und Belohnungen.',
  es:'Las mazmorras regionales tienen hasta tres dificultades con requisitos de nivel y poder de combate. Cada una tiene dos posibles jefes con botín diferente y un 50 % de probabilidad cada uno. Las mazmorras de evento tienen sus propios niveles y recompensas.',
  nl:'Regionale kerkers hebben maximaal drie moeilijkheden met eisen voor level en gevechtskracht. Elke kerker heeft twee mogelijke bazen met eigen buit, elk met 50% kans. Evenementkerkers hebben eigen niveaus en beloningen.',
  it:'I dungeon regionali hanno fino a tre difficoltà con requisiti di livello e potenza. Ognuno ha due boss possibili, con bottino distinto e probabilità del 50% ciascuno. I dungeon evento hanno difficoltà e ricompense proprie.',
  fr:'Les donjons régionaux ont jusqu’à trois niveaux avec des exigences de niveau et de puissance. Chacun possède deux boss possibles, au butin distinct et avec 50 % de chances chacun. Les donjons événementiels ont leurs propres niveaux et récompenses.',
  ru:'У региональных подземелий до трёх уровней сложности с требованиями к уровню и боевой мощи. У каждого два возможных босса с отдельной добычей и шансом появления 50 % у каждого. У событий свои уровни и награды.',
  tr:'Bölgesel zindanların seviye ve Savaş Gücü şartları olan en fazla üç zorluğu bulunur. Her zindanda farklı ganimeti olan iki olası patron vardır; her birinin gelme olasılığı %50’dir. Etkinlik zindanlarının zorlukları ve ödülleri ayrıdır.',
 },
 'Boons and artifacts only affect the current dungeon run. They do not permanently increase your character power. Room outcomes are confirmed by the server.':{
  de:'Segen und Artefakte gelten nur für den aktuellen Dungeon-Durchlauf. Sie erhöhen deine Charakterstärke nicht dauerhaft. Raumergebnisse werden vom Server bestätigt.',
  es:'Las bendiciones y artefactos solo afectan a la partida actual. No aumentan permanentemente el poder del personaje. El servidor confirma los resultados de cada sala.',
  nl:'Zegeningen en artefacten gelden alleen tijdens de huidige kerker. Ze verhogen je personagekracht niet permanent. De server bevestigt de resultaten per kamer.',
  it:'Benedizioni e artefatti valgono solo per la spedizione corrente. Non aumentano permanentemente la potenza del personaggio. I risultati delle stanze sono confermati dal server.',
  fr:'Les bénédictions et artefacts ne servent que pendant la tentative en cours. Ils n’augmentent pas la puissance permanente. Les résultats des salles sont validés par le serveur.',
  ru:'Благословения и артефакты действуют только в текущем забеге. Они не повышают силу персонажа навсегда. Результаты комнат подтверждаются сервером.',
  tr:'Lütuflar ve eserler yalnızca mevcut zindan seferini etkiler. Karakter gücünü kalıcı olarak artırmazlar. Oda sonuçları sunucu tarafından onaylanır.',
 },
 'Choose your party':{de:'Wähle deine Gruppe',es:'Elige tu grupo',nl:'Kies je groep',it:'Scegli il gruppo',fr:'Choisissez votre équipe',ru:'Выберите группу',tr:'Grubunu seç'},
 'Regional dungeons':{de:'Regionale Dungeons',es:'Mazmorras regionales',nl:'Regionale kerkers',it:'Dungeon regionali',fr:'Donjons régionaux',ru:'Региональные подземелья',tr:'Bölgesel zindanlar'},
 'Dungeon guide':{de:'Dungeon-Hilfe',es:'Guía de mazmorras',nl:'Kerkergids',it:'Guida ai dungeon',fr:'Guide des donjons',ru:'Руководство по подземельям',tr:'Zindan rehberi'},
 'Next topic':{de:'Nächstes Thema',es:'Siguiente tema',nl:'Volgend onderwerp',it:'Argomento successivo',fr:'Sujet suivant',ru:'Следующая тема',tr:'Sonraki konu'},
 'Previous topic':{de:'Vorheriges Thema',es:'Tema anterior',nl:'Vorig onderwerp',it:'Argomento precedente',fr:'Sujet précédent',ru:'Предыдущая тема',tr:'Önceki konu'},
 'Finish guide':{de:'Guide abschließen',es:'Terminar guía',nl:'Gids afronden',it:'Termina guida',fr:'Terminer le guide',ru:'Завершить руководство',tr:'Rehberi bitir'},
 'Step {current} of {total}':{de:'Schritt {current} von {total}',es:'Paso {current} de {total}',nl:'Stap {current} van {total}',it:'Passo {current} di {total}',fr:'Étape {current} sur {total}',ru:'Шаг {current} из {total}',tr:'Adım {current} / {total}'},
 'Open dungeon guide':{de:'Dungeon-Hilfe öffnen',es:'Abrir guía de mazmorras',nl:'Kerkergids openen',it:'Apri guida ai dungeon',fr:'Ouvrir le guide des donjons',ru:'Открыть руководство по подземельям',tr:'Zindan rehberini aç'},
};
export function dungeonGuideText(language:Language,value:string):string{return rows[value]?.[language]??value;}
