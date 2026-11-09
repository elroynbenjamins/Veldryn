import type {QuestActDef} from '../content/quests';
import {withRebasedLevels} from './quest-level-copy';

/** Act II authored copy. English + DE/ES/NL/IT/FR/RU/TR; game content IDs and names stay authoritative. */
type EightLanguages=readonly [string,string,string,string,string,string,string,string];
type StoryField='name'|'description'|'story';
export const chapterTwoActCopy={
  "2": {
    "name": [
      "Roots, River & Ruin",
      "Wurzeln, Fluss und Ruinen",
      "Raíces, río y ruinas",
      "Wortels, rivier en ruïnes",
      "Radici, fiume e rovine",
      "Racines, rivière et ruines",
      "Корни, река и руины",
      "Kökler, Nehir ve Harabeler"
    ],
    "subtitle": [
      "Follow the spreading echoes through forest, river and mine.",
      "Folge den sich ausbreitenden Echos durch Wald, Fluss und Mine.",
      "Sigue los ecos que se extienden por el bosque, el río y la mina.",
      "Volg de zich verspreidende echo's door bos, rivier en mijn.",
      "Segui gli echi che si diffondono tra foresta, fiume e miniera.",
      "Suivez les échos qui se propagent à travers forêt, rivière et mine.",
      "Иди по следу разрастающегося эха через лес, реку и шахту.",
      "Ormana, nehre ve madene yayılan yankıların izini sür."
    ]
  }
} as const satisfies Partial<Record<QuestActDef['act'],Record<'name'|'subtitle',EightLanguages>>>;
const authoredChapterTwoQuestCopy={
  "QST_006": {
    "name": [
      "Thorn Beneath",
      "Dornen unter den Wurzeln",
      "Espinas bajo las raíces",
      "Doornen onder de wortels",
      "Spine sotto le radici",
      "Des épines sous les racines",
      "Шипы под корнями",
      "Köklerin Altındaki Dikenler"
    ],
    "description": [
      "Defeat 8 Thornlings.",
      "Besiege 8 Thornlings.",
      "Derrota a 8 Thornlings.",
      "Versla 8 Thornlings.",
      "Sconfiggi 8 Thornlings.",
      "Vainquez 8 Thornlings.",
      "Победите 8 Thornlings.",
      "8 Thornlings yen."
    ],
    "story": [
      "Thornlings are gathering around trees marked with old oath-runes. Their growth is too deliberate to be natural, as if the forest is remembering a command nobody living can hear.",
      "Thornlings sammeln sich um Bäume, die mit alten Eidrunen markiert sind. Ihr Wachstum wirkt zu gezielt, um natürlich zu sein, als würde sich der Wald an einen Befehl erinnern, den kein Lebender mehr hören kann.",
      "Los Thornlings se reúnen alrededor de árboles marcados con antiguas runas de juramento. Su crecimiento es demasiado deliberado para ser natural, como si el bosque recordara una orden que ya nadie vivo puede oír.",
      "Thornlings verzamelen zich rond bomen met oude eedrunen. Ze groeien te doelgericht om natuurlijk te zijn, alsof het bos zich een bevel herinnert dat niemand die nog leeft kan horen.",
      "I Thornlings si radunano attorno ad alberi segnati da antiche rune del giuramento. La loro crescita è troppo ordinata per essere naturale, come se la foresta ricordasse un comando che nessun vivente può più udire.",
      "Les Thornlings se rassemblent autour d'arbres marqués d'anciennes runes de serment. Leur croissance semble trop délibérée pour être naturelle, comme si la forêt se souvenait d'un ordre qu'aucun vivant n'entend plus.",
      "Thornlings собираются вокруг деревьев с древними рунами клятвы. Их рост слишком упорядочен для обычной природы, словно лес помнит приказ, который уже никто из живых не слышит.",
      "Thornlings, eski yemin rünleriyle işaretlenmiş ağaçların etrafında toplanıyor. Büyümeleri doğal olamayacak kadar düzenli; sanki orman, yaşayan hiç kimsenin duyamadığı bir emri hatırlıyor."
    ]
  },
  "QST_007": {
    "name": [
      "Silver on the Water",
      "Silber auf dem Wasser",
      "Plata sobre el agua",
      "Zilver op het water",
      "Argento sull'acqua",
      "De l'argent sur l'eau",
      "Серебро на воде",
      "Suyun Üstündeki Gümüş"
    ],
    "description": [
      "Collect 6 River Eels.",
      "Sammle 6 River Eels.",
      "Recoge 6 River Eels.",
      "Verzamel 6 River Eels.",
      "Raccogli 6 River Eels.",
      "Récoltez 6 River Eels.",
      "Соберите 6 River Eels.",
      "6 River Eels topla."
    ],
    "story": [
      "Silverbrook’s ferrymen report pale lights moving beneath the current at night. The village needs food, but the catch may also reveal why the river has begun carrying fragments of echo-touched debris downstream.",
      "Die Fährleute von Silverbrook berichten von blassen Lichtern, die nachts unter der Strömung treiben. Das Dorf braucht Nahrung, doch der Fang könnte auch verraten, warum der Fluss neuerdings von Echos berührte Trümmerstücke stromabwärts trägt.",
      "Los barqueros de Silverbrook hablan de luces pálidas que se mueven bajo la corriente por la noche. La aldea necesita alimento, pero la pesca podría explicar por qué el río arrastra ahora restos tocados por los ecos.",
      "De veerlieden van Silverbrook zien 's nachts bleke lichten onder de stroming bewegen. Het dorp heeft voedsel nodig, maar de vangst kan ook onthullen waarom de rivier sinds kort door echo's aangeraakt puin meevoert.",
      "I traghettatori di Silverbrook raccontano di pallide luci che si muovono sotto la corrente di notte. Il villaggio ha bisogno di cibo, ma la pesca potrebbe anche spiegare perché il fiume trasporta ora detriti sfiorati dagli echi.",
      "Les passeurs de Silverbrook aperçoivent la nuit des lueurs pâles sous le courant. Le village a besoin de nourriture, mais la pêche pourrait aussi révéler pourquoi la rivière charrie désormais des débris imprégnés d'échos.",
      "Перевозчики Silverbrook рассказывают о бледных огнях, движущихся ночью под водой. Деревне нужна еда, но улов может объяснить, почему река вдруг стала нести вниз по течению обломки, затронутые эхом.",
      "Silverbrook'un kayıkçıları, geceleri akıntının altında dolaşan soluk ışıklardan söz ediyor. Köyün yiyeceğe ihtiyacı var, ancak avlananlar nehrin neden artık yankıların dokunduğu enkaz parçalarını aşağı taşıdığını da açıklayabilir."
    ]
  },
  "QST_008": {
    "name": [
      "Old Mine Bell",
      "Die Glocke der alten Mine",
      "La campana de la vieja mina",
      "De bel van de oude mijn",
      "La campana della vecchia miniera",
      "La cloche de l'ancienne mine",
      "Колокол старой шахты",
      "Eski Madenin Çanı"
    ],
    "description": [
      "Defeat 10 Cave Skitters.",
      "Besiege 10 Cave Skitters.",
      "Derrota a 10 Cave Skitters.",
      "Versla 10 Cave Skitters.",
      "Sconfiggi 10 Cave Skitters.",
      "Vainquez 10 Cave Skitters.",
      "Победите 10 Cave Skitters.",
      "10 Cave Skitters yen."
    ],
    "story": [
      "A bell rings below the abandoned mine despite its rope having rotted decades ago. Skitters flood the upper shafts whenever it sounds. Clearing them is the only way to reach the sealed workings below.",
      "Unter der verlassenen Mine läutet eine Glocke, obwohl ihr Seil vor Jahrzehnten verrottet ist. Immer wenn sie ertönt, strömen Skitters in die oberen Schächte. Erst wenn du sie vertreibst, erreichst du die versiegelten Stollen darunter.",
      "Una campana suena bajo la mina abandonada, aunque su cuerda se pudrió hace décadas. Cada vez que tañe, los Skitters invaden los pozos superiores. Despejarlos es la única manera de alcanzar las galerías selladas.",
      "Diep in de verlaten mijn klinkt een bel, hoewel het touw al tientallen jaren verrot is. Telkens als hij luidt, stromen Skitters de bovenste schachten in. Alleen door ze te verjagen bereik je de afgesloten gangen eronder.",
      "Sotto la miniera abbandonata suona una campana, anche se la sua corda è marcita decenni fa. Ogni rintocco richiama gli Skitters nei pozzi superiori. Eliminarli è l'unico modo per raggiungere le gallerie sigillate.",
      "Une cloche sonne sous la mine abandonnée, bien que sa corde ait pourri depuis des décennies. À chaque tintement, les Skitters envahissent les galeries supérieures. Les éliminer est le seul moyen d'atteindre les tunnels scellés.",
      "Под заброшенной шахтой звонит колокол, хотя его верёвка сгнила десятилетия назад. Каждый раз на звук в верхние штольни устремляются Skitters. Только избавившись от них, можно добраться до запечатанных выработок.",
      "Terk edilmiş madenin altında bir çan çalıyor; oysa ipi onlarca yıl önce çürüdü. Çan her çaldığında Skitters üst galerilere doluşuyor. Aşağıdaki mühürlü tünellere ulaşmanın tek yolu onları temizlemek."
    ]
  },
  "QST_009": {
    "name": [
      "Rootbound Vault",
      "Das Gewölbe der Verwurzelten",
      "La bóveda de las raíces",
      "De kluis tussen de wortels",
      "La volta delle radici",
      "Le caveau des racines",
      "Хранилище под корнями",
      "Köklere Bağlı Mahzen"
    ],
    "description": [
      "Defeat 6 Ancient Treants.",
      "Besiege 6 Ancient Treants.",
      "Derrota a 6 Ancient Treants.",
      "Versla 6 Ancient Treants.",
      "Sconfiggi 6 Ancient Treants.",
      "Vainquez 6 Ancient Treants.",
      "Победите 6 Ancient Treants.",
      "6 Ancient Treants yen."
    ],
    "story": [
      "The oldest treants have rooted themselves around a buried stone vault. Their bark carries the same oath-marks found deeper in Ironwood, turning a forest mystery into a trail toward something deliberately hidden.",
      "Die ältesten Treants haben ihre Wurzeln um ein vergrabenes Steingewölbe geschlungen. Ihre Rinde trägt dieselben Eidzeichen wie die Bäume tief in Ironwood. Aus dem Rätsel des Waldes wird eine Spur zu etwas, das absichtlich verborgen wurde.",
      "Los treants más antiguos han echado raíces alrededor de una bóveda de piedra enterrada. Su corteza lleva las mismas marcas de juramento halladas en las profundidades de Ironwood. El misterio del bosque conduce así a algo ocultado deliberadamente.",
      "De oudste treants hebben wortel geschoten rond een begraven stenen kluis. Hun bast draagt dezelfde eedtekens als die diep in Ironwood. Zo leidt het raadsel van het bos naar iets dat doelbewust verborgen werd.",
      "I treants più antichi hanno messo radici attorno a una volta di pietra sepolta. La loro corteccia reca gli stessi segni del giuramento trovati nel cuore di Ironwood. Il mistero della foresta diventa così una pista verso qualcosa di nascosto di proposito.",
      "Les plus anciens tréants ont pris racine autour d'un caveau de pierre enfoui. Leur écorce porte les mêmes marques de serment que celles découvertes au fond d'Ironwood. Le mystère de la forêt mène ainsi vers un secret délibérément dissimulé.",
      "Древнейшие треанты укоренились вокруг погребённого каменного хранилища. На их коре те же знаки клятвы, что встречаются в глубине Ironwood. Лесная тайна превращается в след, ведущий к чему-то намеренно сокрытому.",
      "En yaşlı treantlar, toprağa gömülü taş bir mahzenin çevresine kök salmış. Kabuklarında Ironwood'un derinliklerindeki yemin işaretlerinin aynısı var. Ormanın gizemi, bilerek saklanmış bir şeye uzanan iz hâline geliyor."
    ]
  },
  "QST_010": {
    "name": [
      "Lanterns in Fog",
      "Laternen im Nebel",
      "Faroles en la niebla",
      "Lantaarns in de mist",
      "Lanterne nella nebbia",
      "Des lanternes dans la brume",
      "Фонари в тумане",
      "Sisteki Fenerler"
    ],
    "description": [
      "Defeat 10 Lantern Wretches.",
      "Besiege 10 Lantern Wretches.",
      "Derrota a 10 Lantern Wretches.",
      "Versla 10 Lantern Wretches.",
      "Sconfiggi 10 Lantern Wretches.",
      "Vainquez 10 Lantern Wretches.",
      "Победите 10 Lantern Wretches.",
      "10 Lantern Wretches yen."
    ],
    "story": [
      "Lanterns appear along the abandoned royal road after sunset. Travelers who follow them vanish. The things carrying those lights wear scraps of an army that should have died with the old oath.",
      "Nach Sonnenuntergang erscheinen Laternen an der verlassenen Königsstraße. Reisende, die ihnen folgen, verschwinden. Die Gestalten mit den Lichtern tragen Reste einer Armee, die mit dem alten Eid hätte sterben müssen.",
      "Tras la puesta del sol aparecen faroles en la antigua calzada real. Los viajeros que los siguen desaparecen. Las criaturas que portan esas luces llevan restos de un ejército que debió morir con el viejo juramento.",
      "Na zonsondergang verschijnen lantaarns langs de verlaten koningsweg. Reizigers die ze volgen verdwijnen. De wezens die de lichten dragen, hebben resten aan van een leger dat met de oude eed had moeten sterven.",
      "Dopo il tramonto compaiono lanterne lungo la strada reale abbandonata. I viaggiatori che le seguono scompaiono. Le creature che le portano indossano i resti di un esercito che avrebbe dovuto morire con l'antico giuramento.",
      "Après le coucher du soleil, des lanternes apparaissent le long de l'ancienne route royale. Les voyageurs qui les suivent disparaissent. Les êtres qui les portent arborent les vestiges d'une armée qui aurait dû périr avec le vieux serment.",
      "После заката вдоль заброшенной королевской дороги появляются фонари. Путники, идущие за ними, исчезают. Те, кто несёт огни, одеты в обрывки доспехов армии, которая должна была погибнуть вместе с древней клятвой.",
      "Gün batınca terk edilmiş kral yolunda fenerler beliriyor. Işıkları izleyen yolcular kayboluyor. Fenerleri taşıyan yaratıklar, eski yeminle birlikte yok olması gereken bir ordudan kalma parçalar giyiyor."
    ]
  }
} as const satisfies Record<string,Record<StoryField,EightLanguages>>;
export const chapterTwoQuestCopy=withRebasedLevels(authoredChapterTwoQuestCopy);
