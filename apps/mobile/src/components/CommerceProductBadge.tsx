import {Image} from 'react-native';
import type {CommerceProductId} from '../content/commerce-products';

const artwork={
 vip:require('../../assets/store-membership-badges-v1/vip.png'),
 vip_plus:require('../../assets/store-membership-badges-v1/vip-plus.png'),
 supporter_monthly:require('../../assets/player-badges-v1/supporter.webp'),
};

export function CommerceProductBadge({productId,size}:{productId:CommerceProductId;size:number}){
 return <Image source={artwork[productId]} style={{width:size,height:size}} resizeMode="contain" accessible={false}/>;
}
