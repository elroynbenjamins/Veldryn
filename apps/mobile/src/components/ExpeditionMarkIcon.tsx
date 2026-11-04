import {Image} from 'react-native';

/** Expedition Marks: a shared icon for permanent dungeon currency. */
export function ExpeditionMarkIcon({size=28}:{size?:number}){
 return <Image source={require('../../assets/currency/expedition-marks.webp')} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" resizeMode="contain" style={{width:size,height:size}}/>;
}
