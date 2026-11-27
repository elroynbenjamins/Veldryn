import type {LiveEventVisualKey} from '../content/live-event-visual-keys';
export interface LiveEventVisualBundle{heroBackground:number;showcaseBackground?:number;badgeIcon?:number;commonCurrencyIcon?:number;prestigeCurrencyIcon?:number;candyIcon?:number;discoveryArt:Readonly<Record<string,number>>;rewardArt:Readonly<Record<string,number>>;enemyArt?:Readonly<Record<string,number>>}
const EMPTY_ART:Readonly<Record<string,number>>=Object.freeze({});
const VEILBREAK:LiveEventVisualBundle={
 heroBackground:require('../../assets/card-backgrounds/veilbreak_portrait.webp'),showcaseBackground:require('../../assets/card-backgrounds/veilbreak_wide_v2.webp'),badgeIcon:require('../../assets/events/veilbreak/badge.png'),commonCurrencyIcon:require('../../assets/events/veilbreak/currency_veil_shard.png'),prestigeCurrencyIcon:require('../../assets/events/veilbreak/currency_lantern_ember.png'),candyIcon:require('../../assets/events/veilbreak/candy_gloam_runtime.webp'),
 discoveryArt:{gloam_cinder:require('../../assets/events/veilbreak/discovery_gloam_cinder_runtime.webp'),waxen_sigil:require('../../assets/events/veilbreak/discovery_waxen_sigil_runtime.webp'),breach_fragment:require('../../assets/events/veilbreak/discovery_breach_fragment_runtime.webp')},
 rewardArt:{EVT_PET_013:require('../../assets/event_collectibles/veilbreak/pets/EVT_PET_013_Gloomkin_runtime.webp'),EVT_PET_014:require('../../assets/event_collectibles/veilbreak/pets/EVT_PET_014_Lantern_Mimic_runtime.webp'),EVT_UNIT_007:require('../../assets/event_collectibles/veilbreak/companions/EVT_UNIT_007_Veil_Hound_runtime.webp'),EVT_UNIT_008:require('../../assets/event_collectibles/veilbreak/companions/EVT_UNIT_008_Hollow_Knightling_runtime.webp'),EVT_UNIT_011:require('../../assets/event_collectibles/veilbreak/companions/EVT_UNIT_011_Lantern_Keeper_runtime.webp'),'event:veilbreak-2026-lantern-warden':require('../../assets/profile-icons-v1/veilbreak-2026-lantern-warden_runtime.webp'),'event:veilbreak-2026-pumpkin-moon':require('../../assets/profile-icons-v1/veilbreak-2026-pumpkin-moon_runtime.webp'),bg_veilbreak:require('../../assets/profile-backgrounds/bg_veilbreak.webp'),frame_gloamward:require('../../assets/profile-borders/frame_gloamward.png'),border_halloween_veil:require('../../assets/guild-customization/borders/border_halloween_veil_runtime.webp'),halloween_pumpkin_lantern:require('../../assets/guild-customization/banners/banner_halloween_pumpkin_lantern_runtime.webp'),halloween_bat_moon:require('../../assets/guild-customization/banners/banner_halloween_bat_moon_runtime.webp'),'EVT_ANNUAL_010_2026:candy:skill':require('../../assets/events/veilbreak/candy_gloam_runtime.webp'),'EVT_ANNUAL_010_2026:candy:combat':require('../../assets/events/veilbreak/candy_gloam_runtime.webp'),'EVT_ANNUAL_010_2026:candy:companion':require('../../assets/events/veilbreak/candy_gloam_runtime.webp'),emote_candle_circle:require('../../assets/events/veilbreak/emote_gloam_facepalm_runtime.webp'),emote_laughing_crow:require('../../assets/events/veilbreak/emote_laughing_crow_runtime.webp'),emote_lantern_watch:require('../../assets/events/veilbreak/emote_lantern_watch_runtime.webp'),emote_sleeping_scarecrow:require('../../assets/events/veilbreak/emote_sleeping_scarecrow_runtime.webp'),emote_veil_salute:require('../../assets/events/veilbreak/emote_pumpkin_panic_runtime.webp')},
};
const FROSTFALL:LiveEventVisualBundle={
 heroBackground:require('../../assets/profile-backgrounds/bg_frostfall.webp'),
 badgeIcon:require('../../assets/events/frostfall/badge.png'),
 commonCurrencyIcon:require('../../assets/events/frostfall/currency_frostbell_token.png'),
 prestigeCurrencyIcon:require('../../assets/events/frostfall/currency_aurora_chime.png'),
 candyIcon:require('../../assets/events/frostfall/candy_frostmint.png'),
 discoveryArt:EMPTY_ART,
 rewardArt:{
  EVT_PET_015:require('../../assets/event_collectibles/frostfall_festival/pets/EVT_PET_015_Snowbell_Pup.png'),
  EVT_PET_017:require('../../assets/event_collectibles/frostfall_festival/pets/EVT_PET_017_Aurora_Fox.png'),
  EVT_UNIT_009:require('../../assets/event_collectibles/frostfall_festival/companions/EVT_UNIT_009_Frostbell_Herald.png'),
  EVT_UNIT_012:require('../../assets/event_collectibles/frostfall_festival/companions/EVT_UNIT_012_Rimeshard_Wolverine.png'),
  EVT_UNIT_013:require('../../assets/event_collectibles/frostfall_festival/companions/EVT_UNIT_013_Hearthguard_Ram.png'),
  emote_snowbell_ring:require('../../assets/events/frostfall/frostfall_emotes_runtime/emote_frostbell_cheer_runtime.webp'),
  emote_frostfall_wave:require('../../assets/events/frostfall/frostfall_emotes_runtime/emote_frozen_shock_runtime.webp'),
  emote_aurora_chime:require('../../assets/events/frostfall/frostfall_emotes_runtime/emote_aurora_hug_runtime.webp'),
  emote_cozy_hearth:require('../../assets/events/frostfall/frostfall_emotes_runtime/emote_cozy_hearth_runtime.webp'),
  emote_snowball_attack:require('../../assets/events/frostfall/frostfall_emotes_runtime/emote_snowball_attack_runtime.webp'),
  bg_frostfall:require('../../assets/profile-backgrounds/bg_frostfall.webp'),
  frame_frostfall_aurora_bellframe:require('../../assets/profile-borders/frame_frostfall_aurora_bellframe.webp'),
  'event:frostfall-2026-snowbell':require('../../assets/profile-icons-v1/frostfall-2026-snowman.webp'),
  'event:frostfall-2026-maiden':require('../../assets/profile-icons-v1/frostfall-2026-maiden.webp'),
  'event:frostfall-2026-adventurer':require('../../assets/profile-icons-v1/frostfall-2026-adventurer.webp'),
  'EVT_ANNUAL_012_2026:candy:skill':require('../../assets/events/frostfall/candy_frostmint.png'),
  'EVT_ANNUAL_012_2026:candy:combat':require('../../assets/events/frostfall/candy_frostmint.png'),
  'EVT_ANNUAL_012_2026:candy:companion':require('../../assets/events/frostfall/candy_frostmint.png'),
 },
};
const GENERIC:LiveEventVisualBundle={heroBackground:require('../../assets/card-backgrounds/veilbreak_portrait.webp'),discoveryArt:EMPTY_ART,rewardArt:EMPTY_ART};
export function liveEventVisuals(visualKey?:LiveEventVisualKey){return visualKey==='veilbreak'?VEILBREAK:visualKey==='frostfall'?FROSTFALL:GENERIC;}
export function liveEventVisualCoverage(visualKey:LiveEventVisualKey,discoveryIds:readonly string[]=[]){const bundle=liveEventVisuals(visualKey);return {dedicatedBundle:visualKey==='veilbreak'||visualKey==='frostfall',badgeArt:!!bundle.badgeIcon,commonCurrencyArt:!!bundle.commonCurrencyIcon,prestigeCurrencyArt:!!bundle.prestigeCurrencyIcon,discoveryArtCount:discoveryIds.filter(id=>!!bundle.discoveryArt[id]).length,discoveryTotal:discoveryIds.length};}
