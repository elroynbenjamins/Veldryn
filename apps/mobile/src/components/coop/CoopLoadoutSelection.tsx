import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {CharacterPortrait} from '../CharacterVisual';
import type {GameState} from '../../core/types';
import {buildCoopLoadoutIntent,presentCoopLoadout,type CoopEffectiveStats,type CoopLoadoutIntent,type CoopLoadoutProjection} from '../../core/coop-loadout-presentation';
import type {CoopMode} from '../../core/coop-presentation';
import {clt,t,type CoopLoadoutMessageKey,type Language} from '../../i18n';
import {coopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {ExpeditionScreenShell,FantasyPanel,PrimaryAction,RoleBadge,StateChip} from './CoopVisualKit';

type Props={state:GameState;language:Language;dungeonId:string;dungeonName:string;tier:1|2|3|4|5;mode:CoopMode;loadouts:CoopLoadoutProjection[];onBack:()=>void;onIntent:(intent:CoopLoadoutIntent)=>void;onRefresh:()=>void;refreshing?:boolean;notice?:string};
const statRows:Array<[keyof CoopEffectiveStats,CoopLoadoutMessageKey]>=[['maxHp','hp'],['attackPower','attack'],['healingPower','healing'],['defense','defense']];
function status(loadout:ReturnType<typeof presentCoopLoadout>,language:Language){
  if(loadout.status==='pending')return {label:clt(language,'pending'),tone:'warning' as const};
  if(loadout.status==='stale')return {label:clt(language,'stale'),tone:'warning' as const};
  if(loadout.status==='failed')return {label:clt(language,'failed'),tone:'danger' as const};
  if(loadout.selectable)return {label:clt(language,'ready'),tone:'success' as const};
  return {label:clt(language,'ineligible'),tone:'danger' as const};
}
export function CoopLoadoutSelection({state,language,dungeonId,dungeonName,tier,mode,loadouts,onBack,onIntent,onRefresh,refreshing=false,notice}:Props){
  const views=useMemo(()=>loadouts.map(loadout=>presentCoopLoadout(loadout,state.character!.id)),[loadouts,state.character]);
  const [selectedId,setSelectedId]=useState(views.find(loadout=>loadout.selectable)?.id??views[0]?.id);
  const [showDetails,setShowDetails]=useState(false);
  const selected=views.find(loadout=>loadout.id===selectedId)??views[0];
  const cta=mode==='live'?clt(language,'liveCta'):clt(language,'qmodeCta');
  return <ExpeditionScreenShell eyebrow={clt(language,'kicker')} title={clt(language,'title')} onBack={onBack} backLabel={clt(language,'back')} banner={<Text style={s.copy}>{clt(language,'intro')}</Text>} stickyAction={<View style={s.sticky}>{notice?<Text accessibilityRole="alert" style={s.notice}>{notice}</Text>:null}<PrimaryAction label={cta} disabled={!selected?.selectable} onPress={()=>selected&&onIntent(buildCoopLoadoutIntent({mode,dungeonId,tier,loadout:selected}))}/></View>}>
    <FantasyPanel variant="selected"><View style={s.hero}><CharacterPortrait state={state} compact style={s.portrait}/><View style={s.heroCopy}><Text style={s.character}>{state.character!.name}</Text><Text style={s.copy}>{dungeonName} · {clt(language,'level')} {tier}</Text>{selected?<RoleBadge role={selected.role} label={t(language,`coopUi.${selected.role}`)}/>:null}</View></View></FantasyPanel>
    {!views.length?<FantasyPanel variant="danger"><Text style={s.copy}>{clt(language,'empty')}</Text><PrimaryAction label={clt(language,'refresh')} tone="secondary" loading={refreshing} onPress={onRefresh}/></FantasyPanel>:null}
    {views.map(loadout=>{const stateLabel=status(loadout,language),wrongCharacter=loadout.characterId!==state.character!.id;return <Pressable key={loadout.id} accessibilityRole="button" accessibilityState={{selected:selected?.id===loadout.id,disabled:wrongCharacter}} disabled={wrongCharacter} onPress={()=>{setSelectedId(loadout.id);setShowDetails(false)}} style={({pressed})=>pressed&&s.pressed}><FantasyPanel variant={selected?.id===loadout.id?'selected':loadout.selectable?'default':'disabled'}><View style={s.cardHead}><View style={s.grow}><Text style={s.loadout}>{loadout.name}</Text><Text style={s.copy}>{loadout.className} · {loadout.characterName}</Text></View><StateChip label={stateLabel.label} tone={stateLabel.tone}/></View></FantasyPanel></Pressable>})}
    {selected?<>
      <FantasyPanel variant={selected.selectable?'success':'danger'}><View style={s.cardHead}><View style={s.grow}><Text style={s.section}>{selected.name}</Text><Text style={s.copy}>{clt(language,'effectiveLevel')} {selected.effectiveLevel??'—'}</Text></View><StateChip {...status(selected,language)}/></View>{selected.blockingReasons.map(reason=><Text key={reason} style={s.failure}>• {clt(language,(reason in ({different_character:1,stale_revision:1,verification_pending:1,verification_failed:1,not_eligible:1,missing_server_snapshot:1,below_role_readiness_floor:1,missing_tank_capability:1,missing_support_capability:1,missing_damage_capability:1,character_below_min_level:1,invalid_loadout_revision:1})?reason:'not_eligible') as CoopLoadoutMessageKey)}</Text>)}</FantasyPanel>
      {(selected.effectiveStats&&selected.beforeStats)||selected.skills.length||selected.equipment.length?<PrimaryAction label={`${showDetails?'▾':'›'} ${clt(language,'stats')}`} tone="secondary" selected={showDetails} onPress={()=>setShowDetails(value=>!value)}/>:null}
      {showDetails&&selected.effectiveStats&&selected.beforeStats?<FantasyPanel><View style={s.statHeader}><Text style={s.statLabel}/><Text style={s.statValue}>{clt(language,'before')}</Text><Text style={s.statValue}>{clt(language,'effective')}</Text></View><View style={s.statHeader}><Text style={s.statLabel}>{clt(language,'level')}</Text><Text style={s.statValue}>{selected.level}</Text><Text style={s.statValue}>{selected.effectiveLevel}</Text></View>{statRows.map(([key,label])=><View key={key} style={s.statHeader}><Text style={s.statLabel}>{clt(language,label)}</Text><Text style={s.statValue}>{Math.round(selected.beforeStats![key])}</Text><Text style={s.statValue}>{Math.round(selected.effectiveStats![key])}</Text></View>)}</FantasyPanel>:null}
      {showDetails?<><Summary title={clt(language,'skills')} values={selected.skills} empty={clt(language,'noSummary')}/><Summary title={clt(language,'equipment')} values={selected.equipment} empty={clt(language,'noSummary')}/></>:null}
      {!selected.selectable?<PrimaryAction label={clt(language,'refresh')} tone="secondary" loading={refreshing} onPress={onRefresh}/>:null}
    </>:null}
  </ExpeditionScreenShell>;
}
function Summary({title,values,empty}:{title:string;values:string[];empty:string}){return <FantasyPanel><Text style={s.section}>{title}</Text><Text style={s.copy}>{values.length?values.join(' · '):empty}</Text></FantasyPanel>}
const s=StyleSheet.create({copy:{...coopTypography.body,color:coopColors.textSecondary},hero:{flexDirection:'row',gap:coopSpacing.md,alignItems:'center'},portrait:{width:88,height:110},heroCopy:{flex:1,minWidth:0,gap:coopSpacing.xs},character:{...coopTypography.section,color:coopColors.text},section:{...coopTypography.section,color:coopColors.gold,flex:1},loadout:{...coopTypography.section,color:coopColors.text},cardHead:{flexDirection:'row',gap:coopSpacing.sm,alignItems:'center'},grow:{flex:1,minWidth:0},failure:{...coopTypography.body,color:coopColors.danger},statHeader:{flexDirection:'row',gap:coopSpacing.sm,paddingVertical:coopSpacing.xs,borderBottomWidth:1,borderColor:coopColors.goldDim},statLabel:{...coopTypography.meta,color:coopColors.textSecondary,flex:1},statValue:{...coopTypography.meta,color:coopColors.text,textAlign:'right',width:76,fontWeight:'800'},sticky:{gap:coopSpacing.xs},notice:{...coopTypography.meta,color:coopColors.gold,textAlign:'center'},pressed:{opacity:.72}});
