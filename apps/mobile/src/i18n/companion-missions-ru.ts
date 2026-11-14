/** Russian Sanctuary Expedition display names, keyed by stable ID and exact server-authored English source. */
export const russianCompanionMissionNames:Readonly<Record<string,readonly [source:string,translation:string]>>={
  "MISSION_SCOUT_2H": [
    "Asterfall Perimeter Patrol",
    "Патруль окраин Астерфолла"
  ],
  "MISSION_APPRENTICE_3H": [
    "Apprentice Field Survey",
    "Полевое исследование учеников"
  ],
  "MISSION_SILVERBROOK_4H": [
    "Silverbrook Relief Run",
    "Доставка помощи в Сильвербрук"
  ],
  "MISSION_SUNSCAR_4H": [
    "Sunscar Caravan Guard",
    "Охрана каравана Санскара"
  ],
  "MISSION_FROST_SCOUT_4H": [
    "Frostmarch Whiteout Scout",
    "Разведка снежной мглы Фростмарча"
  ],
  "MISSION_ASTERFALL_SHRINE_8H": [
    "Forgotten Asterfall Shrine",
    "Забытое святилище Астерфолла"
  ],
  "MISSION_SUNSCAR_RUINS_8H": [
    "Sunscar Ruin Survey",
    "Исследование руин Санскара"
  ],
  "MISSION_FROST_8H": [
    "Frostmarch Bell Route",
    "Маршрут колоколов Фростмарча"
  ],
  "MISSION_ASH_RESCUE_8H": [
    "Ashlands Furnace Rescue",
    "Спасательная операция у горнила Эшлендса"
  ],
  "MISSION_ASH_12H": [
    "Ashlands Crucible Watch",
    "Дозор у горнила Эшлендса"
  ],
  "MISSION_GREENFIELDS_FORAGE_2H": [
    "Greenfields Forage Run",
    "Сбор припасов в Гринфилдс"
  ],
  "MISSION_IRONWOOD_TRACK_4H": [
    "Ironwood Tracking Detail",
    "Поиск следов в Айронвуде"
  ],
  "MISSION_SUNSCAR_RELIC_6H": [
    "Sunscar Relic Survey",
    "Поиск реликвий Санскара"
  ],
  "MISSION_FROST_RESONANCE_6H": [
    "Frostmarch Resonance Survey",
    "Исследование резонанса Фростмарча"
  ],
  "MISSION_ASHLANDS_SALVAGE_8H": [
    "Blackglass Salvage Run",
    "Сбор чёрного стекла"
  ],
  "MISSION_OLD_FRIENDS_8H": [
    "Old Friends Patrol",
    "Патруль старых друзей"
  ],
  "MISSION_PRESTIGE_VIGIL_12H": [
    "Sanctuary Prestige Vigil",
    "Престижный дозор святилища"
  ]
};

/** These two expedition-only IDs are not in the regular item-name registry. */
export const russianMissionOnlyMaterials:Readonly<Record<string,string>>={
  SUPPLIES:'Припасы',
  TRIAL_SANCTUARY_MATERIAL:'Материалы святилища спутников',
};
