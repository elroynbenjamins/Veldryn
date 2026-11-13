import {accountText,accountError} from '../i18n/account';
import {recentScreenText} from '../i18n/recent-screens';
import type {Language} from '../i18n/languages';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {usePlayerBadges,type BadgeState} from '../online/PlayerBadgeProvider';
import {PlayerBadge,PlayerBadges,PlayerBadgeShowcase} from './PlayerBadges';
import {
 COLLECTIBLE_PLAYER_BADGE_IDS,SUPPORTER_BADGE_IDS,MAX_FEATURED_PLAYER_BADGES,
 PLAYER_BADGE_LABELS,PLAYER_BADGE_UNLOCK_HINTS,
 SUPPORTER_BADGE_UNLOCK_HINTS,canEquipSupporterBadge,type EquippablePlayerBadgeId,
 type SupporterBadgeId,
} from '../core/player-badges';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';

/** Two separate decisions over one gallery: the single badge worn beside the name
 * everywhere a name appears, and up to three featured on the profile. Choosing a
 * slot first keeps every badge row a single tap instead of two competing controls. */
type Slot='name'|'profile';

export function PlayerBadgeSettings(){
 const badges=usePlayerBadges();
 return <PlayerBadgeSettingsView badges={badges}/>;
}
export function PlayerBadgeSettingsView({language:languageOverride,badges}:{language?:Language;badges:BadgeState}){
 const contextLanguage=useGameLanguage(),language=languageOverride??contextLanguage;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);
 const r=(text:string,params?:Record<string,string|number>)=>recentScreenText(language,text,params);
 const C=useGameTheme();
 const [slot,setSlot]=useState<Slot>('name');
 const owned=badges.ownedExtras??[];
 const showcase=badges.featuredExtras??[];
 const equipped:EquippablePlayerBadgeId|null=badges.identity?.equippedBadgeId!==undefined
  ?badges.identity.equippedBadgeId
  :badges.equippedBadgeId??(badges.showSupporter&&badges.supporterAvailable?'supporter':null);
 const disabled=badges.loading||badges.busy||!!badges.error;
 const full=showcase.length>=MAX_FEATURED_PLAYER_BADGES;
 const choose=(id:EquippablePlayerBadgeId)=>{
  if(disabled)return;
  if(slot==='name'){void badges.setEquipped(equipped===id?null:id);return;}
  if(showcase.includes(id)){void badges.setProfileBadges(showcase.filter(row=>row!==id));return;}
  if(!full)void badges.setProfileBadges([...showcase,id]);
 };
 const row=(id:EquippablePlayerBadgeId,unlocked:boolean,detail:string)=>{
  const selected=slot==='name'?equipped===id:showcase.includes(id);
  const maxed=slot==='profile'&&!selected&&full;
  const blocked=disabled||!unlocked||maxed;
  const status=!unlocked?r('LOCKED')
   :slot==='name'?(selected?r('EQUIPPED'):r('EQUIP'))
   :selected?r('ON PROFILE {slot}',{slot:showcase.indexOf(id)+1}):maxed?r('FULL'):r('FEATURE');
  return <Pressable
   key={id} accessibilityRole="button"
   accessibilityLabel={r(PLAYER_BADGE_LABELS[id])} accessibilityValue={{text:status}}
   accessibilityHint={!unlocked?r(detail)
    :slot==='name'?(selected?r('Unequip this badge'):r('Wear this badge beside your name'))
    :selected?r('Remove this badge from your profile'):maxed?r('Remove a featured badge to make room'):r('Feature this badge on your profile')}
   accessibilityState={{selected,disabled:blocked}}
   disabled={blocked}
   onPress={()=>choose(id)}
   style={({pressed})=>[s.badgeRow,{borderColor:selected?C.accent:C.line,backgroundColor:selected?C.selection:C.panel},
    (!unlocked||maxed)&&s.locked,pressed&&s.pressed]}>
   <View style={[s.artFrame,{backgroundColor:C.bg}]}><PlayerBadge id={id} size={38}/></View>
   <View style={s.badgeDetails}>
    <Text numberOfLines={1} style={[s.badgeName,{color:C.text}]}>{r(PLAYER_BADGE_LABELS[id])}</Text>
    <Text style={[s.badgeDetail,{color:C.muted}]}>{r(detail)}</Text>
   </View>
   <Text style={[s.status,{color:selected?C.accent:unlocked&&!maxed?C.good:C.muted}]}>{status}</Text>
  </Pressable>;
 };
 const slotTab=(value:Slot,label:string,count:string)=><Pressable
  key={value} accessibilityRole="radio" accessibilityState={{selected:slot===value}} accessibilityLabel={label}
  onPress={()=>setSlot(value)}
  style={({pressed})=>[s.slotTab,{borderColor:slot===value?C.accent:C.line,backgroundColor:slot===value?C.selection:C.panel},pressed&&s.pressed]}>
  <Text numberOfLines={1} style={[s.slotTabText,{color:slot===value?C.accent:C.muted}]}>{label}</Text>
  <Text numberOfLines={1} style={[s.slotTabCount,{color:slot===value?C.text:C.muted}]}>{count}</Text>
 </Pressable>;
 if(!badges.accountId)return <Text style={{color:C.muted}}>{r('Sign in to choose a player badge.')}</Text>;

 return <View style={s.root}>
  <View style={s.heading}>
   <View style={s.grow}>
    <Text style={[s.title,{color:C.text}]}>{a('Player badges')}</Text>
    <Text style={[s.note,{color:C.muted}]}>{r('Wear one badge beside your name, and feature up to three on your profile. Staff badges appear automatically.')}</Text>
   </View>
  </View>
  <View style={[s.preview,{backgroundColor:C.panel,borderColor:C.line}]}>
   <View style={s.previewRow}>
    <View style={s.previewLabels}>
     <Text style={[s.sectionEyebrow,{color:C.accent}]}>{r('BESIDE YOUR NAME')}</Text>
     <Text style={[s.note,{color:C.muted}]}>{equipped?r(PLAYER_BADGE_LABELS[equipped]):r('No badge equipped')}</Text>
    </View>
    <PlayerBadges identity={badges.identity} size={29}/>
   </View>
   <View style={[s.previewDivider,{backgroundColor:C.line}]}/>
   <View style={s.previewRow}>
    <View style={s.previewLabels}>
     <Text style={[s.sectionEyebrow,{color:C.accent}]}>{r('ON YOUR PROFILE')}</Text>
     <Text numberOfLines={2} style={[s.note,{color:C.muted}]}>{showcase.length?showcase.map(id=>r(PLAYER_BADGE_LABELS[id])).join(' · '):r('No badges featured yet')}</Text>
    </View>
    <PlayerBadgeShowcase identity={badges.identity} size={23}/>
   </View>
  </View>

  <View accessibilityRole="radiogroup" style={s.slotTabs}>
   {slotTab('name',r('Beside your name'),equipped?'1/1':'0/1')}
   {slotTab('profile',r('Profile showcase'),showcase.length+'/'+MAX_FEATURED_PLAYER_BADGES)}
  </View>
  <Text style={[s.note,{color:C.muted}]}>{slot==='name'
   ?r('Tap a badge to wear it beside your name in chat, parties, guilds and rankings.')
   :r('Tap up to {count} badges to feature on your profile, in the order you tap them. Tap a featured badge again to remove it.',{count:MAX_FEATURED_PLAYER_BADGES})}</Text>

  {slot==='profile'&&full?<Text accessibilityLiveRegion="polite" style={[s.fullNotice,{color:C.info,backgroundColor:C.infoSurface,borderColor:C.selectionLine}]}>All three profile slots are filled. Remove a featured badge to choose another.</Text>:null}

  <View style={s.section}>
   <View style={s.sectionHeading}>
    <Text style={[s.sectionTitle,{color:C.text}]}>{r('Supporter')}</Text>
    <Text style={[s.counter,{color:C.muted}]}>{badges.supporterAvailable?r('ACTIVE'):r('NOT ACTIVE')}</Text>
   </View>
   {badges.supporterTotalDays>0?<Text style={[s.note,{color:C.muted}]}>{r('Verified Supporter time: {days} days total',{days:badges.supporterTotalDays})}</Text>:null}
   <Text style={[s.note,{color:C.muted}]}>{r('Your star evolves at 3, 6 and 12 total verified months of Supporter time.')}</Text>
   {SUPPORTER_BADGE_IDS.map((id:SupporterBadgeId)=>{
    const required=id==='supporter_12m'?12:id==='supporter_6m'?6:id==='supporter_3m'?3:0;
    const unlocked=canEquipSupporterBadge(id,badges.supporterAvailable,badges.supporterTierMonths);
    return row(id,unlocked,unlocked
     ?required===0?'Active Supporter · first star':r('Verified {months}-month Supporter milestone',{months:required})
     :SUPPORTER_BADGE_UNLOCK_HINTS[id]);
   })}
   <Text style={[s.footnote,{color:C.muted}]}>{r('Time from separate verified subscription periods adds together. Pauses do not erase progress, and buying future months does not count early. Earlier history requires reliable billing proof.')}</Text>
  </View>

  <View style={s.section}>
   <View style={s.sectionHeading}>
    <Text style={[s.sectionTitle,{color:C.text}]}>{r('Earned badges')}</Text>
    <Text style={[s.counter,{color:C.muted}]}>{r('{owned}/{total} UNLOCKED',{owned:owned.length,total:COLLECTIBLE_PLAYER_BADGE_IDS.length})}</Text>
   </View>
   {COLLECTIBLE_PLAYER_BADGE_IDS.map(id=>row(id,owned.includes(id),
    owned.includes(id)?'Unlocked · account-wide':PLAYER_BADGE_UNLOCK_HINTS[id]))}
  </View>

  {slot==='name'&&equipped?<GameButton compact title={r('Unequip badge')} tone="secondary" loading={badges.busy} disabled={disabled} onPress={()=>badges.setEquipped(null)}/>:null}
  {slot==='profile'&&showcase.length?<GameButton compact title={r('Clear profile badges')} tone="secondary" loading={badges.busy} disabled={disabled} onPress={()=>badges.setProfileBadges([])}/>:null}
  {badges.loading?<Text style={[s.note,{color:C.muted}]}>{r('Loading earned badges…')}</Text>:null}
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
 preview:{padding:12,borderWidth:1,borderRadius:12,gap:10},
 previewRow:{minHeight:42,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'space-between'},
 previewDivider:{height:StyleSheet.hairlineWidth,opacity:.85},
 previewLabels:{flex:1,minWidth:0,gap:5},
 sectionEyebrow:{fontSize:10,letterSpacing:.8,fontWeight:'900'},
 slotTabs:{flexDirection:'row',gap:8},
 slotTab:{flex:1,minWidth:0,minHeight:48,justifyContent:'center',gap:2,paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderRadius:10},
 slotTabText:{fontSize:11.5,fontWeight:'900',letterSpacing:.3},
 slotTabCount:{fontSize:10,fontWeight:'800'},
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
  fullNotice:{fontSize:11,lineHeight:16,paddingHorizontal:10,paddingVertical:8,borderWidth:1,borderRadius:8},
 errors:{gap:6},
});
