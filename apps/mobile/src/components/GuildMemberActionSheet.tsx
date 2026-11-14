import {useMemo,useState,useEffect} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {guildMemberManagement,type GuildManagementRole} from '../core/social-management';
import {spacing,radii,typography,touchTargetMin,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import type {Language} from '../i18n/languages';
import {socialLabel} from '../i18n/social';
import {germanSocialManagementText,germanSocialManagementFormat} from '../i18n/social-management-de';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {CompactPlayerIdentity} from './CompactPlayerIdentity';
import {GameButton} from './GameButton';
import type {GuildMember} from '../online/social';

export type GuildMemberAction='promote'|'demote'|'remove'|'transfer';
type Action={kind:GuildMemberAction;title:string;detail:string;destructive?:boolean;confirm?:boolean};
const ACTIONS:Record<GuildMemberAction,Action>={
 promote:{kind:'promote',title:'Promote to Officer',detail:'Allow this member to manage regular members.'},
 demote:{kind:'demote',title:'Demote to Member',detail:'Remove this member’s Officer permissions.'},
 transfer:{kind:'transfer',title:'Transfer leadership',detail:'Hand over leadership and become an Officer.',confirm:true},
 remove:{kind:'remove',title:'Remove from Guild',detail:'Revoke this player’s Guild membership.',confirm:true,destructive:true},
};
function joinedLabel(value:string,language:Language){
 const date=new Date(value);
 return Number.isFinite(date.getTime())?date.toLocaleDateString(language,{year:'numeric',month:'short',day:'numeric'}):germanSocialManagementText(language,'Unavailable');
}
/** Presentation only. The existing server RPCs remain authoritative. */
export function GuildMemberActionSheet({
 member,actorRole,actorAccountId,busy,onClose,onProfile,onAction,
}:{
 member:GuildMember|null;actorRole:GuildManagementRole;actorAccountId:string;busy:boolean;
 onClose:()=>void;onProfile:(member:GuildMember)=>void;
 onAction:(member:GuildMember,kind:GuildMemberAction)=>Promise<boolean>;
}){
 const C=useGameTheme(),language=useGameLanguage(),s=useMemo(()=>makeStyles(C),[C]);
 const [confirmation,setConfirmation]=useState<GuildMemberAction|null>(null);
 useEffect(()=>setConfirmation(null),[member?.account_id]);
 if(!member)return null;
 const current=member;
 const allowed=guildMemberManagement(actorRole,current.role,current.account_id===actorAccountId);
 const actions:Action[]=[
  ...(allowed.canPromote?[ACTIONS.promote]:[]),
  ...(allowed.canDemote?[ACTIONS.demote]:[]),
  ...(allowed.canTransferLeadership?[ACTIONS.transfer]:[]),
  ...(allowed.canRemove?[ACTIONS.remove]:[]),
 ];
 const active=confirmation?ACTIONS[confirmation]:null;
 const display=(source:string)=>germanSocialManagementText(language,source);
 const close=()=>{if(busy)return;setConfirmation(null);onClose()};
 const execute=async(kind:GuildMemberAction)=>{
  if(busy)return;
  const permission={promote:allowed.canPromote,demote:allowed.canDemote,remove:allowed.canRemove,transfer:allowed.canTransferLeadership}[kind];
  if(!permission)return;
  const succeeded=await onAction(current,kind);
  if(succeeded){setConfirmation(null);onClose();}
 };
 return <GameModalSurface visible onClose={close} dismissOnBackdrop={!busy} surfaceStyle={s.surface}>
  <GameModalHeader eyebrow={display(active?'CONFIRM GUILD ACTION':'GUILD MEMBER')} title={display(active?active.title:'Member details')} onClose={close} closeDisabled={busy}/>
  <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.content}>
   <View style={s.identity}><CompactPlayerIdentity accountId={current.account_id} badges={current.player_badges} name={current.display_name} guildTag={current.guild_tag} guildTagColorId={current.guild_tag_color_id} role={current.role} avatarSize={48}/></View>
   <View style={s.stats}>
    <View style={s.stat}><Text style={s.statLabel}>{display('GUILD ROLE')}</Text><Text style={s.statValue}>{socialLabel(language,current.role.charAt(0).toUpperCase()+current.role.slice(1))}</Text></View>
    <View style={s.stat}><Text style={s.statLabel}>{display('JOINED GUILD')}</Text><Text style={s.statValue}>{joinedLabel(current.joined_at,language)}</Text></View>
   </View>
   {active?<View style={[s.confirm,active.destructive&&s.confirmDanger]}>
     <Text style={s.confirmTitle}>{germanSocialManagementFormat(language,active.kind==='remove'?'Remove {name}?':'Give leadership to {name}?',{name:current.display_name})}</Text>
     <Text style={s.confirmCopy}>{display(active.kind==='remove'?'They will lose access to Guild chat, projects and benefits until they join another Guild.':'This member will become Guild Leader. You will become an Officer. This changes who can manage the Guild.')}</Text>
     <GameButton title={display(active.kind==='remove'?'Remove member':'Transfer leadership')} tone={active.destructive?'danger':'primary'} loading={busy} disabled={busy} onPress={()=>execute(active.kind)}/>
     <GameButton title={display("Keep current role")} tone="secondary" disabled={busy} onPress={()=>setConfirmation(null)}/>
    </View>:<View style={s.actionGroup}>
     <Text style={s.section}>{display('PLAYER ACTIONS')}</Text>
     <ActionRow title={display("View player profile")} detail={display("Open this player's public showcase")} onPress={()=>{onClose();onProfile(current)}} disabled={busy} C={C}/>
     {actions.length?<View style={s.groupDivider}/>:null}
     {actions.map(action=><ActionRow key={action.kind} title={display(action.title)} detail={display(action.detail)} destructive={action.destructive} disabled={busy} C={C} onPress={()=>action.confirm?setConfirmation(action.kind):void execute(action.kind)}/>)}
     {!actions.length?<Text style={s.readOnly}>{display('Your role does not allow changes to this member.')}</Text>:null}
    </View>}
   {busy?<View style={s.working}><ActivityIndicator size="small" color={C.accent}/><Text style={s.workingText}>{display('Saving Guild changes…')}</Text></View>:null}
  </ScrollView>
 </GameModalSurface>;
}
function ActionRow({title,detail,destructive=false,disabled,onPress,C}:{title:string;detail:string;destructive?:boolean;disabled:boolean;onPress:()=>void;C:ThemeColors}){
 const s=useMemo(()=>makeStyles(C),[C]);
 return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.action,destructive&&s.actionDanger,pressed&&s.pressed,disabled&&s.disabled]}>
  <View style={s.actionCopy}><Text style={[s.actionTitle,destructive&&s.actionTitleDanger]}>{title}</Text><Text numberOfLines={3} style={s.actionDetail}>{detail}</Text></View><Text style={[s.chevron,destructive&&s.actionTitleDanger]}>›</Text>
 </Pressable>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 surface:{paddingHorizontal:spacing.md},
 scroll:{flexShrink:1,minHeight:0},
 content:{gap:spacing.md,paddingBottom:spacing.lg},
 identity:{minHeight:68,padding:spacing.md,borderWidth:1,borderRadius:radii.md,borderColor:C.lineStrong,backgroundColor:C.panelRaised,justifyContent:'center'},
 stats:{flexDirection:'row',gap:spacing.sm},
 stat:{flex:1,minWidth:0,minHeight:62,padding:spacing.sm,borderRadius:radii.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,justifyContent:'center',gap:3},
 statLabel:{fontSize:9,lineHeight:13,letterSpacing:.7,fontWeight:'900',color:C.muted},
 statValue:{fontSize:12,lineHeight:17,fontWeight:'700',color:C.text},
 actionGroup:{gap:spacing.xs},
 section:{fontSize:10,lineHeight:15,fontWeight:'900',letterSpacing:1,color:C.accent,marginBottom:3},
 groupDivider:{height:1,backgroundColor:C.line,marginVertical:spacing.xs},
 action:{minHeight:touchTargetMin,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel,borderRadius:radii.sm,flexDirection:'row',gap:spacing.sm,alignItems:'center'},
 actionDanger:{backgroundColor:C.badSurface,borderColor:C.bad},
 actionCopy:{flex:1,minWidth:0,justifyContent:'center'},
 actionTitle:{...typography.bodyStrong,color:C.text},
 actionTitleDanger:{color:C.bad},
 actionDetail:{fontSize:11,lineHeight:16,color:C.muted,marginTop:1},
 chevron:{fontSize:23,lineHeight:26,fontWeight:'500',color:C.muted},
 pressed:{opacity:.74},disabled:{opacity:.45},
 readOnly:{fontSize:12,lineHeight:18,color:C.muted,paddingTop:spacing.sm},
 confirm:{padding:spacing.md,backgroundColor:C.warningSurface,borderWidth:1,borderRadius:radii.md,borderColor:C.warning,gap:spacing.sm},
 confirmDanger:{backgroundColor:C.badSurface,borderColor:C.bad},
 confirmTitle:{...typography.bodyStrong,color:C.text},
 confirmCopy:{...typography.body,color:C.muted},
 working:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm},
 workingText:{fontSize:12,lineHeight:17,color:C.muted},
});}
