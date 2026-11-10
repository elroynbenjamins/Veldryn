import {accountText,accountError} from '../i18n/account';
import type {Language} from '../i18n/languages';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {usePlayerBadges,type BadgeState} from '../online/PlayerBadgeProvider';
import {PlayerBadge,PlayerBadges} from './PlayerBadges';
import {
 COLLECTIBLE_PLAYER_BADGE_IDS,SUPPORTER_BADGE_IDS,PLAYER_BADGE_LABELS,PLAYER_BADGE_UNLOCK_HINTS,
 SUPPORTER_BADGE_UNLOCK_HINTS,canEquipSupporterBadge,type EquippablePlayerBadgeId,
 type SupporterBadgeId,
} from '../core/player-badges';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';

export function PlayerBadgeSettings(){
 const badges=usePlayerBadges();
 return <PlayerBadgeSettingsView badges={badges}/>;
}
export function PlayerBadgeSettingsView({language:languageOverride,badges}:{language?:Language;badges:BadgeState}){
 const contextLanguage=useGameLanguage(),language=languageOverride??contextLanguage;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);
 const C=useGameTheme();
 const owned=badges.ownedExtras??[];
 const equipped:EquippablePlayerBadgeId|null=badges.identity?.equippedBadgeId!==undefined
  ?badges.identity.equippedBadgeId
  :badges.equippedBadgeId??badges.featuredExtras?.[0]??(badges.showSupporter&&badges.supporterAvailable?'supporter':null);
 const disabled=badges.loading||badges.busy||!!badges.error;
 const choose=(id:EquippablePlayerBadgeId)=>{if(!disabled)void badges.setEquipped(equipped===id?null:id);};
 const row=(id:EquippablePlayerBadgeId,unlocked:boolean,detail:string)=>{
  const selected=equipped===id;
  const blocked=disabled||!unlocked;
  return <Pressable
   key={id} accessibilityRole="button"
   accessibilityLabel={PLAYER_BADGE_LABELS[id]}
   accessibilityHint={unlocked?(selected?'Unequip this badge':'Equip this badge'):detail}
   accessibilityState={{selected,disabled:blocked}}
   disabled={blocked}
   onPress={()=>choose(id)}
   style={({pressed})=>[s.badgeRow,{borderColor:selected?C.accent:C.line,backgroundColor:selected?C.selection:C.panel},
    !unlocked&&s.locked,pressed&&s.pressed]}>
   <View style={[s.artFrame,{backgroundColor:C.bg}]}><PlayerBadge id={id} size={38}/></View>
   <View style={s.badgeDetails}>
    <Text numberOfLines={1} style={[s.badgeName,{color:C.text}]}>{PLAYER_BADGE_LABELS[id]}</Text>
    <Text style={[s.badgeDetail,{color:C.muted}]}>{detail}</Text>
   </View>
   <Text style={[s.status,{color:selected?C.accent:unlocked?C.good:C.muted}]}>
    {selected?'EQUIPPED':unlocked?'EQUIP':'LOCKED'}
   </Text>
  </Pressable>;
 };
 if(!badges.accountId)return <Text style={{color:C.muted}}>Sign in to choose a player badge.</Text>;

 return <View style={s.root}>
  <View style={s.heading}>
   <View style={s.grow}>
    <Text style={[s.title,{color:C.text}]}>{a('Player badges')}</Text>
    <Text style={[s.note,{color:C.muted}]}>Equip one achievement or Supporter badge. Staff badges appear automatically.</Text>
   </View>
  </View>
  <View style={[s.preview,{backgroundColor:C.panel,borderColor:C.line}]}>
   <View style={s.previewLabels}>
    <Text style={[s.sectionEyebrow,{color:C.accent}]}>YOUR PUBLIC BADGES</Text>
    <Text style={[s.note,{color:C.muted}]}>{equipped?PLAYER_BADGE_LABELS[equipped]:'No badge equipped'}</Text>
   </View>
   <PlayerBadges identity={badges.identity} size={29}/>
  </View>

  <View style={s.section}>
   <View style={s.sectionHeading}>
    <Text style={[s.sectionTitle,{color:C.text}]}>Supporter</Text>
    <Text style={[s.counter,{color:C.muted}]}>{badges.supporterAvailable?'ACTIVE':'NOT ACTIVE'}</Text>
   </View>
   {badges.supporterTotalDays>0?<Text style={[s.note,{color:C.muted}]}>{`Verified Supporter time: ${badges.supporterTotalDays} days total`}</Text>:null}
   <Text style={[s.note,{color:C.muted}]}>Your star evolves at 3, 6 and 12 total verified months of Supporter time.</Text>
   {SUPPORTER_BADGE_IDS.map((id:SupporterBadgeId)=>{
    const required=id==='supporter_12m'?12:id==='supporter_6m'?6:id==='supporter_3m'?3:0;
    const unlocked=canEquipSupporterBadge(id,badges.supporterAvailable,badges.supporterTierMonths);
    return row(id,unlocked,unlocked
     ?required===0?'Active Supporter · first star':`Verified ${required}-month Supporter milestone`
     :SUPPORTER_BADGE_UNLOCK_HINTS[id]);
   })}
   <Text style={[s.footnote,{color:C.muted}]}>Time from separate verified subscription periods adds together. Pauses do not erase progress, and buying future months does not count early. Earlier history requires reliable billing proof.</Text>
  </View>

  <View style={s.section}>
   <View style={s.sectionHeading}>
    <Text style={[s.sectionTitle,{color:C.text}]}>Earned badges</Text>
    <Text style={[s.counter,{color:C.muted}]}>{owned.length}/{COLLECTIBLE_PLAYER_BADGE_IDS.length} UNLOCKED</Text>
   </View>
   {COLLECTIBLE_PLAYER_BADGE_IDS.map(id=>row(id,owned.includes(id),
    owned.includes(id)?'Unlocked · account-wide':PLAYER_BADGE_UNLOCK_HINTS[id]))}
  </View>

  {equipped?<GameButton compact title="Unequip badge" tone="secondary" loading={badges.busy} disabled={disabled} onPress={()=>badges.setEquipped(null)}/>:null}
  {badges.loading?<Text style={[s.note,{color:C.muted}]}>Loading earned badges…</Text>:null}
  {badges.error?<View style={s.errors}>
   <Text accessibilityRole="alert" style={[s.note,{color:C.bad}]}>{accountError(language,badges.error,'Could not load badges.')}</Text>
   <GameButton compact title={a('Retry badges')} tone="secondary" loading={badges.loading} onPress={()=>badges.refresh()}/>
  </View>:null}
 </View>;
}
const s=StyleSheet.create({
 root:{gap:12,paddingVertical:8},
 heading:{flexDirection:'row',gap:8,alignItems:'center'},
 grow:{flex:1,minWidth:0},
 title:{fontSize:17,fontWeight:'800'},
 note:{fontSize:12,lineHeight:18},
 preview:{minHeight:66,padding:12,borderWidth:1,borderRadius:12,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'space-between'},
 previewLabels:{flex:1,minWidth:0,gap:5},
 sectionEyebrow:{fontSize:10,letterSpacing:.8,fontWeight:'900'},
 section:{gap:7,marginTop:4},
 sectionHeading:{flexDirection:'row',alignItems:'center',gap:8,justifyContent:'space-between'},
 sectionTitle:{fontSize:14,fontWeight:'800'},
 counter:{fontSize:10,fontWeight:'800'},
 badgeRow:{borderWidth:1,borderRadius:10,minHeight:66,paddingHorizontal:9,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:9},
 artFrame:{width:50,height:50,borderRadius:8,justifyContent:'center',alignItems:'center'},
 badgeDetails:{flex:1,minWidth:0,gap:3},
 badgeName:{fontSize:12,fontWeight:'800'},
 badgeDetail:{fontSize:11,lineHeight:15},
 status:{fontSize:9,letterSpacing:.45,fontWeight:'900'},
 locked:{opacity:.62},
 pressed:{opacity:.78},
 footnote:{fontSize:10,lineHeight:15,marginTop:3},
 errors:{gap:6},
});
