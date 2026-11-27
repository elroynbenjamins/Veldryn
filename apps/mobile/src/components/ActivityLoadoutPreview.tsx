/** Local-only UI design QA. Never reads or changes a player save. */
import {useState} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {ACTIVITY_LOADOUT_GEAR_SLOTS} from '../core/activity-loadout-editor-review';
const categories=['Combat','Mining','Woodcutting','Fishing'] as const;
type Category=typeof categories[number];
type Draft={name:string;gear:Record<string,string>;pet:string;faith:Record<string,string>};
const groups=['Combat','Gathering','Production','Experience'];
const initial=():Draft[]=>categories.map(name=>({name,gear:{},pet:'None',faith:{}}));
const gearExamples=['None','Example Common','Example Epic'];
const faithExamples:Record<string,string[]>={Combat:['None','Ember Vow','Ward of Stone'],Gathering:['None','Verdant Whisper',"Nature's Covenant"],Production:['None',"Artisan's Prayer"],Experience:['None','Lantern of Wisdom']};
export function ActivityLoadoutPreview(){
 const C=useGameTheme(),{width,fontScale}=useWindowDimensions();
 const compact=width<360||fontScale>=1.25;
 const [slots,setSlots]=useState(3),[auto,setAuto]=useState(true),[drafts,setDrafts]=useState(initial);
 const [active,setActive]=useState<Category>('Mining'),[editing,setEditing]=useState<number|null>(null);
 const [draft,setDraft]=useState<Draft|null>(null),[picker,setPicker]=useState<string|null>(null);
 const button=(label:string,action:()=>void,selected=false)=><Pressable accessibilityRole="button" onPress={action} style={[s.button,{borderColor:selected?C.selectionLine:C.line,backgroundColor:selected?C.selection:C.panelRaised}]}><Text style={{color:C.text,fontWeight:'700',fontSize:12,textAlign:'center'}}>{label}</Text></Pressable>;
 const edit=(index:number)=>{setDraft({...drafts[index],gear:{...drafts[index].gear},faith:{...drafts[index].faith}});setEditing(index);setPicker(null);};
 const close=()=>{setEditing(null);setDraft(null);setPicker(null);};
 const save=()=>{if(editing===null||!draft||!draft.name.trim())return;setDrafts(old=>old.map((row,i)=>i===editing?{...draft,name:draft.name.trim()}:row));close();};
 const activeIndex=categories.indexOf(active);
 const activeDraft=activeIndex<slots?drafts[activeIndex]:null;
 const options=picker==='pet'?['None','Example gathering pet','Example combat pet']:picker?.startsWith('faith:')?faithExamples[picker.slice(6)]??[]:gearExamples;
 const choose=(value:string)=>{if(!draft||!picker)return;if(picker==='pet')setDraft({...draft,pet:value});else if(picker.startsWith('faith:'))setDraft({...draft,faith:{...draft.faith,[picker.slice(6)]:value}});else setDraft({...draft,gear:{...draft.gear,[picker]:value}});setPicker(null);};
 return <View style={[s.panel,{backgroundColor:C.panel,borderColor:C.line}]}>
  <Text style={{color:C.warning,fontSize:10,fontWeight:'900'}}>DEVELOPER PREVIEW · NO PLAYER SAVE</Text>
  <View style={s.row}><Text style={[s.title,{color:C.text}]}>Activity loadouts</Text><Text style={{color:C.muted}}>{slots} / 5 slots</Text></View>
  <Text style={{color:C.muted,fontSize:11}}>Sample slot availability</Text>
  <View style={s.row}>{[1,2,3,4,5].map(n=><View key={n} style={{flex:1}}>{button(String(n),()=>setSlots(n),slots===n)}</View>)}</View>
  <View style={s.row}><Text style={{color:C.text,flex:1}}>Automatic switching</Text>{button(auto?'On':'Off',()=>setAuto(v=>!v),auto)}</View>
  {categories.map((category,index)=><Pressable key={category} accessibilityRole="button" accessibilityState={{disabled:index>=slots}} disabled={index>=slots} onPress={()=>edit(index)} style={[s.entry,{borderColor:index<slots&&active===category&&auto?C.good:C.line,backgroundColor:C.panelRaised}]}>
   <View style={{flex:1,minWidth:0}}><Text style={{color:C.text,fontWeight:'800'}}>{drafts[index].name}</Text><Text style={{color:C.muted,fontSize:11}}>{index>=slots?'Slot locked':category+' · '+drafts[index].pet}</Text></View>
   <Text style={{color:index>=slots?C.muted:C.accent,fontSize:12}}>{index>=slots?'Locked':active===category&&auto?'Active · Edit':'Edit'}</Text>
  </Pressable>)}
  {slots===5?<Text style={{color:C.muted,fontSize:11}}>Fifth slot: reserved for an alternate manual setup in this demo.</Text>:null}
  <Text style={{color:C.muted,fontSize:11}}>Simulate starting an activity</Text>
  <View style={s.wrap}>{categories.map(category=><View key={category} style={{flexGrow:1}}>{button(category,()=>setActive(category),active===category)}</View>)}</View>
  <View style={[s.entry,{borderColor:C.line,backgroundColor:C.panel2}]}><View style={{flex:1}}><Text style={{color:C.text,fontWeight:'800'}}>{active}</Text><Text style={{color:auto&&activeDraft?C.good:C.muted,fontSize:11}}>{!auto?'Manual setup':activeDraft?activeDraft.name+' loadout active':'No assigned loadout'}</Text></View><Text style={{color:C.muted,fontSize:11}}>{auto&&activeDraft?activeDraft.pet:'—'}</Text></View>
  <Modal visible={draft!==null} transparent animationType="none" onRequestClose={close}>
   <View style={[s.shade,{backgroundColor:C.overlay}]}><View accessibilityViewIsModal style={[s.modal,{backgroundColor:C.panel,borderColor:C.lineStrong}]}>
    <View style={s.row}><Text style={[s.title,{color:C.text}]}>{editing===null?'Loadout':categories[editing]} loadout</Text>{button('Cancel',close)}</View>
    {draft?<><ScrollView style={{flexShrink:1}} contentContainerStyle={{gap:10}} keyboardShouldPersistTaps="handled">
     <TextInput accessibilityLabel="Loadout name" value={draft.name} maxLength={28} onChangeText={name=>setDraft({...draft,name})} style={[s.input,{color:C.text,borderColor:C.line,backgroundColor:C.inputBg}]}/>
     <View style={s.wrap}>{ACTIVITY_LOADOUT_GEAR_SLOTS.map(slot=><Pressable key={slot} accessibilityRole="button" accessibilityLabel={'Edit '+slot} onPress={()=>setPicker(slot)} style={[s.gear,{width:compact?'23%':'18%',backgroundColor:C.panelRaised,borderColor:C.line}]}><Text style={{color:C.text,fontWeight:'700',fontSize:11,textAlign:'center'}}>{slot}</Text><Text style={{color:C.muted,fontSize:10,textAlign:'center'}}>{draft.gear[slot]??'Empty'}</Text></Pressable>)}</View>
     {button('Active pet · '+draft.pet,()=>setPicker('pet'))}
     <Text style={{color:C.muted,fontSize:11,fontWeight:'800'}}>FAITH BLESSINGS</Text>
     {groups.map(group=><View key={group}>{button(group+' · '+(draft.faith[group]??'None'),()=>setPicker('faith:'+group))}</View>)}
     {picker?<View style={[s.panel,{borderColor:C.selectionLine,backgroundColor:C.panel2}]}><Text style={{color:C.text,fontWeight:'800'}}>Choose {picker.replace('faith:','')}</Text>{options.map(option=><View key={option}>{button(option,()=>choose(option))}</View>)}{button('Back',()=>setPicker(null))}</View>:null}
     <Text style={{color:C.muted,fontSize:11}}>Illustrative choices only. Editing never equips a loadout.</Text>
    </ScrollView>{button('Save preview loadout',save,true)}</>:null}
   </View></View>
  </Modal>
 </View>;
}
const s=StyleSheet.create({panel:{padding:10,borderWidth:1,borderRadius:10,gap:8},title:{fontSize:16,fontWeight:'900',flex:1},row:{flexDirection:'row',alignItems:'center',gap:6},wrap:{flexDirection:'row',flexWrap:'wrap',gap:5},button:{minHeight:44,borderWidth:1,borderRadius:7,justifyContent:'center',alignItems:'center',paddingHorizontal:8,paddingVertical:6},entry:{flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderRadius:8,padding:9,minHeight:48},shade:{flex:1,justifyContent:'center',padding:12},modal:{maxHeight:'90%',padding:12,borderWidth:1,borderRadius:12,gap:10},input:{minHeight:44,borderWidth:1,borderRadius:7,paddingHorizontal:9,fontSize:15},gear:{minHeight:62,borderWidth:1,borderRadius:7,justifyContent:'center',padding:3,gap:3}});
