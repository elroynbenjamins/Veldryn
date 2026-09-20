import {Platform} from 'react-native';

export const displayFont=Platform.select({ios:'Georgia',android:'serif',default:'Georgia'});
export const spacing={xs:4,sm:8,md:12,lg:16,xl:24};
export const radii={sm:8,md:14,lg:18};
export const typography={
  caption:{fontSize:12,lineHeight:16},
  body:{fontSize:14,lineHeight:20},
  bodyStrong:{fontSize:14,lineHeight:21,fontWeight:'600' as const},
  title:{fontFamily:displayFont,fontSize:19,lineHeight:25,fontWeight:'700' as const},
  hero:{fontFamily:displayFont,fontSize:25,lineHeight:32,fontWeight:'700' as const},
};
export const touchTargetMin=44;
export const touchTargetPreferred=48;

export type ThemeId='veldryn'|'obsidian'|'ivory';
export type ThemeColors={
  bg:string;panel:string;panel2:string;line:string;text:string;muted:string;disabled:string;
  accent:string;good:string;bad:string;warning:string;info:string;
  action:string;actionBorder:string;actionText:string;selection:string;selectionLine:string;
  nav:string;topBar:string;input:string;overlay:string;shadow:string;inverseText:string;
};
export type EquipmentColors={
  background:string;stage:string;panel:string;panelRaised:string;line:string;lineStrong:string;
  gold:string;goldSoft:string;selected:string;selectedLine:string;
};
export type AppTheme={id:ThemeId;name:string;description:string;dark:boolean;colors:ThemeColors;equipmentColors:EquipmentColors};

export const THEMES:Record<ThemeId,AppTheme>={
  veldryn:{
    id:'veldryn',name:'VELDRYN',description:'Deep Asterfall navy with warm gold progression accents and crisp cyan interaction states.',dark:true,
    colors:{
      bg:'#07111C',panel:'#0D1E2D',panel2:'#14283A',line:'#345066',
      text:'#F1F6FC',muted:'#9DAFC0',disabled:'#66788A',accent:'#E2B74D',
      good:'#57C98A',bad:'#E47778',warning:'#E7B85F',info:'#63B6DE',
      action:'#214B63',actionBorder:'#4F9EC2',actionText:'#F3FAFF',
      selection:'#123E61',selectionLine:'#43BDF2',nav:'#081522',topBar:'#06101A',
      input:'#0A1825',overlay:'rgba(0,0,0,.70)',shadow:'#000000',inverseText:'#07111C',
    },
    equipmentColors:{
      background:'#07111C',stage:'#081A29',panel:'#0D1E2D',panelRaised:'#14283A',
      line:'#725A2B',lineStrong:'#C69A3D',gold:'#F2C14E',goldSoft:'#EFD895',
      selected:'#123E61',selectedLine:'#43BDF2',
    },
  },
  obsidian:{
    id:'obsidian',name:'Obsidian',description:'Near-black high contrast with bright frost-blue actions and vivid gold rewards.',dark:true,
    colors:{
      bg:'#05070A',panel:'#10141A',panel2:'#181E26',line:'#526273',
      text:'#FFFFFF',muted:'#C1CBD5',disabled:'#7B8794',accent:'#FFD166',
      good:'#68E0A0',bad:'#FF7B84',warning:'#FFD166',info:'#78C8FF',
      action:'#134F73',actionBorder:'#63CCFF',actionText:'#FFFFFF',
      selection:'#103D59',selectionLine:'#6ED5FF',nav:'#070A0E',topBar:'#030507',
      input:'#0B0F14',overlay:'rgba(0,0,0,.78)',shadow:'#000000',inverseText:'#05070A',
    },
    equipmentColors:{
      background:'#05070A',stage:'#080D12',panel:'#10141A',panelRaised:'#181E26',
      line:'#7A642E',lineStrong:'#E3B64E',gold:'#FFD166',goldSoft:'#FFE6A0',
      selected:'#103D59',selectedLine:'#6ED5FF',
    },
  },
  ivory:{
    id:'ivory',name:'Ivory',description:'Warm parchment-light high contrast with navy structure, royal blue actions and antique gold rewards.',dark:false,
    colors:{
      bg:'#F4F0E7',panel:'#FFFDF8',panel2:'#EAE4D8',line:'#697586',
      text:'#18212B',muted:'#52606E',disabled:'#8A949E',accent:'#9A6A12',
      good:'#1F7A4D',bad:'#B33A45',warning:'#9A6510',info:'#1D6692',
      action:'#175E8A',actionBorder:'#0E4D75',actionText:'#FFFFFF',
      selection:'#D9EEF8',selectionLine:'#147FB5',nav:'#EEE8DD',topBar:'#E8E1D4',
      input:'#FFFDF8',overlay:'rgba(20,25,31,.48)',shadow:'#5C5347',inverseText:'#FFFFFF',
    },
    equipmentColors:{
      background:'#F4F0E7',stage:'#E7E0D3',panel:'#FFFDF8',panelRaised:'#EEE7DA',
      line:'#9B7A39',lineStrong:'#8A651E',gold:'#9A6A12',goldSoft:'#7C5716',
      selected:'#D9EEF8',selectedLine:'#147FB5',
    },
  },
};

export const DEFAULT_THEME_ID:ThemeId='veldryn';
export function resolveTheme(id?:ThemeId|null):AppTheme{return THEMES[id&&THEMES[id]?id:DEFAULT_THEME_ID];}

/** Backward-compatible static tokens. New or theme-aware UI should use useTheme(). */
export const C=THEMES.veldryn.colors;
export const equipmentColors=THEMES.veldryn.equipmentColors;
