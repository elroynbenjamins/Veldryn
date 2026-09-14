import {BossEncounterIntro} from './BossEncounterIntro';
import {ItemArtwork} from './ItemArtwork';
import {SearchField} from './SearchField';
import {useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {WorldZoneDef} from '../content/world-map';
import {encounterUnlocked,regionEncounters} from '../core/world-navigation';
import {itemDef} from '../content/items';
import {itemRarity,rarityLabel,rarityMeta} from '../core/item-rarity';
import {formatGameNumber} from '../core/number-format';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';
import {GameButton} from './GameButton';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {Panel} from './Panel';
import {ResourceArtwork} from './ResourceArtwork';
import {combatReadiness} from '../core/combat-presentation';

export function RegionEncounterList({state,zone,onStart,onBoss,showFilters=false}:{state:GameState;zone:WorldZoneDef;onStart:(id:string)=>void;onBoss:()=>void;showFilters?:boolean}){
  const [query,setQuery]=useState(''),[availableOnly,setAvailableOnly]=useState(false),[expandedId,setExpandedId]=useState<string|null>(null);
  const monsters=regionEncounters(state,zone.name,query,availableOnly);
  return <View style={s.list}>
    {showFilters&&<><SearchField accessibilityLabel="Search encounters" value={query} onChangeText={setQuery} placeholder="Search encounters…" placeholderTextColor={C.muted}/><GameButton title={availableOnly?'Available only · Show all':'Show available encounters only'} tone="secondary" onPress={()=>setAvailableOnly(!availableOnly)}/></>}
    <Text style={s.kicker}>{monsters.length} ENEM{monsters.length===1?'Y':'IES'} · TAP TO EXPAND</Text>
    {monsters.length===0&&<Panel><Text style={s.title}>No matching enemies</Text><Text style={s.sub}>Try another name or show all encounters.</Text><GameButton title="Clear filters" onPress={()=>{setQuery('');setAvailableOnly(false)}}/></Panel>}
    {monsters.map(monster=>{
      const unlocked=encounterUnlocked(state,monster),active=state.activity?.kind==='combat'&&state.activity.targetId===monster.id,defeated=state.defeatedBossIds.includes(monster.id),expanded=expandedId===monster.id;
      const baseXp=Math.floor(monster.xp*3600/monster.secondsPerKill);
      const readiness=combatReadiness(state,monster),readinessColor=readiness.safety==='safe'?C.good:readiness.safety==='steady'?C.info:C.warning;
      return <View key={monster.id} style={[s.card,expanded&&s.cardExpanded]}>
        <Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={`${monster.name}, level ${monster.level}, ${monster.hp} health, ${monster.attack} attack, ${expanded?'collapse':'expand'}`} onPress={()=>setExpandedId(expanded?null:monster.id)} style={({pressed})=>[s.head,pressed&&s.pressed]}>
          <MonsterPortraitFrame monster={monster} size={72} active={active}/>
          <View style={s.flex}><Text style={s.title}>{monster.boss?'♛ ':''}{monster.name}</Text><Text style={s.stats}>LV {monster.level} · HP {monster.hp} · ATK {monster.attack} · DEF {monster.defense}</Text><View style={s.statusRow}><Text style={active?s.active:unlocked?s.ready:s.locked}>{active?'HUNTING':unlocked?'AVAILABLE':`LOCKED · LV ${monster.unlockLevel}`}</Text><Text style={[s.readiness,{color:readinessColor}]}>{readiness.safety.toUpperCase()} · {readiness.percent}%</Text></View></View>
          <Text aria-hidden style={s.chevron}>{expanded?'⌃':'⌄'}</Text>
        </Pressable>
        {expanded&&<View style={s.detail}>{monster.boss&&<BossEncounterIntro monster={monster}/>}
          {!monster.boss&&<Text style={s.sub}>Base rate: {formatGameNumber(baseXp,state.settings.numberMode)} XP/hour before combat speed and survival.</Text>}
          <View style={[s.readinessBox,{borderColor:readinessColor}]}><Text style={[s.readinessTitle,{color:readinessColor}]}>{readiness.safety==='safe'?'Well prepared':readiness.safety==='steady'?'Close match':'Upgrade recommended'}</Text><Text style={s.sub}>Your effective power: {formatGameNumber(readiness.power,state.settings.numberMode)} · recommended: {formatGameNumber(readiness.recommendedPower,state.settings.numberMode)}</Text></View>
          <Text style={s.dropLabel}>DROP TABLE</Text>
          {monster.drops.map(drop=>{const item=itemDef(drop.itemId),rarity=itemRarity(item);return <View key={drop.itemId} style={s.dropRow}><ItemArtwork itemId={drop.itemId} size={30}/><Text style={[s.dropRarity,{color:rarityMeta(rarity).color}]}>{rarityLabel(item)}</Text><Text style={s.dropName}>{item.name}</Text><Text style={s.dropChance}>{Math.max(.1,drop.chance*100).toFixed(drop.chance<.01?1:0)}%</Text></View>})}
          {monster.boss&&!unlocked&&state.character!.level>=monster.unlockLevel&&<Text style={s.locked}>Advance the Asterfall questline to challenge this boss.</Text>}
          <GameButton disabled={!unlocked||active||defeated} title={defeated?'Defeated':active?'Currently hunting':monster.boss?'Challenge Fallen Knight':state.activity?'Collect current rewards & hunt':'Start idle hunt'} onPress={()=>monster.boss?onBoss():onStart(monster.id)}/>
        </View>}
      </View>;
    })}
  </View>;
}

const s=StyleSheet.create({list:{gap:spacing.sm},search:{minHeight:48,borderWidth:1,borderColor:C.line,borderRadius:radii.md,color:C.text,backgroundColor:C.panel,paddingHorizontal:spacing.md,fontSize:16},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},card:{backgroundColor:equipmentColors.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,overflow:'hidden'},cardExpanded:{borderColor:equipmentColors.lineStrong},head:{minHeight:92,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm},pressed:{opacity:.7},flex:{flex:1,minWidth:0},title:{...typography.title,color:C.text},stats:{...typography.caption,color:C.muted,fontWeight:'800'},statusRow:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:spacing.xs},readiness:{fontSize:10,fontWeight:'900',letterSpacing:.6},readinessBox:{borderLeftWidth:3,backgroundColor:C.panel2,padding:spacing.sm},readinessTitle:{...typography.bodyStrong},ready:{fontSize:10,color:C.good,fontWeight:'900',letterSpacing:.7},active:{fontSize:10,color:equipmentColors.gold,fontWeight:'900',letterSpacing:.7},locked:{...typography.caption,color:C.warning,fontWeight:'800'},chevron:{width:28,color:equipmentColors.goldSoft,fontSize:22,textAlign:'center'},detail:{gap:spacing.sm,padding:spacing.md,paddingTop:0,borderTopWidth:1,borderTopColor:equipmentColors.line},sub:{...typography.body,color:C.muted},dropLabel:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:.8},dropRow:{minHeight:34,flexDirection:'row',alignItems:'center',gap:spacing.sm,backgroundColor:C.panel2,borderRadius:radii.sm,paddingHorizontal:spacing.sm},dropRarity:{fontSize:10,fontWeight:'900',width:68},dropName:{...typography.caption,color:C.text,flex:1},dropChance:{...typography.caption,color:C.muted,fontWeight:'800'},
});
