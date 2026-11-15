import type {Language} from './languages';
import {itemDef} from '../content/items';
import {germanCoverageText} from './german-coverage';
import {expandedItemNamesA} from './expanded-item-names-a';
import {expandedItemNamesB} from './expanded-item-names-b';
import {alchemyItemNames} from './alchemy-item-names';

/** Source-guarded, ID-based names. These are UI-only, never item identities.
 * Unknown IDs and revised canonical English names retain their source wording. */
export const starterItemNames={
  "HOLY_WATER": {
    "en": "Holy Water",
    "de": "Heiliges Wasser",
    "es": "Agua bendita",
    "nl": "Heilig water",
    "it": "Acqua santa",
    "fr": "Eau bénite",
    "ru": "Святая вода",
    "tr": "Kutsal Su"
  },
  "GEM_DUST": {
    "en": "Gem Dust",
    "de": "Edelsteinstaub",
    "es": "Polvo de gema",
    "nl": "Edelsteenstof",
    "it": "Polvere di gemma",
    "fr": "Poussière de gemme",
    "ru": "Самоцветная пыль",
    "tr": "Mücevher Tozu"
  },
  "REGIONAL_CATALYST": {
    "en": "Regional Catalyst",
    "de": "Regionaler Katalysator",
    "es": "Catalizador regional",
    "nl": "Regionale katalysator",
    "it": "Catalizzatore regionale",
    "fr": "Catalyseur régional",
    "ru": "Региональный катализатор",
    "tr": "Bölgesel Katalizör"
  },
  "RADIANT_CATALYST": {
    "en": "Radiant Catalyst",
    "de": "Strahlender Katalysator",
    "es": "Catalizador radiante",
    "nl": "Stralende katalysator",
    "it": "Catalizzatore radioso",
    "fr": "Catalyseur radieux",
    "ru": "Сияющий катализатор",
    "tr": "Işıltılı Katalizör"
  },
  "TEMPERING_DUST": {
    "en": "Tempering Dust",
    "de": "Härtungsstaub",
    "es": "Polvo de templado",
    "nl": "Hardingsstof",
    "it": "Polvere di tempra",
    "fr": "Poussière de trempe",
    "ru": "Закалочная пыль",
    "tr": "Sertleştirme Tozu"
  },
  "ASTERFALL_MINERAL_ESSENCE": {
    "en": "Asterfall Mineral Essence",
    "de": "Asterfall-Mineralessenz",
    "es": "Esencia mineral de Asterfall",
    "nl": "Minerale essentie van Asterfall",
    "it": "Essenza minerale di Asterfall",
    "fr": "Essence minérale d'Asterfall",
    "ru": "Минеральная эссенция Asterfall",
    "tr": "Asterfall Maden Özü"
  },
  "TEMPERING_CORE": {
    "en": "Tempering Core",
    "de": "Härtungskern",
    "es": "Núcleo de templado",
    "nl": "Hardingskern",
    "it": "Nucleo di tempra",
    "fr": "Noyau de trempe",
    "ru": "Закалочное ядро",
    "tr": "Sertleştirme Çekirdeği"
  },
  "EMBER_SHARD": {
    "en": "Ember Shard",
    "de": "Glutsplitter",
    "es": "Fragmento de brasa",
    "nl": "Gloedscherf",
    "it": "Scheggia di brace",
    "fr": "Éclat de braise",
    "ru": "Осколок угля",
    "tr": "Kor Parçası"
  },
  "EMBERHEART_GEM": {
    "en": "Emberheart Gem",
    "de": "Glutherz-Edelstein",
    "es": "Gema corazón de brasa",
    "nl": "Gloeiendehart-edelsteen",
    "it": "Gemma cuore di brace",
    "fr": "Gemme cœur de braise",
    "ru": "Самоцвет пылающего сердца",
    "tr": "Kor Yüreği Taşı"
  },
  "WARD_SHARD": {
    "en": "Ward Shard",
    "de": "Schutzsplitter",
    "es": "Fragmento protector",
    "nl": "Wachtscherf",
    "it": "Scheggia protettiva",
    "fr": "Éclat protecteur",
    "ru": "Защитный осколок",
    "tr": "Koruma Parçası"
  },
  "WARDHEART_GEM": {
    "en": "Wardheart Gem",
    "de": "Schutzherz-Edelstein",
    "es": "Gema corazón protector",
    "nl": "Wachthart-edelsteen",
    "it": "Gemma cuore protettivo",
    "fr": "Gemme cœur protecteur",
    "ru": "Самоцвет сердца защиты",
    "tr": "Koruyucu Yürek Taşı"
  },
  "VITALITY_SHARD": {
    "en": "Vitality Shard",
    "de": "Vitalitätssplitter",
    "es": "Fragmento de vitalidad",
    "nl": "Vitaliteitsscherf",
    "it": "Scheggia di vitalità",
    "fr": "Éclat de vitalité",
    "ru": "Осколок жизненной силы",
    "tr": "Canlılık Parçası"
  },
  "VITALITY_HEART_GEM": {
    "en": "Vitality Heart Gem",
    "de": "Vitalitätsherz-Edelstein",
    "es": "Gema corazón vital",
    "nl": "Vitaliteitshart-edelsteen",
    "it": "Gemma cuore vitale",
    "fr": "Gemme cœur de vitalité",
    "ru": "Самоцвет жизненного сердца",
    "tr": "Canlılık Yüreği Taşı"
  },
  "SWIFT_SIGIL": {
    "en": "Swift Sigil",
    "de": "Schnelligkeitssiegel",
    "es": "Sello de rapidez",
    "nl": "Snelheidszegel",
    "it": "Sigillo della rapidità",
    "fr": "Sceau de rapidité",
    "ru": "Печать быстроты",
    "tr": "Hız Mührü"
  },
  "BOSSBANE_SIGIL": {
    "en": "Bossbane Sigil",
    "de": "Bossbann-Siegel",
    "es": "Sello matador de jefes",
    "nl": "Baasdoderzegel",
    "it": "Sigillo flagello dei boss",
    "fr": "Sceau fléau des boss",
    "ru": "Печать убийцы боссов",
    "tr": "Boss Avcısı Mührü"
  },
  "BULWARK_SIGIL": {
    "en": "Bulwark Sigil",
    "de": "Bollwerksiegel",
    "es": "Sello de baluarte",
    "nl": "Bolwerkzegel",
    "it": "Sigillo del baluardo",
    "fr": "Sceau du rempart",
    "ru": "Печать бастиона",
    "tr": "Siper Mührü"
  },
  "RENEWAL_SIGIL": {
    "en": "Renewal Sigil",
    "de": "Erneuerungssiegel",
    "es": "Sello de renovación",
    "nl": "Vernieuwingszegel",
    "it": "Sigillo del rinnovamento",
    "fr": "Sceau du renouveau",
    "ru": "Печать обновления",
    "tr": "Yenilenme Mührü"
  },
  "TRAVEL_RATION": {
    "en": "Travel Ration",
    "de": "Reiseration",
    "es": "Ración de viaje",
    "nl": "Reisrantsoen",
    "it": "Razione da viaggio",
    "fr": "Ration de voyage",
    "ru": "Дорожный паёк",
    "tr": "Yol Azığı"
  },
  "COOKED_MEADOW_PERCH": {
    "en": "Cooked Meadow Perch",
    "de": "Gegarter Wiesenbarsch",
    "es": "Perca de pradera cocinada",
    "nl": "Gebakken weidebaars",
    "it": "Persico di prato cotto",
    "fr": "Perche des prés cuite",
    "ru": "Приготовленный луговой окунь",
    "tr": "Pişmiş Çayır Levreği"
  },
  "COOKED_SILVERFIN": {
    "en": "Cooked Silverfin",
    "de": "Gegarte Silberflosse",
    "es": "Aleta plateada cocinada",
    "nl": "Gebakken zilvervin",
    "it": "Pinna argentata cotta",
    "fr": "Nageoire argentée cuite",
    "ru": "Приготовленная серебропёрка",
    "tr": "Pişmiş Gümüşyüzgeç"
  },
  "SEARED_RIVER_EEL": {
    "en": "Seared River Eel",
    "de": "Gebratener Flussaal",
    "es": "Anguila de río sellada",
    "nl": "Gebakken rivieraal",
    "it": "Anguilla di fiume scottata",
    "fr": "Anguille de rivière saisie",
    "ru": "Обжаренный речной угорь",
    "tr": "Mühürlenmiş Nehir Yılan Balığı"
  },
  "COPPER_ORE": {
    "en": "Copper Ore",
    "de": "Kupfererz",
    "es": "Mineral de cobre",
    "nl": "Kopererts",
    "it": "Minerale di rame",
    "fr": "Minerai de cuivre",
    "ru": "Медная руда",
    "tr": "Bakır Cevheri"
  },
  "COPPER_INGOT": {
    "en": "Copper Ingot",
    "de": "Kupferbarren",
    "es": "Lingote de cobre",
    "nl": "Koperstaaf",
    "it": "Lingotto di rame",
    "fr": "Lingot de cuivre",
    "ru": "Медный слиток",
    "tr": "Bakır Külçesi"
  },
  "GREENWOOD_LOG": {
    "en": "Greenwood Log",
    "de": "Grünholzscheit",
    "es": "Tronco de madera verde",
    "nl": "Groenhoutstam",
    "it": "Tronco di legno verde",
    "fr": "Bûche de bois vert",
    "ru": "Бревно зелёного дерева",
    "tr": "Yeşil Odun Kütüğü"
  },
  "IRONWOOD_LOG": {
    "en": "Ironwood Log",
    "de": "Eisenholzscheit",
    "es": "Tronco de madera férrea",
    "nl": "IJzerhoutstam",
    "it": "Tronco di legnoferro",
    "fr": "Bûche de bois de fer",
    "ru": "Бревно железного дерева",
    "tr": "Demirağaç Kütüğü"
  },
  "MEADOW_PERCH": {
    "en": "Meadow Perch",
    "de": "Wiesenbarsch",
    "es": "Perca de pradera",
    "nl": "Weidebaars",
    "it": "Persico di prato",
    "fr": "Perche des prés",
    "ru": "Луговой окунь",
    "tr": "Çayır Levreği"
  },
  "ROOTSTREAM_TROUT": {
    "en": "Rootstream Trout",
    "de": "Wurzelbachforelle",
    "es": "Trucha del arroyo de raíces",
    "nl": "Wortelbeekforel",
    "it": "Trota del ruscello radicato",
    "fr": "Truite du ruisseau des racines",
    "ru": "Форель корневого ручья",
    "tr": "Kökdere Alabalığı"
  },
  "SILVERFIN": {
    "en": "Silverfin",
    "de": "Silberflosse",
    "es": "Aleta plateada",
    "nl": "Zilvervin",
    "it": "Pinna argentata",
    "fr": "Nageoire argentée",
    "ru": "Серебропёрка",
    "tr": "Gümüşyüzgeç"
  },
  "RIVER_EEL": {
    "en": "River Eel",
    "de": "Flussaal",
    "es": "Anguila de río",
    "nl": "Rivieraal",
    "it": "Anguilla di fiume",
    "fr": "Anguille de rivière",
    "ru": "Речной угорь",
    "tr": "Nehir Yılan Balığı"
  },
  "MOSS_FIBER": {
    "en": "Moss Fiber",
    "de": "Moosfaser",
    "es": "Fibra de musgo",
    "nl": "Mosvezel",
    "it": "Fibra di muschio",
    "fr": "Fibre de mousse",
    "ru": "Моховое волокно",
    "tr": "Yosun Lifi"
  },
  "WISP_DUST": {
    "en": "Wisp Dust",
    "de": "Irrlichtstaub",
    "es": "Polvo de fuego fatuo",
    "nl": "Dwaallichtstof",
    "it": "Polvere di fuoco fatuo",
    "fr": "Poussière de feu follet",
    "ru": "Пыль блуждающего огонька",
    "tr": "Peri Işığı Tozu"
  },
  "BOAR_HIDE": {
    "en": "Boar Hide",
    "de": "Eberhaut",
    "es": "Piel de jabalí",
    "nl": "Everzwijnhuid",
    "it": "Pelle di cinghiale",
    "fr": "Peau de sanglier",
    "ru": "Шкура кабана",
    "tr": "Yaban Domuzu Derisi"
  },
  "WOLF_PELT": {
    "en": "Wolf Pelt",
    "de": "Wolfspelz",
    "es": "Piel de lobo",
    "nl": "Wolfsvacht",
    "it": "Pelliccia di lupo",
    "fr": "Fourrure de loup",
    "ru": "Волчья шкура",
    "tr": "Kurt Postu"
  },
  "IRONWOOD_FANG": {
    "en": "Ironwood Fang",
    "de": "Eisenholzfangzahn",
    "es": "Colmillo de Ironwood",
    "nl": "IJzerhoutslagtand",
    "it": "Zanna di Ironwood",
    "fr": "Croc d'Ironwood",
    "ru": "Клык Железного леса",
    "tr": "Demirağaç Dişi"
  },
  "THORN_SAP": {
    "en": "Thorn Sap",
    "de": "Dornensaft",
    "es": "Savia de espina",
    "nl": "Doornsap",
    "it": "Linfa di rovo",
    "fr": "Sève d'épine",
    "ru": "Терновый сок",
    "tr": "Diken Özsuyu"
  },
  "TROLL_HIDE": {
    "en": "Troll Hide",
    "de": "Trollhaut",
    "es": "Piel de trol",
    "nl": "Trollenhuid",
    "it": "Pelle di troll",
    "fr": "Peau de troll",
    "ru": "Шкура тролля",
    "tr": "Trol Derisi"
  },
  "OATHGLASS_SHARD": {
    "en": "Oathglass Shard",
    "de": "Eidglassplitter",
    "es": "Fragmento de cristal jurado",
    "nl": "Eedglasscherf",
    "it": "Scheggia di vetro del giuramento",
    "fr": "Éclat de verre du serment",
    "ru": "Осколок клятвостекла",
    "tr": "Yemin Camı Parçası"
  },
  "ECHO_TOUCHED_PELT": {
    "en": "Echo-Touched Pelt",
    "de": "Echoberührter Pelz",
    "es": "Piel tocada por el eco",
    "nl": "Echo-aangeraakte vacht",
    "it": "Pelliccia toccata dall'eco",
    "fr": "Fourrure marquée par l'écho",
    "ru": "Шкура, тронутая эхом",
    "tr": "Yankı Dokunmuş Post"
  },
  "TORN_OATHCLOTH": {
    "en": "Torn Oathcloth",
    "de": "Zerrissenes Eidtuch",
    "es": "Tela de juramento rasgada",
    "nl": "Gescheurd eeddoek",
    "it": "Tessuto del giuramento lacerato",
    "fr": "Étoffe du serment déchirée",
    "ru": "Разорванная ткань клятвы",
    "tr": "Yırtık Yemin Kumaşı"
  },
  "LANTERNSTEEL_SHARD": {
    "en": "Lanternsteel Shard",
    "de": "Laternenstahlsplitter",
    "es": "Fragmento de acero de farol",
    "nl": "Lantaarnstaalscherf",
    "it": "Scheggia di acciaio-lanterna",
    "fr": "Éclat d'acier-lanterne",
    "ru": "Осколок фонарной стали",
    "tr": "Fener Çeliği Parçası"
  },
  "FALLEN_KNIGHT_SIGIL": {
    "en": "Fallen Knight Sigil",
    "de": "Siegel des Gefallenen Ritters",
    "es": "Sello del Caballero Caído",
    "nl": "Zegel van de Gevallen Ridder",
    "it": "Sigillo del Cavaliere Caduto",
    "fr": "Sceau du Chevalier Déchu",
    "ru": "Печать Павшего Рыцаря",
    "tr": "Düşmüş Şövalye Mührü"
  }
} as const satisfies Record<string,Record<Language,string>>;

/** Consolidated presentation registry; the original 41-row export is retained for compatibility. */
export const allItemNames={...starterItemNames,...expandedItemNamesA,...expandedItemNamesB,...alchemyItemNames} as const;

export function localizedItemName(language:Language,itemId:string):string{
 // A reward from a newer server may not yet exist in this client's catalog.
 // Presentation falls back to the raw ID; gameplay operations still validate it.
 let item:ReturnType<typeof itemDef>;
 try{item=itemDef(itemId)}catch{return itemId.replace(/_/g,' ');}
 const row=Object.prototype.hasOwnProperty.call(allItemNames,itemId)?allItemNames[itemId as keyof typeof allItemNames]:undefined;
 return row&&row.en===item.name?row[language]??item.name:language==='de'?(germanCoverageText(item.name)??item.name):item.name;
}
