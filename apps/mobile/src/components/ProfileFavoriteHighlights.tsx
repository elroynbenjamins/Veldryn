import {useMemo} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import type {ImageSourcePropType} from 'react-native';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {smallSkillIcons} from '../theme/skill-assets';
import {companionArtSource} from '../theme/companion-art';
import {equipmentTheme,radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

const label=(value?:string)=>value?value.replace(/[_:-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'Not selected';

function skillIcon(id?:string):ImageSourcePropType|undefined{
 if(!id)return undefined;
 return (smallSkillIcons as Record<string,ImageSourcePropType|undefined>)[id];
}

export function ProfileFavoriteHighlights({favoriteSkillId,favoriteSkillDetail,favoriteCompanionId}:{favoriteSkillId?:string|null;favoriteSkillDetail?:string;favoriteCompanionId?:string|null}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const companion=favoriteCompanionId?COMBAT_COMPANIONS.find(row=>row.id===favoriteCompanionId):undefined;
 const companionArt=favoriteCompanionId?companionArtSource(favoriteCompanionId):undefined;
 const skillArt=skillIcon(favoriteSkillId??undefined);
 return <View style={s.row}>
  <View style={s.card}>
   <View style={s.cardHead}>{skillArt?<View style={s.iconShell}><Image source={skillArt} resizeMode="contain" style={s.skillIcon}/></View>:<View style={s.iconShell}><Text style={s.fallback}>◆</Text></View>}<View style={s.flex}><Text style={s.eyebrow}>FAVORITE SKILL</Text><Text numberOfLines={1} style={s.value}>{label(favoriteSkillId??undefined)}</Text><Text numberOfLines={1} style={s.meta}>{favoriteSkillDetail??(favoriteSkillId?'Showcased by player':'No favorite selected')}</Text></View></View>
  </View>
  <View style={[s.card,companion?.rarity==='prestige'&&s.prestigeCard,companion?.rarity==='elite'&&s.eliteCard,companion?.rarity==='rare'&&s.rareCard]}>
   <View style={s.cardHead}>{companionArt?<View style={s.companionShell}><Image source={companionArt} resizeMode="contain" style={s.companionArt}/></View>:<View style={s.iconShell}><Text style={s.fallback}>◇</Text></View>}<View style={s.flex}><Text style={s.eyebrow}>FAVORITE COMPANION</Text><Text numberOfLines={1} style={s.value}>{companion?.name??'Not selected'}</Text><View style={s.metaRow}><Text numberOfLines={1} style={s.meta}>{companion?label(companion.role):'Choose a companion'}</Text>{companion?<View style={[s.rarity,companion.rarity==='prestige'&&s.rarityPrestige,companion.rarity==='elite'&&s.rarityElite,companion.rarity==='rare'&&s.rarityRare]}><Text style={[s.rarityText,companion.rarity==='prestige'&&s.rarityTextPrestige,companion.rarity==='elite'&&s.rarityTextElite,companion.rarity==='rare'&&s.rarityTextRare]}>{companion.rarity.toUpperCase()}</Text></View>:null}</View></View></View>
  </View>
 </View>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C),elite=C.dark?'#A485CF':'#6D47A6',eliteSurface=C.dark?'#211D2B':'#F2ECF8';return StyleSheet.create({
 row:{flexDirection:'row',gap:6},
 card:{flex:1,minWidth:0,minHeight:78,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,justifyContent:'center'},
 rareCard:{borderColor:C.selectionLine,backgroundColor:C.selection},
 eliteCard:{borderColor:elite,backgroundColor:eliteSurface},
 prestigeCard:{borderColor:C.lineStrong,backgroundColor:C.warningSurface},
 cardHead:{flexDirection:'row',alignItems:'center',gap:7},
 flex:{flex:1,minWidth:0},
 iconShell:{width:34,height:34,borderRadius:radii.sm,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 skillIcon:{width:27,height:27},
 companionShell:{width:38,height:38,alignItems:'center',justifyContent:'center'},
 companionArt:{width:38,height:38},
 fallback:{fontSize:16,color:C.accent,fontWeight:'900'},
 eyebrow:{fontSize:7.5,color:C.muted,fontWeight:'900',letterSpacing:.65},
 value:{...typography.bodyStrong,color:C.text,marginTop:1},
 metaRow:{flexDirection:'row',alignItems:'center',gap:4,marginTop:1},
 meta:{flex:1,minWidth:0,fontSize:8.5,lineHeight:11,color:C.info},
 rarity:{paddingHorizontal:4,paddingVertical:1,borderRadius:99,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 rarityRare:{borderColor:C.selectionLine,backgroundColor:C.selection},
 rarityElite:{borderColor:elite,backgroundColor:eliteSurface},
 rarityPrestige:{borderColor:C.lineStrong,backgroundColor:C.warningSurface},
 rarityText:{fontSize:6.5,color:C.muted,fontWeight:'900',letterSpacing:.4},
 rarityTextRare:{color:C.info},
 rarityTextElite:{color:elite},
 rarityTextPrestige:{color:equipmentColors.goldSoft},
});}
