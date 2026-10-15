import {Text} from 'react-native';

/** Decorative: keep the localized gold label/amount in the surrounding UI. */
export function GoldIcon({size=20}:{size?:number}){
 return <Text accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:size,height:size,lineHeight:size,fontSize:size*.82,textAlign:'center',color:'#F6C95B',fontWeight:'900'}}>●</Text>;
}
