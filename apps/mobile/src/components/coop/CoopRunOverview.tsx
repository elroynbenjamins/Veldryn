import {StyleSheet,Text,View} from 'react-native';
import type {CoopRunView} from '../../core/coop-presentation';
import {validateCoopRunView} from '../../core/coop-presentation';
import type {CoopUiAssetId} from '../../core/coop-ui-contract';
import {ct,t,type Language} from '../../i18n';
import {coopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {CoopImageSlot,ExpeditionScreenShell,FantasyPanel,RoleBadge,StateChip} from './CoopVisualKit';
import {GameButton} from '../GameButton';

const roomAssets:Record<string,CoopUiAssetId>={battle:'node_battle',elite:'node_elite',event:'node_event',shrine:'node_shrine',camp:'node_camp',treasure:'node_treasure',merchant:'node_merchant',echo:'node_echo',risk:'node_risk',boss:'node_boss'};

export function CoopRunOverview({language,run,onBack,onChoose,onRefresh,onClaim,busy=false,notice,rewards=[]}:{language:Language;run:CoopRunView;onBack:()=>void;onChoose?:(nodeId:string)=>void;onRefresh?:()=>void;onClaim?:(id:string)=>void;busy?:boolean;notice?:string;rewards?:Array<{id:string;claimed_at:string|null;reward_json:{marks?:number}}>}){
  validateCoopRunView(run);
  const modeLabel=run.mode==='qmode'?ct(language,'details.qmode'):ct(language,'details.live');
  return <ExpeditionScreenShell eyebrow={ct(language,'browse.resumeTitle')} title={ct(language,'browse.resume')} onBack={onBack} backLabel={ct(language,'details.backList')} banner={<View style={s.banner}><StateChip label={modeLabel} tone="selected"/><Text style={s.phase}>{run.phase.replaceAll('_',' ')}</Text></View>}>
    <FantasyPanel variant="selected"><View style={s.summary}><View style={s.grow}><Text style={s.title}>{ct(language,'details.party')}</Text><Text style={s.copy}>{ct(language,'details.partyValue')}</Text></View><StateChip label={`Lv. ${run.syncedLevel}`} tone="success"/></View></FantasyPanel>
    <Text style={s.section}>{ct(language,'details.party')}</Text>
    <View style={s.party}>{run.roleSlots.map((slot,index)=><FantasyPanel key={`${slot.role}-${index}`} variant={slot.ready===false?'danger':'default'} style={s.member}><RoleBadge role={slot.role} label={t(language,`coopUi.${slot.role}`)}/><Text numberOfLines={2} style={s.name}>{slot.name}</Text><View style={s.memberMeta}><StateChip label={slot.echo?'Echo':modeLabel} tone={slot.echo?'selected':'neutral'}/>{slot.ready!==undefined?<StateChip label={slot.ready?t(language,'coopUi.ready'):t(language,'coopUi.searching')} tone={slot.ready?'success':'warning'}/>:null}</View></FantasyPanel>)}</View>
    <Text style={s.section}>{ct(language,'details.rooms')}</Text>
    {!!notice&&<Text accessibilityRole="alert" style={s.copy}>{notice}</Text>}
    {run.phase==='resolving_node'&&<FantasyPanel><Text style={s.copy}>Your party is resolving this room. Progress is saved online.</Text></FantasyPanel>}
    {run.options.length?run.options.map(option=><FantasyPanel key={option.nodeId}><View style={s.option}><CoopImageSlot assetId={roomAssets[option.kind]} size="node" accessibilityLabel={option.title}/><View style={s.grow}><Text style={s.title}>{option.title}</Text><Text style={s.copy}>{option.risk} · {option.reward}</Text></View>{option.votes!==undefined?<StateChip label={`${option.votes}`} tone="selected"/>:null}</View>{onChoose&&<GameButton title={run.mode==='qmode'?'Choose this room':'Vote for this room'} disabled={busy||run.phase!=='awaiting_choice'} onPress={()=>onChoose(option.nodeId)}/>}</FantasyPanel>):run.phase!=='resolving_node'?<FantasyPanel><Text style={s.copy}>{ct(language,'browse.resumeBody')}</Text></FantasyPanel>:null}
    {onRefresh&&<GameButton title="Refresh saved progress" tone="secondary" disabled={busy} onPress={onRefresh}/>}
    {rewards.map(reward=><FantasyPanel key={reward.id} variant="success">{reward.claimed_at?<Text style={s.copy}>{reward.reward_json.marks??0} Expedition Marks collected.</Text>:<GameButton title="Collect expedition reward" disabled={busy} onPress={()=>onClaim?.(reward.id)}/>}</FantasyPanel>)}
    {run.rewardText?<FantasyPanel variant="success"><Text style={s.title}>{ct(language,'details.reward')}</Text><Text style={s.copy}>{run.rewardText}</Text></FantasyPanel>:null}
  </ExpeditionScreenShell>;
}

const s=StyleSheet.create({banner:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},phase:{...coopTypography.meta,color:coopColors.textSecondary,textTransform:'capitalize',flex:1},summary:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},grow:{flex:1,minWidth:0},section:{...coopTypography.section,color:coopColors.gold,marginTop:coopSpacing.xs},title:{...coopTypography.section,color:coopColors.text},copy:{...coopTypography.body,color:coopColors.textSecondary},party:{flexDirection:'row',flexWrap:'wrap',gap:coopSpacing.sm},member:{width:'48%',flexGrow:1},name:{...coopTypography.body,color:coopColors.text,fontWeight:'800'},memberMeta:{flexDirection:'row',flexWrap:'wrap',gap:coopSpacing.xs},option:{minHeight:64,flexDirection:'row',alignItems:'center',gap:coopSpacing.md}});
