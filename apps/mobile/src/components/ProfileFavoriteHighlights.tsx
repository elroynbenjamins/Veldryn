import {useMemo} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import type {ImageSourcePropType} from 'react-native';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {smallSkillIcons} from '../theme/skill-assets';
import {companionArtSource} from '../theme/companion-art';
import {radii,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

const label=(value?:string)=>value?value.replace(/[_:-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'Not selected';

function skillIcon(id?:string):ImageSourcePropType|undefined{
 if(!id)return undefined;
 return (smallSkillIcons as Record<string,ImageSourcePropType|undefined>)[id];
}

export function ProfileFavoriteHighlights({favoriteSkillId,favoriteSkillDetail,favoriteCompanionId}:{favoriteSkillId?:string|null;favoriteSkillDetail?:string;favoriteCompanionId?:string|null}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const companion=favoriteCompanionId?COMBAT_COMPANIONS.find(row=>row.id===favoriteCompanionId):undefined;
 const companionArt=favoriteCompanionId?companionArtSource(favoriteCompanionId):undefined;
 const skillArt=skillIcon(favoriteSkillId??undefined);
 return <View style={s.row}>
  <View style={s.card}>
   <View style={s.cardHead}>{skillArt?<View style={s.iconShell}><Image source={skillArt} resizeMode="contain" style={s.skillIcon}/></View>:<View style={s.iconShell}><Text style={s.fallback}>◆</Text></View>}<View style={s.flex}><Text style={s.eyebrow}>FAVORITE SKILL</Text><Text numberOfLines={1} style={s.value}>{label(favoriteSkillId??undefined)}</Text></View></View>
   <Text numberOfLines={2} style={s.meta}>{favoriteSkillDetail??(favoriteSkillId?'Showcased by player':'No favorite selected')}</Text>
  </View>
  <View style={[s.card,companion?.rarity==='prestige'&&s.prestigeCard,companion?.rarity==='elite'&&s.eliteCard]}>
   <View style={s.cardHead}>{companionArt?<View style={s.companionShell}><Image source={companionArt} resizeMode="contain" style={s.companionArt}/></View>:<View style={s.iconShell}><Text style={s.fallback}>◇</Text></View>}<View style={s.flex}><Text style={s.eyebrow}>FAVORITE COMPANION</Text><Text numberOfLines={1} style={s.value}>{companion?.name??'Not selected'}</Text></View></View>
   <View style={s.metaRow}><Text numberOfLines={1} style={s.meta}>{companion?label(companion.role):'Choose a companion'}</Text>{companion?<View style={[s.rarity,companion.rarity==='prestige'&&s.rarityPrestige,companion.rarity==='elite'&&s.rarityElite,companion.rarity==='rare'&&s.rarityRare]}><Text style={[s.rarityText,companion.rarity==='prestige'&&s.rarityTextPrestige]}>{companion.rarity.toUpperCase()}</Text></View>:null}</View>
  </View>
 </View>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 row:{flexDirection:'row',gap:8},
 card:{flex:1,minWidth:0,minHeight:92,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,justifyContent:'space-between'},
 prestigeCard:{borderColor:equipmentColors.lineStrong,backgroundColor:'#2a2418'},
 eliteCard:{borderColor:'#8f72bb',backgroundColor:'#211d2b'},
 cardHead:{flexDirection:'row',alignItems:'center',gap:7},
 flex:{flex:1,minWidth:0},
 iconShell:{width:38,height:38,borderRadius:radii.sm,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 skillIcon:{width:30,height:30},
 companionShell:{width:42,height:42,alignItems:'center',justifyContent:'center'},
 companionArt:{width:42,height:42},
 fallback:{fontSize:17,color:C.accent,fontWeight:'900'},
 eyebrow:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.7},
 value:{...typography.bodyStrong,color:C.text,marginTop:2},
 metaRow:{flexDirection:'row',alignItems:'center',gap:4,marginTop:5},
 meta:{flex:1,minWidth:0,fontSize:9,lineHeight:12,color:C.info},
 rarity:{paddingHorizontal:5,paddingVertical:2,borderRadius:99,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 rarityRare:{borderColor:C.info},
 rarityElite:{borderColor:'#a485cf'},
 rarityPrestige:{borderColor:equipmentColors.goldSoft,backgroundColor:'#322814'},
 rarityText:{fontSize:7,color:C.muted,fontWeight:'900',letterSpacing:.45},
 rarityTextPrestige:{color:equipmentColors.goldSoft},
});}
