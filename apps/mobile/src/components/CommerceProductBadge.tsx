import {Image,type ImageSourcePropType} from 'react-native';
import type {CommerceProductId} from '../content/commerce-products';
import {PLAYER_BADGE_ARTWORK} from './player-badge-artwork';

// Store, chat and all profile/name displays resolve the same bundled icons.
const artwork:Record<CommerceProductId,ImageSourcePropType>={
 vip:PLAYER_BADGE_ARTWORK.vip,
 vip_plus:PLAYER_BADGE_ARTWORK.vip_plus,
 supporter_monthly:PLAYER_BADGE_ARTWORK.supporter,
};

export function CommerceProductBadge({productId,size}:{productId:CommerceProductId;size:number}){
 return <Image source={artwork[productId]} style={{width:size,height:size}} resizeMode="contain" accessible={false}/>;
}
