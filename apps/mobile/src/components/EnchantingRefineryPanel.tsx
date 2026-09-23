import {useMemo,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {availableGemRefinementsV1,availableGemResearchV1,enchantingExtractionDiscountV1,GEM_RESEARCH_REQUIRED_POINTS_V1} from '../core/gem-progression-v1';
import {itemDef} from '../content/items';
import {GemArtwork} from './GemArtwork';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

const duration=(seconds:number)=>seconds>=3600?Math.round(seconds/3600*10)/10+'h':seconds>=60?Math.ceil(seconds/60)+'m':seconds+'s';

export function EnchantingRefineryPanel({state,onCommand}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),rows=useMemo(()=>availableGemRefinementsV1(state).sort((a,b)=>b.recipe.grade-a.recipe.grade||a.recipe.name.localeCompare(b.recipe.name)),[state]),researchRows=useMemo(()=>availableGemResearchV1(state).sort((a,b)=>b.grade-a.grade||String(a.family?.name).localeCompare(String(b.family?.name))),[state]);
 const [confirmResearch,setConfirmResearch]=useState('');
 const level=state.skills.find(row=>row.skillId==='enchanting')?.level??1,extractDiscount=enchantingExtractionDiscountV1(level);
 return <Panel>
  <View style={s.head}><View style={s.flex}><Text style={s.eyebrow}>ENCHANTING · GEM REFINERY</Text><Text style={s.title}>Refine, research and preserve gems</Text><Text style={s.copy}>Unrefined drops keep their family and grade. Enchanting makes them socketable, researches Effect Gem recipes, and improves safe extraction.</Text></View><Text style={s.level}>Lv {level}</Text></View>
  <View style={s.service}><Text style={s.serviceLabel}>ENCHANTING SERVICE</Text><Text style={s.serviceValue}>{extractDiscount?Math.round(extractDiscount*100)+'% cheaper safe extraction':'Safe extraction discounts begin at Lv 20'}</Text><Text style={s.copy}>Catalyst synthesis unlocks in the recipe list at Enchanting Lv 70 and Lv 90.</Text></View>
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
  <View style={s.section}><Text style={s.eyebrow}>EFFECT GEM RESEARCH</Text><Text style={s.copy}>At Lv 25+, sacrifice an unrefined Effect Gem plus Gem Dust and Gold for deterministic recipe progress. Higher-grade samples contribute more; boss/dungeon recipe drops still unlock instantly.</Text></View>
  {researchRows.length===0?<Text style={s.emptyTitle}>No researchable unrefined Effect Gems owned</Text>:researchRows.slice(0,6).map(row=>{const family=row.family!,key=row.rawItemId,confirm=confirmResearch===key,reason=!row.skillReady?'Enchanting Lv '+row.cost.level:!row.inputReady?'Need gem + '+row.cost.dust+' dust':!row.goldReady?row.cost.gold.toLocaleString()+' Gold':'Research';return <View key={row.rawItemId} style={[s.row,row.ready&&s.readyRow]}><GemArtwork itemId={'gem:'+family.familyId+':g'+row.grade} size={42} framed={false}/><View style={s.flex}><View style={s.rowHead}><Text style={s.name}>{family.name} · Grade {row.grade}</Text><Text style={row.ready?s.ready:s.blocked}>{row.progress}/{GEM_RESEARCH_REQUIRED_POINTS_V1}</Text></View><Text style={s.meta}>This sample adds {row.cost.points} research point{row.cost.points===1?'':'s'} · +{row.cost.xp.toLocaleString()} Enchanting XP</Text><Text style={s.reagents}>Consumes 1 unrefined gem · {row.cost.dust} Gem Dust · {row.cost.gold.toLocaleString()} Gold</Text></View><View style={s.action}><GameButton compact title={confirm?'Confirm':row.ready?'Research':reason} disabled={!row.ready} tone={confirm?'primary':'secondary'} onPress={()=>{if(!confirm){setConfirmResearch(key);return;}setConfirmResearch('');void onCommand({type:'gem_research',args:{familyId:family.familyId,grade:row.grade}})}}/></View></View>})}
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 flex:{flex:1,minWidth:0},head:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},eyebrow:{...typography.caption,color:C.special,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},copy:{...typography.caption,color:C.muted},level:{...typography.bodyStrong,color:C.special,paddingHorizontal:8,paddingVertical:4,borderWidth:1,borderColor:C.special,borderRadius:8},service:{gap:2,padding:8,borderWidth:1,borderColor:C.special,borderRadius:8,backgroundColor:C.specialSurface},serviceLabel:{fontSize:8.5,color:C.special,fontWeight:'900',letterSpacing:.7},serviceValue:{...typography.bodyStrong,color:C.text},section:{gap:2,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line},empty:{gap:2,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line},emptyTitle:{...typography.bodyStrong,color:C.text},row:{minHeight:76,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm,borderTopWidth:1,borderTopColor:C.line},readyRow:{borderTopColor:C.good},rowHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},name:{...typography.bodyStrong,color:C.text,flex:1},meta:{...typography.caption,color:C.info},reagents:{...typography.caption,color:C.muted},ready:{...typography.caption,color:C.good,fontWeight:'900'},blocked:{...typography.caption,color:C.warning,fontWeight:'900'},action:{width:116},more:{...typography.caption,color:C.muted,textAlign:'center',paddingTop:4}
});}
