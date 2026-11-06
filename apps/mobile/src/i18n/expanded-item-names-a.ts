import type {Language} from './languages';

/** Additional base catalog item names, part A. All eight UI languages;
 * English source checks happen inside localizedItemName, not in game state. */
export const expandedItemNamesA={
  "basic_sword": {
    "en": "Basic Sword",
    "de": "Einfaches Schwert",
    "es": "Espada básica",
    "nl": "Basiszwaard",
    "it": "Spada base",
    "fr": "Épée de base",
    "ru": "Простой меч",
    "tr": "Temel Kılıç"
  },
  "basic_tower_shield": {
    "en": "Basic Tower Shield",
    "de": "Einfacher Turmschild",
    "es": "Escudo de torre básico",
    "nl": "Basis-torenschild",
    "it": "Scudo a torre base",
    "fr": "Grand bouclier de base",
    "ru": "Простой башенный щит",
    "tr": "Temel Kule Kalkanı"
  },
  "basic_chained_weapon": {
    "en": "Basic Chained Weapon",
    "de": "Einfache Kettenwaffe",
    "es": "Arma de cadena básica",
    "nl": "Basis-kettingwapen",
    "it": "Arma a catena base",
    "fr": "Arme à chaîne de base",
    "ru": "Простое цепное оружие",
    "tr": "Temel Zincirli Silah"
  },
  "basic_mace": {
    "en": "Basic Mace",
    "de": "Einfacher Streitkolben",
    "es": "Maza básica",
    "nl": "Basisknots",
    "it": "Mazza base",
    "fr": "Masse de base",
    "ru": "Простая булава",
    "tr": "Temel Gürz"
  },
  "basic_bow": {
    "en": "Basic Bow",
    "de": "Einfacher Bogen",
    "es": "Arco básico",
    "nl": "Basisboog",
    "it": "Arco base",
    "fr": "Arc de base",
    "ru": "Простой лук",
    "tr": "Temel Yay"
  },
  "basic_two_handed_weapon": {
    "en": "Basic Two-Handed Weapon",
    "de": "Einfache Zweihandwaffe",
    "es": "Arma a dos manos básica",
    "nl": "Basis-tweehandig wapen",
    "it": "Arma a due mani base",
    "fr": "Arme à deux mains de base",
    "ru": "Простое двуручное оружие",
    "tr": "Temel Çift Elli Silah"
  },
  "basic_wand": {
    "en": "Basic Wand",
    "de": "Einfacher Zauberstab",
    "es": "Varita básica",
    "nl": "Basis-toverstaf",
    "it": "Bacchetta base",
    "fr": "Baguette de base",
    "ru": "Простая волшебная палочка",
    "tr": "Temel Asa"
  },
  "basic_main_hand_blade": {
    "en": "Basic Main-Hand Blade",
    "de": "Einfache Haupthandklinge",
    "es": "Hoja principal básica",
    "nl": "Basis-mes voor hoofdhand",
    "it": "Lama principale base",
    "fr": "Lame principale de base",
    "ru": "Простой клинок для основной руки",
    "tr": "Temel Ana El Kılıcı"
  },
  "basic_staff": {
    "en": "Basic Staff",
    "de": "Einfacher Stab",
    "es": "Bastón básico",
    "nl": "Basisstaf",
    "it": "Bastone base",
    "fr": "Bâton de base",
    "ru": "Простой посох",
    "tr": "Temel Değnek"
  },
  "ROASTED_ROOTSTREAM_TROUT": {
    "en": "Roasted Rootstream Trout",
    "de": "Gebratene Wurzelbachforelle",
    "es": "Trucha de arroyo asada",
    "nl": "Geroosterde wortelbeekforel",
    "it": "Trota del ruscello arrosto",
    "fr": "Truite du ruisseau grillée",
    "ru": "Жареная форель корневого ручья",
    "tr": "Közlenmiş Kökdere Alabalığı"
  },
  "IRONWOOD_STEW": {
    "en": "Ironwood Hunter Stew",
    "de": "Eisenholz-Jägereintopf",
    "es": "Estofado de cazador de Ironwood",
    "nl": "IJzerhout-jagersstoofpot",
    "it": "Stufato del cacciatore di Ironwood",
    "fr": "Ragoût du chasseur d'Ironwood",
    "ru": "Похлёбка охотника из Железного леса",
    "tr": "Demirağaç Avcı Yahnisi"
  },
  "OATHSTONE_ORE": {
    "en": "Oathstone Ore",
    "de": "Eidsteinerz",
    "es": "Mineral de piedra del juramento",
    "nl": "Eedsteenerts",
    "it": "Minerale di pietra del giuramento",
    "fr": "Minerai de pierre du serment",
    "ru": "Руда камня клятвы",
    "tr": "Yemintaşı Cevheri"
  },
  "CROWNWOOD_LOG": {
    "en": "Crownwood Log",
    "de": "Kronenholzscheit",
    "es": "Tronco de madera de corona",
    "nl": "Kroonhoutstam",
    "it": "Tronco di legno della corona",
    "fr": "Bûche de bois couronné",
    "ru": "Бревно коронного дерева",
    "tr": "Taç Ağacı Kütüğü"
  },
  "OATHSCALE_PIKE": {
    "en": "Oathscale Pike",
    "de": "Eidschuppen-Hecht",
    "es": "Lucio de escamas juradas",
    "nl": "Eedschub-snoek",
    "it": "Luccio squama del giuramento",
    "fr": "Brochet aux écailles du serment",
    "ru": "Щука клятвенной чешуи",
    "tr": "Yeminpullu Turna"
  },
  "ASTER_IRON_INGOT": {
    "en": "Aster-Iron Ingot",
    "de": "Aster-Eisenbarren",
    "es": "Lingote de hierro de Aster",
    "nl": "Aster-ijzerstaaf",
    "it": "Lingotto di ferro Aster",
    "fr": "Lingot de fer d'Aster",
    "ru": "Астер-железный слиток",
    "tr": "Aster-Demir Külçesi"
  },
  "OATHSTONE_INGOT": {
    "en": "Oathstone Ingot",
    "de": "Eidsteinbarren",
    "es": "Lingote de piedra jurada",
    "nl": "Eedsteenstaaf",
    "it": "Lingotto di pietra del giuramento",
    "fr": "Lingot de pierre du serment",
    "ru": "Слиток камня клятвы",
    "tr": "Yemintaşı Külçesi"
  },
  "REINFORCED_FITTING": {
    "en": "Reinforced Fitting",
    "de": "Verstärkter Beschlag",
    "es": "Herraje reforzado",
    "nl": "Verstevigd beslag",
    "it": "Rinforzo metallico",
    "fr": "Ferrure renforcée",
    "ru": "Усиленное крепление",
    "tr": "Güçlendirilmiş Bağlantı"
  },
  "BAKED_CAVE_LOACH": {
    "en": "Baked Cave Loach",
    "de": "Gebackene Höhlenschmerle",
    "es": "Locha de cueva al horno",
    "nl": "Gebakken grottemodderkruiper",
    "it": "Cobite di grotta al forno",
    "fr": "Loche des cavernes cuite",
    "ru": "Запечённый пещерный вьюн",
    "tr": "Fırında Mağara Çöpçü Balığı"
  },
  "ROASTED_CROWN_CARP": {
    "en": "Roasted Crown Carp",
    "de": "Gebratener Kronenkarpfen",
    "es": "Carpa real asada",
    "nl": "Geroosterde kroonkarper",
    "it": "Carpa della corona arrosto",
    "fr": "Carpe royale rôtie",
    "ru": "Жареный коронный карп",
    "tr": "Közlenmiş Taç Sazanı"
  },
  "ROASTED_OATHSCALE": {
    "en": "Roasted Oathscale Pike",
    "de": "Gebratener Eidschuppen-Hecht",
    "es": "Lucio de escamas juradas asado",
    "nl": "Geroosterde eedschub-snoek",
    "it": "Luccio del giuramento arrosto",
    "fr": "Brochet aux écailles du serment rôti",
    "ru": "Жареная щука клятвенной чешуи",
    "tr": "Közlenmiş Yeminpullu Turna"
  },
  "ASTER_IRON_ORE": {
    "en": "Aster-Iron Ore",
    "de": "Aster-Eisenerz",
    "es": "Mineral de hierro de Aster",
    "nl": "Aster-ijzererts",
    "it": "Minerale di ferro Aster",
    "fr": "Minerai de fer d'Aster",
    "ru": "Астер-железная руда",
    "tr": "Aster-Demir Cevheri"
  },
  "SUNSTONE_ORE": {
    "en": "Sunstone Ore",
    "de": "Sonnensteinerz",
    "es": "Mineral de piedra solar",
    "nl": "Zonnesteenerts",
    "it": "Minerale di pietra solare",
    "fr": "Minerai de pierre solaire",
    "ru": "Руда солнечного камня",
    "tr": "Güneştaşı Cevheri"
  },
  "AMBERGLASS": {
    "en": "Amberglass",
    "de": "Bernsteinglas",
    "es": "Cristal ámbar",
    "nl": "Amberglas",
    "it": "Vetro ambrato",
    "fr": "Verre ambré",
    "ru": "Янтарное стекло",
    "tr": "Kehribar Camı"
  },
  "ASTRAL_SCRIPT": {
    "en": "Astral Script",
    "de": "Astralschrift",
    "es": "Escritura astral",
    "nl": "Astraal schrift",
    "it": "Scrittura astrale",
    "fr": "Écriture astrale",
    "ru": "Астральное письмо",
    "tr": "Astral Yazıt"
  },
  "GLASSBOUND_CORE": {
    "en": "Glassbound Core",
    "de": "Glasgebundener Kern",
    "es": "Núcleo ligado al cristal",
    "nl": "Glasgebonden kern",
    "it": "Nucleo legato al vetro",
    "fr": "Noyau lié au verre",
    "ru": "Ядро стеклянных уз",
    "tr": "Cam Bağlı Çekirdek"
  },
  "FROSTIRON": {
    "en": "Frostiron",
    "de": "Frosteisen",
    "es": "Hierro helado",
    "nl": "Vorstijzer",
    "it": "Ferro gelido",
    "fr": "Fer de givre",
    "ru": "Морозное железо",
    "tr": "Ayaz Demiri"
  },
  "BLACKGLASS_ORE": {
    "en": "Blackglass Ore",
    "de": "Schwarzglaserz",
    "es": "Mineral de cristal negro",
    "nl": "Zwartglaserts",
    "it": "Minerale di vetro nero",
    "fr": "Minerai de verre noir",
    "ru": "Руда чёрного стекла",
    "tr": "Kara Cam Cevheri"
  },
  "RIMEGLASS": {
    "en": "Rimeglass",
    "de": "Reifglas",
    "es": "Cristal escarchado",
    "nl": "Rijpglas",
    "it": "Vetro brinato",
    "fr": "Verre givré",
    "ru": "Инистое стекло",
    "tr": "Kırağı Camı"
  },
  "CHOIR_BLOOM": {
    "en": "Choir Bloom",
    "de": "Chorblüte",
    "es": "Flor del coro",
    "nl": "Koorbloem",
    "it": "Fiore del coro",
    "fr": "Fleur du chœur",
    "ru": "Цветок хора",
    "tr": "Koro Çiçeği"
  },
  "SAFFRON_REED": {
    "en": "Saffron Reed",
    "de": "Safranschilf",
    "es": "Junco azafrán",
    "nl": "Saffraanriet",
    "it": "Giunco zafferano",
    "fr": "Roseau safrané",
    "ru": "Шафрановый тростник",
    "tr": "Safran Kamışı"
  },
  "MIRAGE_BLOOM": {
    "en": "Mirage Bloom",
    "de": "Trugbildblüte",
    "es": "Flor del espejismo",
    "nl": "Luchtspiegelingsbloem",
    "it": "Fiore del miraggio",
    "fr": "Fleur du mirage",
    "ru": "Цветок миража",
    "tr": "Serap Çiçeği"
  },
  "DUNEWOOD": {
    "en": "Dunewood",
    "de": "Dünenholz",
    "es": "Madera de duna",
    "nl": "Duinhout",
    "it": "Legno di duna",
    "fr": "Bois des dunes",
    "ru": "Дюнное дерево",
    "tr": "Kumul Odunu"
  },
  "CHARBARK": {
    "en": "Charbark",
    "de": "Kohlenrinde",
    "es": "Corteza carbonizada",
    "nl": "Koolschors",
    "it": "Corteccia carbonizzata",
    "fr": "Écorce calcinée",
    "ru": "Обугленная кора",
    "tr": "Kömür Kabuğu"
  },
  "CINDERWOOD_LOG": {
    "en": "Cinderwood Log",
    "de": "Aschenholzscheit",
    "es": "Tronco de madera de ceniza",
    "nl": "Sintelhoutstam",
    "it": "Tronco di legno di brace",
    "fr": "Bûche de bois de cendre",
    "ru": "Бревно пепельного дерева",
    "tr": "Köz Odunu Kütüğü"
  }
} as const satisfies Record<string,Record<Language,string>>;
