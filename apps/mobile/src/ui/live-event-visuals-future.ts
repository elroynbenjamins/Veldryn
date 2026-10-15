import type {LiveEventVisualBundle} from './live-event-visuals-active';

/** Source-only visual pack for the next scheduled annual event. Move this bundle into the active registry when its server window opens. */
export const MERCHANT_GUILD_FESTIVAL:LiveEventVisualBundle={
  heroBackground:require('../../assets/card-backgrounds/guild_plaza_portrait.webp'),
  showcaseBackground:require('../../assets/card-backgrounds/guild_plaza_wide_v2.webp'),
  badgeIcon:require('../../assets/events/merchant_guild/badge_v2.png'),
  commonCurrencyIcon:require('../../assets/events/merchant_guild/currency_guild_scrip_v2.png'),
  prestigeCurrencyIcon:require('../../assets/events/merchant_guild/currency_caravan_seal_v2.png'),
  candyIcon:require('../../assets/events/merchant_guild/candy_guild_caramel.png'),
  discoveryArt:{
    trade_token:require('../../assets/events/merchant_guild/discovery_trade_token.png'),
    merchant_seal:require('../../assets/events/merchant_guild/discovery_merchant_seal.png'),
    ledger_mark:require('../../assets/events/merchant_guild/discovery_ledger_mark.png'),
    caravan_standard:require('../../assets/events/merchant_guild/discovery_caravan_standard.png'),
  },
  rewardArt:{
    EVT_PET_018:require('../../assets/event_collectibles/merchant_guild_festival/pets/EVT_PET_018_Ledger_Ferret.png'),
    EVT_PET_019:require('../../assets/event_collectibles/merchant_guild_festival/pets/EVT_PET_019_Guildcrest_Drakelet.png'),
    EVT_UNIT_010:require('../../assets/event_collectibles/merchant_guild_festival/companions/EVT_UNIT_010_Caravan_Sentinel.png'),
    bg_merchant_guild:require('../../assets/profile-backgrounds/bg_merchant_guild.webp'),
  },
  enemyArt:{
    local:require('../../assets/events/merchant_guild/enemies/roadside_raider.png'),
    trade:require('../../assets/events/merchant_guild/enemies/toll_brute.png'),
    guild:require('../../assets/events/merchant_guild/enemies/coinbound_beast.png'),
  },
};
