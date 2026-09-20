import {useState,type ReactNode} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameTextInput} from './GameTextInput';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {ProfileScenePreview} from './ProfileScenePreview';
import {RegionArtwork} from './RegionArtwork';
import type {GameState} from '../core/types';
import {BASE_PROFILE_BACKGROUNDS,canUseProfileCosmetic} from '../core/profile-cosmetics';
import {PROFILE_BACKGROUND_PREVIEWS} from '../theme/profile-background-assets';
import {profileBorderSourceById} from '../theme/profile-border-assets';
import {petArtSource} from '../theme/pet-art';
import {collectibleJournal} from '../core/collectibles';
import {COLLECTIBLE_TARGET_LABELS} from '../content/collectibles';
import {LIVE_EVENT_CATALOG} from '../content/live-events';
import {C,radii,typography} from '../theme/theme';
import {SavedLoadoutsPanel} from './SavedLoadoutsPanel';

type Tab='Backgrounds'|'Borders'|'Titles'|'Pets';
function CosmeticTile({name,status,detail,selected,onPress,children}:{name:string;status:string;detail?:string;selected:boolean;onPress:()=>void;children:ReactNode}){
 return <Pressable accessibilityRole="button" accessibilityLabel={`${name}, ${status}`} accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.choice,selected&&s.choiceOn,pressed&&s.choicePressed]}>
  <View style={s.artwork}>{children}<View style={[s.statusBadge,selected&&s.statusBadgeOn]}><Text numberOfLines={1} style={[s.badgeText,selected&&s.badgeTextOn]}>{selected?'Previewing':status}</Text></View></View>
  <Text numberOfLines={2} style={s.name}>{name}</Text>{detail?<Text numberOfLines={2} style={s.detail}>{detail}</Text>:null}
 </Pressable>;
}
export function ProfileEditor({state,onChange}:{state:GameState;onChange:(next:GameState)=>void}){
 const character=state.character!;
 const [tab,setTab]=useState<Tab>('Backgrounds'),[title,setTitle]=useState(character.profileTitle??'New Adventurer');
 const [background,setBackground]=useState(character.profileBackgroundId??'asterfall-night'),[border,setBorder]=useState(character.profileBorderId??''),[pet,setPet]=useState(character.selectedCosmeticPetId??'');
 const rewards=[...new Map(LIVE_EVENT_CATALOG.flatMap(event=>[...event.milestones(character.classId).map(m=>m.reward),...event.shop.map(o=>o.reward)]).map(r=>[r.id,r])).values()],petRows=collectibleJournal(state).filter(row=>row.kind==='pet');
 const rewardName=(id:string)=>rewards.find(r=>r.id===id)?.name??id.replace(/^frame_|^pet_/,'').replaceAll('_',' ');
 const preview={...state,character:{...character,profileTitle:title,profileBackgroundId:background,profileBorderId:border||undefined,selectedCosmeticPetId:pet||undefined}};
 const kind=tab==='Backgrounds'?'background':tab==='Borders'?'border':'pet',id=tab==='Backgrounds'?background:tab==='Borders'?border:pet;
 const usable=canUseProfileCosmetic(state,kind,id);
 const applied=tab==='Backgrounds'?background===(character.profileBackgroundId??'asterfall-night'):tab==='Borders'?border===(character.profileBorderId??''):pet===(character.selectedCosmeticPetId??'');
 const apply=()=>{if(!canUseProfileCosmetic(state,kind,id))return;const patch=kind==='background'?{profileBackgroundId:id}:kind==='border'?{profileBorderId:id||undefined}:{selectedCosmeticPetId:id||undefined};onChange({...state,character:{...character,...patch}});};
 return <Panel>
  <Text style={s.heading}>Your profile</Text><Text style={s.sub}>Preview your look, then apply an unlocked cosmetic.</Text>
  <ProfileScenePreview state={preview} backgroundId={background}/>
  {tab==='Pets'&&<Text style={s.sub}>Cosmetic Pets are separate from Combat Companions. Owned Pets keep their collection passive bonus; the selected Pet also applies its stronger active bonus. Exact bonuses and sources are shown below.</Text>}
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{(['Backgrounds','Borders','Titles','Pets'] as Tab[]).map(value=><Pressable key={value} accessibilityRole="tab" accessibilityState={{selected:tab===value}} onPress={()=>setTab(value)} style={[s.tab,tab===value&&s.tabOn]}><Text style={[s.tabText,tab===value&&s.selectedText]}>{value}</Text>{tab===value?<View style={s.tabIndicator}/>:null}</Pressable>)}</ScrollView>
  {tab==='Backgrounds'&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.gallery}>
   {BASE_PROFILE_BACKGROUNDS.map(item=><CosmeticTile key={item.id} name={item.name} status="Available" selected={background===item.id} onPress={()=>setBackground(item.id)}><View style={s.sceneThumb}><RegionArtwork regionId={item.region}/></View></CosmeticTile>)}
   {PROFILE_BACKGROUND_PREVIEWS.map(item=>{const unlocked=canUseProfileCosmetic(state,'background',item.id),reward=rewards.some(r=>r.id===item.id);return <CosmeticTile key={item.id} name={item.name} status={unlocked?'Unlocked':reward?'Event reward':'Preview only'} selected={background===item.id} onPress={()=>setBackground(item.id)}><Image source={item.source} style={s.sceneThumb} resizeMode="cover"/></CosmeticTile>})}
  </ScrollView>}
  {tab==='Borders'&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.gallery}>
   <CosmeticTile name="No event border" status="Available" selected={!border} onPress={()=>setBorder('')}><View style={[s.sceneThumb,s.blank]}><Text style={s.blankMark}>◇</Text></View></CosmeticTile>
   {[...profileBorderSourceById].map(([key,source])=>{const unlocked=canUseProfileCosmetic(state,'border',key);return <CosmeticTile key={key} name={rewardName(key)} status={unlocked?'Unlocked':rewards.some(r=>r.id===key)?'Event reward':'Preview only'} selected={border===key} onPress={()=>setBorder(key)}><View style={s.sceneThumb}><RegionArtwork regionId="KINGS_ROAD" muted/><Image source={source} style={s.borderThumb} resizeMode="contain"/></View></CosmeticTile>})}
  </ScrollView>}
  {tab==='Pets'&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.gallery}>
   <CosmeticTile name="No Pet" status="Available" detail="Show your character without a cosmetic Pet." selected={!pet} onPress={()=>setPet('')}><View style={[s.sceneThumb,s.blank]}><Text style={s.blankMark}>Solo</Text></View></CosmeticTile>
   {petRows.map(row=>{const source=petArtSource(row.id),active=(row.activeBps/100).toFixed(2)+'%',passive=(row.ownedBps/100).toFixed(2)+'%',detail=COLLECTIBLE_TARGET_LABELS[row.target]+' · +'+passive+' owned · +'+active+' selected';return <CosmeticTile key={row.id} name={row.name} status={row.owned?'Unlocked':row.event?'Event reward':'Locked'} detail={row.owned?detail:row.source} selected={pet===row.id} onPress={()=>setPet(row.id)}><View style={[s.sceneThumb,s.petThumb]}>{source?<Image source={source} style={StyleSheet.absoluteFill} resizeMode="contain"/>:<Text style={s.petFallback}>?</Text>}</View></CosmeticTile>})}
  </ScrollView>}
  {tab==='Titles'?<><Text style={s.sub}>Displayed title</Text><GameTextInput accessibilityLabel="Profile title" value={title} onChangeText={setTitle} maxLength={32} placeholder="New Adventurer"/><GameButton title="Save title" disabled={title.trim()===(character.profileTitle??'New Adventurer')} onPress={()=>onChange({...state,character:{...character,profileTitle:title.trim()||'New Adventurer'}})}/>
   {rewards.filter(r=>r.kind==='title').map(reward=>{const owned=state.account.unlockedTitleIds?.includes(reward.id);return <Pressable key={reward.id} accessibilityRole="button" disabled={!owned} accessibilityState={{disabled:!owned,selected:title===reward.name}} onPress={()=>setTitle(reward.name)} style={[s.titleChoice,!owned&&s.locked]}><Text style={s.name}>{reward.name}</Text><Text style={s.status}>{owned?'Unlocked':'Locked · event reward'}</Text></Pressable>})}
  </>:<><GameButton title={applied?'Currently equipped':usable?'Apply '+(tab==='Pets'?'Pet':tab==='Borders'?'border':'background'):'Preview only · not unlocked'} disabled={!usable||applied} onPress={apply}/>{!usable&&<Text style={s.sub}>You can inspect this cosmetic here. Applying it requires an available unlock.</Text>}</>}
  <SavedLoadoutsPanel state={state} onChange={onChange}/>
 </Panel>;
}
const s=StyleSheet.create({heading:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},tabs:{gap:4,padding:4,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.bg},tab:{minHeight:44,justifyContent:'center',paddingHorizontal:12,borderRadius:radii.sm,position:'relative'},tabOn:{backgroundColor:'#20384A'},tabText:{...typography.bodyStrong,color:C.muted},selectedText:{color:'#F2D08D'},tabIndicator:{position:'absolute',left:10,right:10,bottom:0,height:3,borderTopLeftRadius:3,borderTopRightRadius:3,backgroundColor:C.accent},gallery:{gap:12,paddingVertical:8,paddingRight:8},choice:{width:160,minHeight:132,padding:7,gap:8,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderRadius:radii.lg,backgroundColor:'#101B27'},choiceOn:{borderWidth:1,borderColor:C.info,backgroundColor:'#172c3c'},choicePressed:{opacity:.76},artwork:{width:'100%',height:88,borderRadius:radii.md,overflow:'hidden',backgroundColor:C.bg},sceneThumb:{width:'100%',height:'100%',overflow:'hidden'},borderThumb:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},petThumb:{padding:8},statusBadge:{position:'absolute',left:6,bottom:6,maxWidth:'90%',paddingHorizontal:7,paddingVertical:3,borderRadius:99,backgroundColor:'rgba(7,17,28,.88)',borderWidth:StyleSheet.hairlineWidth,borderColor:C.line},statusBadgeOn:{borderColor:C.info,backgroundColor:'rgba(18,57,78,.94)'},badgeText:{fontSize:10,lineHeight:13,color:C.muted,fontWeight:'800'},badgeTextOn:{color:'#B8E5F5'},name:{...typography.bodyStrong,color:C.text},detail:{...typography.caption,color:C.muted,lineHeight:15},status:{...typography.caption,color:C.muted},petFallback:{...typography.title,color:C.muted,textAlign:'center',marginTop:28},blank:{justifyContent:'center',alignItems:'center',backgroundColor:C.panel},blankMark:{...typography.bodyStrong,color:C.muted},titleChoice:{minHeight:56,gap:4,paddingVertical:8,borderBottomWidth:1,borderColor:C.line},locked:{opacity:.55}});
