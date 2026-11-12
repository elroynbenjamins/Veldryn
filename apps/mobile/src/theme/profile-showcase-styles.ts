import {StyleSheet} from 'react-native';
import {radii,typography,type ThemeColors} from './theme';

/** Shared, readable identity treatment over both personal and public artwork. */
export function profileShowcaseStyles(C:ThemeColors){
 const gold=C.accentSoft;
 return StyleSheet.create({
  identityPlate:{position:'absolute',left:136,right:16,top:24,maxWidth:'100%',zIndex:4,paddingHorizontal:0,paddingVertical:0,borderWidth:0,borderColor:C.lineStrong,borderRadius:radii.md,backgroundColor:'transparent'},
  /** The identity column is bracketed by the portrait beside it: the name's line box starts
   * at the portrait's top edge, and the badge shelf is pushed down to end on its bottom edge.
   * A minimum height rather than a fixed one, so a longer column (combat power, a wrapped
   * title) still grows instead of being clipped. */
  identityStack:{minHeight:96},
  identityStackCompact:{minHeight:64},
  identityFill:{flexGrow:1,minHeight:7},
  eyebrow:{fontSize:8,lineHeight:11,color:gold,fontWeight:'700',letterSpacing:.6,marginBottom:2},
  name:{...typography.bodyStrong,color:C.text,fontSize:21,lineHeight:27,fontWeight:'800',flexShrink:1},
  title:{fontSize:11,lineHeight:15,color:gold,fontWeight:'600',marginTop:2},
  meta:{fontSize:10,lineHeight:14,color:C.dark?'#dbe4ef':'#344456',fontWeight:'500',marginTop:3},
 });
}
