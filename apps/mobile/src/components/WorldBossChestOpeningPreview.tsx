/** Developer-only illustrated chest reveal. No account data, RNG, network,
 * reward writer or production claim action. Fixed demo receipts only. */
import {useEffect,useMemo,useState} from 'react';
import {Animated,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {UiIcon} from './UiIcon';
import {buildWorldBossChestOpeningReviewV97,type ChestOpenEntryReviewV97} from '../core/world-boss-chest-opening-review-v97';
const DEMO_ACCOUNT='qa-chest-opening';
const DEMO:readonly ChestOpenEntryReviewV97[]=[450,650,900,450,450,450].map((gold,i):ChestOpenEntryReviewV97=>{
 const sourceKey='qa-world-chest-'+i;
 const resources=[{itemId:'gold',name:'Gold',quantity:gold},
  {itemId:'companion_essence',name:'Companion Essence',quantity:i===1?8:i===2?10:6},
  {itemId:'gem_dust',name:'Gem Dust',quantity:i===1?3:i===2?4:2},
  {itemId:'tempering_dust',name:'Tempering Dust',quantity:i===1?3:i===2?4:2},
  ...(i>=3?[{itemId:'IRONWOOD_LOG',name:'Ironwood Logs',quantity:8}]:[])];
 return {sourceKey,state:'committed',receipt:{sourceKey,accountId:DEMO_ACCOUNT,status:'committed',
  resources,gear:i===1?{instanceId:'qa-rootbound-grips',name:'Rootbound Grips',rarity:'epic',quality:87,skill:'woodcutting'}:null}};
});
const rarityColor={common:'#B8BAC1',uncommon:'#79C88A',rare:'#79AEFF',epic:'#C084FC',legendary:'#E8B66B',mythic:'#FF8CA4'};
export function WorldBossChestOpeningPreview({reduceMotion=false}:{reduceMotion?:boolean}){
 const C=useGameTheme();
 const [count,setCount]=useState(0),[revealed,setRevealed]=useState(false),[expanded,setExpanded]=useState(false);
 const [glow]=useState(()=>new Animated.Value(0));
 const result=useMemo(()=>count?buildWorldBossChestOpeningReviewV97(DEMO_ACCOUNT,DEMO.slice(0,count)):null,[count]);
 useEffect(()=>{
  if(!count||revealed)return;
  if(reduceMotion){setRevealed(true);return;}
  glow.setValue(0);
  const animation=Animated.timing(glow,{toValue:1,duration:620,useNativeDriver:true});
  animation.start();
  const timer=setTimeout(()=>setRevealed(true),650);
  return ()=>{clearTimeout(timer);animation.stop();};
 },[count,revealed,reduceMotion,glow]);
 const open=(n:number)=>{setExpanded(false);setRevealed(reduceMotion);setCount(n);};
 const close=()=>{setCount(0);setRevealed(false);setExpanded(false);};
 const button=(label:string,onPress:()=>void,secondary=false)=>(
  <Pressable accessibilityRole="button" onPress={onPress} style={[s.button,{backgroundColor:secondary?C.secondaryButton:C.primaryButton,
   borderColor:secondary?C.secondaryButtonBorder:C.primaryButtonBorder}]}>
   <Text style={[s.buttonText,{color:secondary?C.secondaryButtonText:C.primaryButtonText}]}>{label}</Text>
  </Pressable>);
 return <View style={{gap:8}}>
  <Text style={{color:C.muted,fontSize:11}}>Opening demo · fixed illustrative loot, no rewards granted</Text>
  <View style={s.buttons}>{button('Preview one',()=>open(1),true)}{button('Preview all (6)',()=>open(6))}</View>
  <Modal visible={count>0} transparent animationType={reduceMotion?'none':'fade'} onRequestClose={close}>
   <View style={[s.shade,{backgroundColor:C.overlay}]} onAccessibilityEscape={close}>
    <View accessibilityViewIsModal style={[s.panel,{backgroundColor:C.panel,borderColor:C.lineStrong}]}>
     <View style={s.header}><View style={s.flex}>
      <Text style={[s.kicker,{color:C.warning}]}>DEVELOPER PREVIEW</Text>
      <Text accessibilityRole="header" style={[s.title,{color:C.text}]}>World Boss Rewards</Text>
      <Text accessibilityLiveRegion="polite" style={{color:C.muted,fontSize:12}}>{revealed?count+' demo chests opened':'Opening '+count+' demo chest'+(count===1?'':'s')+'…'}</Text>
     </View><Pressable accessibilityRole="button" accessibilityLabel="Close preview" onPress={close} style={s.close}><Text style={{color:C.text,fontSize:24}}>×</Text></Pressable></View>
     <Animated.View style={[s.chest,{opacity:revealed?1:glow.interpolate({inputRange:[0,1],outputRange:[.45,1]}),
      transform:[{scale:revealed?1:glow.interpolate({inputRange:[0,1],outputRange:[.85,1.08]})}]}]}>
      <UiIcon name="rewards" size={64}/>
     </Animated.View>
     {revealed&&result?<ScrollView style={s.scroll} contentContainerStyle={{gap:10}} showsVerticalScrollIndicator>
      <Text style={[s.kicker,{color:C.muted}]}>EQUIPMENT FOUND</Text>
      {result.gear.length?result.gear.map(g=><View key={g.instanceId} style={[s.gear,{backgroundColor:C.panelRaised,borderColor:rarityColor[g.rarity]}]}>
       <UiIcon name="rewards" size={32}/><View style={s.flex}>
        <Text style={[s.name,{color:rarityColor[g.rarity]}]}>{g.name}</Text>
        <Text style={{color:C.text,fontSize:12}}>{g.rarity[0].toUpperCase()+g.rarity.slice(1)} · Quality {g.quality}</Text>
        <Text style={{color:C.muted,fontSize:11}}>{g.skill[0].toUpperCase()+g.skill.slice(1)} · +17.78% innate speed (example)</Text>
       </View>
      </View>):<Text style={{color:C.muted,fontSize:12}}>No equipment in this example. Resources are still received.</Text>}
      <Text style={[s.kicker,{color:C.muted}]}>TOTAL RESOURCES</Text>
      <View style={s.grid}>{result.resources.map(item=><View key={item.itemId} style={[s.resource,{backgroundColor:C.panelRaised,borderColor:C.line}]}>
       <UiIcon name="rewards" size={20}/><Text style={[s.name,{color:C.text}]}>{item.quantity.toLocaleString('en-US')}</Text>
       <Text style={{color:C.muted,fontSize:11,textAlign:'center'}}>{item.name}</Text>
      </View>)}</View>
      {button(expanded?'Hide chest breakdown':'Show chest breakdown',()=>setExpanded(x=>!x),true)}
      {expanded?DEMO.slice(0,count).map((entry,i)=>entry.state==='committed'?<View key={entry.sourceKey} style={{gap:3}}>
       <Text style={[s.name,{color:C.text}]}>{i===0?'War Camp':i===1?'Warrior':i===2?'Realm Victory':'Personal Damage'} Chest</Text>
       <Text style={{color:C.muted,fontSize:11}}>{entry.receipt.resources.map(x=>x.quantity+' '+x.name).join(' · ')}</Text>
       {entry.receipt.gear?<Text style={{color:rarityColor[entry.receipt.gear.rarity],fontSize:12}}>{entry.receipt.gear.name}</Text>:null}
      </View>:null):null}
     </ScrollView>:null}
     {revealed?button('Done',close):button('Skip reveal',()=>setRevealed(true))}
    </View>
   </View>
  </Modal>
 </View>;
}
const s=StyleSheet.create({
 shade:{flex:1,justifyContent:'center',padding:14},panel:{maxHeight:'90%',borderWidth:1,borderRadius:14,padding:14,gap:12},
 header:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},kicker:{fontSize:10,fontWeight:'900',letterSpacing:1},
 title:{fontSize:19,fontWeight:'900'},close:{width:44,height:44,alignItems:'center',justifyContent:'center'},chest:{alignItems:'center',justifyContent:'center',minHeight:70},
 scroll:{flexGrow:0,flexShrink:1},gear:{flexDirection:'row',gap:10,alignItems:'center',borderWidth:1,borderRadius:9,padding:10},
 name:{fontWeight:'800',fontSize:13},grid:{flexDirection:'row',flexWrap:'wrap',gap:6},
 resource:{flexGrow:1,flexBasis:'46%',minWidth:100,borderWidth:1,borderRadius:8,padding:8,alignItems:'center',gap:3},
 buttons:{flexDirection:'row',flexWrap:'wrap',gap:8},button:{flexGrow:1,minHeight:44,borderRadius:8,borderWidth:1,paddingHorizontal:12,paddingVertical:10,alignItems:'center',justifyContent:'center'},
 buttonText:{fontWeight:'900',fontSize:12,textAlign:'center'},
});
