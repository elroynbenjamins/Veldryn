import type {Language} from './languages';

/** Season-specific room choices, reviewed against authored EVENT_EXPEDITIONS special nodes. */
export const SEASONAL_ROOM_TITLE_ROWS={
  "Champion's Trial": [
    "Prüfung des Champions",
    "Prueba del campeón",
    "Proef van de kampioen",
    "Prova del campione",
    "Épreuve du champion",
    "Испытание чемпиона",
    "Şampiyonun Sınavı"
  ],
  "Honor the Sun Shrine": [
    "Ehre den Sonnenschrein",
    "Honra el santuario solar",
    "Eer het zonneheiligdom",
    "Onora il santuario solare",
    "Honorer le sanctuaire solaire",
    "Почтить святилище Солнца",
    "Güneş Tapınağı'nı Onurlandır"
  ],
  "Take the Crowd Challenge": [
    "Nimm die Herausforderung der Menge an",
    "Acepta el desafío del público",
    "Ga de uitdaging van het publiek aan",
    "Accetta la sfida della folla",
    "Relever le défi de la foule",
    "Принять вызов толпы",
    "Kalabalığın Meydan Okumasını Kabul Et"
  ],
  "Take the Daring Sea Route": [
    "Wähle die gewagte Seeroute",
    "Toma la arriesgada ruta marítima",
    "Neem de gewaagde zeeroute",
    "Prendi l'audace rotta marina",
    "Prendre la route maritime risquée",
    "Выбрать опасный морской путь",
    "Tehlikeli Deniz Rotasına Gir"
  ],
  "Recover the Champion Laurels": [
    "Birg die Lorbeeren des Champions",
    "Recupera los laureles del campeón",
    "Vind de lauwerkrans van de kampioen",
    "Recupera gli allori del campione",
    "Récupérer les lauriers du champion",
    "Вернуть лавры чемпиона",
    "Şampiyonun Defne Çelengini Geri Al"
  ],
  "Defeat the Shoreline Colossus": [
    "Besiege den Küstenkoloss",
    "Derrota al coloso costero",
    "Versla de kustkolos",
    "Sconfiggi il colosso costiero",
    "Vaincre le colosse du rivage",
    "Победить прибрежного колосса",
    "Kıyı Devi'ni Yen"
  ],
  "Anchor the Meteor Tear": [
    "Verankere den Meteorriss",
    "Ancla la grieta meteórica",
    "Veranker de meteorscheur",
    "Ancora lo squarcio meteoritico",
    "Ancrer la déchirure météorique",
    "Закрепить метеоритный разлом",
    "Meteor Yırtığını Sabitle"
  ],
  "Cross the Meteor Surge": [
    "Durchquere den Meteorschwall",
    "Cruza la oleada meteórica",
    "Doorkruis de meteorengolf",
    "Attraversa l'ondata meteoritica",
    "Traverser la vague météorique",
    "Пересечь метеоритный поток",
    "Meteor Dalgasını Aş"
  ],
  "Align the Star Shrine": [
    "Richte den Sternenschrein aus",
    "Alinea el santuario estelar",
    "Lijn het sterrenheiligdom uit",
    "Allinea il santuario stellare",
    "Aligner le sanctuaire stellaire",
    "Настроить звёздное святилище",
    "Yıldız Tapınağı'nı Hizala"
  ],
  "Break the Riftbound Herald": [
    "Besiege den rissgebundenen Herold",
    "Derrota al heraldo de la grieta",
    "Versla de aan de scheur gebonden heraut",
    "Sconfiggi l'araldo del varco",
    "Vaincre le héraut lié à la faille",
    "Победить вестника разлома",
    "Yarığa Bağlı Habercinin Direncini Kır"
  ],
  "Seal a Minor Rift": [
    "Versiegle einen kleinen Riss",
    "Sella una grieta menor",
    "Verzegel een kleine scheur",
    "Sigilla un varco minore",
    "Sceller une faille mineure",
    "Запечатать малый разлом",
    "Küçük Bir Yarığı Mühürle"
  ],
  "Cross the Void Bridge": [
    "Überquere die Leerenbrücke",
    "Cruza el puente del vacío",
    "Steek de leegtebrug over",
    "Attraversa il ponte del vuoto",
    "Traverser le pont du Néant",
    "Пересечь мост Пустоты",
    "Boşluk Köprüsü'nü Aş"
  ],
  "Rest at the Observatory": [
    "Raste am Observatorium",
    "Descansa en el observatorio",
    "Rust bij het observatorium",
    "Riposa all'osservatorio",
    "Se reposer à l'observatoire",
    "Отдохнуть в обсерватории",
    "Gözlemevinde Dinlen"
  ],
  "Destroy the Meteoric Sentinel": [
    "Vernichte den Meteorschildwächter",
    "Destruye al centinela meteórico",
    "Vernietig de meteoorwachter",
    "Distruggi la sentinella meteoritica",
    "Détruire la sentinelle météorique",
    "Уничтожить метеоритного стража",
    "Meteor Nöbetçisini Yok Et"
  ],
  "Stabilize the Rift Gate": [
    "Stabilisiere das Risstor",
    "Estabiliza la puerta de la grieta",
    "Stabiliseer de scheurpoort",
    "Stabilizza il portale del varco",
    "Stabiliser la porte de la faille",
    "Стабилизировать врата разлома",
    "Yarık Kapısını Sabitle"
  ],
  "Rush the Rift Nexus": [
    "Stürme zum Rissnexus",
    "Corre hacia el nexo de la grieta",
    "Storm naar de scheurnexus",
    "Corri verso il nodo del varco",
    "Foncer vers le nexus de la faille",
    "Устремиться к узлу разлома",
    "Yarık Merkezi'ne Atıl"
  ],
  "Relight the Lantern Ward": [
    "Entzünde die Schutzlaterne erneut",
    "Reenciende el farol protector",
    "Steek de beschermlantaarn opnieuw aan",
    "Riaccendi la lanterna protettiva",
    "Rallumer la lanterne protectrice",
    "Вновь зажечь защитный фонарь",
    "Koruma Fenerini Yeniden Yak"
  ],
  "Take the Gloam Shortcut": [
    "Nimm die Gloam-Abkürzung",
    "Toma el atajo del Ocaso",
    "Neem de Gloam-kortere weg",
    "Prendi la scorciatoia del Crepuscolo",
    "Prendre le raccourci du Crépuscule",
    "Воспользоваться тропой Мрака",
    "Kasvet Kestirmesine Gir"
  ],
  "Consecrate the Hollow Chapel": [
    "Weihe die Leere Kapelle",
    "Consagra la capilla hueca",
    "Wijd de holle kapel in",
    "Consacra la cappella cava",
    "Consacrer la chapelle creuse",
    "Освятить Пустую часовню",
    "Issız Şapeli Kutsallaştır"
  ],
  "Clear the Lantern-Eater Nest": [
    "Säubere das Nest der Laternenfresser",
    "Despeja el nido de devorafaroles",
    "Ruim het nest van lantaarneters op",
    "Ripulisci il nido dei mangialanterne",
    "Nettoyer le nid des dévoreurs de lanternes",
    "Зачистить гнездо пожирателей фонарей",
    "Fener Yiyenlerin Yuvasını Temizle"
  ],
  "Restore the Street Lantern Chain": [
    "Stelle die Straßenlaternenkette wieder her",
    "Restaura la cadena de faroles",
    "Herstel de reeks straatlantaarns",
    "Ripristina la catena di lanterne stradali",
    "Rétablir la chaîne de lanternes",
    "Восстановить цепь уличных фонарей",
    "Sokak Fenerleri Zincirini Onar"
  ],
  "Cross Blackout Alley": [
    "Durchquere die finstere Gasse",
    "Cruza el callejón a oscuras",
    "Steek de verduisterde steeg over",
    "Attraversa il vicolo buio",
    "Traverser l'allée plongée dans le noir",
    "Пересечь Тёмный переулок",
    "Karanlık Sokağı Aş"
  ],
  "Rest at the Keeper's Refuge": [
    "Raste in der Zuflucht des Hüters",
    "Descansa en el refugio del guardián",
    "Rust in het toevluchtsoord van de bewaker",
    "Riposa al rifugio del custode",
    "Se reposer au refuge du gardien",
    "Отдохнуть в убежище хранителя",
    "Muhafızın Sığınağında Dinlen"
  ],
  "Break the Hollow Warden Patrol": [
    "Zerschlage die Patrouille der Leerenwächter",
    "Desbarata la patrulla de guardianes huecos",
    "Versla de patrouille van holle wachters",
    "Sconfiggi la pattuglia dei guardiani cavi",
    "Briser la patrouille des gardiens creux",
    "Разгромить патруль Пустых стражей",
    "Issız Muhafız Devriyesini Dağıt"
  ],
  "Repair the Damaged Wagons": [
    "Repariere die beschädigten Wagen",
    "Repara los carros dañados",
    "Repareer de beschadigde wagens",
    "Ripara i carri danneggiati",
    "Réparer les chariots endommagés",
    "Починить повреждённые повозки",
    "Hasarlı Arabaları Onar"
  ],
  "Stop at the Guild Supply Wagon": [
    "Halte am Gildenversorgungswagen",
    "Detente en el carro de suministros del gremio",
    "Stop bij de bevoorradingswagen van de gilde",
    "Fermati al carro rifornimenti della gilda",
    "Faire halte au chariot de ravitaillement de guilde",
    "Остановиться у обозной повозки гильдии",
    "Lonca İkmal Arabasında Dur"
  ],
  "Form a Caravan Escort": [
    "Stelle einen Karawanengeleitschutz auf",
    "Forma una escolta para la caravana",
    "Stel een karavaanescorte samen",
    "Forma una scorta per la carovana",
    "Former une escorte de caravane",
    "Собрать охрану каравана",
    "Kervan Eskortu Oluştur"
  ],
  "Take the Unsafe Toll Road": [
    "Nimm die unsichere Zollstraße",
    "Toma el camino de peaje peligroso",
    "Neem de onveilige tolweg",
    "Prendi la strada a pedaggio pericolosa",
    "Emprunter la route à péage dangereuse",
    "Выбрать опасную платную дорогу",
    "Tehlikeli Ücretli Yola Gir"
  ],
  "Fortify the Guard Camp": [
    "Verstärke das Wachlager",
    "Fortifica el campamento de guardia",
    "Versterk het wachterskamp",
    "Fortifica l'accampamento delle guardie",
    "Fortifier le camp des gardes",
    "Укрепить сторожевой лагерь",
    "Muhafız Kampını Güçlendir"
  ],
  "Break the Iron Tollkeeper Ambush": [
    "Zerschlage den Hinterhalt des Eisenzöllners",
    "Desbarata la emboscada del cobrador de hierro",
    "Verijdel de hinderlaag van de ijzeren tolwachter",
    "Sventa l'imboscata dell'esattore di ferro",
    "Déjouer l'embuscade du percepteur de fer",
    "Сорвать засаду Железного сборщика пошлин",
    "Demir Geçiş Görevlisinin Pusunu Boz"
  ],
  "Resupply at the Guild Quarter": [
    "Versorge dich im Gildenviertel",
    "Reabastécete en el barrio del gremio",
    "Bevoorraad je in het gildekwartier",
    "Rifornisciti nel quartiere della gilda",
    "Se ravitailler au quartier de guilde",
    "Пополнить припасы в квартале гильдии",
    "Lonca Mahallesinde İkmal Yap"
  ],
  "Secure the Final Tollgate": [
    "Sichere die letzte Zollstation",
    "Asegura el último puesto de peaje",
    "Beveilig de laatste tolpoort",
    "Metti in sicurezza l'ultimo casello",
    "Sécuriser le dernier péage",
    "Обезопасить последнюю заставу",
    "Son Geçiş Kapısını Güvenceye Al"
  ]
} as const;
