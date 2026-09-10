import React,{PropsWithChildren,useState} from 'react';
import {ActivityIndicator,Image,Pressable,ScrollView,StyleProp,StyleSheet,Text,View,ViewStyle} from 'react-native';
import type {CoopRole,CoopUiAssetId} from '../../core/coop-ui-contract';
import {coopUiAssets} from '../../theme/coop-ui-assets';
import {coopColors,coopRadii,coopSizing,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';

export type FantasyPanelVariant='default'|'selected'|'success'|'danger'|'disabled';
export function FantasyPanel({children,variant='default',style}:PropsWithChildren<{variant?:FantasyPanelVariant;style?:StyleProp<ViewStyle>}>){
  return <View accessibilityState={{disabled:variant==='disabled',selected:variant==='selected'}} style={[s.panel,s[`panel_${variant}`],style]}>
    <View pointerEvents="none" style={s.cornerTop}/><View pointerEvents="none" style={s.cornerBottom}/>
    <View style={s.panelInner}>{children}</View>
  </View>;
}

type PrimaryActionProps={label:string;onPress?:()=>void;disabled?:boolean;loading?:boolean;selected?:boolean;tone?:'primary'|'secondary'|'danger';accessibilityLabel?:string;previewPressed?:boolean};
export function PrimaryAction({label,onPress,disabled=false,loading=false,selected=false,tone='primary',accessibilityLabel,previewPressed=false}:PrimaryActionProps){
  const [focused,setFocused]=useState(false),inactive=disabled||loading;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel??label} accessibilityState={{disabled:inactive,busy:loading,selected}} disabled={inactive} onPress={onPress} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={({pressed})=>[s.action,s[`action_${tone}`],selected&&s.actionSelected,(pressed||previewPressed)&&!inactive&&s.actionPressed,focused&&s.actionFocused,inactive&&s.actionDisabled]}>
    {loading?<ActivityIndicator color={coopColors.text}/>:null}<Text style={[s.actionText,tone==='danger'&&s.dangerText]}>{label}</Text>
  </Pressable>;
}

const roleAsset:Record<CoopRole,CoopUiAssetId>={tank:'role_tank',damage:'role_damage',support:'role_support'};
export function RoleBadge({role,label}: {role:CoopRole;label:string}){
  return <View accessibilityLabel={label} style={s.roleBadge}><Image source={coopUiAssets[roleAsset[role]]} resizeMode="contain" style={s.roleImage}/><Text style={s.roleText}>{label}</Text></View>;
}

export function StateChip({label,tone='neutral'}:{label:string;tone?:'neutral'|'selected'|'success'|'warning'|'danger'}){
  return <View style={[s.chip,s[`chip_${tone}`]]}><Text style={[s.chipText,s[`chipText_${tone}`]]}>{label}</Text></View>;
}

type ImageSlotSize='hero'|'room'|'node'|'boon'|'skill';
export function CoopImageSlot({assetId,size='node',fallbackLabel='ART',accessibilityLabel}: {assetId?:CoopUiAssetId;size?:ImageSlotSize;fallbackLabel?:string;accessibilityLabel?:string}){
  const source=assetId?coopUiAssets[assetId]:undefined;
  return <View accessibilityLabel={accessibilityLabel} style={[s.imageSlot,s[`image_${size}`]]}>{source?<Image source={source} resizeMode={size==='hero'||size==='room'?'cover':'contain'} style={s.image}/>:<View style={s.imageFallback}><Text style={s.fallbackMark}>◇</Text><Text style={s.fallbackText}>{fallbackLabel}</Text></View>}</View>;
}

type ShellProps=PropsWithChildren<{eyebrow:string;title:string;onBack?:()=>void;backLabel?:string;banner?:React.ReactNode;stickyAction?:React.ReactNode;testID?:string}>;
/** Content shell for use inside the app's single existing SafeAreaView. */
export function ExpeditionScreenShell({eyebrow,title,onBack,backLabel='Back',banner,stickyAction,children,testID}:ShellProps){
  return <View testID={testID} style={s.shell}>
    <View style={s.shellHeader}>{onBack?<Pressable accessibilityRole="button" accessibilityLabel={backLabel} hitSlop={8} onPress={onBack} style={({pressed})=>[s.back,pressed&&s.backPressed]}><Text style={s.backText}>‹ {backLabel}</Text></Pressable>:null}<View style={s.heading}><Text style={s.eyebrow}>{eyebrow}</Text><Text style={s.title}>{title}</Text></View></View>
    {banner?<View style={s.banner}>{banner}</View>:null}
    <ScrollView style={s.scroll} contentContainerStyle={[s.content,stickyAction?s.contentWithAction:undefined]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    {stickyAction?<View style={s.sticky}>{stickyAction}</View>:null}
  </View>;
}

const s=StyleSheet.create({
  shell:{flex:1,backgroundColor:coopColors.background},shellHeader:{minHeight:76,paddingHorizontal:coopSpacing.lg,paddingVertical:coopSpacing.sm,flexDirection:'row',alignItems:'center',gap:coopSpacing.sm,borderBottomWidth:1,borderColor:coopColors.goldDim,backgroundColor:coopColors.surface},heading:{flex:1,minWidth:0},eyebrow:{...coopTypography.meta,color:coopColors.gold,fontWeight:'900',letterSpacing:1},title:{...coopTypography.title,color:coopColors.text,flexShrink:1},back:{minWidth:coopSizing.minimumTarget,minHeight:coopSizing.minimumTarget,justifyContent:'center',paddingRight:coopSpacing.sm},backPressed:{opacity:.65},backText:{...coopTypography.meta,color:coopColors.gold,fontWeight:'900'},banner:{paddingHorizontal:coopSpacing.lg,paddingVertical:coopSpacing.sm,backgroundColor:coopColors.surfaceRaised,borderBottomWidth:1,borderColor:coopColors.goldDim},scroll:{flex:1},content:{padding:coopSpacing.lg,gap:coopSpacing.md},contentWithAction:{paddingBottom:coopSizing.minimumTarget+coopSpacing.xxl},sticky:{padding:coopSpacing.md,borderTopWidth:1,borderColor:coopColors.goldDim,backgroundColor:coopColors.surface},
  panel:{position:'relative',padding:3,borderWidth:1,borderColor:coopColors.goldDim,borderRadius:coopRadii.panel,backgroundColor:coopColors.surface,overflow:'hidden'},panelInner:{padding:coopSpacing.md,gap:coopSpacing.sm,borderWidth:1,borderColor:'rgba(213,173,97,.18)',borderRadius:4},panel_default:{},panel_selected:{borderColor:coopColors.cyan,shadowColor:coopColors.cyan,shadowOpacity:.22,shadowRadius:7,elevation:2},panel_success:{borderColor:coopColors.success},panel_danger:{borderColor:coopColors.danger},panel_disabled:{opacity:.42},cornerTop:{position:'absolute',top:0,left:0,width:18,height:18,borderRightWidth:1,borderBottomWidth:1,borderColor:coopColors.gold},cornerBottom:{position:'absolute',right:0,bottom:0,width:18,height:18,borderLeftWidth:1,borderTopWidth:1,borderColor:coopColors.goldDim},
  action:{minHeight:coopSizing.minimumTarget,paddingHorizontal:coopSpacing.lg,paddingVertical:coopSpacing.sm,flexDirection:'row',gap:coopSpacing.sm,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:coopRadii.button,shadowColor:'#000',shadowOpacity:.3,shadowRadius:3,shadowOffset:{width:0,height:2},elevation:2},action_primary:{backgroundColor:coopColors.blue,borderColor:coopColors.cyan},action_secondary:{backgroundColor:coopColors.surfaceRaised,borderColor:coopColors.gold},action_danger:{backgroundColor:'#501E2A',borderColor:coopColors.danger},actionSelected:{borderWidth:2,backgroundColor:'#0A4168'},actionPressed:{transform:[{translateY:1}],opacity:.72},actionFocused:{borderColor:coopColors.text,borderWidth:2},actionDisabled:{opacity:.38},actionText:{...coopTypography.button,color:coopColors.text,textAlign:'center',flexShrink:1},dangerText:{color:'#FFE0E1'},
  roleBadge:{minHeight:coopSizing.minimumTarget,flexDirection:'row',alignItems:'center',gap:coopSpacing.sm,paddingHorizontal:coopSpacing.sm,borderWidth:1,borderColor:coopColors.goldDim,borderRadius:coopRadii.tile,backgroundColor:coopColors.surfaceRaised},roleImage:{width:coopSizing.roleIcon,height:coopSizing.roleIcon},roleText:{...coopTypography.meta,color:coopColors.text,fontWeight:'900',flexShrink:1},
  chip:{alignSelf:'flex-start',minHeight:32,justifyContent:'center',paddingHorizontal:coopSpacing.sm,borderWidth:1,borderRadius:coopRadii.tile,backgroundColor:coopColors.surfaceRaised},chip_neutral:{borderColor:coopColors.goldDim},chip_selected:{borderColor:coopColors.cyan},chip_success:{borderColor:coopColors.success},chip_warning:{borderColor:coopColors.gold},chip_danger:{borderColor:coopColors.danger},chipText:{...coopTypography.meta,fontWeight:'900'},chipText_neutral:{color:coopColors.textMuted},chipText_selected:{color:coopColors.cyan},chipText_success:{color:coopColors.success},chipText_warning:{color:coopColors.gold},chipText_danger:{color:coopColors.danger},
  imageSlot:{overflow:'hidden',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:coopColors.goldDim,borderRadius:coopRadii.tile,backgroundColor:coopColors.surfaceRaised},image_hero:{width:'100%',aspectRatio:901/301},image_room:{width:96,height:136},image_node:{width:coopSizing.nodeIcon,height:coopSizing.nodeIcon},image_boon:{width:coopSizing.boonIcon,height:coopSizing.boonIcon},image_skill:{width:40,height:40},image:{width:'100%',height:'100%'},imageFallback:{width:'100%',height:'100%',alignItems:'center',justifyContent:'center',padding:2},fallbackMark:{color:coopColors.danger,fontSize:16,lineHeight:18},fallbackText:{color:coopColors.textMuted,fontSize:9,lineHeight:11,fontWeight:'900',textAlign:'center'},
});
