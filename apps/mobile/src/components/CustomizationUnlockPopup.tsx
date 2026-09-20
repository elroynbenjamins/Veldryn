import {Modal,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';

export type CustomizationUnlockKind='background'|'border'|'title'|'skin';
export interface CustomizationUnlockEntry{key:string;kind:CustomizationUnlockKind;name:string;detail?:string;}

const kindLabel:Record<CustomizationUnlockKind,string>={
 background:'PROFILE BACKGROUND',border:'PROFILE BORDER',title:'TITLE',skin:'CHARACTER SKIN',
};

export function CustomizationUnlockPopup({entries,reduceMotion=false,onClose,onProfile,onCharacter}:{entries:CustomizationUnlockEntry[];reduceMotion?:boolean;onClose:()=>void;onProfile:()=>void;onCharacter:()=>void}){
 const hasProfile=entries.some(row=>row.kind!=='skin'),hasSkin=entries.some(row=>row.kind==='skin');
 return <Modal transparent visible={entries.length>0} animationType={reduceMotion?'none':'fade'} onRequestClose={onClose}>
  <View style={s.backdrop}>
   <View style={s.card}>
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
   </View>
  </View>
 </Modal>;
}

const s=StyleSheet.create({
 backdrop:{flex:1,alignItems:'center',justifyContent:'center',padding:spacing.lg,backgroundColor:'rgba(3,8,14,.78)'},
 card:{width:'100%',maxWidth:430,gap:spacing.sm,padding:spacing.lg,borderWidth:1,borderColor:equipmentColors.goldSoft,borderRadius:radii.lg,backgroundColor:C.bg},
 badge:{width:46,height:46,alignSelf:'center',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:equipmentColors.goldSoft,borderRadius:23,backgroundColor:C.panel2},
 badgeMark:{fontSize:24,color:equipmentColors.goldSoft,fontWeight:'900'},
 kicker:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1,textAlign:'center'},
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
});
