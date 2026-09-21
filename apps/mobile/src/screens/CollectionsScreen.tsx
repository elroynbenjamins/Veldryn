import {useMemo} from 'react';
import {Image,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {COLLECTIBLE_TARGET_LABELS,type CollectibleKind} from '../content/collectibles';
import {collectibleJournal,collectionBonusBreakdown,selectCollectible} from '../core/collectibles';
import type {GameState} from '../core/types';
import {petArtSource} from '../theme/pet-art';
import {radii,spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

const pct=(bps:number)=>(bps/100).toFixed(2)+'%';

export function CollectionsScreen({state,onChange}:{state:GameState;onChange:(next:GameState)=>void}){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const journal=collectibleJournal(state),breakdown=collectionBonusBreakdown(state),owned=journal.filter(row=>row.owned).length;
  const rows=(kind:CollectibleKind)=>journal.filter(row=>row.kind===kind);

  return <ScrollView contentContainerStyle={s.root}>
    <Text accessibilityRole="header" style={s.heading}>Collections</Text>
    <Panel>
      <Text style={s.title}>Account legacy</Text>
      <Text style={s.copy}><Text style={s.accent}>Owned</Text> collectibles provide account-wide passive bonuses. Selecting an eligible collectible adds its stronger active bonus without changing ownership.</Text>
      <View style={s.summaryRow}>
        <View style={s.summaryCell}><Text style={s.summaryValue}>{owned}</Text><Text style={s.summaryLabel}>OWNED</Text></View>
        <View style={s.summaryCell}><Text style={s.summaryValue}>{journal.length-owned}</Text><Text style={s.summaryLabel}>LOCKED</Text></View>
        <View style={s.summaryCell}><Text style={s.summaryValue}>{journal.length}</Text><Text style={s.summaryLabel}>TOTAL</Text></View>
      </View>
    </Panel>

    <Panel>
      <Text style={s.section}>ACTIVE BONUS SUMMARY</Text>
      {breakdown.length?breakdown.map(row=><View key={row.target} style={s.bonusRow}>
        <View style={s.flex}><Text style={s.name}>{COLLECTIBLE_TARGET_LABELS[row.target]}</Text><Text style={s.copy}>{pct(row.ownedAppliedBps)} passive{row.activeAppliedBps?` · ${pct(row.activeAppliedBps)} active`:''}</Text></View>
        <Text style={s.bonusValue}>+{pct(row.appliedBps)}</Text>
      </View>):<Text style={s.copy}>No owned collectible bonuses yet.</Text>}
    </Panel>

    {(['pet','background','border'] as CollectibleKind[]).map(kind=>{
      const entries=rows(kind);
      return <Panel key={kind}>
        <Text style={s.section}>{kind.toUpperCase()} · {entries.filter(row=>row.owned).length}/{entries.length}</Text>
        {kind==='pet'?<View style={s.petGrid}>{entries.map(row=>{
          const art=petArtSource(row.id);
          return <View key={row.id} style={[s.petCard,row.selected&&s.selectedCard,!row.owned&&s.lockedCard]}>
            <View style={s.petPortrait}>{art?<Image source={art} resizeMode="contain" style={s.petImage}/>:<Text style={s.petFallback}>{row.owned?'◆':'?'}</Text>}</View>
            <View style={s.petTags}><Text style={s.tag}>{(row.collectionGroup??'legacy').toUpperCase()}</Text>{row.selected?<Text style={s.activeTag}>ACTIVE</Text>:null}</View>
            <Text numberOfLines={1} style={s.petName}>{row.name}</Text>
            {row.region||row.rarity?<Text numberOfLines={1} style={s.context}>{[row.region,row.rarity].filter(Boolean).join(' · ')}</Text>:null}
            <Text numberOfLines={2} style={s.source}>{row.source}</Text>
            <Text style={s.bonusText}>{COLLECTIBLE_TARGET_LABELS[row.target]} · +{pct(row.activeBps)} active</Text>
            <GameButton compact title={row.selected?'Selected':row.owned?'Use':'Locked'} disabled={!row.owned||row.selected} tone="secondary" onPress={()=>onChange(selectCollectible(state,'pet',row.id))}/>
          </View>;
        })}</View>:entries.map(row=><View key={row.id} style={[s.row,row.owned&&s.owned]}>
          <View style={s.flex}>
            <Text style={s.name}>{row.name}</Text>
            <Text style={s.copy}>{row.owned?<Text style={s.ownedWord}>Owned</Text>:<Text style={s.lockedWord}>Locked</Text>} · {row.source}</Text>
            <Text style={s.bonusText}>{COLLECTIBLE_TARGET_LABELS[row.target]} · +{pct(row.activeBps)} active</Text>
          </View>
          <GameButton compact title={row.selected?'Selected':row.owned?'Use':'Locked'} disabled={!row.owned||row.selected} tone="secondary" onPress={()=>onChange(selectCollectible(state,kind,row.id))}/>
        </View>)}
      </Panel>;
    })}
  </ScrollView>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  root:{padding:spacing.lg,gap:spacing.md,paddingBottom:110},
  heading:{...typography.hero,color:C.text},
  title:{...typography.title,color:C.text},
  section:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},
  copy:{...typography.caption,color:C.muted,lineHeight:18},
  accent:{color:C.accent,fontWeight:'800'},
  ownedWord:{color:C.good,fontWeight:'900'},
  lockedWord:{color:C.disabled,fontWeight:'800'},
  flex:{flex:1,minWidth:0},
  name:{...typography.bodyStrong,color:C.text},
  summaryRow:{flexDirection:'row',gap:8,marginTop:spacing.md},
  summaryCell:{flex:1,alignItems:'center',padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
  summaryValue:{...typography.title,color:C.text},
  summaryLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.8,marginTop:2},
  bonusRow:{minHeight:52,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderBottomWidth:1,borderBottomColor:C.line},
  bonusValue:{...typography.bodyStrong,color:C.good},
  row:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm,borderBottomWidth:1,borderBottomColor:C.line,opacity:.52},
  owned:{opacity:1},
  petGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:spacing.sm},
  petCard:{width:'48%',minWidth:0,gap:5,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
  selectedCard:{borderColor:C.accent,backgroundColor:C.accentSurface},
  lockedCard:{opacity:.46},
  petPortrait:{height:78,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:C.stage,overflow:'hidden'},
  petImage:{width:'100%',height:'100%'},
  petFallback:{fontSize:28,color:C.accent,fontWeight:'900'},
  petTags:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:4},
  tag:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.6},
  activeTag:{fontSize:8,color:C.good,fontWeight:'900',letterSpacing:.6},
  petName:{fontSize:11,color:C.text,fontWeight:'900'},
  context:{fontSize:9,color:C.info,fontWeight:'700'},
  source:{fontSize:9,lineHeight:12,color:C.muted,minHeight:24},
  bonusText:{fontSize:9,lineHeight:12,color:C.accent,fontWeight:'800'},
});}
