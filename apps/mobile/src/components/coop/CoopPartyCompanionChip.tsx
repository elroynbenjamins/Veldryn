import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {combatCompanionDef} from '../../content/combat-companions';
import {companionArtSource} from '../../theme/companion-art';
import {UiIcon} from '../UiIcon';
import {useSocialText} from '../../i18n/social';
import {useCoopStyles} from '../../theme/useCoopStyles';
import type {CoopColors} from '../../theme/coop-ui-theme';

export function CoopPartyCompanionChip({companionId,echo=false,expanded,onPress}:{companionId:string;echo?:boolean;expanded:boolean;onPress:()=>void}){
 const {styles:s}=useCoopStyles(makeStyles),st=useSocialText();
 const companion=combatCompanionDef(companionId),art=companionArtSource(companionId);
 if(!companion)return null;
 return <Pressable accessibilityRole="button"
  accessibilityLabel={(echo?st('Frozen Echo companion'):st('Tap to view companion'))+': '+companion.name}
  accessibilityState={{expanded}}
  onPress={onPress}
  style={({pressed})=>[s.chip,expanded&&s.expanded,pressed&&s.pressed]}>
  <View style={s.icon}>{art?<Image source={art} resizeMode="contain" style={s.image}/>:<UiIcon name="companions" size={24}/>}</View>
  <View style={s.textArea}>
   <Text numberOfLines={1} style={s.name}>{companion.name}</Text>
   <Text numberOfLines={1} style={s.subtitle}>{st(echo?'Frozen Echo companion':'Companion assist')}</Text>
  </View>
  <Text style={s.chevron}>{expanded?'−':'›'}</Text>
 </Pressable>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 chip:{minHeight:46,flexDirection:'row',gap:6,alignItems:'center',paddingHorizontal:7,paddingVertical:5,
  borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.surfaceRaised},
 expanded:{borderColor:C.cyan},
 pressed:{opacity:.70},
 icon:{width:30,height:30,alignItems:'center',justifyContent:'center'},
 image:{width:30,height:30},
 textArea:{flex:1,minWidth:0},
 name:{fontSize:11,lineHeight:15,color:C.text,fontWeight:'700'},
 subtitle:{fontSize:10,lineHeight:14,color:C.textMuted},
 chevron:{fontSize:18,color:C.textMuted,lineHeight:22}
});
