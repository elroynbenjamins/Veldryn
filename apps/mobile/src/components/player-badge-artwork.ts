import type {ImageSourcePropType} from 'react-native';
import type {PlayerBadgeId} from '../core/player-badges';

/**
 * The single bundled artwork catalogue for player identity badges.
 * Store membership art and worn VIP badges must be visually identical;
 * collectible/staff badges keep their approved player-badge artwork.
 *
 * Keep static require paths so the artwork is available offline.
 */
export const PLAYER_BADGE_ARTWORK:Record<Exclude<PlayerBadgeId,`ascendant_${string}`>,ImageSourcePropType>&Partial<Record<Extract<PlayerBadgeId,`ascendant_${string}`>,ImageSourcePropType>>={
 admin:require('../../assets/player-badges-v1/admin.webp'),
 moderator:require('../../assets/player-badges-v1/moderator.webp'),
 supporter:require('../../assets/player-badges-v1/supporter.webp'),
 supporter_3m:require('../../assets/player-badges-v1/supporter_3m.webp'),
 supporter_6m:require('../../assets/player-badges-v1/supporter_6m.webp'),
 supporter_12m:require('../../assets/player-badges-v1/supporter_12m.webp'),
 founder:require('../../assets/player-badges-v1/founder.webp'),
 veteran:require('../../assets/player-badges-v1/veteran.webp'),
 guild_leader:require('../../assets/player-badges-v1/guild_leader.webp'),
 community_champion:require('../../assets/player-badges-v1/community_champion.webp'),
 event_champion:require('../../assets/player-badges-v1/event_champion.webp'),
 ascendant_sovereign_of_stars:require('../../assets/ascendant/celestial/sovereign_badge_64.webp'),
 ascendant_dragon_sovereign:require('../../assets/ascendant/draconic/dragon_sovereign_64.webp'),
 ascendant_monarch_of_deep:require('../../assets/ascendant/abyssal/monarch_of_the_deep_64.webp'),
 ascendant_beyond_existence:require('../../assets/ascendant/paradox/beyond_existence_64.webp'),
 vip:require('../../assets/store-membership-badges-v1/vip.png'),
 vip_plus:require('../../assets/store-membership-badges-v1/vip-plus.png'),
};

export const PLAYER_BADGE_FALLBACK_GLYPHS:Partial<Record<PlayerBadgeId,{glyph:string;accent:string}>>={
 ascendant_sovereign_of_stars:{glyph:'✦',accent:'#F5D982'},
 ascendant_dragon_sovereign:{glyph:'◆',accent:'#FF8A45'},
 ascendant_monarch_of_deep:{glyph:'◉',accent:'#6CF2EB'},
 ascendant_beyond_existence:{glyph:'◇',accent:'#EDEBFF'},
};
