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
  bg:'#0b1018',panel:'#151e2b',panel2:'#1c2939',line:'#314259',
  text:'#eef4ff',muted:'#93a4ba',disabled:'#64748b',accent:'#d4ad58',
  good:'#7fc59b',bad:'#e08888',warning:'#e6bd72',info:'#7bb7df',
};

/** Shared presentation tokens for the approved dark-navy / warm-gold equipment surfaces. */
export const equipmentColors={
  background:'#07111c',stage:'#071a2b',panel:'#0c1d2e',panelRaised:'#11283d',
  line:'#725a2b',lineStrong:'#c69a3d',gold:'#f2c14e',goldSoft:'#efd895',
  selected:'#123e61',selectedLine:'#43bdf2',
};
