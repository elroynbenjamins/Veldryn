import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {availableGemRefinementsV1,availableGemResearchV1,GEM_RESEARCH_V1} from '../core/gem-progression-v1';
import {itemDef} from '../content/items';
import {GemArtwork} from './GemArtwork';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

const duration=(seconds:number)=>seconds>=3600?Math.round(seconds/3600*10)/10+'h':seconds>=60?Math.ceil(seconds/60)+'m':seconds+'s';

export function EnchantingRefineryPanel({state,onCommand}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),rows=useMemo(()=>availableGemRefinementsV1(state).sort((a,b)=>b.recipe.grade-a.recipe.grade||a.recipe.name.localeCompare(b.recipe.name)),[state]),research=useMemo(()=>availableGemResearchV1(state),[state]);
 const level=state.skills.find(row=>row.skillId==='enchanting')?.level??1;
 return <Panel>
  <View style={s.head}><View style={s.flex}><Text style={s.eyebrow}>ENCHANTING · GEM REFINERY</Text><Text style={s.title}>Refine unrefined gems</Text><Text style={s.copy}>Gem drops preserve their family and grade, but cannot be socketed until refined. Refinement uses Enchanting, Gold and regional reagents.</Text></View><Text style={s.level}>Lv {level}</Text></View>
  {rows.length===0?<View style={s.empty}><Text style={s.emptyTitle}>No unrefined gems owned</Text><Text style={s.copy}>Regional enemies, elites, bosses and co-op dungeons can drop unrefined gems. Their family and grade are already fixed when they drop.</Text></View>:rows.slice(0,8).map(row=>{
    const r=row.recipe,reagents=r.inputs.slice(1).map(input=>input.quantity+'× '+itemDef(input.itemId).name).join(' · ');
    const reason=!row.skillReady?`Enchanting Lv ${r.level}`:!row.goldReady?`${r.gold.toLocaleString()} Gold`:!row.inputReady?'Missing reagents':'Ready';
    return <View key={r.id} style={[s.row,row.ready&&s.readyRow]}>
      <GemArtwork itemId={r.output.itemId} size={46} framed={false}/>
      <View style={s.flex}><View style={s.rowHead}><Text style={s.name}>{r.name}</Text><Text style={row.ready?s.ready:s.blocked}>{row.ready?'READY':'BLOCKED'}</Text></View>
        <Text style={s.meta}>Unrefined owned ×{row.raw} · +{r.xp.toLocaleString()} Enchanting XP · {duration(r.seconds)}</Text>
        <Text style={s.reagents}>{reagents||'No extra reagent'} · {r.gold.toLocaleString()} Gold</Text>
      </View>
      <View style={s.action}><GameButton compact title={row.ready?'Refine':reason} disabled={!row.ready} onPress={()=>void onCommand({type:'gem_refine',args:{familyId:r.familyId,grade:r.grade}})}/></View>
    </View>;
  })}
  {rows.length>8?<Text style={s.more}>+{rows.length-8} more unrefined gem stacks are available.</Text>:null}
  <View style={s.researchBlock}><Text style={s.eyebrow}>EFFECT GEM RESEARCH · LV {GEM_RESEARCH_V1.level}</Text><Text style={s.copy}>Found an Effect Gem family but missed its recipe drop? Study one unrefined copy to permanently discover that family’s combine recipe.</Text>
   {research.length===0?<Text style={s.meta}>No researchable Effect Gem families owned right now.</Text>:research.slice(0,5).map(row=>{const family=row.family!;return <View key={family.familyId} style={s.researchRow}><View style={s.flex}><Text style={s.name}>{family.name}</Text><Text style={s.meta}>Consumes 1 lowest-grade unrefined copy · {GEM_RESEARCH_V1.dust} Gem Dust · {GEM_RESEARCH_V1.gold.toLocaleString()} Gold · +{GEM_RESEARCH_V1.xp} XP</Text></View><View style={s.action}><GameButton compact title={row.ready?'Research':row.reason.replace(/\.$/,'')} disabled={!row.ready} onPress={()=>void onCommand({type:'gem_research',args:{familyId:family.familyId}})}/></View></View>;})}
  </View>
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 flex:{flex:1,minWidth:0},head:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},eyebrow:{...typography.caption,color:C.special,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},copy:{...typography.caption,color:C.muted},level:{...typography.bodyStrong,color:C.special,paddingHorizontal:8,paddingVertical:4,borderWidth:1,borderColor:C.special,borderRadius:8},empty:{gap:2,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line},emptyTitle:{...typography.bodyStrong,color:C.text},row:{minHeight:76,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm,borderTopWidth:1,borderTopColor:C.line},readyRow:{borderTopColor:C.good},rowHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},name:{...typography.bodyStrong,color:C.text,flex:1},meta:{...typography.caption,color:C.info},reagents:{...typography.caption,color:C.muted},ready:{...typography.caption,color:C.good,fontWeight:'900'},blocked:{...typography.caption,color:C.warning,fontWeight:'900'},action:{width:116},more:{...typography.caption,color:C.muted,textAlign:'center',paddingTop:4},researchBlock:{gap:6,paddingTop:8,borderTopWidth:1,borderTopColor:C.line},researchRow:{minHeight:58,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:5,borderTopWidth:1,borderTopColor:C.line}
});}
