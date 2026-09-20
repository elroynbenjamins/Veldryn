import {Image,StyleSheet,Text,View} from 'react-native';
import {GuildCrest} from './SocialIdentity';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {
 GUILD_NAME_COLORS,GUILD_NAMEPLATES,normalizeGuildNameColorId,normalizeGuildNameplateId,
 type GuildBannerId,type GuildFrameId,type GuildNameColorId,type GuildNameplateId,
} from '../core/guild-customization';
import type {GuildTagColorId} from '../core/guild-tags';
import {guildNameplateSourceByKey} from '../theme/guild-customization-assets';
import {C,equipmentColors,radii,typography} from '../theme/theme';

export function GuildIdentitySummary({
 name,tag,tagColorId,level,memberCount,memberCap,bannerId,frameId,nameColorId,nameplateId,motto,compact=false,
}:{
 name:string;tag?:string|null;tagColorId?:GuildTagColorId|string|null;level:number;memberCount?:number;memberCap?:number;
 bannerId?:GuildBannerId|string;frameId?:GuildFrameId|string;nameColorId?:GuildNameColorId|string;nameplateId?:GuildNameplateId|string;motto?:string|null;compact?:boolean;
}){
 const nameColor=GUILD_NAME_COLORS.find(row=>row.id===normalizeGuildNameColorId(nameColorId))??GUILD_NAME_COLORS[0];
 const nameplate=GUILD_NAMEPLATES.find(row=>row.id===normalizeGuildNameplateId(nameplateId))??GUILD_NAMEPLATES[0];
 const plateSource=nameplate.assetKey?guildNameplateSourceByKey.get(nameplate.assetKey):undefined;
 return <View style={[s.card,compact&&s.cardCompact]}>
  <GuildCrest size={compact?42:54} bannerId={bannerId} frameId={frameId}/>
  <View style={s.copy}>
   <View style={[s.nameplate,nameplate.id!=='classic'&&s.nameplateSpecial]}>
    {plateSource?<Image accessible={false} source={plateSource} resizeMode="stretch" style={StyleSheet.absoluteFill}/>:null}
    <GuildTaggedPlayerName name={name} guildTag={tag} tagColorId={tagColorId} style={[s.name,{color:nameColor.color}]}/>
   </View>
   <View style={s.metaRow}><View style={s.levelPill}><Text style={s.levelText}>GUILD LV. {Math.max(1,Math.floor(level))}</Text></View>{typeof memberCount==='number'?<Text style={s.meta}>{memberCount}{typeof memberCap==='number'?'/'+memberCap:''} MEMBERS</Text>:null}</View>
   {!compact&&motto?<Text numberOfLines={2} style={s.motto}>“{motto}”</Text>:null}
  </View>
 </View>;
}

const s=StyleSheet.create({
 card:{minHeight:72,flexDirection:'row',alignItems:'center',gap:11,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 cardCompact:{minHeight:58,paddingVertical:7,paddingHorizontal:8},
 copy:{flex:1,minWidth:0},
 nameplate:{minHeight:27,justifyContent:'center',alignSelf:'flex-start',maxWidth:'100%',paddingHorizontal:7,paddingVertical:3,borderRadius:6},
 nameplateSpecial:{borderWidth:1,borderColor:'rgba(114,185,255,.45)',backgroundColor:'rgba(12,23,40,.8)',overflow:'hidden'},
 name:{...typography.bodyStrong,color:C.text,fontWeight:'900'},
 metaRow:{flexDirection:'row',alignItems:'center',gap:7,marginTop:3},
 levelPill:{paddingHorizontal:6,paddingVertical:2,borderWidth:1,borderColor:equipmentColors.line,borderRadius:99,backgroundColor:C.panel},
 levelText:{fontSize:7,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:.55},
 meta:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.45},
 motto:{fontSize:10,lineHeight:14,color:C.muted,fontStyle:'italic',marginTop:4},
});
