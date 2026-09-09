import React,{useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {ProfileScenePreview} from './ProfileScenePreview';
import {GameState} from '../core/types';
import {PROFILE_BACKGROUND_PREVIEWS} from '../theme/profile-background-assets';
import {C} from '../theme/theme';
import {LIVE_EVENT_CATALOG} from '../content/live-events';

const LIVE_BACKGROUND_BINDINGS=[['asterfall-night','Asterfall Night'],['ironwood-dawn','Ironwood Dawn'],['silverbrook-mist','Silverbrook Mist'],['oathglass-hall','Oathglass Hall']] as const;

export function ProfileEditor({state,onChange}:{state:GameState;onChange:(next:GameState)=>void}){
  const character=state.character!;
  const [title,setTitle]=useState(character.profileTitle??'New Adventurer');
  const [previewBackgroundId,setPreviewBackgroundId]=useState(PROFILE_BACKGROUND_PREVIEWS[0].id);
  const selectedPreview=PROFILE_BACKGROUND_PREVIEWS.find(background=>background.id===previewBackgroundId)!;
  const eventRewards=LIVE_EVENT_CATALOG.flatMap(event=>event.milestones(character.classId).map(milestone=>milestone.reward));
  const eventTitles=eventRewards.filter(reward=>reward.kind==='title'&&state.account.unlockedTitleIds?.includes(reward.id));
  const eventBackgrounds=eventRewards.filter(reward=>reward.kind==='background'&&state.account.unlockedProfileBackgroundIds?.includes(reward.id));
  const eventBorders=eventRewards.filter(reward=>reward.kind==='border'&&state.account.unlockedProfileBorderIds?.includes(reward.id));
  const eventPets=eventRewards.filter(reward=>reward.kind==='pet'&&state.account.unlockedCosmeticPetIds?.includes(reward.id));
  const save=()=>onChange({...state,character:{...character,profileTitle:title.trim()||'New Adventurer'}});
  return <Panel>
    <Text style={s.title}>My profile</Text>
    <Text style={s.sub}>This profile belongs to {character.name} and is shown when other players view your character.</Text>
    <Text style={s.sub}>Your selected skin is used in full and compact profiles. Equipment changes stats only.</Text>
    <Text style={s.label}>Displayed title</Text>
    <TextInput value={title} onChangeText={setTitle} maxLength={32} placeholder="New Adventurer" placeholderTextColor={C.muted} style={s.input}/>
    <GameButton title="Save profile title" onPress={save}/>
    {eventTitles.length?<><Text style={s.label}>Unlocked event titles</Text><View style={s.row}>{eventTitles.map(reward=><View style={s.flex} key={reward.id}><GameButton title={reward.name} tone={character.profileTitle===reward.name?'primary':'secondary'} onPress={()=>{setTitle(reward.name);onChange({...state,character:{...character,profileTitle:reward.name}})}}/></View>)}</View></>:null}

    <Text style={s.label}>Approved scene review</Text>
    <ProfileScenePreview state={state} backgroundId={previewBackgroundId}/>
    <Text style={s.previewName}>{selectedPreview.name}</Text>
    <Text style={s.warning}>Preview only · export prepared · device QA and unlock binding pending. Choosing a preview does not grant or save this cosmetic.</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.gallery}>
      {PROFILE_BACKGROUND_PREVIEWS.map(background=><Pressable key={background.id} accessibilityRole="button" accessibilityLabel={`Preview ${background.name}`} accessibilityState={{selected:background.id===previewBackgroundId}} onPress={()=>setPreviewBackgroundId(background.id)} style={[s.thumbButton,background.id===previewBackgroundId&&s.thumbSelected]}>
        <Image source={background.source} resizeMode="cover" style={s.thumb}/>
        <Text numberOfLines={2} style={s.thumbLabel}>{background.name}</Text>
      </Pressable>)}
    </ScrollView>

    <Text style={s.label}>Existing profile background binding</Text>
    <Text style={s.sub}>These live save IDs are preserved until the approved scenes receive canonical unlock mappings.</Text>
    <View style={s.row}>{LIVE_BACKGROUND_BINDINGS.map(([id,name])=><View style={s.flex} key={id}><GameButton title={name} tone={character.profileBackgroundId===id?'primary':'secondary'} onPress={()=>onChange({...state,character:{...character,profileBackgroundId:id}})}/></View>)}</View>
    {eventBackgrounds.length?<><Text style={s.label}>Unlocked event backgrounds</Text><View style={s.row}>{eventBackgrounds.map(reward=><View style={s.flex} key={reward.id}><GameButton title={reward.name} tone={character.profileBackgroundId===reward.id?'primary':'secondary'} onPress={()=>{setPreviewBackgroundId(reward.id);onChange({...state,character:{...character,profileBackgroundId:reward.id}})}}/></View>)}</View></>:null}
    {eventBorders.length?<><Text style={s.label}>Profile border</Text><View style={s.row}><View style={s.flex}><GameButton title="No event border" tone={!character.profileBorderId?'primary':'secondary'} onPress={()=>onChange({...state,character:{...character,profileBorderId:undefined}})}/></View>{eventBorders.map(reward=><View style={s.flex} key={reward.id}><GameButton title={reward.name} tone={character.profileBorderId===reward.id?'primary':'secondary'} onPress={()=>onChange({...state,character:{...character,profileBorderId:reward.id}})}/></View>)}</View></>:null}
    {eventPets.length?<><Text style={s.label}>Profile companion</Text><View style={s.row}><View style={s.flex}><GameButton title="No companion" tone={!character.selectedCosmeticPetId?'primary':'secondary'} onPress={()=>onChange({...state,character:{...character,selectedCosmeticPetId:undefined}})}/></View>{eventPets.map(reward=><View style={s.flex} key={reward.id}><GameButton title={reward.name} tone={character.selectedCosmeticPetId===reward.id?'primary':'secondary'} onPress={()=>onChange({...state,character:{...character,selectedCosmeticPetId:reward.id}})}/></View>)}</View></>:null}
  </Panel>;
}

const s=StyleSheet.create({
  title:{color:C.text,fontSize:18,fontWeight:'900'},
  sub:{color:C.muted,lineHeight:20,marginVertical:6},
  label:{color:C.accent,fontWeight:'800',marginTop:10,marginBottom:4},
  input:{minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:6,color:C.text,paddingHorizontal:10,marginVertical:6},
  previewName:{color:C.text,fontWeight:'800',textAlign:'center',marginTop:6},
  warning:{color:C.muted,fontSize:12,lineHeight:17,textAlign:'center',marginTop:2},
  gallery:{gap:8,paddingVertical:10},
  thumbButton:{width:112,minHeight:96,borderWidth:1,borderColor:C.line,borderRadius:8,padding:4,backgroundColor:C.bg},
  thumbSelected:{borderColor:C.accent,backgroundColor:C.panel2},
  thumb:{width:'100%',height:58,borderRadius:5},
  thumbLabel:{color:C.muted,fontSize:11,lineHeight:14,textAlign:'center',marginTop:4},
  row:{flexDirection:'row',gap:6,flexWrap:'wrap'},
  flex:{flex:1,minWidth:130},
});
