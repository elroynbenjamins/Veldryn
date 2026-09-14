import {useEffect,useMemo,useRef,useState} from 'react';
import {Image,PanResponder,Pressable,StyleSheet,Text,View} from 'react-native';
import {WORLD_CHANNELS,worldMessages,type WorldMessage} from '../online/social';
import {uiIcons} from '../theme/ui-icons';
import {C,radii,typography} from '../theme/theme';

export function ChatDock({enabled,onOpen}:{enabled:boolean;onOpen:()=>void}){
 const [rows,setRows]=useState<WorldMessage[]>([]),[offset,setOffset]=useState({x:0,y:0});
 const offsetRef=useRef(offset),origin=useRef(offset);offsetRef.current=offset;
 const drag=useMemo(()=>PanResponder.create({onPanResponderGrant:()=>{origin.current=offsetRef.current},onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>5||Math.abs(g.dy)>5,onPanResponderMove:(_,g)=>setOffset({x:origin.current.x+g.dx,y:origin.current.y+g.dy})}),[]);
 useEffect(()=>{if(!enabled)return;let active=true;const load=()=>void worldMessages(WORLD_CHANNELS[0].id).then(next=>{if(active)setRows(next.slice(-3));}).catch(()=>{});load();const timer=setInterval(load,8000);return()=>{active=false;clearInterval(timer)};},[enabled]);
 if(!enabled)return <Pressable accessibilityRole="button" accessibilityLabel="Open chat" onPress={onOpen} style={({pressed})=>[s.bubble,pressed&&s.pressed]}><Image source={uiIcons.chat} resizeMode="contain" style={s.icon}/></Pressable>;
 return <Pressable {...drag.panHandlers} accessibilityRole="button" accessibilityLabel="Open World chat" accessibilityHint="Tap to open chat. Drag to move the chat preview." onPress={onOpen} style={({pressed})=>[s.dock,{transform:[{translateX:offset.x},{translateY:offset.y}]},pressed&&s.pressed]}>
  <View style={s.heading}><Image source={uiIcons.chat} resizeMode="contain" style={s.smallIcon}/><Text style={s.channel}>WORLD</Text><Text style={s.open}>OPEN ›</Text></View>
  {rows.length?rows.map(row=><Text numberOfLines={1} key={row.id} style={s.message}><Text style={s.name}>{row.sender_name}: </Text>{row.body}</Text>):<Text style={s.empty}>World chat is quiet.</Text>}
 </Pressable>;
}
const s=StyleSheet.create({dock:{position:'absolute',left:10,bottom:82,zIndex:20,width:'58%',maxWidth:260,minHeight:72,paddingHorizontal:10,paddingVertical:8,backgroundColor:'rgba(5,13,22,.72)',borderLeftWidth:2,borderLeftColor:'#4fa8d4',borderRadius:radii.sm},heading:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:3},smallIcon:{width:16,height:16},channel:{...typography.caption,color:'#83c9ed',fontWeight:'900',letterSpacing:.8},open:{...typography.caption,color:C.muted,marginLeft:'auto',fontSize:10},message:{color:'#d9e2ec',fontSize:12,lineHeight:17,textShadowColor:'#000',textShadowRadius:3},name:{color:'#8dcdf0',fontWeight:'800'},empty:{...typography.caption,color:C.muted},bubble:{position:'absolute',left:12,bottom:82,zIndex:20,width:48,height:48,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(12,29,46,.84)',borderRadius:24,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line},icon:{width:25,height:25},pressed:{opacity:.65}});
