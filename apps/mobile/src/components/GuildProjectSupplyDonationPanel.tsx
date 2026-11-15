import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {GameButton} from './GameButton';
import {ResourceArtwork} from './ResourceArtwork';
import {useGameTheme} from '../theme/ThemeContext';
import {useOnlineGuildProjectUiText} from '../i18n/online-guild-project-ui';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import type {ThemeColors} from '../theme/theme';
import type {OnlineGuildProjectResourceGoal,OnlineGuildProjectSupplyItem} from '../online/guild-projects-v18';

export function GuildProjectSupplyDonationPanel({goals,inventory,busy,onDonate}:{
 goals:readonly OnlineGuildProjectResourceGoal[];
 inventory:readonly OnlineGuildProjectSupplyItem[];
 busy:boolean;
 onDonate:(itemId:string,quantity:number)=>void;
}){
 const language=useGameLanguage(),ui=useOnlineGuildProjectUiText(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [quantity,setQuantity]=useState('1');
 const activeGoals=goals.filter(goal=>goal.resourceId.startsWith('supply:')&&goal.current<goal.target);
 const available=inventory.filter(item=>item.available>0&&activeGoals.some(goal=>goal.resourceId==='supply:'+item.category));
 const selected=available.find(item=>item.itemId===selectedId)??available[0];
 const goal=activeGoals.find(row=>row.resourceId==='supply:'+selected?.category);
 const amount=Number(quantity),units=selected?amount*selected.value:0;
 const goalRemaining=goal?Math.max(0,goal.target-goal.current):0;
 const quantityProblem=!selected||!goal?null
  :!Number.isSafeInteger(amount)||amount<1?ui('Enter a positive whole number of resources.')
  :amount>10000?ui('You can donate up to 10,000 items at once.')
  :amount>selected.available?ui('You only have {count} eligible items available.',{count:selected.available.toLocaleString(language)})
  :units>goalRemaining?ui('That exceeds the remaining {count} supply needed.',{count:goalRemaining.toLocaleString(language)})
  :null;
 const valid=!!selected&&!!goal&&quantityProblem===null&&amount>=1;
 if(!goals.some(goal=>goal.resourceId.startsWith('supply:')))return null;
 return <View style={s.root}>
  <Text style={s.heading}>{ui('Supply donations')}</Text>
  <Text style={s.muted}>{ui('Donated resources are permanently consumed to help your Guild.')}</Text>
  {goals.filter(row=>row.resourceId.startsWith('supply:')).map(row=>{
   const label=row.resourceId==='supply:wood'?ui('Wood supplies'):row.resourceId==='supply:fish'?ui('Food supplies'):ui('Ore supplies');
   const pct=row.target>0?Math.min(100,row.current/row.target*100):100;
   return <View key={row.resourceId} style={s.goal}>
    <View style={s.between}><Text style={s.text}>{label}</Text><Text style={s.muted}>{row.current.toLocaleString(language)} / {row.target.toLocaleString(language)}</Text></View>
    <View style={s.track}><View style={[s.fill,{width:`${pct}%` as any}]}/></View>
   </View>;
  })}
  {available.length?<View style={s.selector}>
   <Text style={s.headingSmall}>{ui('Your available materials')}</Text>
   <View style={s.options}>
    {available.map(item=><Pressable key={item.itemId} accessibilityRole="button"
     accessibilityLabel={ui('{name} · {count} owned · {value} supply each',{name:item.name,count:item.available,value:item.value})}
     accessibilityState={{selected:item.itemId===selected?.itemId}}
     disabled={busy} onPress={()=>{setSelectedId(item.itemId);setQuantity('1');}}
     style={({pressed})=>[s.option,selected?.itemId===item.itemId&&s.chosen,pressed&&s.pressed]}>
     <ResourceArtwork itemId={item.itemId} size={31} framed={false}/>
     <View style={s.flex}><Text style={s.optionName} numberOfLines={1}>{item.name}</Text>
      <Text style={s.muted}>{item.available.toLocaleString(language)} × {item.value.toLocaleString(language)} {ui('supply')}</Text></View>
    </Pressable>)}
   </View>
   <View style={s.between}>
    <Text style={s.headingSmall}>{ui('Quantity')}</Text>
    <TextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad"
     editable={!busy} maxLength={5} selectTextOnFocus
     accessibilityLabel={ui('Donation quantity')}
     style={s.quantity} placeholderTextColor={C.muted}/>
   </View>
   {selected&&goal?<Text style={s.muted}>{ui('{remaining} supply still needed · You own {owned} of this resource',{remaining:goalRemaining.toLocaleString(language),owned:selected.available.toLocaleString(language)})}</Text>:null}
   <GameButton title={valid?ui('Donate {value} supply',{value:units.toLocaleString(language)}):ui('Donate supplies')}
    disabled={busy||!valid} loading={busy} onPress={()=>{if(valid&&selected)onDonate(selected.itemId,amount)}}/>
   {quantityProblem?<Text accessibilityRole="alert" style={[s.muted,{color:C.warning}]}>{quantityProblem}</Text>:null}
   <Text style={s.muted}>{ui('Each member can provide up to half of a supply goal. The server checks your remaining personal limit.')}</Text>
  </View>:activeGoals.length?<Text style={s.muted}>{ui('No eligible common resources are available for the unfinished supply goals. Check your inventory or gather more.')}</Text>
    :<Text style={s.muted}>{ui('All supply goals are complete. No further donations are needed.')}</Text>}
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:9,padding:10,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:9},
 heading:{fontSize:14,lineHeight:19,fontWeight:'800',color:C.text},
 headingSmall:{fontSize:12,lineHeight:17,fontWeight:'700',color:C.text},
 text:{fontSize:12,lineHeight:17,fontWeight:'700',color:C.text},
 muted:{fontSize:11,lineHeight:16,color:C.muted},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 goal:{gap:5},track:{height:7,borderRadius:5,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,overflow:'hidden'},
 fill:{height:'100%',backgroundColor:C.good},
 selector:{gap:9,marginTop:4},options:{flexDirection:'row',flexWrap:'wrap',gap:7},flex:{flex:1,minWidth:0},
 option:{flexDirection:'row',alignItems:'center',gap:6,width:'48%',minWidth:125,flexGrow:1,borderRadius:8,borderWidth:1,
  borderColor:C.lineStrong,backgroundColor:C.panel,padding:6},
 chosen:{borderColor:C.accent,backgroundColor:C.selection},pressed:{opacity:.75},
 optionName:{fontSize:11.5,lineHeight:16,fontWeight:'700',color:C.text},
 quantity:{minWidth:74,maxWidth:112,textAlign:'center',color:C.text,backgroundColor:C.panel,
  borderColor:C.lineStrong,borderWidth:1,borderRadius:7,minHeight:42,fontSize:15},
});}
