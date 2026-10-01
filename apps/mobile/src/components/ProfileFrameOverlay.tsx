import {useState} from 'react';
import {Image,StyleSheet,View,type ImageSourcePropType} from 'react-native';
import {profileFrameSegments} from '../core/profile-frame-layout';

/** Last sibling in the card: no rounded clipping, no second CSS border. */
export function ProfileFrameOverlay({source}:{source:ImageSourcePropType}){
 const [size,setSize]=useState({width:0,height:0});
 // React Native Web has no resolveAssetSource; this catalog is authored at 16:9.
 const asset=Image.resolveAssetSource?.(source),aspect=asset?.width&&asset?.height?asset.width/asset.height:16/9;
 return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{zIndex:10}]} onLayout={({nativeEvent:{layout}})=>setSize(previous=>previous.width===layout.width&&previous.height===layout.height?previous:{width:layout.width,height:layout.height})}>
  {profileFrameSegments(size.width,size.height,aspect).map(p=><View key={p.key} style={{position:'absolute',overflow:'hidden',left:p.x,top:p.y,width:p.width,height:p.height}}>
   <Image accessible={false} source={source} resizeMode="stretch" style={{position:'absolute',left:p.imageLeft,top:p.imageTop,width:p.imageWidth,height:p.imageHeight}}/>
  </View>)}
 </View>;
}
