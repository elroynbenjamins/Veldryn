import {useState,type ReactNode} from 'react';
import {Image,StyleSheet,View,type ImageSourcePropType} from 'react-native';
import {profileBackdropTopInset} from '../core/profile-frame-layout';

/** Clip artwork independently of profile content, sharing the frame's scale.
 * Do not crop the portrait, badge shelf, guild tag or ornamental overlay. */
export function ProfileBorderBackdrop({borderId,source,existingInset,children}:{
 borderId?:string|null;source?:ImageSourcePropType;existingInset:number;children:ReactNode;
}){
 const [size,setSize]=useState({width:0,height:0});
 if(!source||borderId!=='frame_gloamward')return <>{children}</>;
 const asset=Image.resolveAssetSource?.(source);
 const aspect=asset?.width&&asset?.height?asset.width/asset.height:16/9;
 const top=profileBackdropTopInset(borderId,size.width+existingInset*2,size.height+existingInset*2,aspect,existingInset);
 return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}
  onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
  {size.width>0&&size.height>0?<View style={[StyleSheet.absoluteFill,{top,overflow:'hidden'}]}>{children}</View>:null}
 </View>;
}
