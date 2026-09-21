import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,type LayoutChangeEvent,type NativeScrollEvent,type NativeSyntheticEvent} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';

export interface ChatLogItem{id:string}

export function ChatLog<T extends ChatLogItem>({channelKey,items,firstUnreadMessageId,emptyText,renderItem,onCaughtUp}:{channelKey:string;items:readonly T[];firstUnreadMessageId?:string;emptyText:string;renderItem:(item:T)=>ReactNode;onCaughtUp?:()=>void}){
 const C=useGameTheme(),scrollRef=useRef<ScrollView>(null),nearBottomRef=useRef(!firstUnreadMessageId),initializedRef=useRef(false),previousIdsRef=useRef<Set<string>>(new Set()),caughtUpIdRef=useRef<string|undefined>();
 const [dividerId,setDividerId]=useState(firstUnreadMessageId),[dividerCleared,setDividerCleared]=useState(false),[pendingNew,setPendingNew]=useState(0);
 const latestId=items.length?items[items.length-1].id:undefined;

 const caughtUp=()=>{setPendingNew(0);setDividerCleared(true);if(!latestId||caughtUpIdRef.current===latestId)return;caughtUpIdRef.current=latestId;onCaughtUp?.();};
 useEffect(()=>{nearBottomRef.current=!firstUnreadMessageId;initializedRef.current=false;previousIdsRef.current=new Set();caughtUpIdRef.current=undefined;setDividerId(firstUnreadMessageId);setDividerCleared(false);setPendingNew(0);},[channelKey]);
 useEffect(()=>{if(!initializedRef.current&&!dividerId&&firstUnreadMessageId){nearBottomRef.current=false;setDividerId(firstUnreadMessageId)}},[firstUnreadMessageId,dividerId]);
 useEffect(()=>{
  const ids=new Set(items.map(item=>item.id));
  if(!initializedRef.current){previousIdsRef.current=ids;return;}
  let added=0;for(const id of ids)if(!previousIdsRef.current.has(id))added++;
  previousIdsRef.current=ids;
  if(!added)return;
  if(nearBottomRef.current){requestAnimationFrame(()=>{scrollRef.current?.scrollToEnd({animated:true});caughtUp();});}
  else setPendingNew(current=>current+added);
 },[items]);

 const onDividerLayout=(event:LayoutChangeEvent)=>{
  if(initializedRef.current||dividerCleared)return;
  initializedRef.current=true;previousIdsRef.current=new Set(items.map(item=>item.id));nearBottomRef.current=false;
  requestAnimationFrame(()=>scrollRef.current?.scrollTo({y:Math.max(0,event.nativeEvent.layout.y-10),animated:false}));
 };
 const onContentSizeChange=()=>{
  if(initializedRef.current)return;
  if(dividerId&&!dividerCleared)return;
  initializedRef.current=true;previousIdsRef.current=new Set(items.map(item=>item.id));nearBottomRef.current=true;
  requestAnimationFrame(()=>{scrollRef.current?.scrollToEnd({animated:false});caughtUp();});
 };
 const onScroll=(event:NativeSyntheticEvent<NativeScrollEvent>)=>{
  const {contentOffset,contentSize,layoutMeasurement}=event.nativeEvent;
  const near=layoutMeasurement.height+contentOffset.y>=contentSize.height-44;
  const was=nearBottomRef.current;nearBottomRef.current=near;
  if(near&&!was)caughtUp();
 };
 const jumpLatest=()=>{nearBottomRef.current=true;setPendingNew(0);scrollRef.current?.scrollToEnd({animated:true});caughtUp();};

 return <View style={s.root}>
  <ScrollView ref={scrollRef} style={s.log} contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled" scrollEventThrottle={80} onScroll={onScroll} onContentSizeChange={onContentSizeChange}>
   {items.length?items.map(item=><View key={item.id} onLayout={!dividerCleared&&dividerId===item.id?onDividerLayout:undefined}>{!dividerCleared&&dividerId===item.id?<View style={s.divider}><View style={[s.line,{backgroundColor:C.warning}]}/><Text style={[s.dividerText,{color:C.warning}]}>NEW MESSAGES</Text><View style={[s.line,{backgroundColor:C.warning}]}/></View>:null}{renderItem(item)}</View>):<Text style={[s.empty,{color:C.muted}]}>{emptyText}</Text>}
  </ScrollView>
  {pendingNew>0?<Pressable accessibilityRole="button" accessibilityLabel={'Jump to '+pendingNew+' new messages'} onPress={jumpLatest} style={({pressed})=>[s.jump,{backgroundColor:C.selection,borderColor:C.selectionLine},pressed&&s.pressed]}><Text style={[s.jumpText,{color:C.info}]}>↓ {pendingNew>99?'99+':pendingNew} NEW</Text></Pressable>:null}
 </View>;
}
const s=StyleSheet.create({root:{position:'relative'},log:{minHeight:120,maxHeight:260},inner:{paddingVertical:2},divider:{minHeight:26,flexDirection:'row',alignItems:'center',gap:7,paddingVertical:4},line:{height:1,flex:1,opacity:.75},dividerText:{fontSize:8,fontWeight:'900',letterSpacing:.9},empty:{fontSize:12,textAlign:'center',paddingVertical:28},jump:{position:'absolute',right:8,bottom:8,minHeight:32,justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderRadius:16},jumpText:{fontSize:9,fontWeight:'900',letterSpacing:.5},pressed:{opacity:.72}});
