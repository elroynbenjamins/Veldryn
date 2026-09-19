export interface LiveEventVisualBundle{
  heroBackground:number;
  commonCurrencyIcon?:number;
  prestigeCurrencyIcon?:number;
  discoveryArt:Readonly<Record<string,number>>;
  rewardArt:Readonly<Record<string,number>>;
}

const EMPTY_ART:Readonly<Record<string,number>>=Object.freeze({});

const GENERIC:LiveEventVisualBundle={
  heroBackground:require('../../assets/profile-backgrounds/bg_cosmic_gate.png'),
  discoveryArt:EMPTY_ART,
  rewardArt:EMPTY_ART,
};

const VISUALS:Record<string,LiveEventVisualBundle>={
  harvestwake:{
    heroBackground:require('../../assets/profile-backgrounds/bg_harvestwake.png'),
    commonCurrencyIcon:require('../../assets/events/harvestwake/currency_harvest_mark.png'),
    prestigeCurrencyIcon:require('../../assets/events/harvestwake/currency_amber_seed.png'),
    discoveryArt:{
      whispering_husk:require('../../assets/events/harvestwake/discovery_whispering_husk.png'),
      golden_field_feather:require('../../assets/events/harvestwake/discovery_golden_field_feather.png'),
      amber_artisan_seal:require('../../assets/events/harvestwake/discovery_amber_artisan_seal.png'),
      guardian_lantern:require('../../assets/events/harvestwake/discovery_guardian_lantern.png'),
    },
    rewardArt:{
      pet_harvest_fox:require('../../assets/events/harvestwake/pet_harvest_fox.png'),
      pet_field_mouse:require('../../assets/events/harvestwake/pet_field_mouse.png'),
      pet_straw_sparrow:require('../../assets/events/harvestwake/pet_straw_sparrow.png'),
      pet_amber_owl:require('../../assets/events/harvestwake/pet_amber_owl.png'),
      emote_harvest_cheer:require('../../assets/events/harvestwake/emote_harvest_cheer.png'),
      emote_scarecrow_salute:require('../../assets/events/harvestwake/emote_scarecrow_salute.png'),
      frame_amber_vine:require('../../assets/profile-borders/frame_amber_vine.png'),
      frame_wheat_crown:require('../../assets/profile-borders/frame_wheat_crown.png'),
      EVT_UNIT_006:require('../../assets/event_collectibles/harvestwake/companions/EVT_UNIT_006_Harvest_Guardian.png'),
    },
  },
  heartbond:{heroBackground:require('../../assets/profile-backgrounds/bg_heartbond.png'),discoveryArt:EMPTY_ART,rewardArt:EMPTY_ART},
  bloomwake:{heroBackground:require('../../assets/profile-backgrounds/bg_bloomwake.png'),discoveryArt:EMPTY_ART,rewardArt:EMPTY_ART},
  starfall:{heroBackground:require('../../assets/profile-backgrounds/bg_starfall.png'),discoveryArt:EMPTY_ART,rewardArt:EMPTY_ART},
  veilbreak:{heroBackground:require('../../assets/profile-backgrounds/bg_veilbreak.png'),discoveryArt:EMPTY_ART,rewardArt:EMPTY_ART},
  frostfall:{heroBackground:require('../../assets/profile-backgrounds/bg_frostfall.png'),discoveryArt:EMPTY_ART,rewardArt:EMPTY_ART},
};

export function liveEventVisuals(visualKey?:string):LiveEventVisualBundle{
  return visualKey?VISUALS[visualKey]??GENERIC:GENERIC;
}
