import {useMemo} from 'react';
import {useSocialText} from '../../i18n/social';
import {Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {CoopRunView} from '../../core/coop-presentation';
import type {CoopLiveRematchState} from '../../online/coop-client';
import {useGameTheme} from '../../theme/ThemeContext';
import type {ThemeColors} from '../../theme/theme';
import {IdentityArtwork} from '../SocialIdentity';
import {GameButton} from '../GameButton';

/** The modal never chooses a party or creates a dungeon locally. Every ready
 * mark is received from the server; only four independent accepts can start. */
export function CoopLiveRematchPanel({visible,run,status,busy=false,error,onReady,onDecline,onClose,onEnter}:{
 visible:boolean;run:CoopRunView;status?:CoopLiveRematchState;busy?:boolean;error?:string;
 onReady:()=>void;onDecline:()=>void;onClose:()=>void;onEnter:()=>void;
}){
 const st=useSocialText();
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),insets=useSafeAreaInsets();
 const members=status?.members??[],ready=members.filter(member=>member.accepted).length;
 const self=members.find(member=>member.self);
 const accepted=Boolean(self?.accepted),committed=status?.status==='committed';
 return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
  <View style={[s.overlay,{paddingTop:insets.top+14,paddingBottom:insets.bottom+14}]}>
   <View style={s.dialog}>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
     <View style={s.head}>
      <View style={s.heading}><Text style={s.kicker}>{st('LIVE DUNGEON · REMATCH')}</Text><Text accessibilityRole="header" style={s.title}>{st('Keep the party together')}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={st('Close rematch')} onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable>
     </View>
     <Text style={s.description}>{st('Run this dungeon again with a fresh route, current equipment, and the same four adventurers.')}</Text>
     <View style={s.readyHeader}><Text style={s.section}>{st('Party ready check')}</Text><Text style={[s.counter,committed&&s.good]}>{ready}/4 ready</Text></View>
     {members.length===4?members.map((member,index)=>{
      const slot=run.roleSlots.find(slot=>slot.memberId===member.characterId)??run.roleSlots[index];const name=member.self?st('You'):slot?.name??`${st('Party member')} ${index+1}`;
      return <View key={member.accountId} style={s.member}>
       <IdentityArtwork name={slot?.name??name} profileIconId={slot?.profileIconId} className={slot?.iconClassId??slot?.classId} size={36}/>
       <View style={s.memberText}><Text numberOfLines={1} style={s.memberName}>{name}</Text><Text style={s.role}>{(member.role==='damage'?st('Damage'):member.role==='tank'?st('Tank'):st('Support')).toUpperCase()}</Text></View>
       <Text style={[s.stateText,member.accepted&&s.good]}>{member.accepted?`✓ ${st('Ready')}`:st('Waiting')}</Text>
      </View>;
     }):<Text style={s.description}>{st('Checking the original party roster…')}</Text>}
     {committed?<Text accessibilityLiveRegion="polite" style={s.success}>{'✓ '+st('All four members approved a new dungeon run.')}</Text>
      :status?.status==='declined'||status?.status==='expired'?<Text style={s.warning}>{st('This rematch is no longer available. You can find a new Live party instead.')}</Text>
      :<Text style={s.note}>{st('Everyone must agree. Leaving or declining never starts a run. This ready check expires automatically.')}</Text>}
     {error?<Text accessibilityRole="alert" style={s.warning}>{error}</Text>:null}
     {committed&&status?.runId?<GameButton title={st('Enter new dungeon')} disabled={busy} onPress={onEnter}/>:
      status?.status==='open'&&!accepted?<GameButton title={`✓ ${st("I'm ready")}`} disabled={busy||members.length!==4} onPress={onReady}/>:
      accepted?<Text style={s.waiting}>{'✓ '+st('Your vote is saved. Waiting for your party…')}</Text>:null}
     {status?.status==='open'&&!committed&&!accepted?<GameButton title={st('Decline rematch')} tone="secondary" disabled={busy} onPress={onDecline}/>:null}
     <GameButton title={st('Close')} tone="secondary" onPress={onClose} disabled={busy}/>
    </ScrollView>
   </View>
  </View>
 </Modal>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 overlay:{flex:1,justifyContent:'center',paddingHorizontal:14,backgroundColor:'rgba(0,0,0,.84)'},
 dialog:{width:'100%',maxHeight:'95%',borderRadius:16,borderColor:C.lineStrong,borderWidth:1,backgroundColor:C.panel,overflow:'hidden'},
 content:{padding:16,gap:11},
 head:{flexDirection:'row',gap:8,alignItems:'flex-start'},heading:{flex:1,gap:4},kicker:{fontSize:10,fontWeight:'900',letterSpacing:1,color:C.accent},
 title:{fontSize:20,fontWeight:'900',color:C.text},close:{width:44,height:44,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2,borderColor:C.line,borderWidth:1,borderRadius:10},closeText:{fontSize:25,color:C.text},
 description:{color:C.muted,fontSize:12,lineHeight:18},readyHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:7},
 section:{fontWeight:'800',fontSize:13,color:C.text},counter:{color:C.warning,fontWeight:'900',fontSize:12},
 good:{color:C.good},member:{flexDirection:'row',gap:10,padding:9,alignItems:'center',borderWidth:1,borderRadius:9,borderColor:C.line,backgroundColor:C.panel2},
 memberText:{flex:1,gap:3,minWidth:0},memberName:{color:C.text,fontWeight:'800',fontSize:12},role:{fontSize:10,fontWeight:'700',color:C.muted},
 stateText:{fontSize:11,color:C.muted,fontWeight:'700'},note:{fontSize:11,lineHeight:17,color:C.muted},success:{color:C.good,fontWeight:'800',fontSize:12,lineHeight:18},
 warning:{color:C.bad,fontWeight:'700',fontSize:12,lineHeight:18},waiting:{color:C.good,textAlign:'center',paddingVertical:10,fontWeight:'800',fontSize:12},
});}
