import React,{useState} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameState} from '../core/types';
import {GATHERING,RECIPES} from '../content/skills';
import {itemDef} from '../content/items';
import {recipeAvailability} from '../core/playability';
import {offlineCapBreakdown} from '../core/game';
import {environmentEffect,environmentForZone} from '../core/world-weather';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {C,spacing,typography} from '../theme/theme';
import {NoviceWorkshop} from '../components/NoviceWorkshop';
import {formatGameNumber} from '../core/number-format';
import {ot} from '../i18n';

export function SkillsScreen({state,onGather,onCraft,onCharacter,initialMode='gathering'}:{state:GameState;onGather:(id:string)=>void;onCraft:(id:string)=>void;onCharacter:()=>void;initialMode?:'gathering'|'crafting'|'novice'}){
  const [mode,setMode]=useState<'gathering'|'crafting'|'novice'>(initialMode);
  const [readyOnly,setReadyOnly]=useState(false);
  const offlineCap=offlineCapBreakdown(state);
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.h}>{ot(state.settings.language,'craft.screen')}</Text>
    <View style={s.row}>{(['gathering','crafting','novice'] as const).map(value=><View style={s.flex} key={value}><GameButton title={ot(state.settings.language,value==='gathering'?'craft.gathering':value==='novice'?'craft.novice':'craft.crafting')} tone={mode===value?'primary':'secondary'} onPress={()=>setMode(value)}/></View>)}</View>
    {mode==='novice'&&<NoviceWorkshop state={state} onCraft={onCraft} onCharacter={onCharacter}/>}
    {mode==='crafting'&&<><Text style={s.sub}>Materials are taken from Inventory first, then Bank. Gear costs and XP requirements follow the slower Asterfall progression curve.</Text><GameButton title={readyOnly?'Showing craftable · Show all':'Show only craftable'} tone="secondary" onPress={()=>setReadyOnly(!readyOnly)}/></>}
    {mode!=='novice'&&state.skills.filter(sk=>mode==='gathering'?GATHERING.some(g=>g.skillId===sk.skillId):RECIPES.some(r=>r.skillId===sk.skillId&&!r.noviceSetId)).map(sk=>{
      const recipes=RECIPES.filter(r=>r.skillId===sk.skillId&&!r.noviceSetId).map(recipe=>({recipe,status:recipeAvailability(state,recipe.id)})).filter(({status})=>!readyOnly||status.ready);
      return <View key={sk.skillId} style={s.group}><Text style={s.name}>{sk.skillId.toUpperCase()} · Level {sk.level}</Text><Text style={s.sub}>{formatGameNumber(sk.xp,state.settings.numberMode)} XP</Text>
        {mode==='gathering'&&GATHERING.filter(g=>g.skillId===sk.skillId).map(g=>{const active=state.activity?.targetId===g.id;const environment=environmentForZone(g.zoneId);const effect=environmentEffect(g.skillId,environment);const cycle=g.seconds*effect.actionTimeMultiplier;const capActions=Math.floor(offlineCap.hours*3600/cycle);const baselineItems=Math.floor(capActions*g.min*effect.itemMultiplier);const capXp=Math.floor(capActions*g.xp*effect.xpMultiplier);return <Panel key={g.id}><Text style={s.name}>{g.name}</Text><Text style={s.sub}>{itemDef(g.itemId).name} · every {cycle.toFixed(1)}s · {g.xp} base skill XP/action</Text><Text style={[s.weather,{color:environment.weatherColor}]}>{environment.weatherSymbol} {environment.weatherName} · {effect.notes.join(' · ')}</Text><Text style={s.pacing}>At your {offlineCap.hours}h AFK cap: {formatGameNumber(capActions,state.settings.numberMode)} actions · {formatGameNumber(baselineItems,state.settings.numberMode)}+ {itemDef(g.itemId).name} · {formatGameNumber(capXp,state.settings.numberMode)} XP</Text><GameButton disabled={sk.level<g.unlockLevel||active} title={active?'Currently gathering':sk.level<g.unlockLevel?`Requires ${g.skillId} level ${g.unlockLevel}`:`Gather ${g.name}`} onPress={()=>onGather(g.id)}/></Panel>})}
        {mode==='crafting'&&recipes.map(({recipe:r,status})=><Panel key={r.id}><Text style={s.name}>{r.name}</Text><Text style={s.output}>Makes {formatGameNumber(r.output.quantity,state.settings.numberMode)}× {itemDef(r.output.itemId).name}</Text><Text style={s.sub}>Level {r.level} · {formatGameNumber(r.gold,state.settings.numberMode)} gold (have {formatGameNumber(state.character!.gold,state.settings.numberMode)}) · +{formatGameNumber(r.xp,state.settings.numberMode)} skill XP</Text>{status.inputs.map(input=><Text key={input.itemId} style={input.inventory+input.bank>=input.quantity?s.met:s.missing}>{itemDef(input.itemId).name}: {formatGameNumber(input.inventory+input.bank,state.settings.numberMode)}/{formatGameNumber(input.quantity,state.settings.numberMode)} · {formatGameNumber(input.inventory,state.settings.numberMode)} bag + {formatGameNumber(input.bank,state.settings.numberMode)} bank</Text>)}<Text style={status.ready?s.met:s.missing}>{status.reason}</Text><GameButton disabled={!status.ready} title={`Craft ${formatGameNumber(r.output.quantity,state.settings.numberMode)}×`} onPress={()=>onCraft(r.id)}/></Panel>)}
        {mode==='crafting'&&recipes.length===0&&<Text style={s.sub}>No craftable recipes here yet. Show all to see requirements.</Text>}
      </View>;
    })}
  </ScrollView>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},h:{...typography.hero,color:C.text},name:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},weather:{...typography.caption,fontWeight:'900'},pacing:{...typography.caption,color:C.info},row:{flexDirection:'row',gap:spacing.sm},flex:{flex:1},group:{gap:spacing.md},output:{...typography.bodyStrong,color:C.accent},met:{...typography.caption,color:C.good},missing:{...typography.caption,color:C.warning}});
