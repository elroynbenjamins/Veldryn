import {ImageBackground,StyleSheet,Text,View} from 'react-native';

export function GuildBoardHero({title,subtitle}:{title:string;subtitle:string}){
 return <ImageBackground source={require('../../assets/card-backgrounds/guild_plaza_wide_v2.webp')} resizeMode="cover" style={s.hero}>
  <View style={s.shade}/><View style={s.copy}><Text style={s.eyebrow}>GUILD</Text><Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text></View>
 </ImageBackground>;
}
const s=StyleSheet.create({hero:{minHeight:140,borderRadius:12,overflow:'hidden',justifyContent:'flex-end'},shade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(3,7,9,.65)'},copy:{padding:16,gap:5},eyebrow:{fontSize:11,lineHeight:16,color:'#D5DADD',fontWeight:'700',letterSpacing:1},title:{fontSize:25,lineHeight:31,color:'#FFFFFF',fontWeight:'700'},subtitle:{fontSize:13,lineHeight:19,color:'#E8ECEF'}});
