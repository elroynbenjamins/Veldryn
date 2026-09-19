import {UiIcon} from './UiIcon';
import {useEffect,useMemo,useRef,useState} from 'react';
import {KeyboardAvoidingView,Modal,PanResponder,Platform,Pressable,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import type {GameState} from '../core/types';
import {onlineConfigured} from '../online/supabase';
import {C} from '../theme/theme';
import {GuildChat} from './GuildChat';
import {OnlineWorldChat} from './OnlineWorldChat';
import {WorldChat} from './WorldChat';
import {OnlinePartyChat} from './OnlinePartyChat';
import {PartyChatGate} from './PartyChatGate';
import {usePartySocial} from '../online/PartySocialProvider';
import {ChatDock} from './ChatDock';

type Channel='world'|'guild'|'party';
type Position={x:number;y:number};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export function ChatOverlay({state,visible,onOpen,onClose}:{state:GameState;visible:boolean;onOpen:()=>void;onClose:()=>void}){
  const [channel,setChannel]=useState<Channel>('world');
  const [position,setPosition]=useState<Position>({x:0,y:0});
  const dragStart=useRef<Position>({x:0,y:0});
  const {width,height}=useWindowDimensions();
  const {party,accountId,refresh}=usePartySocial();
  useEffect(()=>{if(!party&&channel==='party')setChannel('world');},[party,channel]);
  useEffect(()=>{if(visible)void refresh();},[visible,refresh]);
  useEffect(()=>{setPosition(current=>({x:clamp(current.x,0,Math.max(0,width-Math.min(width,480))),y:clamp(current.y,-Math.round(height*.48),0)}));},[width,height]);
  const maxX=Math.max(0,width-Math.min(width,480)),minY=-Math.round(height*.48);
  const dragResponder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>false,
    onMoveShouldSetPanResponder:(_event,gesture)=>Math.abs(gesture.dx)>5||Math.abs(gesture.dy)>5,
    onPanResponderGrant:()=>{dragStart.current=position;},
    onPanResponderMove:(_event,gesture)=>setPosition({x:clamp(dragStart.current.x+gesture.dx,0,maxX),y:clamp(dragStart.current.y+gesture.dy,minY,0)}),
    onPanResponderRelease:()=>{},
    onPanResponderTerminate:()=>{},
  }),[position,maxX,minY]);
  const guildAvailable=state.account.guildMember;
  return <>
    {!visible&&<ChatDock enabled={onlineConfigured} onOpen={onOpen}/>}
    <Modal visible={visible} transparent statusBarTranslucent animationType={state.settings.reduceMotion?'none':'fade'} onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.keyboardRoot} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={s.modalRoot}>
          <Pressable accessibilityLabel="Close chat overlay" onPress={onClose} style={StyleSheet.absoluteFill}/>
          <View style={[s.window,{transform:[{translateX:position.x},{translateY:position.y}]}]}>
            <View {...dragResponder.panHandlers} accessibilityLabel="Drag chat window" style={s.dragHeader}>
              <View style={s.grabber}/>
              <View style={s.header}>
                <View><Text style={s.eyebrow}>LIVE CHAT</Text><Text style={s.title}>{channel==='world'?'World':channel==='party'?'Party':'Guild'}</Text></View>
                <View style={s.headerActions}>
                  {(position.x!==0||position.y!==0)&&<Pressable accessibilityRole="button" accessibilityLabel="Reset chat position" onPress={()=>setPosition({x:0,y:0})} style={s.reset}><Text style={s.resetText}>RESET</Text></Pressable>}
                  <Pressable accessibilityRole="button" accessibilityLabel="Close chat" onPress={onClose} style={s.close}><UiIcon name="close" size={24}/></Pressable>
                </View>
              </View>
            </View>
            <View accessibilityRole="tablist" style={s.tabs}>
              <PartyChatGate party={party} accountId={accountId}><Pressable accessibilityRole="tab" accessibilityState={{selected:channel==='party'}} onPress={()=>setChannel('party')} style={[s.tab,channel==='party'&&s.tabActive]}><Text style={[s.tabText,channel==='party'&&s.tabTextActive]}>PARTY</Text></Pressable></PartyChatGate>
              <Pressable accessibilityRole="tab" accessibilityState={{selected:channel==='world'}} onPress={()=>setChannel('world')} style={[s.tab,channel==='world'&&s.tabActive]}><Text style={[s.tabText,channel==='world'&&s.tabTextActive]}>WORLD</Text></Pressable>
              <Pressable accessibilityRole="tab" accessibilityState={{selected:channel==='guild',disabled:!guildAvailable}} disabled={!guildAvailable} onPress={()=>setChannel('guild')} style={[s.tab,channel==='guild'&&s.tabActive,!guildAvailable&&s.tabDisabled]}><Text style={[s.tabText,channel==='guild'&&s.tabTextActive]}>GUILD</Text></Pressable>
            </View>
            <View style={s.content}>{channel==='party'?<OnlinePartyChat/>:channel==='guild'&&guildAvailable?<GuildChat language={state.settings.language}/>:onlineConfigured?<OnlineWorldChat playerName={state.character!.name} language={state.settings.language} embedded/>:<WorldChat language={state.settings.language} embedded/>}</View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}

const s=StyleSheet.create({
  keyboardRoot:{flex:1},
  modalRoot:{flex:1,justifyContent:'flex-end',alignItems:'flex-start',paddingBottom:Platform.OS==='android'?88:96,backgroundColor:'rgba(0,0,0,.14)'},
  window:{width:'100%',maxWidth:480,maxHeight:'72%',backgroundColor:'rgba(13,22,33,.94)',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(111,151,178,.62)',borderTopLeftRadius:20,borderTopRightRadius:20,borderBottomRightRadius:14,overflow:'hidden',shadowColor:'#000',shadowOpacity:.35,shadowRadius:16,shadowOffset:{width:0,height:6},elevation:12},
  dragHeader:{paddingTop:5},grabber:{width:46,height:4,borderRadius:2,backgroundColor:'#6f8293',alignSelf:'center',marginBottom:2,opacity:.8},
  header:{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingLeft:16},eyebrow:{color:'#70b9de',fontSize:9,fontWeight:'900',letterSpacing:1.2},title:{color:C.text,fontSize:18,fontWeight:'800'},headerActions:{flexDirection:'row',alignItems:'center'},reset:{minHeight:44,paddingHorizontal:8,justifyContent:'center'},resetText:{color:C.muted,fontSize:9,fontWeight:'900',letterSpacing:.6},close:{width:52,height:52,alignItems:'center',justifyContent:'center'},
  tabs:{flexDirection:'row',paddingHorizontal:10,paddingBottom:8,gap:4},tab:{minHeight:38,flex:1,alignItems:'center',justifyContent:'center',borderRadius:10},tabActive:{backgroundColor:'#17364b'},tabDisabled:{opacity:.35},tabText:{color:C.muted,fontSize:11,fontWeight:'800',letterSpacing:.7},tabTextActive:{color:'#a9dcf6'},content:{paddingHorizontal:10,paddingBottom:10},
});
