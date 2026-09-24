import {ClassSkillAffinityNote} from '../ClassSkillAffinityNote';
import {UiIcon} from '../UiIcon';
import {useEffect,useRef} from 'react';
import {Image,Platform,Pressable,ScrollView,StyleSheet,Text,View,type GestureResponderHandlers} from 'react-native';
import type {ClassDef} from '../../content/classes';
import {classEmblemIconArtwork} from '../../theme/class-emblem-assets';
import {classCreationPresentation} from '../../theme/class-creation-art';

/** Class choice intentionally defers character appearance to the Identity step. */
export function ClassHeroCarousel({selected,classes,index,onChange,onIndex,panHandlers}:{selected:ClassDef;classes:ClassDef[];index:number;onChange:(direction:number)=>void;onIndex:(index:number)=>void;panHandlers:GestureResponderHandlers}){
  const presentation=classCreationPresentation[selected.id];
  const strip=useRef<ScrollView>(null);
  useEffect(()=>{strip.current?.scrollTo({x:Math.max(0,index*64-96),animated:true});},[selected.id,index]);
  return <View style={s.root} {...panHandlers}>
    <View style={s.summary} accessibilityLiveRegion="polite">
      <Pressable accessibilityRole="button" accessibilityLabel="Previous class" disabled={classes.length<2} accessibilityState={{disabled:classes.length<2}} onPress={()=>onChange(-1)} style={({pressed})=>[s.arrow,{opacity:classes.length<2?.35:pressed?.65:1}]}><UiIcon name="back" size={24}/></Pressable>
      <View style={s.identity}><Image accessible={false} source={classEmblemIconArtwork[selected.id]} style={s.crest}/><View style={s.copy}><Text style={[s.role,{color:presentation.accent}]}>{selected.role.toUpperCase()}</Text><Text style={s.className}>{selected.name}</Text><Text style={[s.traits,{color:presentation.accent}]}>{presentation.traits}</Text></View></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Next class" disabled={classes.length<2} accessibilityState={{disabled:classes.length<2}} onPress={()=>onChange(1)} style={({pressed})=>[s.arrow,{opacity:classes.length<2?.35:pressed?.65:1}]}><UiIcon name="next" size={24}/></Pressable>
    </View>
    <Text style={s.hint}>{index+1} / {classes.length} · Swipe or select a crest</Text>
    <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.strip}>{classes.map((item,i)=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Select ${item.name}`} accessibilityState={{selected:item.id===selected.id}} onPress={()=>onIndex(i)} style={[s.thumb,item.id===selected.id&&s.thumbSelected]}><Image accessible={false} source={classEmblemIconArtwork[item.id]} style={s.thumbArt}/><View style={[s.thumbMark,item.id===selected.id&&s.thumbMarkSelected]}/></Pressable>)}</ScrollView>
    <Text style={s.description}>{selected.description}</Text>
    <ClassSkillAffinityNote classId={selected.id} compact/>
    <View accessibilityLabel={`${selected.name} role ratings`} style={s.stats}>{([['TANK',selected.roleRatings.tank,'#8BAFC2'],['DAMAGE',selected.roleRatings.damage,'#D58B72'],['SUPPORT',selected.roleRatings.support,'#C9A7E8']] as const).map(([label,value,color])=><View key={label} style={s.stat}><Text style={s.statLabel}>{label}</Text><Text accessibilityLabel={`${label} ${value} out of 5`} style={[s.gems,{color}]}>{'◆'.repeat(value)}<Text style={s.gemEmpty}>{'◇'.repeat(5-value)}</Text></Text></View>)}</View>
  </View>;
}

const s=StyleSheet.create({
  root:{gap:16},summary:{minHeight:112,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:4,borderWidth:1,borderColor:'#54738C',borderRadius:20,backgroundColor:'#111D2B'},arrow:{width:44,height:52,alignItems:'center',justifyContent:'center'},identity:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12},crest:{width:60,height:60},copy:{flex:1,minWidth:0,gap:3},role:{fontSize:12,lineHeight:17,fontWeight:'900',letterSpacing:1.6},className:{color:'#FFF1CF',fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:28,lineHeight:34,fontWeight:'600'},traits:{fontSize:13,lineHeight:19,fontWeight:'700'},hint:{color:'#C8D6E6',fontSize:13,lineHeight:18,fontWeight:'600',textAlign:'center'},
  strip:{gap:8,paddingVertical:2},thumb:{width:56,height:62,alignItems:'center',justifyContent:'center',borderRadius:28},thumbSelected:{backgroundColor:'rgba(110,175,209,.20)'},thumbArt:{width:48,height:48},thumbMark:{width:5,height:5,borderRadius:3,backgroundColor:'transparent',marginTop:3},thumbMarkSelected:{backgroundColor:'#FFE09A'},description:{color:'#E1EAF4',fontSize:16,lineHeight:25,fontWeight:'500',textAlign:'center',paddingHorizontal:12},stats:{flexDirection:'row',gap:10,paddingVertical:8},stat:{flex:1,alignItems:'center',paddingVertical:4,gap:5},statLabel:{color:'#D1DCE8',fontSize:11,lineHeight:16,fontWeight:'900',letterSpacing:1.1},gems:{fontSize:14,lineHeight:21,letterSpacing:1},gemEmpty:{color:'#627386'},
});
