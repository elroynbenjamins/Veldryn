import {Image} from 'react-native';

/** Decorative: the surrounding UI provides the localized gold amount/label. */
export function GoldIcon({size=20}:{size?:number}){
 return <Image source={require('../../assets/currency/gold-coins.webp')} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" resizeMode="contain" style={{width:size,height:size}}/>;
}
