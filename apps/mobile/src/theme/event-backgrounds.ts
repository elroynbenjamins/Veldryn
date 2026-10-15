import type {LiveEventVisualKey} from '../content/live-event-visual-keys';

/** Shared preview and hero artwork for live events. */
export const EVENT_BACKGROUNDS={
 turning_of_the_age:require('../../assets/events-startup-v1/backgrounds/startup_firstlight.png'),
 heartbond:require('../../assets/card-backgrounds/heartbond_wide_v2.webp'),
 bloomwake:require('../../assets/card-backgrounds/bloomwake_wide_v2.webp'),
 suncrest:require('../../assets/card-backgrounds/kingdom_approach_wide_v2.webp'),
 starfall:require('../../assets/card-backgrounds/starfall_wide_v2.webp'),
 veilbreak:require('../../assets/card-backgrounds/veilbreak_wide_v2.webp'),
 merchant_guild:require('../../assets/card-backgrounds/guild_plaza_wide_v2.webp'),
 frostfall:require('../../assets/card-backgrounds/frostfall_wide_v2.webp'),
 harvestwake:require('../../assets/card-backgrounds/harvestwake_wide_v2.webp'),
} satisfies Record<LiveEventVisualKey,number>;
