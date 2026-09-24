import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameModalSurface} from './GameModalSurface';

export type CustomizationUnlockKind='background'|'border'|'title'|'skin';
export interface CustomizationUnlockEntry{key:string;kind:CustomizationUnlockKind;name:string;detail?:string;}

const kindLabel:Record<CustomizationUnlockKind,string>={
 background:'PROFILE BACKGROUND',border:'PROFILE BORDER',title:'TITLE',skin:'CHARACTER SKIN',
};

export function CustomizationUnlockPopup({entries,reduceMotion=false,onClose,onProfile,onCharacter}:{entries:CustomizationUnlockEntry[];reduceMotion?:boolean;onClose:()=>void;onProfile:()=>void;onCharacter:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const hasProfile=entries.some(row=>row.kind!=='skin'),hasSkin=entries.some(row=>row.kind==='skin');
 return <GameModalSurface visible={entries.length>0} presentation="dialog" reduceMotion={reduceMotion} onClose={onClose} backdropLabel="Close customization rewards" surfaceStyle={s.card}>
  <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
   <View style={s.badge}><Text style={s.badgeMark}>✦</Text></View>
   <Text style={s.kicker}>NEW CUSTOMIZATION</Text>
   <Text accessibilityRole="header" style={s.heading}>{entries.length===1?'Reward unlocked':'Rewards unlocked'}</Text>
   <Text style={s.copy}>Your new customization is permanently available. Preview it before deciding whether to equip it.</Text>
   <View style={s.list}>
    {entries.slice(0,4).map(row=><View key={row.key} style={s.row}><View style={s.rowIcon}><Text style={s.rowMark}>◆</Text></View><View style={s.rowCopy}><Text style={s.kind}>{kindLabel[row.kind]}</Text><Text style={s.name}>{row.name}</Text>{row.detail?<Text numberOfLines={2} style={s.detail}>{row.detail}</Text>:null}</View></View>)}
    {entries.length>4?<Text style={s.more}>+{entries.length-4} more customization rewards</Text>:null}
   </View>
   <View style={s.actions}>
    {hasProfile?<GameButton title="Customize Profile" onPress={onProfile}/>:null}
    {hasSkin?<GameButton title="View Character" tone={hasProfile?'secondary':undefined} onPress={onCharacter}/>:null}
    <GameButton title="Later" tone="secondary" onPress={onClose}/>
   </View>
  </ScrollView>
 </GameModalSurface>;
}

function makeStyles(C:ThemeColors){const E=equipmentTheme(C);return StyleSheet.create({
 card:{maxWidth:430,padding:0,borderColor:E.goldSoft,backgroundColor:C.bg},
 scroll:{maxHeight:'100%'},
 content:{gap:spacing.sm,padding:spacing.lg},
 badge:{width:46,height:46,alignSelf:'center',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:E.goldSoft,borderRadius:23,backgroundColor:C.panel2},
 badgeMark:{fontSize:24,color:E.goldSoft,fontWeight:'900'},
 kicker:{...typography.caption,color:E.goldSoft,fontWeight:'900',letterSpacing:1,textAlign:'center'},
 heading:{...typography.hero,color:C.text,textAlign:'center'},
 copy:{...typography.body,color:C.muted,lineHeight:20,textAlign:'center'},
 list:{gap:6,marginTop:spacing.xs},
 row:{minHeight:58,flexDirection:'row',alignItems:'center',gap:9,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 rowIcon:{width:26,height:26,alignItems:'center',justifyContent:'center',borderRadius:13,backgroundColor:C.panel2},
 rowMark:{fontSize:12,color:C.accent,fontWeight:'900'},
 rowCopy:{flex:1,minWidth:0},
 kind:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.7},
 name:{...typography.bodyStrong,color:C.text,marginTop:1},
 detail:{...typography.caption,color:C.info,marginTop:1},
 more:{...typography.caption,color:C.muted,textAlign:'center',marginTop:2},
 actions:{gap:6,marginTop:spacing.xs},
});}
