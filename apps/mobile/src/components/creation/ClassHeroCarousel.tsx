import {UiIcon} from '../UiIcon';
import {useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Image,Platform,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions,type GestureResponderHandlers} from 'react-native';
import type {ClassDef} from '../../content/classes';
import type {BodyPresentation} from '../../core/types';
import {classEmblemIconArtwork} from '../../theme/class-emblem-assets';
import {classCreationArt,classCreationPresentation} from '../../theme/class-creation-art';
import {creationColors as colors} from './CreationChrome';

export function ClassHeroCarousel({selected,classes,index,body,onBody,onChange,onIndex,panHandlers}:{selected:ClassDef;classes:ClassDef[];index:number;body:BodyPresentation;onBody:(body:BodyPresentation)=>void;onChange:(direction:number)=>void;onIndex:(index:number)=>void;panHandlers:GestureResponderHandlers}){
  const presentation=classCreationPresentation[selected.id],art=classCreationArt(selected.id);
  const {height:windowHeight}=useWindowDimensions();
  const heroHeight=Math.round(Math.max(240,Math.min(324,windowHeight*.36)));
  const strip=useRef<ScrollView>(null),fade=useRef(new Animated.Value(1)).current;
  const [reducedMotion,setReducedMotion]=useState(true);
  useEffect(()=>{let live=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(live)setReducedMotion(value)});const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',setReducedMotion);return()=>{live=false;subscription.remove();};},[]);
  useEffect(()=>{strip.current?.scrollTo({x:Math.max(0,index*64-96),animated:!reducedMotion});fade.stopAnimation();fade.setValue(reducedMotion?1:.25);const animation=Animated.timing(fade,{toValue:1,duration:180,useNativeDriver:true});if(!reducedMotion)animation.start();return()=>animation.stop();},[selected.id,body,index,reducedMotion,fade]);
  return <View style={s.root}>
    <View style={s.frame}>
      <View style={[s.heroStage,{height:heroHeight}]} {...panHandlers}>
        <Animated.View style={[StyleSheet.absoluteFill,{opacity:fade}]}>
          <Image accessibilityLabel={`${selected.name}, ${body} class equipment illustration`} source={art[body].front} fadeDuration={0} resizeMode="contain" style={s.hero}/>
        </Animated.View>
        <View pointerEvents="none" style={s.heroTop}><View style={[s.roleBadge,{borderColor:presentation.accent}]}><Text style={[s.role,{color:presentation.accent}]}>{selected.role.toUpperCase()}</Text></View><Image accessible={false} source={classEmblemIconArtwork[selected.id]} style={s.crest}/></View>
        <View style={[s.arrows,{top:Math.round((heroHeight-48)/2)}]}>{([-1,1] as const).map(direction=><Pressable key={direction} accessibilityRole="button" accessibilityLabel={direction<0?'Previous class':'Next class'} disabled={classes.length<2} accessibilityState={{disabled:classes.length<2}} onPress={()=>onChange(direction)} style={({pressed})=>[s.arrow,{opacity:classes.length<2 ? .35 : pressed ? .65 : 1}]}><UiIcon name={direction<0?'back':'next'} size={24}/></Pressable>)}</View>
      </View>
      <View style={s.nameplate} accessibilityLiveRegion="polite"><Text style={s.className}>{selected.name}</Text><Text style={[s.traits,{color:presentation.accent}]}>{presentation.traits}</Text></View>
    </View>
    <View style={s.browseMeta}><Text style={s.hint}>{index+1} / {classes.length} · Swipe or select a crest</Text><View style={s.presentation}>{(['male','female'] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={`Preview ${value} presentation`} accessibilityState={{selected:body===value}} onPress={()=>onBody(value)} style={[s.bodyChoice,body===value&&s.bodySelected]}><Text style={[s.bodyLabel,body===value&&s.bodyLabelSelected]}>{value==='male'?'Male':'Female'}</Text></Pressable>)}</View></View>
    <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.strip}>{classes.map((item,i)=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Select ${item.name}`} accessibilityState={{selected:item.id===selected.id}} onPress={()=>onIndex(i)} style={[s.thumb,item.id===selected.id&&s.thumbSelected]}><Image accessible={false} source={classEmblemIconArtwork[item.id]} style={s.thumbArt}/><View style={[s.thumbMark,item.id===selected.id&&s.thumbMarkSelected]}/></Pressable>)}</ScrollView>
    <Text style={s.description}>{selected.description}</Text>
    <View accessibilityLabel={`${selected.name} role ratings`} style={s.stats}>{([['TANK',selected.roleRatings.tank,'#8BAFC2'],['DAMAGE',selected.roleRatings.damage,'#D58B72'],['SUPPORT',selected.roleRatings.support,'#C9A7E8']] as const).map(([label,value,color])=><View key={label} style={s.stat}><Text style={s.statLabel}>{label}</Text><Text accessibilityLabel={`${label} ${value} out of 5`} style={[s.gems,{color}]}>{'◆'.repeat(value)}<Text style={s.gemEmpty}>{'◇'.repeat(5-value)}</Text></Text></View>)}</View>
  </View>;
}

const s=StyleSheet.create({
  root:{gap:16},frame:{backgroundColor:'transparent'},heroStage:{position:'relative',backgroundColor:'#020303',borderTopLeftRadius:84,borderTopRightRadius:84,borderBottomLeftRadius:24,borderBottomRightRadius:24,overflow:'hidden'},hero:{width:'100%',height:'100%'},heroTop:{position:'absolute',left:20,right:20,top:22,flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},roleBadge:{paddingHorizontal:8,paddingVertical:6},role:{fontSize:10,fontWeight:'600',letterSpacing:1.8},crest:{width:44,height:44},arrows:{position:'absolute',left:2,right:2,flexDirection:'row',justifyContent:'space-between'},arrow:{width:48,height:48,alignItems:'center',justifyContent:'center'},arrowGlyph:{fontSize:42,lineHeight:46,fontWeight:'300',color:'#E2C58F',includeFontPadding:false,textAlignVertical:'center'},
  nameplate:{alignItems:'center',paddingTop:14,paddingBottom:2,paddingHorizontal:8,gap:6},className:{color:'#F0DCB3',fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:30,lineHeight:38,fontWeight:'500',textAlign:'center'},traits:{fontSize:11,lineHeight:18,textAlign:'center',fontWeight:'400'},browseMeta:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'},hint:{color:colors.muted,fontSize:11},presentation:{flexDirection:'row',gap:10},bodyChoice:{minHeight:44,justifyContent:'center',paddingHorizontal:8,borderBottomWidth:1,borderColor:'transparent'},bodySelected:{borderColor:'#8BAFC2'},bodyLabel:{fontSize:12,color:colors.muted},bodyLabelSelected:{color:'#D6E9F1',fontWeight:'600'},
  strip:{gap:8,paddingVertical:4},thumb:{width:56,height:62,alignItems:'center',justifyContent:'center',borderRadius:28},thumbSelected:{backgroundColor:'rgba(110,175,209,.12)'},thumbArt:{width:48,height:48},thumbMark:{width:4,height:4,borderRadius:2,backgroundColor:'transparent',marginTop:3},thumbMarkSelected:{backgroundColor:colors.gold},description:{color:'#B7C3CF',fontSize:14,lineHeight:23,textAlign:'center',paddingHorizontal:12},stats:{flexDirection:'row',gap:10,paddingVertical:6},stat:{flex:1,alignItems:'center',paddingVertical:4,gap:4},statLabel:{color:colors.muted,fontSize:10,fontWeight:'700',letterSpacing:1},gems:{fontSize:13,lineHeight:20,letterSpacing:1},gemEmpty:{color:'#33414D'},
});
