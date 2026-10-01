import {resolveTheme,type ThemeColors} from './theme';

/** Legacy accent names are aliases for the selected game theme, not a separate palette. */
export function coopTheme(C:ThemeColors){return {
  background:C.bg,surface:C.panel,surfaceRaised:C.panelRaised,
  gold:C.accent,goldDim:C.line,cyan:C.selectionLine,blue:C.primaryButton,
  text:C.text,textSecondary:C.text,textMuted:C.muted,
  success:C.good,danger:C.bad,violet:C.special,warning:C.warning,
  line:C.line,lineStrong:C.lineStrong,selection:C.selection,
  primaryButton:C.primaryButton,primaryButtonBorder:C.primaryButtonBorder,primaryButtonText:C.primaryButtonText,
  secondaryButton:C.secondaryButton,secondaryButtonBorder:C.secondaryButtonBorder,secondaryButtonText:C.secondaryButtonText,
  dangerButton:C.dangerButton,dangerButtonBorder:C.dangerButtonBorder,dangerButtonText:C.dangerButtonText,
};}
export type CoopColors=ReturnType<typeof coopTheme>;
export const coopColors=coopTheme(resolveTheme());

export const coopSpacing={xs:4,sm:8,md:12,lg:16,xl:20,xxl:24,hero:32};
export const coopRadii={panel:16,button:14,tile:10};
export const coopSizing={referenceWidth:390,pagePadding:16,narrowPagePadding:12,minimumTarget:48,bottomNav:68,smallIcon:24,roleIcon:32,nodeIcon:40,boonIcon:56};
export const coopTypography={
  title:{fontSize:26,lineHeight:32,fontWeight:'700' as const},
  section:{fontSize:19,lineHeight:25,fontWeight:'700' as const},
  body:{fontSize:16,lineHeight:22},
  meta:{fontSize:14,lineHeight:20},
  button:{fontSize:17,lineHeight:22,fontWeight:'600' as const},
};
