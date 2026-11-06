import type {Language} from './languages';

/** Alchemy's twelve potions and eight equipment infusion materials.
 * Canonical item IDs and source English names are retained for validation. */
export const alchemyItemNames={
  "DEWLEAF_DRAUGHT": {
    "en": "Dewleaf Draught",
    "de": "Taublatttrank",
    "es": "Pócima de hoja de rocío",
    "nl": "Dauwbladbrouwsel",
    "it": "Pozione di foglia di rugiada",
    "fr": "Breuvage de feuille de rosée",
    "ru": "Настой росолиста",
    "tr": "Çiy Yaprağı İksiri"
  },
  "RIVERHEART_DRAUGHT": {
    "en": "Riverheart Draught",
    "de": "Flussherztrank",
    "es": "Pócima corazón del río",
    "nl": "Rivierhartbrouwsel",
    "it": "Pozione cuore del fiume",
    "fr": "Breuvage du cœur de rivière",
    "ru": "Настой речного сердца",
    "tr": "Nehir Yüreği İksiri"
  },
  "OATHBLOOM_DRAUGHT": {
    "en": "Oathbloom Draught",
    "de": "Eidblütentrank",
    "es": "Pócima de flor del juramento",
    "nl": "Eedbloesembrouwsel",
    "it": "Pozione fiore del giuramento",
    "fr": "Breuvage de fleur du serment",
    "ru": "Настой цветка клятвы",
    "tr": "Yemin Çiçeği İksiri"
  },
  "VIGOR_TONIC": {
    "en": "Vigor Tonic",
    "de": "Stärkungstonikum",
    "es": "Tónico de vigor",
    "nl": "Krachttonicum",
    "it": "Tonico del vigore",
    "fr": "Tonique de vigueur",
    "ru": "Тоник силы",
    "tr": "Güç Toniği"
  },
  "GREATER_VIGOR_TONIC": {
    "en": "Greater Vigor Tonic",
    "de": "Großes Stärkungstonikum",
    "es": "Tónico de vigor superior",
    "nl": "Sterk krachttonicum",
    "it": "Tonico del vigore superiore",
    "fr": "Tonique de vigueur supérieur",
    "ru": "Усиленный тоник силы",
    "tr": "Üstün Güç Toniği"
  },
  "OATH_VIGOR_TONIC": {
    "en": "Oath Vigor Tonic",
    "de": "Eid-Stärkungstonikum",
    "es": "Tónico de vigor del juramento",
    "nl": "Eedkrachttonicum",
    "it": "Tonico del vigore del giuramento",
    "fr": "Tonique de vigueur du serment",
    "ru": "Тоник силы клятвы",
    "tr": "Yemin Gücü Toniği"
  },
  "WARD_TONIC": {
    "en": "Ward Tonic",
    "de": "Schutztonikum",
    "es": "Tónico protector",
    "nl": "Beschermingstonicum",
    "it": "Tonico di protezione",
    "fr": "Tonique de protection",
    "ru": "Защитный тоник",
    "tr": "Koruma Toniği"
  },
  "GREATER_WARD_TONIC": {
    "en": "Greater Ward Tonic",
    "de": "Großes Schutztonikum",
    "es": "Tónico protector superior",
    "nl": "Sterk beschermingstonicum",
    "it": "Tonico di protezione superiore",
    "fr": "Tonique de protection supérieur",
    "ru": "Усиленный защитный тоник",
    "tr": "Üstün Koruma Toniği"
  },
  "OATH_WARD_TONIC": {
    "en": "Oath Ward Tonic",
    "de": "Eid-Schutztonikum",
    "es": "Tónico protector del juramento",
    "nl": "Eedbeschermingstonicum",
    "it": "Tonico di protezione del giuramento",
    "fr": "Tonique de protection du serment",
    "ru": "Защитный тоник клятвы",
    "tr": "Yemin Koruma Toniği"
  },
  "HARMONY_TONIC": {
    "en": "Harmony Tonic",
    "de": "Harmonietonikum",
    "es": "Tónico de armonía",
    "nl": "Harmonietonicum",
    "it": "Tonico dell'armonia",
    "fr": "Tonique d'harmonie",
    "ru": "Тоник гармонии",
    "tr": "Uyum Toniği"
  },
  "GREATER_HARMONY_TONIC": {
    "en": "Greater Harmony Tonic",
    "de": "Großes Harmonietonikum",
    "es": "Tónico de armonía superior",
    "nl": "Sterk harmonietonicum",
    "it": "Tonico dell'armonia superiore",
    "fr": "Tonique d'harmonie supérieur",
    "ru": "Усиленный тоник гармонии",
    "tr": "Üstün Uyum Toniği"
  },
  "OATH_HARMONY_TONIC": {
    "en": "Oath Harmony Tonic",
    "de": "Eid-Harmonietonikum",
    "es": "Tónico de armonía del juramento",
    "nl": "Eedharmonietonicum",
    "it": "Tonico dell'armonia del giuramento",
    "fr": "Tonique d'harmonie du serment",
    "ru": "Тоник гармонии клятвы",
    "tr": "Yemin Uyumu Toniği"
  },
  "VERDANT_BINDING_RESIN": {
    "en": "Verdant Binding Resin",
    "de": "Grünes Bindeharz",
    "es": "Resina aglutinante verdante",
    "nl": "Groene bindhars",
    "it": "Resina legante verdeggiante",
    "fr": "Résine liante verdoyante",
    "ru": "Зелёная связующая смола",
    "tr": "Yeşil Bağlama Reçinesi"
  },
  "IRONWOOD_BINDING_RESIN": {
    "en": "Ironwood Binding Resin",
    "de": "Eisenholz-Bindeharz",
    "es": "Resina aglutinante de Ironwood",
    "nl": "IJzerhout-bindhars",
    "it": "Resina legante di Ironwood",
    "fr": "Résine liante d'Ironwood",
    "ru": "Связующая смола Железного леса",
    "tr": "Demirağaç Bağlama Reçinesi"
  },
  "OATHGLASS_SOLVENT": {
    "en": "Oathglass Solvent",
    "de": "Eidglas-Lösungsmittel",
    "es": "Disolvente de cristal jurado",
    "nl": "Eedglas-oplosmiddel",
    "it": "Solvente del vetro del giuramento",
    "fr": "Solvant de verre du serment",
    "ru": "Растворитель клятвостекла",
    "tr": "Yemin Camı Çözücüsü"
  },
  "SUNSCAR_DUNE_BINDER": {
    "en": "Dune Binding Resin",
    "de": "Dünen-Bindeharz",
    "es": "Resina aglutinante de dunas",
    "nl": "Duinbindhars",
    "it": "Resina legante delle dune",
    "fr": "Résine liante des dunes",
    "ru": "Связующая смола дюн",
    "tr": "Kumul Bağlama Reçinesi"
  },
  "GLASSBOUND_BINDER": {
    "en": "Glassbound Binding Resin",
    "de": "Glasgebundenes Bindeharz",
    "es": "Resina aglutinante de cristal",
    "nl": "Glasgebonden bindhars",
    "it": "Resina legante del vetro",
    "fr": "Résine liante du verre",
    "ru": "Связующая смола стеклянных уз",
    "tr": "Cam Bağlı Reçine"
  },
  "SUNFUSED_FIXATIVE": {
    "en": "Sunfused Fixative",
    "de": "Sonnenglut-Fixiermittel",
    "es": "Fijador solar",
    "nl": "Zonnesmelt-fixeermiddel",
    "it": "Fissativo solare",
    "fr": "Fixateur solaire",
    "ru": "Солнцесплавный закрепитель",
    "tr": "Güneş Kaynağı Sabitleyici"
  },
  "RIMEWARD_DISTILLATE": {
    "en": "Rimeward Distillate",
    "de": "Reifschutz-Destillat",
    "es": "Destilado protector de escarcha",
    "nl": "Rijpbeschermer-distillaat",
    "it": "Distillato antigelo",
    "fr": "Distillat de garde-givre",
    "ru": "Дистиллят морозной защиты",
    "tr": "Kırağı Koruma Damıtığı"
  },
  "CINDERHEART_ELIXIR": {
    "en": "Cinderheart Elixir",
    "de": "Glutherz-Elixier",
    "es": "Elixir de corazón de brasa",
    "nl": "Sintelhartelixer",
    "it": "Elisir del cuore di brace",
    "fr": "Élixir du cœur de braise",
    "ru": "Эликсир угольного сердца",
    "tr": "Kor Yüreği İksiri"
  }
} as const satisfies Record<string,Record<Language,string>>;
