import {Platform} from 'react-native';

export const displayFont=Platform.select({ios:'Georgia',android:'serif',default:'Georgia'});
export const spacing={xs:4,sm:8,md:12,lg:16,xl:24};
export const radii={sm:8,md:14,lg:18};
export const typography={
  caption:{fontSize:12,lineHeight:16},
  body:{fontSize:14,lineHeight:20},
  bodyStrong:{fontSize:14,lineHeight:21,fontWeight:'600' as const},
  title:{fontFamily:displayFont,fontSize:19,lineHeight:25,fontWeight:'700' as const},
  hero:{fontFamily:displayFont,fontSize:28,lineHeight:36,fontWeight:'700' as const},
};
export const touchTargetMin=44;
export const touchTargetPreferred=48;
export const C={
  bg:'#07111C',panel:'#0D1E2D',panel2:'#14283A',line:'#38506A',
  text:'#F3F7FC',muted:'#9BAFC4',disabled:'#66798C',accent:'#E2B74D',
  good:'#57C98A',bad:'#EC7D83',warning:'#E9B95D',info:'#67BDE8',
};

/** Shared presentation tokens for the approved dark-navy / warm-gold equipment surfaces. */
export const equipmentColors={
  background:'#07111C',stage:'#081827',panel:'#0D1E2D',panelRaised:'#14283A',
  line:'#6E5528',lineStrong:'#B58A35',gold:'#E2B74D',goldSoft:'#F0D58C',
  selected:'#123B56',selectedLine:'#3EA6D8',
};
