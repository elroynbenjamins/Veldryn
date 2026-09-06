import React,{useState} from 'react';
import {Image,ImageBackground,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {GameState} from '../core/types';
import {encounterUnlocked,nextRegionUnlock,regionEncounters} from '../core/world-navigation';
import {itemDef} from '../content/items';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES,WorldZoneDef} from '../content/world-map';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {C,radii,spacing,typography} from '../theme/theme';
import {monsterPortraits} from '../theme/monster-assets';
import {itemRarity,rarityLabel,rarityMeta} from '../core/item-rarity';

export function WorldScreen({state,onStart,onBoss,selectedId,onSelectZone}:{state:GameState;onStart:(id:string)=>void;onBoss:()=>void;selectedId:string|null;onSelectZone:(id:string|null)=>void}){
  const [mode,setMode]=useState<'map'|'list'>('map');
  const [zoom,setZoom]=useState(1.35);
  const level=state.character!.level;
  const activeMonster=state.activity?.kind==='combat'?MONSTERS.find(monster=>monster.id===state.activity?.targetId):undefined;
  const selected=WORLD_ZONES.find(zone=>zone.id===selectedId),next=nextRegionUnlock(level);
  if(selected)return <ZoneView key={selected.id} zone={selected} state={state} onBack={()=>onSelectZone(null)} onStart={onStart} onBoss={onBoss}/>;
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.kicker}>WORLD MAP</Text><Text style={s.h}>Kingdom of Asterfall</Text><Text style={s.sub}>Choose a region to hunt, or inspect a locked region to plan your journey.</Text>
    <View style={s.row}>{(['map','list'] as const).map(value=><View style={s.flex} key={value}><GameButton title={value==='map'?'Map view':'Region list'} tone={mode===value?'primary':'secondary'} onPress={()=>setMode(value)}/></View>)}</View>
    {mode==='map'?<><View style={s.mapTools}><View style={s.flex}><Text style={s.current}>Drag to explore · tap a region</Text><Text style={s.mapHint}>Use −/+ to change the map scale.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Zoom out map" disabled={zoom<=1} onPress={()=>setZoom(value=>Math.max(1,value-.35))} style={[s.zoomButton,zoom<=1&&s.zoomDisabled]}><Text style={s.zoomText}>−</Text></Pressable><Text style={s.zoomLevel}>{Math.round(zoom*100)}%</Text><Pressable accessibilityRole="button" accessibilityLabel="Zoom in map" disabled={zoom>=2.05} onPress={()=>setZoom(value=>Math.min(2.05,value+.35))} style={[s.zoomButton,zoom>=2.05&&s.zoomDisabled]}><Text style={s.zoomText}>+</Text></Pressable></View><View style={s.viewport}><ScrollView horizontal nestedScrollEnabled directionalLockEnabled={false} showsHorizontalScrollIndicator><ScrollView nestedScrollEnabled directionalLockEnabled={false} showsVerticalScrollIndicator contentContainerStyle={{width:620*zoom,height:620*zoom}}><ImageBackground source={require('../../assets/world/asterfall-map-v1.png')} resizeMode="cover" imageStyle={s.mapArtwork} style={[s.map,{width:620*zoom,height:620*zoom}]} accessibilityLabel="Interactive illustrated map of Asterfall">
      <View style={s.roadMain}/><View style={s.roadBranch}/>
      {WORLD_ZONES.map(zone=>{const unlocked=level>=zone.minLevel,active=activeMonster?.zone===zone.name;return <Pressable key={zone.id} accessibilityRole="button" accessibilityLabel={`${zone.name}, ${unlocked?'unlocked':`preview, requires level ${zone.minLevel}`}`} onPress={()=>onSelectZone(zone.id)} style={[s.node,{left:`${zone.x*100}%`,top:`${zone.y*100}%`,borderColor:unlocked?zone.accent:C.disabled},active&&s.nodeActive]}><Text style={[s.symbol,{color:unlocked?zone.accent:C.disabled}]}>{zone.symbol}</Text><Text style={s.nodeLabel}>{zone.name}</Text><Text style={s.nodeLevel}>{unlocked?`LV ${zone.minLevel}–${zone.maxLevel}`:`LOCKED · LV ${zone.minLevel}`}</Text>{active&&<Text style={s.activeTag}>ACTIVE</Text>}</Pressable>})}
    </ImageBackground></ScrollView></ScrollView></View></>:WORLD_ZONES.map(zone=><Panel key={zone.id}><Text style={s.title}>{zone.symbol} {zone.name}</Text><Text style={s.sub}>{zone.subtitle} · Levels {zone.minLevel}–{zone.maxLevel}</Text><GameButton title={level>=zone.minLevel?'Explore region':`Preview · unlocks at level ${zone.minLevel}`} tone="secondary" onPress={()=>onSelectZone(zone.id)}/></Panel>)}
    <Panel><Text style={s.title}>Journey progress</Text><Text style={s.sub}>{WORLD_ZONES.filter(zone=>level>=zone.minLevel).length} of {WORLD_ZONES.length} regions unlocked · Level {level}</Text><Text style={s.current}>{next?`Next: ${next.name} at level ${next.minLevel} · ${next.minLevel-level} level${next.minLevel-level===1?'':'s'} away`:'All Asterfall regions unlocked'}</Text>{activeMonster&&<GameButton title={`Return to ${activeMonster.zone}`} tone="secondary" onPress={()=>onSelectZone(WORLD_ZONES.find(zone=>zone.name===activeMonster.zone)!.id)}/>}</Panel>
  </ScrollView>;
}

function ZoneView({zone,state,onBack,onStart,onBoss}:{zone:WorldZoneDef;state:GameState;onBack:()=>void;onStart:(id:string)=>void;onBoss:()=>void}){
  const [query,setQuery]=useState(''),[availableOnly,setAvailableOnly]=useState(false);
  const monsters=regionEncounters(state,zone.name,query,availableOnly);
  const regionLocked=state.character!.level<zone.minLevel;
  return <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
    <GameButton title="‹ All Asterfall regions" tone="secondary" onPress={onBack}/>
    <View style={[s.zoneHero,{borderColor:zone.accent}]}><Text style={[s.symbol,{color:zone.accent}]}>{zone.symbol}</Text><View style={s.flex}><Text style={s.h}>{zone.name}</Text><Text style={s.sub}>{zone.subtitle}</Text><Text style={s.current}>LEVELS {zone.minLevel}–{zone.maxLevel}</Text></View></View>
    {regionLocked&&<Text style={s.warning}>Preview only. Reach character level {zone.minLevel} to enter this region.</Text>}
    <TextInput accessibilityLabel="Search encounters" value={query} onChangeText={setQuery} placeholder="Search encounters…" placeholderTextColor={C.muted} style={s.search}/>
    <GameButton title={availableOnly?'Available only · Show all':'Show available encounters only'} tone="secondary" onPress={()=>setAvailableOnly(!availableOnly)}/>
    <Text style={s.kicker}>{monsters.length} ENCOUNTER{monsters.length===1?'':'S'}</Text>
    {monsters.length===0&&<Panel><Text style={s.title}>No matching encounters</Text><Text style={s.sub}>Try another name or show all encounters.</Text><GameButton title="Clear filters" onPress={()=>{setQuery('');setAvailableOnly(false)}}/></Panel>}
    {monsters.map(monster=>{
      const unlocked=encounterUnlocked(state,monster),active=state.activity?.kind==='combat'&&state.activity.targetId===monster.id;
      const defeated=state.defeatedBossIds.includes(monster.id);
      const baseXp=Math.floor(monster.xp*3600/monster.secondsPerKill);
      return <Panel key={monster.id}>
        <View style={s.encounterHead}><Image accessibilityLabel={`${monster.name} portrait`} source={monsterPortraits[monster.id]} style={s.monsterPortrait}/><View style={s.flex}><Text style={s.title}>{monster.boss?'♛ ':''}{monster.name}</Text><Text style={s.sub}>Level {monster.level} · HP {monster.hp} · ATK {monster.attack} · DEF {monster.defense}</Text><Text style={unlocked?s.current:s.warning}>{active?'HUNTING':unlocked?'UNLOCKED':`LOCKED · LV ${monster.unlockLevel}`}</Text></View></View>
        {!monster.boss&&<Text style={s.sub}>Base rate: {baseXp.toLocaleString()} XP/hour before combat speed and survival. Not a guaranteed reward.</Text>}
        <Text style={s.dropLabel}>LOOT TABLE</Text>{monster.drops.slice(0,3).map(drop=>{const item=itemDef(drop.itemId),rarity=itemRarity(item);return <View key={drop.itemId} style={s.dropRow}><Text style={[s.dropRarity,{color:rarityMeta(rarity).color}]}>{rarityLabel(item)}</Text><Text style={s.drops}>{item.name}</Text><Text style={s.dropChance}>{Math.max(.1,drop.chance*100).toFixed(drop.chance<.01?1:0)}%</Text></View>})}
        {monster.boss&&!unlocked&&state.character!.level>=monster.unlockLevel&&<Text style={s.warning}>Advance the Asterfall questline to challenge this boss.</Text>}
        <GameButton disabled={!unlocked||active||defeated} title={defeated?'Defeated':active?'Currently hunting':monster.boss?'Challenge Fallen Knight':state.activity?'Collect current rewards & hunt':'Start idle hunt'} onPress={()=>monster.boss?onBoss():onStart(monster.id)}/>
      </Panel>;
    })}
  </ScrollView>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},row:{flexDirection:'row',gap:spacing.sm,alignItems:'center'},flex:{flex:1},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},h:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},current:{...typography.bodyStrong,color:C.good},warning:{...typography.bodyStrong,color:C.warning},viewport:{height:500,overflow:'hidden',borderWidth:1,borderColor:C.line,borderRadius:radii.lg},map:{backgroundColor:'#101b22',position:'relative'},mapArtwork:{opacity:.72},mapTools:{flexDirection:'row',alignItems:'center',gap:spacing.sm,backgroundColor:C.panel,padding:spacing.sm,borderRadius:radii.md},mapHint:{...typography.caption,color:C.muted},zoomButton:{width:44,height:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.accent,borderRadius:radii.md,backgroundColor:C.panel2},zoomDisabled:{opacity:.35},zoomText:{fontSize:26,color:C.text,fontWeight:'900'},zoomLevel:{...typography.caption,color:C.accent,fontWeight:'900',minWidth:42,textAlign:'center'},roadMain:{position:'absolute',left:'45%',top:'14%',width:3,height:'66%',backgroundColor:'rgba(212,173,88,.55)',transform:[{rotate:'18deg'}]},roadBranch:{position:'absolute',left:'25%',top:'52%',width:'48%',height:3,backgroundColor:'rgba(212,173,88,.55)',transform:[{rotate:'10deg'}]},node:{position:'absolute',width:112,minHeight:82,marginLeft:-56,marginTop:-41,backgroundColor:'rgba(15,24,35,.92)',borderWidth:2,borderRadius:radii.lg,alignItems:'center',justifyContent:'center',padding:spacing.xs},nodeActive:{borderWidth:3},symbol:{fontSize:26,fontWeight:'900'},nodeLabel:{...typography.caption,color:C.text,fontWeight:'900',textAlign:'center'},nodeLevel:{fontSize:10,color:C.muted,fontWeight:'800'},activeTag:{fontSize:10,color:C.accent,fontWeight:'900'},zoneHero:{flexDirection:'row',alignItems:'center',gap:spacing.md,backgroundColor:C.panel,borderWidth:1,borderRadius:radii.lg,padding:spacing.lg},search:{minHeight:48,borderWidth:1,borderColor:C.line,borderRadius:radii.md,color:C.text,backgroundColor:C.panel,paddingHorizontal:spacing.md,fontSize:16},drops:{...typography.caption,color:C.text,flex:1},dropLabel:{...typography.caption,color:C.accent,fontWeight:'900'},dropRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm,backgroundColor:C.panel2,borderRadius:radii.sm,padding:spacing.xs},dropRarity:{fontSize:10,fontWeight:'900',width:68},dropChance:{...typography.caption,color:C.muted,fontWeight:'800'},common:{color:C.muted},uncommon:{color:C.good},rare:{color:C.info},epic:{color:'#c79cff'},encounterHead:{flexDirection:'row',gap:spacing.md,alignItems:'center'},monsterPortrait:{width:92,height:92}});
