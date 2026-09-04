import React from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import {GameState,GearSlot} from '../core/types';
import {NOVICE_RECIPES,NOVICE_STAGE} from '../content/novice-sets';
import {itemDef} from '../content/items';
import {noviceSetProgress} from '../core/character-appearance';
import {recipeAvailability} from '../core/playability';
import {firstCraftedAppearance} from '../theme/novice-assets';
import {CharacterVisual} from './CharacterVisual';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {StatBar} from './StatBar';
import {C,radii,spacing,typography} from '../theme/theme';

const slotGlyph:Partial<Record<GearSlot,string>>={helmet:'◒',chest:'◆',gloves:'✦',legs:'▥',boots:'▰',weapon:'⚔',offhand:'◈'};
export function NoviceWorkshop({state,onCraft,onCharacter}:{state:GameState;onCraft:(id:string)=>void;onCharacter:()=>void}){
  const progress=noviceSetProgress(state),character=state.character!,body=character.bodyPresentation??'male';
  const recipes=NOVICE_RECIPES.filter(recipe=>recipe.classId===character.classId);
  const next=recipes.find(recipe=>!progress.pieces.find(piece=>piece.id===recipe.output.itemId)?.owned);
  const nextStage=next?NOVICE_STAGE[itemDef(next.output.itemId).slot!]:undefined;
  const totals=new Map<string,number>();for(const recipe of recipes)for(const input of recipe.inputs)totals.set(input.itemId,(totals.get(input.itemId)??0)+input.quantity);
  return <View style={s.root}>
    <View style={[s.hero,{borderColor:progress.set.theme.accent}]}><View style={s.heroCopy}><Text style={s.eyebrow}>FIRST CRAFTED UPGRADE</Text><Text style={s.heroName}>{progress.set.name}</Text><Text style={[s.identity,{color:progress.set.theme.accent}]}>{progress.set.theme.identity}</Text><Text style={s.sub}>{progress.set.theme.material}</Text></View><Image accessibilityLabel={`${progress.set.name} full set reference`} source={firstCraftedAppearance[character.classId][body].front} resizeMode="contain" style={s.heroImage}/></View>
    <CharacterVisual state={state} preview/>
    <Panel><View style={s.between}><Text style={s.title}>Crafting path</Text><Text style={s.counter}>{progress.crafted}/{progress.pieces.length}</Text></View><StatBar label="Pieces crafted" current={progress.crafted} max={progress.pieces.length}/><Text style={s.sub}>{progress.unlocked?'Set complete — equip it on Character to activate the class outfit.':next?`Recommended next: ${itemDef(next.output.itemId).name}`:'All pieces acquired.'}</Text><View style={s.stageRow}>{[1,2,3,4].map(stage=><View key={stage} style={[s.stage,nextStage===stage&&s.stageNext]}><Text style={s.stageNumber}>{stage}</Text><Text style={s.stageText}>{stage===1?'CORE':stage===2?'ARM':stage===3?'GUARD':'FINISH'}</Text></View>)}</View><GameButton title="Open character & equip set" tone="secondary" onPress={onCharacter}/></Panel>
    <Panel><Text style={s.title}>Full-set materials</Text><Text style={s.sub}>Plan the entire set. Crafting spends from Inventory first, then Bank.</Text>{[...totals].map(([id,total])=><View key={id} style={s.material}><Text style={s.pieceName}>{itemDef(id).name}</Text><Text style={s.materialCount}>{total} total</Text></View>)}</Panel>
    {recipes.map(recipe=>{
      const status=recipeAvailability(state,recipe.id),piece=progress.pieces.find(piece=>piece.id===recipe.output.itemId)!,item=itemDef(piece.id),stage=NOVICE_STAGE[piece.slot]??4;
      const stateLabel=piece.equipped?'EQUIPPED':piece.owned?'OWNED':piece.crafted?'RECRAFT':'LOCKED';
      return <View key={recipe.id} style={[s.pieceCard,piece.equipped&&{borderColor:progress.set.theme.accent}]}><View style={[s.slotIcon,{borderColor:progress.set.theme.accent}]}><Text style={[s.glyph,{color:progress.set.theme.accent}]}>{slotGlyph[piece.slot]??'◆'}</Text><Text style={s.slotLabel}>{piece.slot.toUpperCase()}</Text></View><View style={s.pieceCopy}><View style={s.between}><Text style={s.pieceName}>{item.name}</Text><Text style={[s.status,piece.equipped&&{color:progress.set.theme.accent}]}>{stateLabel}</Text></View><Text style={s.stats}>ATK {item.attack??0} · DEF {item.defense??0} · HP {item.hp??0}</Text><Text style={s.sub}>Stage {stage} · Character Lv {recipe.characterLevel} · {recipe.gold} gold · +{recipe.xp} Smithing XP</Text>{status.inputs.map(input=><Text key={input.itemId} style={[s.requirement,input.inventory+input.bank<input.quantity&&s.missing]}>{itemDef(input.itemId).name} {input.inventory+input.bank}/{input.quantity}</Text>)}{!piece.owned&&<Text style={s.reason}>{status.reason}</Text>}<GameButton disabled={piece.owned||!status.ready} title={piece.owned?'Piece owned':status.ready?`Craft ${item.name}`:'Requirements missing'} onPress={()=>onCraft(recipe.id)}/></View></View>;
    })}
  </View>;
}
const s=StyleSheet.create({root:{gap:spacing.md},hero:{minHeight:210,flexDirection:'row',overflow:'hidden',backgroundColor:'#111c29',borderWidth:1,borderRadius:radii.lg,padding:spacing.md},heroCopy:{flex:1,gap:spacing.xs,justifyContent:'center'},heroImage:{width:130,height:190},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},heroName:{...typography.hero,color:C.text},identity:{...typography.bodyStrong},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},between:{flexDirection:'row',justifyContent:'space-between',gap:spacing.sm,alignItems:'center'},counter:{...typography.title,color:C.accent},stageRow:{flexDirection:'row',gap:spacing.xs},stage:{flex:1,alignItems:'center',paddingVertical:spacing.sm,borderRadius:radii.sm,backgroundColor:C.bg,borderWidth:1,borderColor:C.line},stageNext:{borderColor:C.accent,backgroundColor:C.panel2},stageNumber:{...typography.bodyStrong,color:C.text},stageText:{fontSize:9,color:C.muted,fontWeight:'900'},material:{flexDirection:'row',justifyContent:'space-between',paddingVertical:spacing.xs,borderBottomWidth:1,borderColor:C.line},materialCount:{...typography.bodyStrong,color:C.accent},pieceCard:{flexDirection:'row',gap:spacing.md,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,padding:spacing.md},slotIcon:{width:62,height:70,borderWidth:1,borderRadius:radii.md,alignItems:'center',justifyContent:'center',backgroundColor:C.bg},glyph:{fontSize:27},slotLabel:{fontSize:9,color:C.muted,fontWeight:'900'},pieceCopy:{flex:1,gap:spacing.xs},pieceName:{...typography.bodyStrong,color:C.text,flexShrink:1},status:{...typography.caption,color:C.muted,fontWeight:'900'},stats:{...typography.bodyStrong,color:C.accent},requirement:{...typography.caption,color:C.good},missing:{color:C.bad},reason:{...typography.caption,color:C.warning}});
