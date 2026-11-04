import type {Language} from './languages';

/**
 * Localizes only an exact, server-authored Guild Quest title/description pair from
 * the reviewed five-slot board's base, special and extended pools.
 *
 * Never process free-form player text here. Unknown or subsequently revised server
 * strings remain unchanged so clients cannot misstate objectives.
 */
export const AUTHORED_GUILD_QUEST_COPY=[
  {
    "family": "combat_front",
    "title": [
      "Guild Vanguard",
      "Gildenvorhut",
      "Vanguardia del gremio",
      "Gildevoorhoede",
      "Avanguardia della gilda",
      "Avant-garde de la guilde",
      "Авангард гильдии",
      "Lonca Öncüleri"
    ],
    "description": [
      "Contribute through verified combat play.",
      "Trage durch bestätigte Kämpfe bei.",
      "Contribuye mediante combates verificados.",
      "Draag bij via geverifieerde gevechten.",
      "Contribuisci con combattimenti verificati.",
      "Contribuez grâce aux combats validés.",
      "Вносите вклад, участвуя в подтверждённых боях.",
      "Doğrulanmış savaşlarla katkıda bulun."
    ]
  },
  {
    "family": "skilling_drive",
    "title": [
      "Supply the Guild",
      "Versorge die Gilde",
      "Abastece al gremio",
      "Bevoorraad de gilde",
      "Rifornisci la gilda",
      "Approvisionner la guilde",
      "Снабжение гильдии",
      "Loncayı Tedarik Et"
    ],
    "description": [
      "Contribute through verified gathering, processing and crafting.",
      "Trage durch bestätigtes Sammeln, Verarbeiten und Herstellen bei.",
      "Contribuye mediante recolección, procesamiento y fabricación verificados.",
      "Draag bij via geverifieerd verzamelen, verwerken en maken.",
      "Contribuisci con raccolta, lavorazione e creazione verificate.",
      "Contribuez par la récolte, la transformation et la fabrication validées.",
      "Вносите вклад подтверждённым сбором, переработкой и изготовлением.",
      "Doğrulanmış toplama, işleme ve üretimle katkıda bulun."
    ]
  },
  {
    "family": "special",
    "title": [
      "Cast & Quarry",
      "Angel & Steinbruch",
      "Pesca y cantera",
      "Hengel en groeve",
      "Pesca e cava",
      "Pêche et carrière",
      "Рыбалка и карьер",
      "Olta ve Ocak"
    ],
    "description": [
      "Fish and mine to complete this combined Guild objective.",
      "Angle und baue Erze ab, um dieses kombinierte Gildenziel zu erfüllen.",
      "Pesca y extrae minerales para completar este objetivo combinado.",
      "Vis en mijn grondstoffen om dit gecombineerde gildedoel te voltooien.",
      "Pesca ed estrai minerali per completare questo obiettivo combinato.",
      "Pêchez et minez pour remplir cet objectif commun de guilde.",
      "Ловите рыбу и добывайте руду ради общей цели гильдии.",
      "Birleşik lonca hedefi için balık tut ve maden çıkar."
    ]
  },
  {
    "family": "special",
    "title": [
      "River Run",
      "Flusslauf",
      "Ruta del río",
      "Riviertocht",
      "Lungo il fiume",
      "Au fil de l'eau",
      "Речной маршрут",
      "Nehir Rotası"
    ],
    "description": [
      "Complete Fishing actions through normal verified skilling.",
      "Erledige Angelaktionen durch normales bestätigtes Fertigkeitentraining.",
      "Completa acciones de pesca mediante la actividad verificada normal.",
      "Voltooi visacties via normale geverifieerde vaardigheidstraining.",
      "Completa azioni di pesca tramite normali attività verificate.",
      "Accomplissez des actions de pêche par des activités validées.",
      "Завершайте рыбалку через обычные подтверждённые действия.",
      "Normal doğrulanmış beceri etkinlikleriyle balıkçılık yap."
    ]
  },
  {
    "family": "special",
    "title": [
      "Deep Delve",
      "Tiefenschürfen",
      "Excavación profunda",
      "Diep delven",
      "Scavo profondo",
      "Fouille profonde",
      "Глубокая выработка",
      "Derin Kazı"
    ],
    "description": [
      "Complete Mining actions through normal verified skilling.",
      "Erledige Bergbauaktionen durch normales bestätigtes Fertigkeitentraining.",
      "Completa acciones de minería mediante la actividad verificada normal.",
      "Voltooi mijnbouwacties via normale geverifieerde vaardigheidstraining.",
      "Completa azioni minerarie tramite normali attività verificate.",
      "Accomplissez des actions de minage par des activités validées.",
      "Добывайте ресурсы обычными подтверждёнными действиями.",
      "Normal doğrulanmış beceri etkinlikleriyle maden çıkar."
    ]
  },
  {
    "family": "special",
    "title": [
      "Forest & Field",
      "Wald & Wiese",
      "Bosque y campo",
      "Bos en veld",
      "Bosco e campo",
      "Forêt et prairie",
      "Лес и поле",
      "Orman ve Tarla"
    ],
    "description": [
      "Split effort between Woodcutting and Herbalism.",
      "Teile die Arbeit zwischen Holzfällen und Kräuterkunde auf.",
      "Reparte el esfuerzo entre tala de árboles y herboristería.",
      "Verdeel je inzet tussen houthakken en kruidenkunde.",
      "Dividi lo sforzo tra taglio della legna ed erboristeria.",
      "Répartissez l'effort entre la coupe du bois et l'herboristerie.",
      "Распределите усилия между рубкой леса и травничеством.",
      "Çabayı Odunculuk ve Bitkicilik arasında paylaştır."
    ]
  },
  {
    "family": "special",
    "title": [
      "Workshop Shift",
      "Werkstattschicht",
      "Turno de taller",
      "Werkplaatsdienst",
      "Turno in officina",
      "Service à l'atelier",
      "Смена в мастерской",
      "Atölye Vardiyası"
    ],
    "description": [
      "Complete Smithing and Cooking actions for the Guild workshops.",
      "Schmiede und koche für die Gildenwerkstätten.",
      "Completa acciones de herrería y cocina para los talleres del gremio.",
      "Smeed en kook voor de gildewerkplaatsen.",
      "Completa azioni di forgiatura e cucina per le officine della gilda.",
      "Forgez et cuisinez pour les ateliers de la guilde.",
      "Занимайтесь кузнечным делом и готовкой для мастерских гильдии.",
      "Lonca atölyeleri için Demircilik ve Aşçılık yap."
    ]
  },
  {
    "family": "special",
    "title": [
      "Guild Circuit",
      "Gildenrunde",
      "Circuito del gremio",
      "Gilderonde",
      "Giro della gilda",
      "Circuit de guilde",
      "Маршрут гильдии",
      "Lonca Rotası"
    ],
    "description": [
      "Complete Fishing, Mining and Woodcutting actions across a varied Guild circuit.",
      "Angle, schürfe und fälle Holz auf einer abwechslungsreichen Gildenrunde.",
      "Completa pesca, minería y tala en un circuito variado del gremio.",
      "Vis, delf en hak hout tijdens een gevarieerde gilderonde.",
      "Completa pesca, estrazione e taglio della legna nel giro della gilda.",
      "Pêchez, minez et coupez du bois au fil d'un circuit de guilde.",
      "Ловите рыбу, добывайте руду и рубите лес на маршруте гильдии.",
      "Çeşitli lonca görevlerinde Balıkçılık, Madencilik ve Odunculuk yap."
    ]
  },
  {
    "family": "extended",
    "title": [
      "Monster Sweep",
      "Monsterjagd",
      "Barrido de monstruos",
      "Monsteropruiming",
      "Caccia ai mostri",
      "Chasse aux monstres",
      "Зачистка монстров",
      "Canavar Temizliği"
    ],
    "description": [
      "Defeat enemies through verified combat.",
      "Besiege Gegner in bestätigten Kämpfen.",
      "Derrota enemigos en combates verificados.",
      "Versla vijanden in geverifieerde gevechten.",
      "Sconfiggi nemici nei combattimenti verificati.",
      "Vainquez des ennemis lors de combats validés.",
      "Побеждайте врагов в подтверждённых боях.",
      "Doğrulanmış savaşlarda düşmanları yen."
    ]
  },
  {
    "family": "extended",
    "title": [
      "Dungeon Patrol",
      "Dungeonpatrouille",
      "Patrulla de mazmorra",
      "Kerkerpatrouille",
      "Pattuglia del dungeon",
      "Patrouille de donjon",
      "Патруль подземелий",
      "Zindan Devriyesi"
    ],
    "description": [
      "Complete Guild-eligible dungeon runs.",
      "Schließe Dungeondurchläufe ab, die für die Gilde zählen.",
      "Completa expediciones de mazmorra válidas para el gremio.",
      "Voltooi kerkerexpedities die meetellen voor de gilde.",
      "Completa spedizioni nei dungeon valide per la gilda.",
      "Terminez des donjons admissibles pour la guilde.",
      "Завершайте походы в подземелья, учитываемые гильдией.",
      "Lonca için uygun zindan seferlerini tamamla."
    ]
  },
  {
    "family": "extended",
    "title": [
      "Forge & Feast",
      "Schmiede & Schmaus",
      "Forja y festín",
      "Smidse en feestmaal",
      "Forgia e banchetto",
      "Forge et festin",
      "Ковка и пир",
      "Demirci ve Ziyafet"
    ],
    "description": [
      "Split completed actions between Smithing and Cooking.",
      "Verteile die erledigten Aktionen auf Schmieden und Kochen.",
      "Reparte las acciones entre herrería y cocina.",
      "Verdeel de voltooide acties over smeden en koken.",
      "Dividi le attività completate tra forgiatura e cucina.",
      "Répartissez les actions entre forge et cuisine.",
      "Распределите выполненные действия между кузнечным делом и готовкой.",
      "Tamamlanan eylemleri Demircilik ve Aşçılık arasında böl."
    ]
  },
  {
    "family": "extended",
    "title": [
      "Hunter-Gatherers",
      "Jäger & Sammler",
      "Cazadores y recolectores",
      "Jagers en verzamelaars",
      "Cacciatori e raccoglitori",
      "Chasseurs-cueilleurs",
      "Охотники и собиратели",
      "Avcı ve Toplayıcılar"
    ],
    "description": [
      "Defeat enemies and complete Woodcutting actions.",
      "Besiege Gegner und fälle Holz.",
      "Derrota enemigos y completa acciones de tala.",
      "Versla vijanden en hak hout.",
      "Sconfiggi nemici e completa azioni di taglio della legna.",
      "Vainquez des ennemis et coupez du bois.",
      "Побеждайте врагов и рубите лес.",
      "Düşmanları yen ve Odunculuk yap."
    ]
  },
  {
    "family": "extended",
    "title": [
      "River & Road",
      "Fluss & Pfad",
      "Río y camino",
      "Rivier en weg",
      "Fiume e strada",
      "Rivière et route",
      "Река и дорога",
      "Nehir ve Yol"
    ],
    "description": [
      "Fish while the Guild also defeats enemies.",
      "Angle, während deine Gilde auch Gegner besiegt.",
      "Pesca mientras el gremio también derrota enemigos.",
      "Vis terwijl de gilde ook vijanden verslaat.",
      "Pesca mentre la gilda sconfigge anche nemici.",
      "Pêchez pendant que la guilde vainc aussi des ennemis.",
      "Ловите рыбу, пока гильдия также побеждает врагов.",
      "Lonca düşmanları yenerken balık da tut."
    ]
  },
  {
    "family": "extended",
    "title": [
      "Delve & Defeat",
      "Schürfen & Siegen",
      "Excavar y vencer",
      "Delven en verslaan",
      "Scavare e sconfiggere",
      "Miner et vaincre",
      "Добыча и победа",
      "Kaz ve Yen"
    ],
    "description": [
      "Mine resources and complete dungeon runs.",
      "Baue Rohstoffe ab und schließe Dungeons ab.",
      "Extrae recursos y completa mazmorras.",
      "Delf grondstoffen en voltooi kerkers.",
      "Estrai risorse e completa dungeon.",
      "Minez des ressources et terminez des donjons.",
      "Добывайте ресурсы и завершайте походы в подземелья.",
      "Kaynak çıkar ve zindan seferlerini tamamla."
    ]
  },
  {
    "family": "extended",
    "title": [
      "Guild Work Order",
      "Gildenauftrag",
      "Orden del gremio",
      "Gildewerkorder",
      "Ordine della gilda",
      "Commande de la guilde",
      "Заказ гильдии",
      "Lonca İş Emri"
    ],
    "description": [
      "Complete a varied order of crafting, Fishing and Mining.",
      "Erledige einen gemischten Auftrag aus Herstellung, Angeln und Bergbau.",
      "Completa un encargo variado de fabricación, pesca y minería.",
      "Voltooi een gevarieerde opdracht met maken, vissen en mijnbouw.",
      "Completa un incarico vario di creazione, pesca ed estrazione.",
      "Remplissez une commande variée de fabrication, pêche et minage.",
      "Выполняйте разнообразный заказ по изготовлению, рыбалке и добыче руды.",
      "Üretim, Balıkçılık ve Madencilik içeren çeşitli bir işi tamamla."
    ]
  }
] as const;
type AuthoredQuestFamily=typeof AUTHORED_GUILD_QUEST_COPY[number]['family'];
const LOCALE_COLUMN:Record<Language,number>={en:0,de:1,es:2,nl:3,it:4,fr:5,ru:6,tr:7};
export function guildQuestAuthoredCopy(language:Language,questKey:string,title:string,description:string):{title:string;description:string}{
 const family:AuthoredQuestFamily|undefined=questKey==='combat_front'?'combat_front'
  :questKey==='skilling_drive'?'skilling_drive'
  :/^special_[1-3]$/.test(questKey)?'special'
  :/^extended_[1-3]$/.test(questKey)?'extended'
  :undefined;
 if(!family||language==='en')return {title,description};
 const match=AUTHORED_GUILD_QUEST_COPY.find(row=>row.family===family&&row.title[0]===title&&row.description[0]===description);
 if(!match)return {title,description};
 const index=LOCALE_COLUMN[language];
 return {title:match.title[index]??title,description:match.description[index]??description};
}
