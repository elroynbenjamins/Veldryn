import {useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {ProfileScenePreview} from './ProfileScenePreview';
import {GameState} from '../core/types';
import {PROFILE_BACKGROUND_PREVIEWS} from '../theme/profile-background-assets';
import {C} from '../theme/theme';
import {LIVE_EVENT_CATALOG} from '../content/live-events';
import {CollectibleJournal} from './CollectibleJournal';


export function ProfileEditor({state,onChange}:{state:GameState;onChange:(next:GameState)=>void}){
  const character=state.character!;
  const [title,setTitle]=useState(character.profileTitle??'New Adventurer');
  const [showCosmetics,setShowCosmetics]=useState(false);
  const [previewBackgroundId,setPreviewBackgroundId]=useState(PROFILE_BACKGROUND_PREVIEWS[0].id);
  const selectedPreview=PROFILE_BACKGROUND_PREVIEWS.find(background=>background.id===previewBackgroundId)??PROFILE_BACKGROUND_PREVIEWS[0];
  const eventRewards=LIVE_EVENT_CATALOG.flatMap(event=>event.milestones(character.classId).map(milestone=>milestone.reward));
  const eventTitles=eventRewards.filter(reward=>reward.kind==='title'&&state.account.unlockedTitleIds?.includes(reward.id));
  const save=()=>onChange({...state,character:{...character,profileTitle:title.trim()||'New Adventurer'}});
  return <Panel>
    <Text style={s.title}>My profile</Text>
    <Text style={s.sub}>Shown to players who open {character.name}’s profile.</Text>
    <Text style={s.label}>Displayed title</Text>
    <TextInput value={title} onChangeText={setTitle} maxLength={32} placeholder="New Adventurer" placeholderTextColor={C.muted} style={s.input}/>
    <GameButton title="Save profile title" onPress={save}/>
    {eventTitles.length?<><Text style={s.label}>Unlocked event titles</Text><View style={s.row}>{eventTitles.map(reward=><View style={s.flex} key={reward.id}><GameButton title={reward.name} tone={character.profileTitle===reward.name?'primary':'secondary'} onPress={()=>{setTitle(reward.name);onChange({...state,character:{...character,profileTitle:reward.name}})}}/></View>)}</View></>:null}

    <Pressable accessibilityRole="button" accessibilityState={{expanded:showCosmetics}} onPress={()=>setShowCosmetics(value=>!value)} style={s.disclosure}><View style={s.flex}><Text style={s.label}>PROFILE COSMETICS</Text><Text style={s.sub}>Background, border and cosmetic pet</Text></View><Text style={s.disclosureMark}>{showCosmetics?'−':'+'}</Text></Pressable>
    {showCosmetics&&<><Text style={s.label}>Approved scene review</Text>
    <ProfileScenePreview state={state} backgroundId={previewBackgroundId}/>
    <Text style={s.previewName}>{selectedPreview.name}</Text>
    <Text style={s.warning}>Preview only · export prepared · device QA and unlock binding pending. Choosing a preview does not grant or save this cosmetic.</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.gallery}>
      {PROFILE_BACKGROUND_PREVIEWS.map(background=><Pressable key={background.id} accessibilityRole="button" accessibilityLabel={`Preview ${background.name}`} accessibilityState={{selected:background.id===previewBackgroundId}} onPress={()=>setPreviewBackgroundId(background.id)} style={[s.thumbButton,background.id===previewBackgroundId&&s.thumbSelected]}>
        <Image source={background.source} resizeMode="cover" style={s.thumb}/>
        <Text numberOfLines={2} style={s.thumbLabel}>{background.name}</Text>
      </Pressable>)}
    </ScrollView>

    <CollectibleJournal state={state} onChange={next=>{const id=next.account.activeProfileBackgroundId;if(id&&PROFILE_BACKGROUND_PREVIEWS.some(entry=>entry.id===id))setPreviewBackgroundId(id);onChange(next)}}/></>}
  </Panel>;
}

const s=StyleSheet.create({
  title:{color:C.text,fontSize:18,fontWeight:'900'},
  sub:{color:C.muted,lineHeight:20,marginVertical:6},
  label:{color:C.accent,fontWeight:'800',marginTop:10,marginBottom:4},
  input:{minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:6,color:C.text,paddingHorizontal:10,marginVertical:6},
  previewName:{color:C.text,fontWeight:'800',textAlign:'center',marginTop:6},
  warning:{color:C.muted,fontSize:12,lineHeight:17,textAlign:'center',marginTop:2},
  disclosure:{minHeight:58,flexDirection:'row',alignItems:'center',gap:8,marginTop:10,paddingHorizontal:10,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.bg},
  disclosureMark:{width:28,color:C.accent,fontSize:25,textAlign:'center'},
  gallery:{gap:8,paddingVertical:10},
  thumbButton:{width:112,minHeight:96,borderWidth:1,borderColor:C.line,borderRadius:8,padding:4,backgroundColor:C.bg},
  thumbSelected:{borderColor:C.accent,backgroundColor:C.panel2},
  thumb:{width:'100%',height:58,borderRadius:5},
  thumbLabel:{color:C.muted,fontSize:11,lineHeight:14,textAlign:'center',marginTop:4},
  row:{flexDirection:'row',gap:6,flexWrap:'wrap'},
  flex:{flex:1,minWidth:130},
});
