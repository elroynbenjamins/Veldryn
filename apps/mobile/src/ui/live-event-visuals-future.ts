import type {LiveEventVisualBundle} from './live-event-visuals-active';

/** Source-only visual pack for the next scheduled annual event. Move this bundle into the active registry when its server window opens. */
export const MERCHANT_GUILD_FESTIVAL:LiveEventVisualBundle={
  heroBackground:require('../../assets/card-backgrounds/guild_plaza_portrait.webp'),
  showcaseBackground:require('../../assets/card-backgrounds/guild_plaza_wide_v2.webp'),
  badgeIcon:require('../../assets/events/merchant_guild/badge_v2.webp'),
  commonCurrencyIcon:require('../../assets/events/merchant_guild/currency_guild_scrip_v2.webp'),
  prestigeCurrencyIcon:require('../../assets/events/merchant_guild/currency_caravan_seal_v2.webp'),
  candyIcon:require('../../assets/events/merchant_guild/candy_guild_caramel.webp'),
  discoveryArt:{
    trade_token:require('../../assets/events/merchant_guild/discovery_trade_token.webp'),
    merchant_seal:require('../../assets/events/merchant_guild/discovery_merchant_seal.webp'),
    ledger_mark:require('../../assets/events/merchant_guild/discovery_ledger_mark.webp'),
    caravan_standard:require('../../assets/events/merchant_guild/discovery_caravan_standard.webp'),
  },
  rewardArt:{
    EVT_PET_018:require('../../assets/event_collectibles/merchant_guild_festival/pets/EVT_PET_018_Ledger_Ferret.webp'),
    EVT_PET_019:require('../../assets/event_collectibles/merchant_guild_festival/pets/EVT_PET_019_Guildcrest_Drakelet.webp'),
    EVT_UNIT_010:require('../../assets/event_collectibles/merchant_guild_festival/companions/EVT_UNIT_010_Caravan_Sentinel.webp'),
    bg_merchant_guild:require('../../assets/profile-backgrounds/bg_merchant_guild.webp'),
  },
  enemyArt:{
    local:require('../../assets/events/merchant_guild/enemies/roadside_raider.webp'),
    trade:require('../../assets/events/merchant_guild/enemies/toll_brute.webp'),
    guild:require('../../assets/events/merchant_guild/enemies/coinbound_beast.webp'),
  },
};
