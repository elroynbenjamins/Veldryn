import {Platform} from 'react-native';

export const displayFont=Platform.select({ios:'Georgia',android:'serif',default:'Georgia'});
export const spacing={xs:4,sm:8,md:12,lg:16,xl:24};
export const radii={sm:8,md:14,lg:18};
export const typography={
  caption:{fontSize:12,lineHeight:16},
  body:{fontSize:14,lineHeight:20},
  bodyStrong:{fontSize:14,lineHeight:21,fontWeight:'600' as const},
  title:{fontFamily:displayFont,fontSize:19,lineHeight:25,fontWeight:'700' as const},
  hero:{fontFamily:displayFont,fontSize:26,lineHeight:33,fontWeight:'700' as const},
};
export const touchTargetMin=44;
export const touchTargetPreferred=48;

export type UiThemeId='veldryn'|'obsidian'|'ivory';
export type ThemeColors={
  id:UiThemeId; name:string; dark:boolean;
  bg:string; panel:string; panel2:string; panelRaised:string; stage:string;
  line:string; lineStrong:string; text:string; muted:string; disabled:string;
  accent:string; accentSoft:string; selection:string; selectionLine:string;
  good:string; bad:string; warning:string; info:string;
  navBg:string; inputBg:string; overlay:string;
  primaryButton:string; primaryButtonBorder:string; primaryButtonText:string;
  secondaryButton:string; secondaryButtonBorder:string; secondaryButtonText:string;
  dangerButton:string; dangerButtonBorder:string; dangerButtonText:string;
};
export const UI_THEMES:Record<UiThemeId,ThemeColors>={
  veldryn:{id:'veldryn',name:'Veldryn',dark:true,bg:'#07111C',panel:'#0D1E2D',panel2:'#14283A',panelRaised:'#173149',stage:'#081827',line:'#33485D',lineStrong:'#A67D2D',text:'#F3F7FC',muted:'#9FB0C2',disabled:'#667789',accent:'#E2B74D',accentSoft:'#F0D58E',selection:'#123E61',selectionLine:'#3EA6D8',good:'#57C98A',bad:'#E47D82',warning:'#E7B85B',info:'#62B8E5',navBg:'#081522',inputBg:'#0B1A28',overlay:'rgba(0,0,0,.70)',primaryButton:'#17638A',primaryButtonBorder:'#3EA6D8',primaryButtonText:'#F7FBFF',secondaryButton:'#132637',secondaryButtonBorder:'#3B5268',secondaryButtonText:'#ECF4FA',dangerButton:'#3A2027',dangerButtonBorder:'#9A535B',dangerButtonText:'#F8C1C4'},
  obsidian:{id:'obsidian',name:'Obsidian Contrast',dark:true,bg:'#050608',panel:'#11151B',panel2:'#19212B',panelRaised:'#202A35',stage:'#080B0F',line:'#52606D',lineStrong:'#FFC857',text:'#F8FAFC',muted:'#C2CBD5',disabled:'#7D8792',accent:'#FFC857',accentSoft:'#FFE3A0',selection:'#0D4059',selectionLine:'#55C2FF',good:'#61D095',bad:'#FF858A',warning:'#FFD166',info:'#72CEFF',navBg:'#080A0D',inputBg:'#0D1117',overlay:'rgba(0,0,0,.78)',primaryButton:'#096B99',primaryButtonBorder:'#55C2FF',primaryButtonText:'#FFFFFF',secondaryButton:'#171E26',secondaryButtonBorder:'#657585',secondaryButtonText:'#FFFFFF',dangerButton:'#451F27',dangerButtonBorder:'#FF858A',dangerButtonText:'#FFFFFF'},
  ivory:{id:'ivory',name:'Ivory Steel',dark:false,bg:'#F5F2E9',panel:'#FFFFFF',panel2:'#EAE6DC',panelRaised:'#FDFBF5',stage:'#E6E0D3',line:'#9AA4AE',lineStrong:'#9A6B12',text:'#17202A',muted:'#52606D',disabled:'#87919B',accent:'#9A6B12',accentSoft:'#704C08',selection:'#DCEFF8',selectionLine:'#176B9C',good:'#16784A',bad:'#B4232B',warning:'#8B5A00',info:'#176B9C',navBg:'#FFFFFF',inputBg:'#FFFFFF',overlay:'rgba(20,28,36,.42)',primaryButton:'#176B9C',primaryButtonBorder:'#0C527B',primaryButtonText:'#FFFFFF',secondaryButton:'#FFFFFF',secondaryButtonBorder:'#75818C',secondaryButtonText:'#17202A',dangerButton:'#FFF0F0',dangerButtonBorder:'#B4232B',dangerButtonText:'#8D151B'},
};
export const DEFAULT_UI_THEME:UiThemeId='veldryn';
export function resolveTheme(id?:UiThemeId):ThemeColors{return UI_THEMES[id??DEFAULT_UI_THEME]??UI_THEMES.veldryn;}
export function equipmentTheme(C:ThemeColors){return {background:C.bg,stage:C.stage,panel:C.panel,panelRaised:C.panelRaised,line:C.lineStrong,lineStrong:C.lineStrong,gold:C.accent,goldSoft:C.accentSoft,selected:C.selection,selectedLine:C.selectionLine};}

/** Legacy static tokens for UI that has not yet moved to runtime theme hooks. */
export const C={bg:UI_THEMES.veldryn.bg,panel:UI_THEMES.veldryn.panel,panel2:UI_THEMES.veldryn.panel2,line:UI_THEMES.veldryn.line,text:UI_THEMES.veldryn.text,muted:UI_THEMES.veldryn.muted,disabled:UI_THEMES.veldryn.disabled,accent:UI_THEMES.veldryn.accent,good:UI_THEMES.veldryn.good,bad:UI_THEMES.veldryn.bad,warning:UI_THEMES.veldryn.warning,info:UI_THEMES.veldryn.info};
export const equipmentColors=equipmentTheme(UI_THEMES.veldryn);
