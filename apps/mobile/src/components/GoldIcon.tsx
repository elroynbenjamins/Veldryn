import {Image} from 'react-native';

/** Decorative: keep the localized gold label/amount in the surrounding UI. */
export function GoldIcon({size=20}:{size?:number}){
 return <Image source={require('../../assets/currency/gold-coin-v1.png')} resizeMode="contain" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:size,height:size,flexShrink:0}}/>;
}
