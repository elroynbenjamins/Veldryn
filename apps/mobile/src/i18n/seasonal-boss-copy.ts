import type {Language} from './languages';

/** Only exact reviewed server-owned boss mechanics and combat names. */
export const SEASONAL_BOSS_LABEL_ROWS={
  "Chronicle Fractures": [
    "Chronikbrüche",
    "Fracturas de la crónica",
    "Kroniekbreuken",
    "Fratture della cronaca",
    "Fractures chronologiques",
    "Разломы хроники",
    "Kronik Çatlakları"
  ],
  "Severed Promises": [
    "Gebrochene Versprechen",
    "Promesas rotas",
    "Verbroken beloften",
    "Promesse infrante",
    "Promesses rompues",
    "Разорванные обещания",
    "Bozulmuş Sözler"
  ],
  "Feral Regrowth": [
    "Wildes Nachwachsen",
    "Rebrote salvaje",
    "Wilde hergroei",
    "Ricrescita selvaggia",
    "Repousse sauvage",
    "Дикое возрождение",
    "Yabani Yeniden Büyüme"
  ],
  "Champion’s Reception": [
    "Empfang des Champions",
    "Recepción del campeón",
    "Ontvangst van de kampioen",
    "Accoglienza del campione",
    "Accueil du champion",
    "Приём чемпиона",
    "Şampiyonun Karşılaması"
  ],
  "Open Rifts": [
    "Offene Risse",
    "Grietas abiertas",
    "Open scheuren",
    "Varchi aperti",
    "Failles ouvertes",
    "Открытые разломы",
    "Açık Yarıklar"
  ],
  "Blackout Cycle": [
    "Finsterniszyklus",
    "Ciclo de apagón",
    "Verduisteringscyclus",
    "Ciclo di oscuramento",
    "Cycle d'obscurité",
    "Цикл тьмы",
    "Karartma Döngüsü"
  ],
  "Plunder Attempts": [
    "Plünderungsversuche",
    "Intentos de saqueo",
    "Plunderpogingen",
    "Tentativi di saccheggio",
    "Tentatives de pillage",
    "Попытки разграбления",
    "Yağma Girişimleri"
  ],
  "Deep Freeze": [
    "Tieffrost",
    "Congelación profunda",
    "Diepe vorst",
    "Gelo profondo",
    "Gel profond",
    "Глубокая заморозка",
    "Derin Don"
  ],
  "Seasonal Boss": [
    "Saisonboss",
    "Jefe de temporada",
    "Seizoensbaas",
    "Boss stagionale",
    "Boss saisonnier",
    "Сезонный босс",
    "Sezon Bossu"
  ]
} as const;
export const SEASONAL_BOSS_NUMBERED_ROWS={
  "Chronicle Fracture": [
    "Chronikbruch",
    "Fractura de la crónica",
    "Kroniekbreuk",
    "Frattura della cronaca",
    "Fracture chronologique",
    "Разлом хроники",
    "Kronik Çatlağı"
  ],
  "Severed Promise": [
    "Gebrochenes Versprechen",
    "Promesa rota",
    "Verbroken belofte",
    "Promessa infranta",
    "Promesse rompue",
    "Разорванное обещание",
    "Bozulmuş Söz"
  ],
  "Feral Regrowth": [
    "Wildes Nachwachsen",
    "Rebrote salvaje",
    "Wilde hergroei",
    "Ricrescita selvaggia",
    "Repousse sauvage",
    "Дикое возрождение",
    "Yabani Yeniden Büyüme"
  ],
  "Open Rift": [
    "Offener Riss",
    "Grieta abierta",
    "Open scheur",
    "Varco aperto",
    "Faille ouverte",
    "Открытый разлом",
    "Açık Yarık"
  ],
  "Blackout": [
    "Finsternis",
    "Apagón",
    "Verduistering",
    "Oscuramento",
    "Obscurité",
    "Затмение",
    "Karartma"
  ],
  "Plunder Attempt": [
    "Plünderungsversuch",
    "Intento de saqueo",
    "Plunderpoging",
    "Tentativo di saccheggio",
    "Tentative de pillage",
    "Попытка разграбления",
    "Yağma Girişimi"
  ],
  "Deep Freeze": [
    "Tieffrost",
    "Congelación profunda",
    "Diepe vorst",
    "Gelo profondo",
    "Gel profond",
    "Глубокая заморозка",
    "Derin Don"
  ]
} as const;
export const SEASONAL_BOSS_MOVE_ROWS={
  "Crowd Disfavor": [
    "Missgunst der Menge",
    "Desaprobación del público",
    "Afkeuring van het publiek",
    "Sfavore della folla",
    "Désapprobation de la foule",
    "Недовольство толпы",
    "Kalabalığın Hoşnutsuzluğu"
  ],
  "Time Reversal": [
    "Zeitumkehr",
    "Reversión temporal",
    "Tijdomkering",
    "Inversione temporale",
    "Inversion du temps",
    "Обращение времени",
    "Zamanı Geri Sarma"
  ],
  "Feral Thornburst": [
    "Wilder Dornenausbruch",
    "Estallido de espinas salvajes",
    "Wilde doornenuitbarsting",
    "Esplosione di spine ferali",
    "Explosion d'épines sauvages",
    "Взрыв диких шипов",
    "Yabani Diken Patlaması"
  ],
  "Rift Collapse": [
    "Risskollaps",
    "Colapso de la grieta",
    "Instorting van de scheur",
    "Collasso del varco",
    "Effondrement de la faille",
    "Обрушение разлома",
    "Yarık Çöküşü"
  ],
  "Total Blackout": [
    "Völlige Finsternis",
    "Apagón total",
    "Totale verduistering",
    "Oscuramento totale",
    "Obscurité totale",
    "Полная тьма",
    "Tam Karartma"
  ],
  "Absolute Zero": [
    "Absoluter Nullpunkt",
    "Cero absoluto",
    "Absoluut nulpunt",
    "Zero assoluto",
    "Zéro absolu",
    "Абсолютный ноль",
    "Mutlak Sıfır"
  ]
} as const;
/** English-only source matches; dynamically generated new/changed summaries remain verbatim. */
export const SEASONAL_BOSS_SUMMARY_ROWS={
  "All Chronicle Fractures are sealed; The Last Hour loses its additional timeline eruptions.": [
    "Alle Chronikbrüche sind versiegelt; Die Letzte Stunde verliert ihre zusätzlichen Zeitausbrüche.",
    "Todas las fracturas de la crónica están selladas; La Última Hora pierde sus erupciones temporales adicionales.",
    "Alle kroniekbreuken zijn verzegeld; Het Laatste Uur verliest zijn extra tijduitbarstingen.",
    "Tutte le fratture della cronaca sono sigillate; L'Ultima Ora perde le eruzioni temporali aggiuntive.",
    "Toutes les fractures chronologiques sont scellées ; La Dernière Heure perd ses éruptions temporelles supplémentaires.",
    "Все разломы хроники запечатаны: Последний Час больше не вызывает дополнительные временные всплески.",
    "Tüm Kronik Çatlakları mühürlendi; Son Saat ek zaman patlamalarını kaybediyor."
  ],
  "All vows are restored: The Severed Vow cannot use its festival-wide Nova.": [
    "Alle Schwüre sind erneuert: Der Gebrochene Schwur kann seine festweite Nova nicht einsetzen.",
    "Se han restaurado todos los votos: El Voto Roto no puede usar su Nova que afecta a todo el festival.",
    "Alle geloften zijn hersteld: De Verbroken Gelofte kan zijn festivalbrede Nova niet gebruiken.",
    "Tutti i voti sono ripristinati: Il Voto Spezzato non può usare la sua Nova che colpisce l'intero festival.",
    "Tous les vœux sont restaurés : Le Serment Brisé ne peut plus utiliser sa Nova qui frappe tout le festival.",
    "Все клятвы восстановлены: Разорванная клятва не может использовать свою фестивальную Нову.",
    "Tüm yeminler yenilendi: Kopmuş Yemin, festivalin tamamını etkileyen Nova'sını kullanamaz."
  ],
  "All Heartroot knots are bound, suppressing the Thornheart Ancient’s extra regrowth enrages.": [
    "Alle Herzwurzelknoten sind gebunden; das zusätzliche Nachwachsen des Dornherz-Uralten wird unterdrückt.",
    "Todos los nudos de raíz del corazón están vinculados, lo que evita los enfurecimientos adicionales por rebrote del Ancestro Corazón de Espinas.",
    "Alle hartwortelknopen zijn gebonden, waardoor de extra hergroeiwoede van de Oude Doornhart wordt onderdrukt.",
    "Tutti i nodi della radice del cuore sono legati, sopprimendo le furie aggiuntive di ricrescita dell'Antico Cuorspina.",
    "Tous les nœuds de racine-cœur sont liés, empêchant les rages de repousse supplémentaires de l'Ancien Cœur-d'Épines.",
    "Все узлы сердечного корня связаны: дополнительные вспышки ярости Древнего Терносердца подавлены.",
    "Tüm Kalp Kökü düğümleri bağlandı; Dikenyürek Kadim'in ek yeniden büyüme öfkesi engellendi."
  ],
  "Aureon recognizes a complete Laurel set and fights an honorable duel without Solar Nova.": [
    "Aureon erkennt den vollständigen Lorbeerkranz an und kämpft ein ehrenhaftes Duell ohne Sonnen-Nova.",
    "Aureon reconoce el conjunto completo de laureles y lucha en un duelo honorable sin Nova solar.",
    "Aureon erkent de volledige lauwerkrans en vecht een eervol duel zonder Zonnenova.",
    "Aureon riconosce il set completo di allori e affronta un duello onorevole senza Nova solare.",
    "Aureon reconnaît la collection complète de lauriers et livre un duel honorable sans Nova solaire.",
    "Авреон признаёт полный набор лавров и сражается честно, без Солнечной Новы.",
    "Aureon tüm Defne Çelenklerini tanır ve Güneş Novası olmadan onurlu bir düelloya girer."
  ],
  "No Laurels: the crowd turns hostile, empowering a Crowd Disfavor phase and a stronger Solar Nova.": [
    "Keine Lorbeeren: Die Menge wird feindselig und verstärkt die Phase Missgunst der Menge sowie die Sonnen-Nova.",
    "Sin laureles: el público se vuelve hostil, lo que refuerza la fase Desaprobación del público y la Nova solar.",
    "Geen lauweren: het publiek wordt vijandig, waardoor de fase Afkeuring van het publiek en de Zonnenova sterker worden.",
    "Nessun alloro: la folla diventa ostile, potenziando la fase Sfavore della folla e la Nova solare.",
    "Aucun laurier : la foule devient hostile, renforçant la phase Désapprobation de la foule et la Nova solaire.",
    "Лавров нет: толпа становится враждебной, усиливая фазу Недовольства толпы и Солнечную Нову.",
    "Defne Çelengi yok: kalabalık düşmanlaşır, Kalabalığın Hoşnutsuzluğu aşamasını ve Güneş Novasını güçlendirir."
  ],
  "All three Rift Anchors are active; the Constellation Eater cannot trigger additional collapse phases.": [
    "Alle drei Rissanker sind aktiv; der Sternbildverschlinger kann keine zusätzlichen Einsturzphasen auslösen.",
    "Los tres anclajes de la grieta están activos; el Devorador de Constelaciones no puede activar fases adicionales de colapso.",
    "Alle drie scheurankers zijn actief; de Sterrenbeeldverslinder kan geen extra instortingsfasen veroorzaken.",
    "Tutte e tre le ancore del varco sono attive; il Divoratore di Costellazioni non può attivare ulteriori fasi di collasso.",
    "Les trois ancres de faille sont actives ; le Dévoreur de Constellations ne peut pas déclencher d'autres phases d'effondrement.",
    "Все три якоря разлома активны: Пожиратель созвездий не может запускать дополнительные фазы обрушения.",
    "Üç Yarık Çapası da etkin; Takımyıldız Yiyen ek çöküş aşamalarını tetikleyemez."
  ],
  "Every Ward Lantern is lit: Lantern Extinction is disabled and no additional Blackout phases occur.": [
    "Alle Schutzlaternen brennen: Laternenauslöschung ist deaktiviert und es treten keine zusätzlichen Finsternisphasen auf.",
    "Todos los faroles protectores están encendidos: Extinción de faroles queda desactivada y no habrá fases adicionales de apagón.",
    "Alle beschermlantaarns branden: Lantaarnuitdoving is uitgeschakeld en er komen geen extra verduisteringsfasen.",
    "Tutte le lanterne protettive sono accese: Estinzione delle Lanterne è disattivata e non si verificano ulteriori fasi di oscuramento.",
    "Toutes les lanternes protectrices sont allumées : Extinction des Lanternes est désactivée et aucune phase d'obscurité supplémentaire ne survient.",
    "Все защитные фонари горят: Угасание фонарей отключено, дополнительные фазы тьмы не возникают.",
    "Tüm Koruma Fenerleri yanıyor: Fener Söndürme devre dışı, ek Karartma aşamaları oluşmaz."
  ],
  "No protected cargo remains: the Captain has nothing to plunder and loses Caravan Breaker, but the cargo payout is gone.": [
    "Keine geschützte Fracht bleibt übrig: Der Kapitän kann nichts mehr plündern und verliert den Karawanenbrecher, aber die Frachtbelohnung entfällt.",
    "No queda carga protegida: el Capitán no tiene nada que saquear y pierde Rompecaravanas, pero también se pierde la recompensa de la carga.",
    "Er is geen beschermde lading meer: de Kapitein kan niets plunderen en verliest Karavaanbreker, maar de ladingbeloning vervalt.",
    "Non resta carico protetto: il Capitano non ha nulla da saccheggiare e perde Spezzacarovana, ma la ricompensa del carico svanisce.",
    "Il ne reste aucune cargaison protégée : le Capitaine n'a rien à piller et perd Briseur de Caravane, mais la récompense de livraison disparaît.",
    "Защищённого груза не осталось: Капитану нечего грабить и он теряет Разрушителя каравана, но награды за груз тоже нет.",
    "Korunan yük kalmadı: Kaptanın yağmalayacak şeyi yok ve Kervan Kırıcı yeteneğini kaybeder, ancak yük ödülü de yok olur."
  ],
  "All Festival Hearths are lit: no extra Deep Freeze phases and Aurora Shatter is reduced by 24%.": [
    "Alle Festherde brennen: keine zusätzlichen Tieffrostphasen und Aurorabruch wird um 24 % abgeschwächt.",
    "Todos los hogares del festival están encendidos: no habrá fases adicionales de congelación profunda y Fragmentación de la Aurora se reduce un 24 %.",
    "Alle feesthaarden branden: geen extra diepe-vorstfasen en Aurorabreuk wordt met 24% verminderd.",
    "Tutti i focolari festivi sono accesi: nessuna fase aggiuntiva di gelo profondo e Frattura dell'Aurora ridotta del 24%.",
    "Tous les foyers du festival sont allumés : aucune phase supplémentaire de gel profond et Fracture de l'Aurore réduite de 24 %.",
    "Все праздничные очаги горят: дополнительных фаз Глубокой заморозки нет, Раскол Авроры ослаблен на 24%.",
    "Tüm Festival Ocakları yanıyor: ek Derin Don aşamaları yok ve Kutup Işığı Parçalanması %24 azalır."
  ],
  "No additional seasonal boss mechanic is active.": [
    "Keine zusätzliche saisonale Bossmechanik ist aktiv.",
    "No hay ninguna mecánica adicional de jefe de temporada activa.",
    "Er is geen extra seizoensbaasmechaniek actief.",
    "Non sono attive meccaniche aggiuntive del boss stagionale.",
    "Aucune mécanique supplémentaire de boss saisonnier n'est active.",
    "Дополнительные механики сезонного босса неактивны.",
    "Ek bir sezon bossu mekaniği etkin değil."
  ]
} as const;
/** Server-owned dynamic seasonal boss warnings; exact canonical English patterns only. */
export const SEASONAL_BOSS_DYNAMIC_ROWS={
  "turning": {
    "one": [
      "{count} unversiegelter Chronikbruch bricht während der Letzten Stunde aus",
      "{count} fractura de la crónica sin sellar entrará en erupción durante La Última Hora",
      "{count} onverzegelde kroniekbreuk barst uit tijdens Het Laatste Uur",
      "{count} frattura della cronaca non sigillata esploderà durante L'Ultima Ora",
      "{count} fracture chronologique non scellée éclatera pendant La Dernière Heure",
      "Во время Последнего Часа возникнет {count} незапечатанный разлом хроники",
      "Son Saat sırasında {count} mühürlenmemiş kronik çatlağı patlayacak"
    ],
    "many": [
      "{count} unversiegelte Chronikbrüche brechen während der Letzten Stunde aus",
      "{count} fracturas de la crónica sin sellar entrarán en erupción durante La Última Hora",
      "{count} onverzegelde kroniekbreuken barsten uit tijdens Het Laatste Uur",
      "{count} fratture della cronaca non sigillate esploderanno durante L'Ultima Ora",
      "{count} fractures chronologiques non scellées éclateront pendant La Dernière Heure",
      "Во время Последнего Часа возникнут {count} незапечатанных разлома хроники",
      "Son Saat sırasında {count} mühürlenmemiş kronik çatlağı patlayacak"
    ],
    "extra": [
      "; kritische Stabilität aktiviert zudem Zeitumkehr.",
      "; además, la estabilidad crítica activa Reversión temporal.",
      "; kritieke stabiliteit activeert ook Tijdomkering.",
      "; inoltre, la stabilità critica attiva Inversione temporale.",
      " ; une stabilité critique active aussi l'Inversion du temps.",
      "; критическая стабильность также активирует Обращение времени.",
      "; kritik denge ayrıca Zamanı Geri Sarma'yı etkinleştirir."
    ]
  },
  "heartbond": {
    "one": [
      "{count} gebrochenes Versprechen löst zusätzliche Kummerphasen aus; die aktuelle Harmonie verändert die Stärke der Nova.",
      "{count} promesa rota activará fases extra de Dolor; la armonía actual modifica la fuerza de la Nova.",
      "{count} verbroken belofte veroorzaakt extra Verdrietfasen; de huidige harmonie beïnvloedt de kracht van de Nova.",
      "{count} promessa infranta attiverà fasi extra di Dolore; l'armonia attuale modifica la potenza della Nova.",
      "{count} promesse rompue déclenchera des phases de Chagrin supplémentaires ; l'harmonie actuelle modifie la puissance de la Nova.",
      "{count} разорванное обещание вызовет дополнительные фазы Скорби; текущая гармония меняет силу Новы.",
      "{count} bozulmuş söz ek Keder aşamaları başlatır; mevcut uyum Nova'nın gücünü değiştirir."
    ],
    "many": [
      "{count} gebrochene Versprechen lösen zusätzliche Kummerphasen aus; die aktuelle Harmonie verändert die Stärke der Nova.",
      "{count} promesas rotas activarán fases extra de Dolor; la armonía actual modifica la fuerza de la Nova.",
      "{count} verbroken beloften veroorzaken extra Verdrietfasen; de huidige harmonie beïnvloedt de kracht van de Nova.",
      "{count} promesse infrante attiveranno fasi extra di Dolore; l'armonia attuale modifica la potenza della Nova.",
      "{count} promesses rompues déclencheront des phases de Chagrin supplémentaires ; l'harmonie actuelle modifie la puissance de la Nova.",
      "{count} разорванных обещания вызовут дополнительные фазы Скорби; текущая гармония меняет силу Новы.",
      "{count} bozulmuş söz ek Keder aşamaları başlatır; mevcut uyum Nova'nın gücünü değiştirir."
    ]
  },
  "bloomwake": {
    "one": [
      "{count} ungebundener Herzwurzelknoten versetzt den Dornherz-Uralten im Kampf in Raserei",
      "{count} nudo de raíz del corazón sin atar enfurecerá al Ancestro Corazón de Espinas durante el combate",
      "{count} ongebonden hartwortelknoop maakt de Oude Doornhart woedend tijdens het gevecht",
      "{count} nodo della radice del cuore non legato farà infuriare l'Antico Cuorspina durante il combattimento",
      "{count} nœud de racine-cœur non lié provoquera la rage de l'Ancien Cœur-d'Épines pendant le combat",
      "{count} несвязанный узел сердечного корня приведёт Древнего Терносердца в ярость во время боя",
      "{count} bağlanmamış Kalp Kökü düğümü, savaş sırasında Dikenyürek Kadim'i öfkelendirir"
    ],
    "many": [
      "{count} ungebundene Herzwurzelknoten versetzen den Dornherz-Uralten im Kampf in Raserei",
      "{count} nudos de raíz del corazón sin atar enfurecerán al Ancestro Corazón de Espinas durante el combate",
      "{count} ongebonden hartwortelknopen maken de Oude Doornhart woedend tijdens het gevecht",
      "{count} nodi della radice del cuore non legati faranno infuriare l'Antico Cuorspina durante il combattimento",
      "{count} nœuds de racine-cœur non liés provoqueront la rage de l'Ancien Cœur-d'Épines pendant le combat",
      "{count} несвязанных узла сердечного корня приведут Древнего Терносердца в ярость во время боя",
      "{count} bağlanmamış Kalp Kökü düğümü, savaş sırasında Dikenyürek Kadim'i öfkelendirir"
    ],
    "extra": [
      "; kritische Hainbalance aktiviert zudem Wilder Dornenausbruch.",
      "; además, el equilibrio crítico del bosque activa Estallido de espinas salvajes.",
      "; een kritieke bosbalans activeert ook Wilde doornenuitbarsting.",
      "; inoltre, l'equilibrio critico del bosco attiva Esplosione di spine ferali.",
      " ; un équilibre critique du bosquet active aussi Explosion d'épines sauvages.",
      "; критическое равновесие рощи также активирует Взрыв диких шипов.",
      "; kritik Koru Dengesi ayrıca Yabani Diken Patlaması'nı etkinleştirir."
    ]
  },
  "suncrest": {
    "one": [
      "{count}/{max} Lorbeer schwächt Aureons Sonnen-Nova; ein vollständiger Satz verändert den Duellverlauf.",
      "{count}/{max} laureles debilitan la Nova solar de Aureon; el conjunto completo cambia el duelo.",
      "{count}/{max} lauweren verzwakken Aureons Zonnenova; een volledige set verandert het duel.",
      "{count}/{max} allori attenuano la Nova solare di Aureon; il set completo cambia il duello.",
      "{count}/{max} lauriers affaiblissent la Nova solaire d'Aureon ; la collection complète change le duel.",
      "{count}/{max} лавров ослабляют Солнечную Нову Авреона; полный набор меняет ход поединка.",
      "{count}/{max} defne Aureon'un Güneş Novasını zayıflatır; tam set düellonun gidişini değiştirir."
    ]
  },
  "starfall": {
    "one": [
      "{count} großer Riss bleibt offen und verursacht zusätzliche Einsturzphasen",
      "{count} grieta mayor sigue abierta y añade fases de colapso",
      "{count} grote scheur blijft open en veroorzaakt extra instortingsfasen",
      "{count} grande varco resta aperto e aggiunge fasi di collasso",
      "{count} faille majeure reste ouverte et ajoute des phases d'effondrement",
      "{count} крупный разлом остаётся открытым, добавляя фазы обрушения",
      "{count} büyük yarık açık kalır ve ek çöküş aşamaları başlatır"
    ],
    "many": [
      "{count} große Risse bleiben offen und verursachen zusätzliche Einsturzphasen",
      "{count} grietas mayores siguen abiertas y añaden fases de colapso",
      "{count} grote scheuren blijven open en veroorzaken extra instortingsfasen",
      "{count} grandi varchi restano aperti e aggiungono fasi di collasso",
      "{count} failles majeures restent ouvertes et ajoutent des phases d'effondrement",
      "{count} крупных разлома остаются открытыми, добавляя фазы обрушения",
      "{count} büyük yarık açık kalır ve ek çöküş aşamaları başlatır"
    ],
    "extra": [
      " und den Zauber Risskollaps.",
      " y el hechizo Colapso de la grieta.",
      " en de spreuk Instorting van de scheur.",
      " e l'abilità Collasso del varco.",
      " et le sort Effondrement de la faille.",
      " и заклинание Обрушение разлома.",
      " ve Yarık Çöküşü büyüsünü de etkinleştirir."
    ]
  },
  "veilbreak": {
    "one": [
      "{count} dunkle Schutzlaterne verursacht zusätzliche Finsternisphasen",
      "{count} farol protector apagado causa fases extra de apagón",
      "{count} gedoofde beschermlantaarn veroorzaakt extra verduisteringsfasen",
      "{count} lanterna protettiva spenta causa fasi extra di oscuramento",
      "{count} lanterne protectrice éteinte provoque des phases d'obscurité supplémentaires",
      "{count} погасший защитный фонарь вызывает дополнительные фазы тьмы",
      "{count} sönmüş koruma feneri ek Karartma aşamaları başlatır"
    ],
    "many": [
      "{count} dunkle Schutzlaternen verursachen zusätzliche Finsternisphasen",
      "{count} faroles protectores apagados causan fases extra de apagón",
      "{count} gedoofde beschermlantaarns veroorzaken extra verduisteringsfasen",
      "{count} lanterne protettive spente causano fasi extra di oscuramento",
      "{count} lanternes protectrices éteintes provoquent des phases d'obscurité supplémentaires",
      "{count} погасших защитных фонаря вызывают дополнительные фазы тьмы",
      "{count} sönmüş koruma feneri ek Karartma aşamaları başlatır"
    ],
    "extra": [
      " und aktiviert Völlige Finsternis.",
      " y activa Apagón total.",
      " en activeert Totale verduistering.",
      " e attiva Oscuramento totale.",
      " et active Obscurité totale.",
      " и включают Полную тьму.",
      " ve Tam Karartma'yı etkinleştirir."
    ]
  },
  "merchant": {
    "one": [
      "{count} geschützter Frachtposten bleibt. Er fügt eine Plünderungsphase hinzu: Der Kampf wird schwerer, aber die Lieferbelohnung steigt.",
      "Queda {count} lote de carga protegida. Añade una fase de saqueo: la pelea se endurece, pero aumenta la recompensa de entrega.",
      "Er blijft {count} beschermde ladingpartij over. Die voegt een plunderfase toe: een zwaarder gevecht voor een hogere bezorgbeloning.",
      "Resta {count} lotto di carico protetto. Aggiunge una fase di saccheggio: lo scontro è più duro, ma la ricompensa di consegna aumenta.",
      "Il reste {count} lot de cargaison protégée. Il ajoute une phase de pillage : le combat devient plus difficile mais la récompense de livraison augmente.",
      "Остаётся {count} партия защищённого груза. Она добавляет фазу разграбления: бой сложнее, но награда за доставку выше.",
      "{count} korunan yük partisi kaldı. Bir yağma aşaması ekler: savaş zorlaşır ama teslimat ödülü artar."
    ],
    "many": [
      "{count} geschützte Frachtposten bleiben. Jeder fügt eine Plünderungsphase hinzu: Der Kampf wird schwerer, aber die Lieferbelohnung steigt.",
      "Quedan {count} lotes de carga protegida. Cada uno añade una fase de saqueo: la pelea se endurece, pero aumenta la recompensa de entrega.",
      "Er blijven {count} beschermde ladingpartijen over. Elk voegt een plunderfase toe: een zwaarder gevecht voor een hogere bezorgbeloning.",
      "Restano {count} lotti di carico protetto. Ognuno aggiunge una fase di saccheggio: lo scontro è più duro, ma la ricompensa di consegna aumenta.",
      "Il reste {count} lots de cargaison protégée. Chacun ajoute une phase de pillage : le combat devient plus difficile mais la récompense de livraison augmente.",
      "Остаются {count} партии защищённого груза. Каждая добавляет фазу разграбления: бой сложнее, но награда за доставку выше.",
      "{count} korunan yük partisi kaldı. Her biri bir yağma aşaması ekler: savaş zorlaşır ama teslimat ödülü artar."
    ]
  },
  "frostfall": {
    "one": [
      "{count} unentzündeter Herd ermöglicht zusätzliche Tieffrostphasen. Entzündete Herde schwächen Aurorabruch um {pct}% ab",
      "{count} hogar apagado permite fases extra de congelación profunda. Los hogares encendidos reducen Fragmentación de la Aurora un {pct}%",
      "{count} onverlichte haard veroorzaakt extra diepe-vorstfasen. Brandende haarden verminderen Aurorabreuk met {pct}%",
      "{count} focolare spento permette fasi extra di gelo profondo. I focolari accesi riducono Frattura dell'Aurora del {pct}%",
      "{count} foyer éteint permet des phases supplémentaires de gel profond. Les foyers allumés réduisent Fracture de l'Aurore de {pct} %",
      "{count} незажжённый очаг допускает дополнительные фазы Глубокой заморозки. Горящие очаги ослабляют Раскол Авроры на {pct}%",
      "{count} yanmamış ocak ek Derin Don aşamalarına yol açar. Yanan ocaklar Kutup Işığı Parçalanmasını %{pct} azaltır"
    ],
    "many": [
      "{count} unentzündete Herde ermöglichen zusätzliche Tieffrostphasen. Entzündete Herde schwächen Aurorabruch um {pct}% ab",
      "{count} hogares apagados permiten fases extra de congelación profunda. Los hogares encendidos reducen Fragmentación de la Aurora un {pct}%",
      "{count} onverlichte haarden veroorzaken extra diepe-vorstfasen. Brandende haarden verminderen Aurorabreuk met {pct}%",
      "{count} focolari spenti permettono fasi extra di gelo profondo. I focolari accesi riducono Frattura dell'Aurora del {pct}%",
      "{count} foyers éteints permettent des phases supplémentaires de gel profond. Les foyers allumés réduisent Fracture de l'Aurore de {pct} %",
      "{count} незажжённых очага допускают дополнительные фазы Глубокой заморозки. Горящие очаги ослабляют Раскол Авроры на {pct}%",
      "{count} yanmamış ocak ek Derin Don aşamalarına yol açar. Yanan ocaklar Kutup Işığı Parçalanmasını %{pct} azaltır"
    ],
    "extra": [
      "; kritische Wärme aktiviert zudem Absoluter Nullpunkt.",
      "; además, el calor crítico activa Cero absoluto.",
      "; kritieke warmte activeert ook Absoluut nulpunt.",
      "; inoltre, il calore critico attiva Zero assoluto.",
      " ; une chaleur critique active aussi Zéro absolu.",
      "; критический уровень тепла также активирует Абсолютный ноль.",
      "; kritik sıcaklık ayrıca Mutlak Sıfır'ı etkinleştirir."
    ]
  }
} as const;
const fillBoss=(template:string,values:Record<string,number>)=>template.replace(/\{(\w+)\}/g,(_match,key:string)=>String(values[key]??'{'+key+'}'));
function dynamicSeasonalBossSummary(language:Language,english:string):string|undefined{
 const idx=column[language];
 const render=(row:{one:readonly string[];many?:readonly string[];extra?:readonly string[]},count:number,values:Record<string,number>,extra=false):string=>{
  const base=fillBoss((count===1?row.one:row.many??row.one)[idx],values);
  return base+(extra&&row.extra?row.extra[idx]:'.');
 };
 const valid=(n:number)=>Number.isInteger(n)&&n>=1&&n<=3;
 let m:RegExpExecArray|null;
 m=/^(\d+) unsealed fractures? will erupt during The Last Hour(?: and critical stability enables Time Reversal)?\.$/.exec(english);
 if(m){const n=Number(m[1]),extra=english.endsWith(' and critical stability enables Time Reversal.');
  if(!valid(n)||english!==n+' unsealed fracture'+(n===1?'':'s')+' will erupt during The Last Hour'+(extra?' and critical stability enables Time Reversal.':'.'))return undefined;
  return render(SEASONAL_BOSS_DYNAMIC_ROWS.turning,n,{count:n},extra);
 }
 m=/^(\d+) broken promises? will trigger extra Sorrow phases; current harmony modifies the Nova’s strength\.$/.exec(english);
 if(m){const n=Number(m[1]);if(!valid(n)||english!==n+' broken promise'+(n===1?'':'s')+' will trigger extra Sorrow phases; current harmony modifies the Nova’s strength.')return undefined;
  return fillBoss((n===1?SEASONAL_BOSS_DYNAMIC_ROWS.heartbond.one:SEASONAL_BOSS_DYNAMIC_ROWS.heartbond.many)[idx],{count:n});
 }
 m=/^(\d+) unbound Heartroot knots? will enrage the Thornheart Ancient during the fight(?:; critical Grove Balance also enables Feral Thornburst)?\.$/.exec(english);
 if(m){const n=Number(m[1]),extra=english.endsWith('; critical Grove Balance also enables Feral Thornburst.');
  if(!valid(n)||english!==n+' unbound Heartroot knot'+(n===1?'':'s')+' will enrage the Thornheart Ancient during the fight'+(extra?'; critical Grove Balance also enables Feral Thornburst.':'.'))return undefined;
  return render(SEASONAL_BOSS_DYNAMIC_ROWS.bloomwake,n,{count:n},extra);
 }
 m=/^(\d+)\/(\d+) Laurels soften Aureon’s Solar Nova; a complete set changes the duel pattern\.$/.exec(english);
 if(m){const n=Number(m[1]),max=Number(m[2]);if(n<1||n>2||max!==3)return undefined;
  return fillBoss(SEASONAL_BOSS_DYNAMIC_ROWS.suncrest.one[idx],{count:n,max});
 }
 m=/^(\d+) major rifts? remain[s]? open, adding collapse phases(?: and the Rift Collapse cast)?\.$/.exec(english);
 if(m){const n=Number(m[1]),extra=english.endsWith(' and the Rift Collapse cast.');
  if(!valid(n)||english!==n+' major rift'+(n===1?' remains':'s remain')+' open, adding collapse phases'+(extra?' and the Rift Collapse cast.':'.'))return undefined;
  return render(SEASONAL_BOSS_DYNAMIC_ROWS.starfall,n,{count:n},extra);
 }
 m=/^(\d+) dark wards? create extra Blackout phases(?: and enable Total Blackout)?\.$/.exec(english);
 if(m){const n=Number(m[1]),extra=english.endsWith(' and enable Total Blackout.');
  if(!valid(n)||english!==n+' dark ward'+(n===1?'':'s')+' create extra Blackout phases'+(extra?' and enable Total Blackout.':'.'))return undefined;
  return render(SEASONAL_BOSS_DYNAMIC_ROWS.veilbreak,n,{count:n},extra);
 }
 m=/^(\d+) protected cargo lots? remain\. Each one adds a Plunder Attempt phase, trading a harder fight for a larger delivery payout\.$/.exec(english);
 if(m){const n=Number(m[1]);if(!valid(n)||english!==n+' protected cargo lot'+(n===1?'':'s')+' remain. Each one adds a Plunder Attempt phase, trading a harder fight for a larger delivery payout.')return undefined;
  return fillBoss((n===1?SEASONAL_BOSS_DYNAMIC_ROWS.merchant.one:SEASONAL_BOSS_DYNAMIC_ROWS.merchant.many)[idx],{count:n});
 }
 m=/^(\d+) unlit hearths? allow extra Deep Freeze phases\. Lit hearths reduce Aurora Shatter by (\d+)%(?:; critical Warmth also enables Absolute Zero)?\.$/.exec(english);
 if(m){const n=Number(m[1]),pct=Number(m[2]),extra=english.endsWith('; critical Warmth also enables Absolute Zero.');
  if(!valid(n)||pct!==(3-n)*8||english!==n+' unlit hearth'+(n===1?'':'s')+' allow extra Deep Freeze phases. Lit hearths reduce Aurora Shatter by '+pct+'%'+(extra?'; critical Warmth also enables Absolute Zero.':'.'))return undefined;
  return render(SEASONAL_BOSS_DYNAMIC_ROWS.frostfall,n,{count:n,pct},extra);
 }
 return undefined;
}

const column:Record<Language,number>={en:-1,de:0,es:1,nl:2,it:3,fr:4,ru:5,tr:6};
function lookup(language:Language,source:string,rows:Readonly<Record<string,readonly string[]>>):string|undefined{
 return Object.prototype.hasOwnProperty.call(rows,source)?rows[source]?.[column[language]]:undefined;
}
/** Presentation only: no changes to boss state, identifiers, cast timings or consequences. */
export function seasonalBossDisplayName(language:Language,english:string):string{
 if(language==='en')return english;
 const direct=lookup(language,english,SEASONAL_BOSS_LABEL_ROWS)??lookup(language,english,SEASONAL_BOSS_MOVE_ROWS);
 if(direct!==undefined)return direct;
 const numbered=/^(.+) ([1-3])$/.exec(english);
 if(!numbered)return english;
 const stem=lookup(language,numbered[1],SEASONAL_BOSS_NUMBERED_ROWS);
 return stem?stem+' '+numbered[2]:english;
}
export function seasonalBossDisplaySummary(language:Language,english:string):string{
 if(language==='en')return english;
 return lookup(language,english,SEASONAL_BOSS_SUMMARY_ROWS)??dynamicSeasonalBossSummary(language,english)??english;
}
