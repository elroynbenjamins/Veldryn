import {useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {profileAudienceCanView,type ProfilePreviewAudience} from '../core/profile-customization';
import {profileAchievementLabel,profileCollectionLabel,profileRecordLabel} from '../core/profile-presentation';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import type {ProfileExtensionSelfV43,PublicPlayerProfileV43} from '../online/profile-extension-v43';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {PublicProfileScene} from './PublicProfileScene';

const audienceRows:ReadonlyArray<{id:ProfilePreviewAudience;label:string;detail:string}>=[
 {id:'public',label:'Public viewer',detail:'Signed-in player outside your guild'},
 {id:'guild',label:'Guild member',detail:'A member of your current guild'},
 {id:'self',label:'You',detail:'Your own profile view'},
];

const visibilityLabel={public:'Public',guild:'Guild only',private:'Private'} as const;
const words=(value?:string|null)=>value?value.replace(/[_:-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'Not selected';

export function ProfileAudiencePreviewModal({visible,state,identityDraft,onClose}:{visible:boolean;state:GameState;identityDraft:ProfileExtensionSelfV43|null;onClose:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [audience,setAudience]=useState<ProfilePreviewAudience>('public');
 useEffect(()=>{if(visible)setAudience(identityDraft?'public':'self')},[visible,!!identityDraft]);
 const characters=[...(state.character?[state.character]:[]),...(state.otherCharacters??[]).map(row=>row.character)];
 const selectedId=identityDraft?.selectedCharacterId??state.character?.id;
 const character=characters.find(row=>row.id===selectedId)??state.character;
 if(!character)return null;
 const visibility=identityDraft?.visibility??'private';
 const canView=profileAudienceCanView(visibility,audience);
 const profile:PublicPlayerProfileV43={
  accountId:identityDraft?.accountId??'preview',
  displayName:character.name,
  visibility,
  character:{id:character.id,name:character.name,classId:character.classId,level:character.level,bodyPresentation:character.bodyPresentation??'male',selectedSkinId:character.selectedSkinId??''},
  title:character.profileTitle??'New Adventurer',
  backgroundId:character.profileBackgroundId??'asterfall-night',
  borderId:character.profileBorderId??null,
  petId:character.selectedCosmeticPetId??null,
  bio:identityDraft?.bio??'',
  favoriteSkillId:identityDraft?.favoriteSkillId??null,
  favoriteCompanionId:identityDraft?.favoriteCompanionId??null,
  achievementShowcaseIds:identityDraft?.achievementShowcaseIds??[],
  collectionShowcase:identityDraft?.collectionShowcase??[],
  recordShowcaseIds:identityDraft?.recordShowcaseIds??[],
  revision:identityDraft?.revision??0,
 };
 const companion=profile.favoriteCompanionId?COMBAT_COMPANIONS.find(row=>row.id===profile.favoriteCompanionId)?.name:undefined;
 const achievements=profile.achievementShowcaseIds.map(profileAchievementLabel);
 const records=profile.recordShowcaseIds.map(profileRecordLabel);
 const collections=profile.collectionShowcase.map(profileCollectionLabel);
 const hiddenReason=visibility==='private'
  ?'Private profiles are visible only to you.'
  :visibility==='guild'&&audience==='public'
   ?'Guild-only profiles are hidden from players outside your guild.'
   :'This viewer cannot open the profile with the current privacy setting.';
 return <GameModalSurface visible={visible} onClose={onClose} backdropLabel="Close profile preview" surfaceStyle={s.sheet}>
    <GameModalHeader eyebrow="AUDIENCE PREVIEW" title="As other players see you" onClose={onClose} trailing={<View style={[s.visibilityPill,!identityDraft&&s.localPill]}><Text style={[s.visibilityText,!identityDraft&&s.localText]}>{identityDraft?visibilityLabel[visibility].toUpperCase():'LOCAL ONLY'}</Text></View>}/>
    <Text style={s.copy}>Switch audiences to test profile visibility. This preview never publishes or saves changes.</Text>
    <View accessibilityRole="tablist" style={s.audiences}>{audienceRows.map(row=><Pressable key={row.id} accessibilityRole="tab" accessibilityState={{selected:audience===row.id}} onPress={()=>setAudience(row.id)} style={({pressed})=>[s.audience,audience===row.id&&s.audienceOn,pressed&&s.pressed]}><Text style={[s.audienceLabel,audience===row.id&&s.audienceLabelOn]}>{row.label}</Text><Text numberOfLines={2} style={s.audienceDetail}>{row.detail}</Text></Pressable>)}</View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
     {!canView?<View style={s.hiddenCard}><Text style={s.hiddenMark}>◇</Text><Text style={s.hiddenTitle}>Profile hidden from this viewer</Text><Text style={s.hiddenCopy}>{hiddenReason}</Text></View>:<>
      <PublicProfileScene profile={profile}/>
      {profile.bio?<View style={s.bioCard}><Text style={s.section}>BIOGRAPHY</Text><Text style={s.bio}>{profile.bio}</Text></View>:<View style={s.bioCard}><Text style={s.section}>BIOGRAPHY</Text><Text style={s.muted}>No biography selected.</Text></View>}
      <View style={s.card}>
       <Text style={s.section}>PROFILE HIGHLIGHTS</Text>
       <PreviewRow label="Favorite skill" value={words(profile.favoriteSkillId)}/>
       <PreviewRow label="Favorite companion" value={companion??'Not selected'}/>
       <PreviewRow label="Achievements" value={achievements.length?achievements.join(' · '):'No featured achievements'}/>
       <PreviewRow label="Personal records" value={records.length?records.join(' · '):'No featured records'}/>
       <PreviewRow label="Collection" value={collections.length?collections.join(' · '):'No featured collectibles'}/>
      </View>
      {identityDraft?.worldFeedOptOut?<View style={s.feedNote}><Text style={s.feedNoteTitle}>WORLD MILESTONES HIDDEN</Text><Text style={s.copy}>Your profile remains viewable to the selected audience, but your recent milestone cards stay out of the World feed.</Text></View>:null}
      <Text style={s.footnote}>Guild tag and guild-name styling come from your live guild identity and are not changed by this preview.</Text>
     </>}
    </ScrollView>
 </GameModalSurface>;
}

function PreviewRow({label,value}:{label:string;value:string}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <View style={s.row}><Text style={s.rowLabel}>{label}</Text><Text numberOfLines={2} style={s.rowValue}>{value}</Text></View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 sheet:{maxHeight:'94%',paddingHorizontal:spacing.lg},
 flex:{flex:1,minWidth:0},
 copy:{...typography.caption,color:C.muted,lineHeight:17},
 visibilityPill:{paddingHorizontal:8,paddingVertical:5,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},
 visibilityText:{fontSize:8,color:C.info,fontWeight:'900',letterSpacing:.65},
 localPill:{borderColor:C.line,backgroundColor:C.panel2},
 localText:{color:C.muted},
 audiences:{flexDirection:'row',gap:5,padding:4,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},
 audience:{flex:1,minHeight:58,justifyContent:'center',paddingHorizontal:7,paddingVertical:6,borderWidth:1,borderColor:'transparent',borderRadius:radii.md},
 audienceOn:{borderColor:C.selectionLine,backgroundColor:C.selection},
 audienceLabel:{fontSize:10,color:C.muted,fontWeight:'900'},
 audienceLabelOn:{color:C.text},
 audienceDetail:{fontSize:7.5,lineHeight:10,color:C.muted,marginTop:2},
 pressed:{opacity:.68},
 scroll:{gap:spacing.sm,paddingBottom:spacing.md},
 hiddenCard:{minHeight:220,alignItems:'center',justifyContent:'center',gap:7,padding:spacing.lg,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},
 hiddenMark:{fontSize:34,color:C.disabled,fontWeight:'900'},
 hiddenTitle:{...typography.title,color:C.text,textAlign:'center'},
 hiddenCopy:{...typography.body,color:C.muted,textAlign:'center',lineHeight:20},
 bioCard:{gap:5,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 section:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
 bio:{...typography.body,color:C.text,lineHeight:20},
 muted:{...typography.body,color:C.muted},
 card:{padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 row:{minHeight:38,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},
 rowLabel:{width:110,...typography.caption,color:C.muted},
 rowValue:{flex:1,...typography.bodyStrong,color:C.text,textAlign:'right'},
 feedNote:{gap:3,padding:9,borderWidth:1,borderColor:C.info,borderRadius:radii.md,backgroundColor:C.infoSurface},
 feedNoteTitle:{fontSize:8,color:C.info,fontWeight:'900',letterSpacing:.7},
 footnote:{fontSize:9,lineHeight:13,color:C.disabled,textAlign:'center'},
});}
