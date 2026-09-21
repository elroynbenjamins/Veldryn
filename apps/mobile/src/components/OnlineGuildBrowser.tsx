import {useEffect,useMemo,useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import {GuildCrest} from './SocialIdentity';
import {GameTextInput as TextInput} from './GameTextInput';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {guildTagAvailabilityMessage,normalizeGuildTag,type GuildTagAvailability} from '../core/guild-tags';
import {guildNameError,normalizeGuildName} from '../core/identity-names';
import {onlineConfigured} from '../online/supabase';
import {browseGuilds,createOnlineGuild,guildTagAvailability,requestGuildMembership,type OnlineGuild} from '../online/social';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {GUILD_NAME_COLORS,normalizeGuildNameColorId} from '../core/guild-customization';

export function OnlineGuildBrowser(){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [guilds,setGuilds]=useState<OnlineGuild[]>([]),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[name,setName]=useState(''),[tag,setTag]=useState(''),[tagStatus,setTagStatus]=useState<GuildTagAvailability|null>(null),[showCreate,setShowCreate]=useState(false),[policy,setPolicy]=useState<'open'|'apply'>('open');
 const load=async()=>{if(!onlineConfigured)return;setBusy(true);try{setGuilds(await browseGuilds());setLoaded(true)}catch(error){Alert.alert('Guilds',error instanceof Error?error.message:'Unable to load guilds.')}finally{setBusy(false)}};
 useEffect(()=>{void load()},[]);useEffect(()=>setTagStatus(null),[tag]);if(!onlineConfigured)return null;
 const nameIssue=name?guildNameError(name):'';
 const checkTag=async()=>{setBusy(true);try{const result=await guildTagAvailability(tag);setTagStatus(result);return result}catch(error){Alert.alert('Guild tag',error instanceof Error?error.message:'Unable to check that tag.');return null}finally{setBusy(false)}};
 const join=async(guild:OnlineGuild)=>{setBusy(true);try{const result=await requestGuildMembership(guild.id);Alert.alert(result==='joined'?'Guild joined':'Application sent',result==='joined'?`You joined ${guild.name}.`:`${guild.name} will review your application.`);await load()}catch(error){Alert.alert('Guilds',error instanceof Error?error.message:'Unable to join guild.')}finally{setBusy(false)}};
 const create=async()=>{setBusy(true);try{const status=tagStatus?.normalizedTag===normalizeGuildTag(tag)?tagStatus:await guildTagAvailability(tag);setTagStatus(status);if(!status.available)throw new Error(guildTagAvailabilityMessage(status));await createOnlineGuild(normalizeGuildName(name),status.normalizedTag!,policy,1);setName('');setTag('');setTagStatus(null);setShowCreate(false);Alert.alert('Guild created','Your guild tag is permanently reserved and visible with your guild identity.');await load()}catch(error){Alert.alert('Create guild',error instanceof Error?error.message:'Unable to create guild.')}finally{setBusy(false)}};

 return <Panel>
  <View style={s.header}><View style={s.flex}><Text style={s.eyebrow}>GUILD DIRECTORY</Text><Text style={s.title}>Find a Guild</Text><Text style={s.sub}>Browse live Guild identities and join policies. Three-letter tags are globally unique.</Text></View><View style={s.headerAction}><GameButton compact title={showCreate?'Close create':'Create'} tone="secondary" onPress={()=>setShowCreate(v=>!v)}/></View></View>

  {showCreate?<View style={s.createCard}>
   <View style={s.sectionHead}><Text style={s.section}>CREATE GUILD</Text><Text style={s.sectionMeta}>Tag reserved permanently</Text></View>
   <TextInput accessibilityLabel="New guild name" value={name} onChangeText={setName} maxLength={24} placeholder="Guild name" placeholderTextColor={C.muted} style={s.input}/>
   {name?<Text style={[s.helper,nameIssue&&s.invalid]}>{nameIssue||'Latin letters, spaces, apostrophes and hyphens only.'}</Text>:null}
   <View style={s.tagRow}><TextInput accessibilityLabel="Guild tag" autoCapitalize="characters" value={tag} onChangeText={value=>setTag(normalizeGuildTag(value).slice(0,3))} maxLength={3} placeholder="TAG" placeholderTextColor={C.muted} style={[s.input,s.tagInput]}/><View style={s.check}><GameButton compact title="Check tag" tone="secondary" disabled={busy||tag.length!==3} onPress={()=>void checkTag()}/></View></View>
   <Text style={[s.helper,tagStatus?.available&&s.available,tagStatus&&!tagStatus.available&&s.invalid]}>{tagStatus?guildTagAvailabilityMessage(tagStatus):'Exactly three letters. A claimed tag can never be reused.'}</Text>
   <View style={s.sectionHead}><Text style={s.section}>JOIN POLICY</Text><Text style={s.sectionMeta}>{policy==='open'?'Instant join':'Officer review'}</Text></View>
   <View style={s.actions}><PolicyChip label="Open" selected={policy==='open'} disabled={busy} onPress={()=>setPolicy('open')}/><PolicyChip label="Applications" selected={policy==='apply'} disabled={busy} onPress={()=>setPolicy('apply')}/></View>
   <GameButton title="Create Guild" disabled={busy||!!nameIssue||normalizeGuildName(name).length<3||tag.length!==3||!tagStatus?.available} onPress={()=>void create()}/>
  </View>:null}

  <View style={s.directoryHead}><Text style={s.section}>AVAILABLE GUILDS</Text><View style={s.directoryMeta}><Text style={s.sectionMeta}>{guilds.length} shown</Text><GameButton compact title={busy?'Loading…':'Refresh'} tone="secondary" disabled={busy} onPress={()=>void load()}/></View></View>
  {loaded&&!guilds.length?<View style={s.emptyCard}><Text style={s.emptyTitle}>No online Guilds yet</Text><Text style={s.empty}>Create the first Guild, or refresh after other players have founded one.</Text></View>:null}
  {guilds.map(guild=>{
   const nameColor=GUILD_NAME_COLORS.find(row=>row.id===normalizeGuildNameColorId(guild.name_color_id))?.color??C.text;
   const policyLabel=guild.join_policy==='open'?'OPEN':guild.join_policy==='apply'?'APPLICATION':'INVITE ONLY';
   return <View key={guild.id} style={s.guildCard}>
    <GuildCrest size={44} bannerId={guild.banner_id} frameId={guild.profile_frame_id}/>
    <View style={s.copy}>
     <GuildTaggedPlayerName name={guild.name} guildTag={guild.tag} tagColorId={guild.tag_color_id} style={[s.name,{color:nameColor}]}/>
     <View style={s.metaRow}><View style={s.levelPill}><Text style={s.levelText}>LV. {guild.level}</Text></View><View style={[s.policyPill,guild.join_policy==='open'?s.policyOpen:guild.join_policy==='apply'?s.policyApply:s.policyInvite]}><Text style={[s.policyPillText,guild.join_policy==='open'?s.policyOpenText:guild.join_policy==='apply'?s.policyApplyText:s.policyInviteText]}>{policyLabel}</Text></View><Text style={s.meta}>{guild.member_cap} cap · Min Lv. {guild.minimum_level}</Text></View>
     {guild.motto?<Text numberOfLines={1} style={s.motto}>“{guild.motto}”</Text>:null}
    </View>
    <View style={s.joinAction}><GameButton compact title={guild.join_policy==='open'?'Join':guild.join_policy==='apply'?'Apply':'Invite only'} tone="secondary" disabled={busy||guild.join_policy==='invite'} onPress={()=>void join(guild)}/></View>
   </View>;
  })}
 </Panel>;
}

function PolicyChip({label,selected,disabled,onPress}:{label:string;selected:boolean;disabled:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="button" accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.policyChip,selected&&s.policyChipSelected,pressed&&s.pressed,disabled&&s.disabled]}><Text style={[s.policyText,selected&&s.policyTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 header:{flexDirection:'row',alignItems:'flex-start',gap:8},flex:{flex:1,minWidth:0},headerAction:{width:92},
 eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9},
 title:{...typography.title,color:C.text},sub:{fontSize:10,lineHeight:14,color:C.muted,marginTop:2},
 createCard:{gap:7,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 section:{fontSize:8.5,color:C.accent,fontWeight:'900',letterSpacing:.75},sectionMeta:{fontSize:8.5,color:C.muted,fontWeight:'800'},
 input:{minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,color:C.text,backgroundColor:C.inputBg,paddingHorizontal:10},
 tagRow:{flexDirection:'row',gap:6,alignItems:'center'},tagInput:{flex:1,fontWeight:'900',letterSpacing:3},check:{width:94},
 helper:{fontSize:9,lineHeight:12,color:C.muted},invalid:{color:C.bad},available:{color:C.good},
 actions:{flexDirection:'row',gap:6},
 policyChip:{flex:1,minHeight:38,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},
 policyChipSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},policyText:{fontSize:10.5,fontWeight:'800',color:C.muted},policyTextSelected:{color:C.text},pressed:{opacity:.72},disabled:{opacity:.45},
 directoryHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:2},directoryMeta:{flexDirection:'row',alignItems:'center',gap:8},
 emptyCard:{minHeight:72,alignItems:'center',justifyContent:'center',gap:3,padding:10,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},emptyTitle:{...typography.bodyStrong,color:C.text},empty:{fontSize:9,lineHeight:13,color:C.muted,textAlign:'center'},
 guildCard:{minHeight:70,flexDirection:'row',gap:8,alignItems:'center',paddingVertical:8,borderTopWidth:1,borderColor:C.line},
 copy:{flex:1,minWidth:0},name:{...typography.bodyStrong,color:C.text},
 metaRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:4,marginTop:3},meta:{fontSize:8.5,color:C.muted},
 levelPill:{paddingHorizontal:5,paddingVertical:2,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},levelText:{fontSize:7,color:C.text,fontWeight:'900'},
 policyPill:{paddingHorizontal:5,paddingVertical:2,borderWidth:1,borderRadius:99},policyPillText:{fontSize:7,fontWeight:'900',letterSpacing:.35},
 policyOpen:{borderColor:C.good,backgroundColor:C.goodSurface},policyOpenText:{color:C.good},
 policyApply:{borderColor:C.info,backgroundColor:C.infoSurface},policyApplyText:{color:C.info},
 policyInvite:{borderColor:C.line,backgroundColor:C.panel2},policyInviteText:{color:C.muted},
 motto:{fontSize:9,lineHeight:12,color:C.muted,fontStyle:'italic',marginTop:2},
 joinAction:{width:88},
});}
