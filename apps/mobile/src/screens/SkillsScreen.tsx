import React,{useState} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameState} from '../core/types';
import {GATHERING,RECIPES} from '../content/skills';
import {itemDef} from '../content/items';
import {recipeAvailability} from '../core/playability';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {C,spacing,typography} from '../theme/theme';
import {NoviceWorkshop} from '../components/NoviceWorkshop';

export function SkillsScreen({state,onGather,onCraft,onCharacter,initialMode='gathering'}:{state:GameState;onGather:(id:string)=>void;onCraft:(id:string)=>void;onCharacter:()=>void;initialMode?:'gathering'|'crafting'|'novice'}){
  const [mode,setMode]=useState<'gathering'|'crafting'|'novice'>(initialMode);
  const [readyOnly,setReadyOnly]=useState(false);
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.h}>Skills & Crafting</Text>
    <View style={s.row}>{(['gathering','crafting','novice'] as const).map(value=><View style={s.flex} key={value}><GameButton title={value==='gathering'?'Gathering':value==='novice'?'Novice set':'Crafting'} tone={mode===value?'primary':'secondary'} onPress={()=>setMode(value)}/></View>)}</View>
    {mode==='novice'&&<NoviceWorkshop state={state} onCraft={onCraft} onCharacter={onCharacter}/>}
    {mode==='crafting'&&<><Text style={s.sub}>Materials are taken from Inventory first, then Bank. Crafting is instant in this prototype.</Text><GameButton title={readyOnly?'Showing craftable · Show all':'Show only craftable'} tone="secondary" onPress={()=>setReadyOnly(!readyOnly)}/></>}
    {mode!=='novice'&&state.skills.filter(sk=>mode==='gathering'?GATHERING.some(g=>g.skillId===sk.skillId):RECIPES.some(r=>r.skillId===sk.skillId&&!r.noviceSetId)).map(sk=>{
      const recipes=RECIPES.filter(r=>r.skillId===sk.skillId&&!r.noviceSetId).map(recipe=>({recipe,status:recipeAvailability(state,recipe.id)})).filter(({status})=>!readyOnly||status.ready);
      return <View key={sk.skillId} style={s.group}><Text style={s.name}>{sk.skillId.toUpperCase()} · Level {sk.level}</Text><Text style={s.sub}>{sk.xp.toLocaleString()} XP</Text>
        {mode==='gathering'&&GATHERING.filter(g=>g.skillId===sk.skillId).map(g=>{const active=state.activity?.targetId===g.id;return <Panel key={g.id}><Text style={s.name}>{g.name}</Text><Text style={s.sub}>{itemDef(g.itemId).name} · every {g.seconds}s · {g.xp} skill XP/action</Text><GameButton disabled={sk.level<g.unlockLevel||active} title={active?'Currently gathering':sk.level<g.unlockLevel?`Requires ${g.skillId} level ${g.unlockLevel}`:`Gather ${g.name}`} onPress={()=>onGather(g.id)}/></Panel>})}
        {mode==='crafting'&&recipes.map(({recipe:r,status})=><Panel key={r.id}><Text style={s.name}>{r.name}</Text><Text style={s.output}>Makes {r.output.quantity}× {itemDef(r.output.itemId).name}</Text><Text style={s.sub}>Level {r.level} · {r.gold} gold (have {state.character!.gold}) · +{r.xp} skill XP</Text>{status.inputs.map(input=><Text key={input.itemId} style={input.inventory+input.bank>=input.quantity?s.met:s.missing}>{itemDef(input.itemId).name}: {input.inventory+input.bank}/{input.quantity} · {input.inventory} bag + {input.bank} bank</Text>)}<Text style={status.ready?s.met:s.missing}>{status.reason}</Text><GameButton disabled={!status.ready} title={`Craft ${r.output.quantity}×`} onPress={()=>onCraft(r.id)}/></Panel>)}
        {mode==='crafting'&&recipes.length===0&&<Text style={s.sub}>No craftable recipes here yet. Show all to see requirements.</Text>}
      </View>;
    })}
  </ScrollView>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},h:{...typography.hero,color:C.text},name:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},row:{flexDirection:'row',gap:spacing.sm},flex:{flex:1},group:{gap:spacing.md},output:{...typography.bodyStrong,color:C.accent},met:{...typography.caption,color:C.good},missing:{...typography.caption,color:C.warning}});
