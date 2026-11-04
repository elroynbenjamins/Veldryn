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
 return lookup(language,english,SEASONAL_BOSS_SUMMARY_ROWS)??english;
}
