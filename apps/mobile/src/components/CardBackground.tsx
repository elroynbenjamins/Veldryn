import {useState} from 'react';
import {Image,Platform,StyleSheet,View,type ImageStyle} from 'react-native';
import type {CardBackgroundSources} from '../theme/card-background-assets';
import {cardBackgroundVariant,type CardBackgroundVariant} from '../core/card-background-layout';

/** Fills only the card surface. Frame ornaments remain outside this layer. */
export function CardBackground({sources,shade=0}:{sources:CardBackgroundSources;shade?:number}){
 const [variant,setVariant]=useState<CardBackgroundVariant>('wide');
 return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill} onLayout={({nativeEvent:{layout}})=>setVariant(cardBackgroundVariant(layout.width,layout.height))}>
  <Image accessible={false} source={sources[variant]??sources.square} resizeMode="cover" style={[styles.fill,Platform.OS==='web'?{imageRendering:'pixelated'} as ImageStyle:undefined]}/>
  {shade>0?<View style={[StyleSheet.absoluteFill,{backgroundColor:`rgba(5,12,20,${shade})`}]}/>:null}
 </View>;
}
const styles=StyleSheet.create({fill:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'}});
