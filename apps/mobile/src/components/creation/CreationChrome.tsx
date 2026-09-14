import {useState,type ReactNode} from 'react';
import {Image,PixelRatio,Platform,Pressable,StyleSheet,Text,View,type ImageStyle,type StyleProp,type ViewStyle} from 'react-native';
import {creationFrames,type CreationSlice} from '../../theme/creation-ui-assets';

export const creationColors={ink:'#080E17',panel:'#111D2B',gold:'#E9C782',muted:'#A5B2C4',blue:'#8FDCF4',line:'#685333'};
const pixelImage=(Platform.OS==='web'?{imageRendering:'pixelated'}:{}) as ImageStyle;

/** Responsive nine-slice chrome; text/content determines height, caps never stretch. */
export function CreationFrame({children,frame=creationFrames.input_default_9slice,style,contentStyle}:{children:ReactNode;frame?:CreationSlice;style?:StyleProp<ViewStyle>;contentStyle?:StyleProp<ViewStyle>}){
  const [size,setSize]=useState({width:0,height:0});
  const snap=PixelRatio.roundToNearestPixel;
  const {width:w,height:h}=size,c=frame.insets;
  const xs=[0,snap(c.left),snap(w-c.right),w],ys=[0,snap(c.top),snap(h-c.bottom),h];
  return <View style={[{position:'relative',minWidth:c.left+c.right+8,minHeight:c.top+c.bottom+8},style]}
    onLayout={({nativeEvent:{layout}})=>{const width=snap(layout.width),height=snap(layout.height);setSize(old=>old.width===width&&old.height===height?old:{width,height});}}>
    {w>c.left+c.right&&h>c.top+c.bottom&&<View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      {['top','middle','bottom'].flatMap((row,r)=>['left','center','right'].map((column,col)=><Image key={`${row}_${column}`} source={frame.slices[`${row}_${column}`]} accessible={false} fadeDuration={0} resizeMode="stretch" style={[pixelImage,{position:'absolute',left:xs[col],top:ys[r],width:xs[col+1]-xs[col],height:ys[r+1]-ys[r]}]}/>))}
    </View>}
    <View style={[{paddingHorizontal:28,paddingVertical:12},contentStyle]}>{children}</View>
  </View>;
}

export function CreationAction({title,onPress,disabled=false,secondary=false,selected}:{title:string;onPress:()=>void;disabled?:boolean;secondary?:boolean;selected?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled,selected}} disabled={disabled} onPress={onPress} style={({pressed})=>({opacity:disabled ? .5 : pressed ? .78 : 1,minHeight:52,paddingHorizontal:22,paddingVertical:12,borderRadius:16,borderWidth:secondary?0:1,borderColor:'#58788C',backgroundColor:secondary?'#101B27':'#203C50',justifyContent:'center',alignItems:'center'})}>
    <Text style={{fontSize:16,fontWeight:'600',color:disabled?creationColors.muted:creationColors.gold,textAlign:'center',includeFontPadding:false,textAlignVertical:'center'}}>{title}</Text>
  </Pressable>;
}
