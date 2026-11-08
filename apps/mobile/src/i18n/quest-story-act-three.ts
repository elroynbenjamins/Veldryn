import type {QuestActDef} from '../content/quests';
import {rebasedCombatLevelFromLegacyLevel as rebaseLevel} from '../core/progression';

/** Act III authored copy. English + DE/ES/NL/IT/FR/RU/TR; keep monster names, quest IDs, counts and rewards authoritative. */
type EightLanguages=readonly [string,string,string,string,string,string,string,string];
type StoryField='name'|'description'|'story';
const guildQuestLevel=rebaseLevel(20);
const beyondTheGreenLevel=rebaseLevel(25);
export const chapterThreeActCopy={
  "3": {
    "name": [
      "The Broken Oath",
      "Der gebrochene Eid",
      "El juramento roto",
      "De gebroken eed",
      "Il giuramento infranto",
      "Le serment brisé",
      "Нарушенная клятва",
      "Bozulan Yemin"
    ],
    "subtitle": [
      "Walk the King’s Road and confront what Asterfall buried.",
      "Folge der King’s Road und stelle dich dem, was Asterfall begraben hat.",
      "Recorre King's Road y enfréntate a lo que Asterfall enterró.",
      "Volg King's Road en confronteer wat Asterfall heeft begraven.",
      "Percorri King's Road e affronta ciò che Asterfall ha sepolto.",
      "Parcourez King's Road et affrontez ce qu'Asterfall a enfoui.",
      "Пройди по King's Road и столкнись с тем, что похоронил Asterfall.",
      "King's Road boyunca ilerle ve Asterfall'ın gömdüğü şeyle yüzleş."
    ]
  }
} as const satisfies Partial<Record<QuestActDef['act'],Record<'name'|'subtitle',EightLanguages>>>;
export const chapterThreeQuestCopy={
  "QST_011": {
    "name": [
      "Place Among Guilds",
      "Ein Platz unter den Gilden",
      "Un lugar entre los gremios",
      "Een plek tussen de gildes",
      "Un posto tra le gilde",
      "Une place parmi les guildes",
      "Место среди гильдий",
      "Loncalar Arasında Bir Yer"
    ],
    "description": [
      `Reach character level ${guildQuestLevel}.`,
      `Erreiche Charakterstufe ${guildQuestLevel}.`,
      `Alcanza el nivel de personaje ${guildQuestLevel}.`,
      `Bereik personageniveau ${guildQuestLevel}.`,
      `Raggiungi il livello personaggio ${guildQuestLevel}.`,
      `Atteignez le niveau ${guildQuestLevel} de personnage.`,
      `Достигните уровня персонажа ${guildQuestLevel}.`,
      `${guildQuestLevel}. karakter seviyesine ulaş.`
    ],
    "story": [
      "The guilds stop treating you as a passing sword. Reports from the King’s Road now carry your name, and older adventurers begin speaking openly of the oathbound host gathering beyond the fog.",
      "Die Gilden sehen in dir keinen bloß vorbeiziehenden Kämpfer mehr. Berichte von der King's Road nennen nun deinen Namen, und erfahrene Abenteurer sprechen offen vom eidestreuen Heer, das sich jenseits des Nebels sammelt.",
      "Los gremios ya no te ven como una espada de paso. Los informes de King's Road mencionan ahora tu nombre, y los aventureros veteranos hablan abiertamente del ejército ligado al juramento que se reúne más allá de la niebla.",
      "De gildes zien je niet langer als zomaar een rondtrekkende zwaardvechter. Berichten van King's Road noemen nu je naam, en ervaren avonturiers spreken openlijk over het eedgebonden leger dat zich achter de mist verzamelt.",
      "Le gilde non ti trattano più come una lama di passaggio. I rapporti dalla King's Road riportano ormai il tuo nome e gli avventurieri esperti parlano apertamente dell'esercito vincolato al giuramento che si raduna oltre la nebbia.",
      "Les guildes ne vous voient plus comme une simple épée de passage. Les rapports de King's Road portent désormais votre nom, et les anciens aventuriers parlent ouvertement de l'armée liée au serment qui se rassemble au-delà du brouillard.",
      "Гильдии больше не считают тебя случайным наёмником. Весточки с King's Road уже содержат твоё имя, а опытные искатели приключений открыто говорят о связанном клятвой воинстве, собирающемся за туманом.",
      "Loncalar seni artık gelip geçici bir kılıç olarak görmüyor. King's Road'dan gelen raporlarda adın geçiyor ve deneyimli maceracılar sisin ardında toplanan, yemine bağlı ordudan açıkça söz ediyor."
    ]
  },
  "QST_012": {
    "name": [
      "Fallen Procession",
      "Der Zug der Gefallenen",
      "La procesión de los caídos",
      "De stoet van de gevallenen",
      "La processione dei caduti",
      "La procession des déchus",
      "Шествие павших",
      "Düşenlerin Alayı"
    ],
    "description": [
      "Defeat 8 Oathbound Squires.",
      "Besiege 8 Oathbound Squires.",
      "Derrota a 8 Oathbound Squires.",
      "Versla 8 Oathbound Squires.",
      "Sconfiggi 8 Oathbound Squires.",
      "Vainquez 8 Oathbound Squires.",
      "Победите 8 Oathbound Squires.",
      "8 Oathbound Squires yen."
    ],
    "story": [
      "Armoured dead march in formation toward Asterfall, still obeying an order issued generations ago. Breaking the procession may reveal who—or what—has called the old soldiers back to duty.",
      "Gepanzerte Tote marschieren in Formation auf Asterfall zu. Noch immer befolgen sie einen Befehl, der vor Generationen erteilt wurde. Wenn du ihren Zug aufhältst, erfährst du vielleicht, wer – oder was – die alten Soldaten wieder gerufen hat.",
      "Muertos acorazados marchan en formación hacia Asterfall, obedeciendo aún una orden de hace generaciones. Romper la procesión podría revelar quién, o qué, ha llamado de nuevo a esos antiguos soldados.",
      "Gepantserde doden marcheren in formatie naar Asterfall en gehoorzamen nog altijd een bevel van generaties geleden. Door hun stoet te breken ontdek je misschien wie, of wat, de oude soldaten opnieuw heeft opgeroepen.",
      "Morti in armatura marciano in formazione verso Asterfall, obbedendo ancora a un ordine impartito generazioni fa. Spezzare la processione potrebbe rivelare chi, o cosa, ha richiamato i vecchi soldati.",
      "Des morts en armure marchent en formation vers Asterfall, obéissant toujours à un ordre vieux de plusieurs générations. Briser leur procession pourrait révéler qui, ou quoi, a rappelé ces anciens soldats.",
      "Закованные в броню мертвецы строем идут к Asterfall, всё ещё подчиняясь приказу, отданному многие поколения назад. Остановив шествие, ты можешь узнать, кто — или что — вновь призвал этих солдат.",
      "Zırhlı ölüler, nesiller önce verilmiş bir emre hâlâ uyarak Asterfall'a doğru düzenli saflar hâlinde yürüyor. Alayı durdurmak, eski askerleri kimin ya da neyin geri çağırdığını ortaya çıkarabilir."
    ]
  },
  "QST_013": {
    "name": [
      "Oathglass Road",
      "Die Straße von Oathglass",
      "El camino de Oathglass",
      "De weg van Oathglass",
      "La strada di Oathglass",
      "La route d'Oathglass",
      "Дорога Oathglass",
      "Oathglass Yolu"
    ],
    "description": [
      "Defeat 10 Fallen Sentinels.",
      "Besiege 10 Fallen Sentinels.",
      "Derrota a 10 Fallen Sentinels.",
      "Versla 10 Fallen Sentinels.",
      "Sconfiggi 10 Fallen Sentinels.",
      "Vainquez 10 Fallen Sentinels.",
      "Победите 10 Fallen Sentinels.",
      "10 Fallen Sentinels yen."
    ],
    "story": [
      "Fallen Sentinels guard the causeway in disciplined silence. Beyond them stands the shattered command post where the last royal defense made its final oath and where its commander never truly left.",
      "Fallen Sentinels bewachen schweigend und diszipliniert den Dammweg. Dahinter liegt der zerstörte Kommandoposten, an dem die letzte königliche Verteidigung ihren Eid schwor – und an dem ihr Kommandant nie wirklich fortging.",
      "Los Fallen Sentinels vigilan la calzada en un silencio disciplinado. Más allá se alza el puesto de mando destruido donde la última defensa real hizo su juramento y donde su comandante nunca llegó a marcharse del todo.",
      "Fallen Sentinels bewaken de verhoogde weg in gedisciplineerde stilte. Daarachter ligt de verwoeste commandopost waar de laatste koninklijke verdedigers hun eed zwoeren en waar hun bevelhebber nooit echt vertrok.",
      "I Fallen Sentinels sorvegliano la strada rialzata in disciplinato silenzio. Oltre di loro sorge il posto di comando distrutto, dove l'ultima difesa reale prestò il suo giuramento e dove il comandante non se ne andò mai davvero.",
      "Les Fallen Sentinels gardent la chaussée dans un silence discipliné. Au-delà se trouve le poste de commandement en ruine où la dernière défense royale prêta serment et que son commandant ne quitta jamais vraiment.",
      "Fallen Sentinels молча и дисциплинированно охраняют дамбу. За ней стоит разрушенный командный пункт, где последние защитники короны дали свою клятву, а их командир так и не ушёл по-настоящему.",
      "Fallen Sentinels geçidi sessiz ve disiplinli biçimde koruyor. Ötede, son kraliyet savunmasının yemin ettiği ve komutanlarının aslında hiç ayrılmadığı yıkık karargâh bulunuyor."
    ]
  },
  "QST_014": {
    "name": [
      "Fallen Knight",
      "Der gefallene Ritter",
      "El caballero caído",
      "De gevallen ridder",
      "Il cavaliere caduto",
      "Le chevalier déchu",
      "Павший рыцарь",
      "Düşmüş Şövalye"
    ],
    "description": [
      "Defeat the Fallen Knight.",
      "Besiege den Fallen Knight.",
      "Derrota al Fallen Knight.",
      "Versla de Fallen Knight.",
      "Sconfiggi il Fallen Knight.",
      "Vainquez le Fallen Knight.",
      "Победите Fallen Knight.",
      "Fallen Knight'ı yen."
    ],
    "story": [
      "The echoes finally have a face. The Fallen Knight still holds the gate as though the kingdom behind him survives, bound to an oath that has outlived everyone it was meant to protect.",
      "Die Echos haben endlich ein Gesicht. Der Fallen Knight hält das Tor, als bestünde das Königreich dahinter noch immer. Ein Eid bindet ihn, der all jene überdauert hat, die er einst schützen sollte.",
      "Los ecos por fin tienen rostro. El Fallen Knight sigue defendiendo la puerta como si el reino tras ella aún existiera, atado a un juramento que ha sobrevivido a todos aquellos a quienes debía proteger.",
      "De echo's hebben eindelijk een gezicht. De Fallen Knight houdt de poort nog steeds alsof het koninkrijk erachter bestaat, gebonden aan een eed die iedereen die hij moest beschermen heeft overleefd.",
      "Gli echi hanno finalmente un volto. Il Fallen Knight presidia ancora il cancello come se il regno alle sue spalle esistesse tuttora, vincolato a un giuramento sopravvissuto a tutti coloro che doveva proteggere.",
      "Les échos ont enfin un visage. Le Fallen Knight tient toujours la porte comme si le royaume derrière lui existait encore, lié à un serment qui a survécu à tous ceux qu'il devait protéger.",
      "У эха наконец появилось лицо. Fallen Knight всё ещё держит ворота, словно королевство за ними существует, связанный клятвой, пережившей всех, кого она должна была защищать.",
      "Yankıların sonunda bir yüzü var. Fallen Knight, ardındaki krallık hâlâ ayaktaymış gibi kapıyı tutuyor; koruması gereken herkesten uzun yaşamış bir yemine bağlı."
    ]
  },
  "QST_015": {
    "name": [
      "Beyond the Green",
      "Jenseits des Grünen",
      "Más allá del verdor",
      "Voorbij het groen",
      "Oltre il verde",
      "Au-delà de la verdure",
      "За пределами зелёных земель",
      "Yeşilliğin Ötesinde"
    ],
    "description": [
      `Claim victory over the Fallen Knight and reach level ${beyondTheGreenLevel}.`,
      `Besiege den Fallen Knight und erreiche Stufe ${beyondTheGreenLevel}.`,
      `Vence al Fallen Knight y alcanza el nivel ${beyondTheGreenLevel}.`,
      `Versla de Fallen Knight en bereik niveau ${beyondTheGreenLevel}.`,
      `Sconfiggi il Fallen Knight e raggiungi il livello ${beyondTheGreenLevel}.`,
      `Triomphez du Fallen Knight et atteignez le niveau ${beyondTheGreenLevel}.`,
      `Победите Fallen Knight и достигните уровня ${beyondTheGreenLevel}.`,
      `Fallen Knight'ı yen ve ${beyondTheGreenLevel}. seviyeye ulaş.`
    ],
    "story": [
      "With the Knight defeated, the sealed routes beyond Asterfall begin to open. The victory ends one chapter, but the echoes carried on the wind make it clear the broken oath was never confined to the green lands.",
      "Nach dem Sieg über den Ritter beginnen sich die versiegelten Wege jenseits von Asterfall zu öffnen. Ein Kapitel endet, doch die Echos im Wind zeigen deutlich: Der gebrochene Eid war nie auf die grünen Lande begrenzt.",
      "Derrotado el caballero, las rutas selladas más allá de Asterfall comienzan a abrirse. La victoria cierra un capítulo, pero los ecos en el viento dejan claro que el juramento roto nunca se limitó a las tierras verdes.",
      "Nu de ridder is verslagen, beginnen de afgesloten routes voorbij Asterfall zich te openen. De overwinning sluit een hoofdstuk af, maar de echo's in de wind maken duidelijk dat de gebroken eed nooit tot de groene landen beperkt was.",
      "Sconfitto il cavaliere, le vie sigillate oltre Asterfall iniziano ad aprirsi. La vittoria chiude un capitolo, ma gli echi portati dal vento chiariscono che il giuramento infranto non era mai rimasto confinato alle terre verdi.",
      "Le chevalier vaincu, les routes scellées au-delà d'Asterfall commencent à s'ouvrir. Cette victoire clôt un chapitre, mais les échos portés par le vent montrent que le serment brisé n'a jamais été limité aux terres verdoyantes.",
      "После победы над рыцарем запечатанные пути за пределами Asterfall начинают открываться. Эта победа завершает главу, но эхо на ветру ясно говорит: нарушенная клятва никогда не ограничивалась зелёными землями.",
      "Şövalye yenilince Asterfall'ın ötesindeki mühürlü yollar açılmaya başlıyor. Zafer bir bölümü bitiriyor ama rüzgârdaki yankılar, bozulan yeminin hiçbir zaman yalnızca yeşil topraklarla sınırlı olmadığını gösteriyor."
    ]
  }
} as const satisfies Record<string,Record<StoryField,EightLanguages>>;
