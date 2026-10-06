import {useState,type ReactNode} from 'react';
import {Image,StyleSheet,Text,View,type StyleProp,type ViewStyle} from 'react-native';
import {GUILD_BANNERS,GUILD_FRAMES,normalizeGuildBannerId,normalizeGuildFrameId,type GuildBannerId,type GuildFrameId} from '../core/guild-customization';
import {guildFrameSegments} from '../core/guild-frame-layout';
import {guildBannerSourceByKey,guildBorderSourceByKey} from '../theme/guild-customization-assets';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {visualText} from '../i18n/visuals';
import {guildBackgroundSources} from '../theme/card-background-assets';
import {CardBackground} from './CardBackground';

/** Full banner: no square crop, frame overlay, or synthetic outline. */
export function GuildBannerArtwork({height=120,bannerId}:{height?:number;bannerId?:GuildBannerId|string}){
 const language=useGameLanguage();
 const banner=GUILD_BANNERS.find(entry=>entry.id===normalizeGuildBannerId(bannerId))!;
 const source=guildBannerSourceByKey.get(banner.assetKey);
 return <View accessibilityLabel={visualText(language,'{banner} guild banner',{banner:banner.name})} style={{width:height*.75,height,flexShrink:0,alignItems:'center',justifyContent:'center'}}>
  {source?<Image accessible={false} source={source} resizeMode="contain" style={s.fullImage}/>:<Text style={{fontSize:height*.4,color:banner.secondary}}>{banner.emblem}</Text>}
 </View>;
}

/** Decorative artwork IS the profile perimeter, not a badge inside a border. */
export function GuildProfileFrame({frameId,backgroundId,children,contentStyle}:{frameId?:GuildFrameId|string;backgroundId?:string;children:ReactNode;contentStyle?:StyleProp<ViewStyle>}){
 const C=useGameTheme();
 const [size,setSize]=useState({width:0,height:0});
 const frame=GUILD_FRAMES.find(entry=>entry.id===normalizeGuildFrameId(frameId))!;
 const source=guildBorderSourceByKey.get(frame.assetKey);
 const segments=guildFrameSegments(size.width,size.height);
 const background=guildBackgroundSources.get(backgroundId??'plain');
 return <View style={s.profile} onLayout={({nativeEvent:{layout}})=>setSize(previous=>previous.width===layout.width&&previous.height===layout.height?previous:{width:layout.width,height:layout.height})}>
  <View pointerEvents="none" style={[s.surface,{backgroundColor:C.panel2},!source&&{borderWidth:1,borderColor:frame.accent}]}>{background?<CardBackground sources={background} shade={.64}/>:null}</View>
  <View style={[s.content,contentStyle]}>{children}</View>
  {source?<View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
   {segments.map(segment=><View key={segment.key} style={{position:'absolute',overflow:'hidden',left:segment.x,top:segment.y,width:segment.width,height:segment.height}}>
    <Image accessible={false} source={source} resizeMode="stretch" style={{position:'absolute',left:segment.imageLeft,top:segment.imageTop,width:segment.imageWidth,height:segment.imageHeight}}/>
   </View>)}
  </View>:null}
 </View>;
}

/** Square frame preview, with no extra box or rounded clipping. */
export function GuildFrameSwatch({frameId,size=64}:{frameId?:GuildFrameId|string;size?:number}){
 const frame=GUILD_FRAMES.find(entry=>entry.id===normalizeGuildFrameId(frameId))!;
 const source=guildBorderSourceByKey.get(frame.assetKey);
 return <View style={{width:size,height:size}}>{source?<Image accessible={false} source={source} resizeMode="contain" style={s.fullImage}/>:null}</View>;
}
const s=StyleSheet.create({
 fullImage:{...StyleSheet.absoluteFill,width:'100%',height:'100%'},
 profile:{position:'relative',minWidth:0},surface:{position:'absolute',left:16,right:16,top:16,bottom:16},
 content:{padding:30},
});
