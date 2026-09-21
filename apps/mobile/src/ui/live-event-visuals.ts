import type {LiveEventVisualKey} from '../content/live-event-visual-keys';
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

export const LIVE_EVENT_VISUALS:Readonly<Record<LiveEventVisualKey,LiveEventVisualBundle>>={
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
      EVT_PET_011:require('../../assets/event_collectibles/harvestwake/pets/EVT_PET_011_Pumpkin_Piglet.png'),
      EVT_PET_012:require('../../assets/event_collectibles/harvestwake/pets/EVT_PET_012_Golden_Sheafling.png'),
      pet_harvest_fox:require('../../assets/events/harvestwake/pet_harvest_fox.png'),
      pet_field_mouse:require('../../assets/events/harvestwake/pet_field_mouse.png'),
      pet_straw_sparrow:require('../../assets/events/harvestwake/pet_straw_sparrow.png'),
      pet_amber_owl:require('../../assets/events/harvestwake/pet_amber_owl.png'),
      emote_harvest_cheer:require('../../assets/events/harvestwake/emote_harvest_cheer.png'),
      emote_scarecrow_salute:require('../../assets/events/harvestwake/emote_scarecrow_salute.png'),
      frame_amber_vine:require('../../assets/profile-borders/frame_amber_vine.png'),
      frame_wheat_crown:require('../../assets/profile-borders/frame_wheat_crown.png'),
    },
  },
  turning_of_the_age:{
    heroBackground:require('../../assets/profile-backgrounds/bg_cosmic_gate.png'),
    commonCurrencyIcon:require('../../assets/events/turning_of_the_age/currency_age_token.png'),
    prestigeCurrencyIcon:require('../../assets/events/turning_of_the_age/currency_first_dawn_seal.png'),
    discoveryArt:EMPTY_ART,
    rewardArt:{
      EVT_PET_001:require('../../assets/event_collectibles/turning_of_the_age/pets/EVT_PET_001_Chronicle_Wisp.png'),
      EVT_PET_002:require('../../assets/event_collectibles/turning_of_the_age/pets/EVT_PET_002_Gilded_Hourling.png'),
      EVT_UNIT_001:require('../../assets/event_collectibles/turning_of_the_age/companions/EVT_UNIT_001_Keeper_of_First_Dawn.png'),
    },
  },
  heartbond:{
    heroBackground:require('../../assets/profile-backgrounds/bg_heartbond.png'),
    commonCurrencyIcon:require('../../assets/events/heartbond/currency_heart_token.png'),
    prestigeCurrencyIcon:require('../../assets/events/heartbond/currency_vow_rose.png'),
    discoveryArt:EMPTY_ART,
    rewardArt:{
      EVT_PET_003:require('../../assets/event_collectibles/heartbond_festival/pets/EVT_PET_003_Rosebud_Bun.png'),
      EVT_PET_004:require('../../assets/event_collectibles/heartbond_festival/pets/EVT_PET_004_Heartwing.png'),
      EVT_UNIT_002:require('../../assets/event_collectibles/heartbond_festival/companions/EVT_UNIT_002_Vowbound_Cherub.png'),
    },
  },
  bloomwake:{
    heroBackground:require('../../assets/profile-backgrounds/bg_bloomwake.png'),
    commonCurrencyIcon:require('../../assets/events/bloomwake/currency_bloom_token.png'),
    prestigeCurrencyIcon:require('../../assets/events/bloomwake/currency_verdant_seed.png'),
    discoveryArt:EMPTY_ART,
    rewardArt:{
      EVT_PET_005:require('../../assets/event_collectibles/bloomwake/pets/EVT_PET_005_Pollenpuff.png'),
      EVT_PET_006:require('../../assets/event_collectibles/bloomwake/pets/EVT_PET_006_Verdant_Fawn.png'),
      EVT_UNIT_003:require('../../assets/event_collectibles/bloomwake/companions/EVT_UNIT_003_Bloomwarden.png'),
    },
  },
  suncrest:{
    heroBackground:require('../../assets/profile-backgrounds/bg_kingdom_approach.png'),
    commonCurrencyIcon:require('../../assets/events/suncrest/currency_suncrest_medal.png'),
    prestigeCurrencyIcon:require('../../assets/events/suncrest/currency_laurel_seal.png'),
    discoveryArt:EMPTY_ART,
    rewardArt:{
      EVT_PET_007:require('../../assets/event_collectibles/suncrest_games/pets/EVT_PET_007_Laurel_Lynx.png'),
      EVT_PET_008:require('../../assets/event_collectibles/suncrest_games/pets/EVT_PET_008_Golden_Gryphlet.png'),
      EVT_UNIT_004:require('../../assets/event_collectibles/suncrest_games/companions/EVT_UNIT_004_Suncrest_Champion.png'),
    },
  },
  starfall:{
    heroBackground:require('../../assets/profile-backgrounds/bg_starfall.png'),
    commonCurrencyIcon:require('../../assets/events/starfall/currency_star_shard.png'),
    prestigeCurrencyIcon:require('../../assets/events/starfall/currency_comet_core.png'),
    discoveryArt:EMPTY_ART,
    rewardArt:{
      EVT_PET_009:require('../../assets/event_collectibles/starfall_nights/pets/EVT_PET_009_Starwhisker.png'),
      EVT_PET_010:require('../../assets/event_collectibles/starfall_nights/pets/EVT_PET_010_Comet_Moth.png'),
      EVT_UNIT_005:require('../../assets/event_collectibles/starfall_nights/companions/EVT_UNIT_005_Astral_Wayfarer.png'),
    },
  },
  merchant_guild:{
    heroBackground:require('../../assets/profile-backgrounds/bg_kingdom_approach.png'),
    commonCurrencyIcon:require('../../assets/events/merchant_guild/currency_guild_scrip.png'),
    prestigeCurrencyIcon:require('../../assets/events/merchant_guild/currency_caravan_seal.png'),
    discoveryArt:EMPTY_ART,
    rewardArt:{
      EVT_PET_018:require('../../assets/event_collectibles/merchant_guild_festival/pets/EVT_PET_018_Ledger_Ferret.png'),
      EVT_PET_019:require('../../assets/event_collectibles/merchant_guild_festival/pets/EVT_PET_019_Guildcrest_Drakelet.png'),
      EVT_UNIT_010:require('../../assets/event_collectibles/merchant_guild_festival/companions/EVT_UNIT_010_Caravan_Sentinel.png'),
    },
  },
  veilbreak:{
    heroBackground:require('../../assets/profile-backgrounds/bg_veilbreak.png'),
    commonCurrencyIcon:require('../../assets/events/veilbreak/currency_veil_shard.png'),
    prestigeCurrencyIcon:require('../../assets/events/veilbreak/currency_lantern_ember.png'),
    discoveryArt:EMPTY_ART,
    rewardArt:{
      EVT_PET_013:require('../../assets/event_collectibles/veilbreak/pets/EVT_PET_013_Gloomkin.png'),
      EVT_PET_014:require('../../assets/event_collectibles_v1/EVT_PET_014.png'),
      EVT_UNIT_007:require('../../assets/event_collectibles/veilbreak/companions/EVT_UNIT_007_Veil_Hound.png'),
      EVT_UNIT_008:require('../../assets/event_collectibles_v1/EVT_UNIT_008.png'),
    },
  },
  frostfall:{
    heroBackground:require('../../assets/profile-backgrounds/bg_frostfall.png'),
    commonCurrencyIcon:require('../../assets/events/frostfall/currency_frostbell_token.png'),
    prestigeCurrencyIcon:require('../../assets/events/frostfall/currency_aurora_chime.png'),
    discoveryArt:EMPTY_ART,
    rewardArt:{
      EVT_PET_015:require('../../assets/event_collectibles_v1/EVT_PET_015.png'),
      EVT_PET_016:require('../../assets/event_collectibles_v1/EVT_PET_016.png'),
      EVT_PET_017:require('../../assets/event_collectibles_v1/EVT_PET_017.png'),
      EVT_UNIT_009:require('../../assets/event_collectibles_v1/EVT_UNIT_009.png'),
    },
  },
};

export function liveEventVisuals(visualKey?:LiveEventVisualKey):LiveEventVisualBundle{
  return visualKey?LIVE_EVENT_VISUALS[visualKey]:GENERIC;
}
export function liveEventVisualCoverage(visualKey:LiveEventVisualKey,discoveryIds:readonly string[]=[]){
  const bundle=liveEventVisuals(visualKey);
  return {
    dedicatedBundle:true,
    commonCurrencyArt:!!bundle.commonCurrencyIcon,
    prestigeCurrencyArt:!!bundle.prestigeCurrencyIcon,
    discoveryArtCount:discoveryIds.filter(id=>!!bundle.discoveryArt[id]).length,
    discoveryTotal:discoveryIds.length,
  };
}
