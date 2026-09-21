import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GameTextInput} from '../GameTextInput';
import type {CoopDungeonView} from '../../core/coop-dungeon-browsing';
import {activeCoopLiveRecruitment,coopLiveRecruitmentTime,type CoopLiveRecruitmentPost} from '../../core/coop-live-recruitment';
import {coopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {FantasyPanel,PrimaryAction,StateChip} from './CoopVisualKit';

export function CoopLiveRecruitmentBoard({
 posts,dungeons,nowMs,busy=false,notice,onQuickMatch,onJoin,onPublish,onCloseMine,onRefresh,
}:{posts:CoopLiveRecruitmentPost[];dungeons:CoopDungeonView[];nowMs:number;busy?:boolean;notice?:string;onQuickMatch:()=>void;onJoin:(dungeonId:string)=>void;onPublish:(dungeonId:string,note:string)=>void;onCloseMine:()=>void;onRefresh:()=>void}){
 const available=useMemo(()=>dungeons.filter(dungeon=>dungeon.available),[dungeons]),visible=useMemo(()=>activeCoopLiveRecruitment(posts,nowMs),[posts,nowMs]),mine=visible.find(post=>post.mine);
 const [composer,setComposer]=useState(false),[dungeonId,setDungeonId]=useState(available[0]?.id??''),[note,setNote]=useState('');
 const names=useMemo(()=>new Map(dungeons.map(dungeon=>[dungeon.id,dungeon.name])),[dungeons]);
 return <View style={s.stack}>
  <FantasyPanel variant="selected">
   <View style={s.head}><View style={s.flex}><Text style={s.kicker}>LIVE QUICK MATCH</Text><Text style={s.title}>Any eligible dungeon</Text></View><StateChip label="FASTEST POOL" tone="success"/></View>
   <Text style={s.copy}>Uses your verified role and sends you to the eligible dungeon where your role helps matchmaking most. The matched party still uses Auto Tier.</Text>
   <PrimaryAction label="Quick Match" disabled={busy} onPress={onQuickMatch}/>
  </FantasyPanel>
  <FantasyPanel>
   <View style={s.head}><View style={s.flex}><Text style={s.kicker}>LIVE GROUP BOARD</Text><Text style={s.title}>30-minute LFG posts</Text></View><StateChip label={visible.length+' LIVE'} tone={visible.length?'selected':'default'}/></View>
   <Text style={s.copy}>Short-lived dungeon adverts only. Posts disappear after 30 minutes and never create a second Party system.</Text>
   {notice?<Text accessibilityRole="alert" style={s.notice}>{notice}</Text>:null}
   <View style={s.actions}><View style={s.flex}><PrimaryAction label={mine?'Replace my post':'Post LFG'} tone="secondary" selected={composer} disabled={busy||!available.length} onPress={()=>setComposer(value=>!value)}/></View><View style={s.flex}><PrimaryAction label="Refresh" tone="secondary" disabled={busy} onPress={onRefresh}/></View></View>
   {composer?<View style={s.composer}><Text style={s.label}>DUNGEON</Text><View style={s.chips}>{available.map(dungeon=><Pressable key={dungeon.id} accessibilityRole="button" accessibilityState={{selected:dungeonId===dungeon.id}} onPress={()=>setDungeonId(dungeon.id)} style={[s.chip,dungeonId===dungeon.id&&s.chipOn]}><Text style={[s.chipText,dungeonId===dungeon.id&&s.chipTextOn]}>{dungeon.name}</Text></Pressable>)}</View><Text style={s.label}>OPTIONAL NOTE</Text><GameTextInput accessibilityLabel="Co-op LFG note" value={note} maxLength={140} placeholder="Starting now, chill run, learning boss…" placeholderTextColor={coopColors.textMuted} style={s.input} onChangeText={setNote}/><Text style={s.meta}>{note.length}/140 · expires 30 minutes after posting</Text><PrimaryAction label={mine?'Replace 30m post':'Publish 30m post'} disabled={busy||!dungeonId} onPress={()=>{onPublish(dungeonId,note.trim());setComposer(false)}}/></View>:null}
   {mine?<View style={s.mineRow}><Text style={s.mineText}>Your post · {names.get(mine.dungeonId)??mine.dungeonId} · {coopLiveRecruitmentTime(mine,nowMs)}</Text><View style={s.close}><PrimaryAction label="Remove" tone="secondary" disabled={busy} onPress={onCloseMine}/></View></View>:null}
   <View style={s.posts}>{visible.filter(post=>!post.mine).map(post=><View key={post.id} style={s.post}><View style={s.head}><View style={s.flex}><Text style={s.postName}>{post.ownerName}</Text><Text style={s.dungeon}>{names.get(post.dungeonId)??post.dungeonId}</Text></View><StateChip label={post.role.toUpperCase()} tone={post.role==='tank'?'selected':post.role==='support'?'success':'default'}/></View><View style={s.metaRow}><Text style={s.meta}>Auto Tier ≤ {post.maxTier}</Text><Text style={s.time}>{coopLiveRecruitmentTime(post,nowMs)}</Text></View>{post.note?<Text style={s.note}>{post.note}</Text>:null}<PrimaryAction label="Join this search" tone="secondary" disabled={busy} onPress={()=>onJoin(post.dungeonId)}/></View>)}</View>
   {!visible.filter(post=>!post.mine).length?<Text style={s.empty}>No other Live LFG posts right now. Quick Match is still available.</Text>:null}
  </FantasyPanel>
 </View>;
}

const s=StyleSheet.create({
 stack:{gap:coopSpacing.sm},head:{flexDirection:'row',alignItems:'flex-start',gap:coopSpacing.sm},flex:{flex:1,minWidth:0},kicker:{...coopTypography.meta,color:coopColors.gold,fontWeight:'900',letterSpacing:.8},title:{...coopTypography.section,color:coopColors.text},copy:{...coopTypography.body,color:coopColors.textSecondary},notice:{...coopTypography.meta,color:coopColors.gold},actions:{flexDirection:'row',gap:coopSpacing.sm},composer:{gap:coopSpacing.sm,paddingTop:coopSpacing.sm,borderTopWidth:1,borderTopColor:coopColors.goldDim},label:{...coopTypography.meta,color:coopColors.gold,fontWeight:'900'},chips:{flexDirection:'row',flexWrap:'wrap',gap:6},chip:{minHeight:38,justifyContent:'center',paddingHorizontal:9,borderWidth:1,borderColor:coopColors.goldDim,borderRadius:4,backgroundColor:coopColors.surfaceRaised},chipOn:{borderColor:coopColors.cyan,backgroundColor:'#0A4168'},chipText:{fontSize:11,color:coopColors.textSecondary,fontWeight:'800'},chipTextOn:{color:coopColors.cyan},input:{minHeight:46,color:coopColors.text,backgroundColor:coopColors.surfaceRaised,borderColor:coopColors.goldDim},meta:{...coopTypography.meta,color:coopColors.textMuted},mineRow:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm,paddingTop:coopSpacing.sm,borderTopWidth:1,borderTopColor:coopColors.goldDim},mineText:{...coopTypography.meta,color:coopColors.cyan,flex:1},close:{width:96},posts:{gap:coopSpacing.sm},post:{gap:6,padding:9,borderWidth:1,borderColor:coopColors.goldDim,borderRadius:5,backgroundColor:coopColors.surfaceRaised},postName:{...coopTypography.section,color:coopColors.text},dungeon:{...coopTypography.meta,color:coopColors.gold,fontWeight:'800'},metaRow:{flexDirection:'row',justifyContent:'space-between',gap:8},time:{...coopTypography.meta,color:coopColors.cyan,fontWeight:'900'},note:{...coopTypography.body,color:coopColors.textSecondary},empty:{...coopTypography.meta,color:coopColors.textMuted,textAlign:'center',paddingVertical:8},
});
