import {useSocialText} from '../i18n/social';
import {useMemo,useState} from 'react';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GuildCrest} from './SocialIdentity';
import {GuildBannerArtwork,GuildProfileFrame} from './GuildHeraldry';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {
 GUILD_NAME_COLORS,normalizeGuildNameColorId,
 type GuildBannerId,type GuildFrameId,type GuildNameColorId,type GuildNameplateId,
} from '../core/guild-customization';
import type {GuildTagColorId} from '../core/guild-tags';
import {equipmentTheme,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function GuildIdentitySummary({
 name,tag,tagColorId,level,memberCount,memberCap,bannerId,frameId,backgroundId,nameColorId,motto,compact=false,
}:{
 name:string;tag?:string|null;tagColorId?:GuildTagColorId|string|null;level:number;memberCount?:number;memberCap?:number;
 backgroundId?:string;bannerId?:GuildBannerId|string;frameId?:GuildFrameId|string;nameColorId?:GuildNameColorId|string;nameplateId?:GuildNameplateId|string;motto?:string|null;compact?:boolean;
}){
 // Existing nameplate IDs stay in saved data, but profile names are intentionally plain.
 const st=useSocialText();
 const C=useGameTheme(),artBacked=!compact&&!!backgroundId&&backgroundId!=='plain',s=useMemo(()=>makeStyles(artBacked?{...C,text:'#f5f1e8',muted:'#d3dce8'}:C),[C,artBacked]);
 const {fontScale}=useWindowDimensions();
 const [width,setWidth]=useState(400);
 const stacked=width<340||fontScale>=1.25;
 const nameColor=GUILD_NAME_COLORS.find(row=>row.id===normalizeGuildNameColorId(nameColorId))??GUILD_NAME_COLORS[0];
 const content=<>
  {compact?<GuildCrest size={44} bannerId={bannerId} frameId={frameId}/>:<GuildBannerArtwork height={120} bannerId={bannerId}/>}
  <View style={[s.copy,!compact&&stacked&&s.copyStacked]}>
   <View style={s.nameRow}>
    <GuildTaggedPlayerName plainTag name={name} guildTag={tag} tagColorId={tagColorId} numberOfLines={1} style={[s.name,!compact&&s.profileName,{color:nameColor.color}]}/>
   </View>
   <View style={s.metaRow}><View style={s.levelPill}><Text style={s.levelText}>GUILD LV. {Math.max(1,Math.floor(level))}</Text></View>{typeof memberCount==='number'?<Text style={s.meta}>{memberCount}{typeof memberCap==='number'?'/'+memberCap:''} {st("MEMBERS")}</Text>:null}</View>
   {!compact&&motto?<Text numberOfLines={2} style={s.motto}>“{motto}”</Text>:null}
  </View>
 </>;
 return compact?<View style={s.cardCompact}>{content}</View>:<View onLayout={event=>setWidth(event.nativeEvent.layout.width)}><GuildProfileFrame frameId={frameId} backgroundId={backgroundId} contentStyle={[s.profileContent,stacked&&s.profileStacked]}>{content}</GuildProfileFrame></View>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 profileContent:{flexDirection:'row',alignItems:'center',gap:14},
 profileStacked:{flexDirection:'column'},
 cardCompact:{minHeight:56,flexDirection:'row',alignItems:'center',gap:9,paddingVertical:6,paddingHorizontal:8},
 copy:{flex:1,minWidth:0},
 copyStacked:{flex:0,width:'100%'},
 nameRow:{minHeight:25,justifyContent:'center',maxWidth:'100%'},
 name:{...typography.bodyStrong,color:C.text,fontWeight:'900'},
 profileName:{fontSize:16,lineHeight:20},
 metaRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6,marginTop:5},
 levelPill:{paddingHorizontal:6,paddingVertical:2,borderWidth:1,borderColor:C.lineStrong,borderRadius:99,backgroundColor:C.warningSurface},
 levelText:{fontSize:7,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:.55},
 meta:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.45},
 motto:{fontSize:9.5,lineHeight:13,color:C.muted,fontStyle:'italic',marginTop:3},
});}
