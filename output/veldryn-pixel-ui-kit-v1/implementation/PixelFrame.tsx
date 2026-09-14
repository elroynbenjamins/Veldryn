import React, {type ReactNode} from 'react';
import {Image, PixelRatio, Platform, Pressable, StyleSheet, Text, View,
  type ImageStyle, type StyleProp, type ViewStyle} from 'react-native';
import {assets, type SliceAsset} from './assets';

type Props = {
  asset: SliceAsset;
  width: number;
  height?: number;
  /** Integer art scale; density selection is handled separately by Metro. */
  scale?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Art only: labels and interaction semantics belong to the containing control. */
export function PixelFrame({asset, width, scale=1, height=asset.height*scale, children, style}: Props) {
  if (!Number.isInteger(scale) || scale < 1) throw new Error('PixelFrame scale must be a positive integer.');
  const snap = PixelRatio.roundToNearestPixel;
  const w=snap(width), h=snap(height);
  if (asset.mode === '3slice' && Math.abs(h-asset.height*scale)>0.01)
    throw new Error('Three-slice assets retain their native height × scale.');
  if (asset.mode === 'fixed' && (w!==asset.width*scale || h!==asset.height*scale))
    throw new Error('Fixed artwork retains its native dimensions × scale.');
  const inset=asset.insets;
  if (inset && (w<(inset.left+inset.right+8)*scale ||
    (asset.mode==='9slice' && h<(inset.top+inset.bottom+8)*scale)))
    throw new Error('PixelFrame is smaller than its protected caps.');
  const px = (Platform.OS==='web' ? {imageRendering:'pixelated'} : {}) as ImageStyle;
  const art = (key:string, x:number,y:number,r:number,b:number) =>
    <Image key={key} source={asset.slices[key]} accessible={false} fadeDuration={0}
      resizeMode="stretch" style={[{position:'absolute',left:x,top:y,width:r-x,height:b-y},px]}/>;
  let pieces:ReactNode;
  if (!inset) {
    pieces=<Image source={asset.source} accessible={false} fadeDuration={0} resizeMode="contain"
      style={[StyleSheet.absoluteFill, {width:w,height:h},px]}/>;
  } else {
    // Shared rounded boundaries ensure adjacent images never disagree at a seam.
    const xs=[0,snap(inset.left*scale),snap(w-inset.right*scale),w];
    if(asset.mode==='3slice') pieces=['left','center','right'].map((key,c)=>art(key,xs[c],0,xs[c+1],h));
    else {
      const ys=[0,snap(inset.top*scale),snap(h-inset.bottom*scale),h];
      pieces=['top','middle','bottom'].flatMap((row,r)=>['left','center','right'].map((col,c)=>
        art(`${row}_${col}`,xs[c],ys[r],xs[c+1],ys[r+1])));
    }
  }
  const p=asset.padding;
  return <View style={[style,{width:w,height:h}]}>
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>{pieces}</View>
    {children!=null && <View style={{flex:1,paddingTop:p.top*scale,paddingRight:p.right*scale,
      paddingBottom:p.bottom*scale,paddingLeft:p.left*scale}}>{children}</View>}
  </View>;
}

type ButtonProps={label:string;width:number;onPress:()=>void;disabled?:boolean;variant?:'primary'|'secondary'|'destructive'};
export function PixelButton({label,width,onPress,disabled=false,variant='primary'}:ButtonProps){
  return <Pressable disabled={disabled} onPress={onPress} accessibilityRole="button"
    accessibilityLabel={label} accessibilityState={{disabled}}
    style={{minHeight:48,width,alignItems:'center',justifyContent:'center'}}>
    {({pressed})=>{
      const asset=disabled?assets.button_disabled_3slice:
        variant==='primary'?(pressed?assets.button_primary_pressed_3slice:assets.button_primary_3slice):
        variant==='destructive'?assets.button_destructive_3slice:assets.button_secondary_3slice;
      return <PixelFrame asset={asset} width={width}>
        <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
          <Text style={{color:disabled?'#A3ACB8':'#F0D49A',fontSize:16,fontWeight:'600',textAlignVertical:'center',includeFontPadding:false}}>{label}</Text>
        </View>
      </PixelFrame>;
    }}
  </Pressable>;
}
