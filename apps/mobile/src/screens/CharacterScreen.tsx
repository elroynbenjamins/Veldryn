import React,{useState} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameState,GearSlot} from '../core/types';
import {CLASSES} from '../content/classes';
import {itemDef} from '../content/items';
import {effectiveStats,regionalReadiness,equipNoviceSet} from '../core/game';
import {noviceSetProgress} from '../core/character-appearance';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {StatBar} from '../components/StatBar';
import {CharacterVisual,FixedCharacterPortrait} from '../components/CharacterVisual';
import {ConfirmModal} from '../components/ConfirmModal';
import {C,spacing,typography} from '../theme/theme';
import {itemRarity,rarityMeta} from '../core/item-rarity';
import {characterSkinCollection} from '../core/character-skins';
import {ot} from '../i18n';

const slots:GearSlot[]=['weapon','offhand','helmet','chest','legs','boots','gloves','cape','amulet','ring'];
export function CharacterScreen({state,onUnequip,onEquipSet,onCrafting,onSelectSkin}:{state:GameState;onUnequip:(slot:GearSlot)=>void;onEquipSet:()=>void;onCrafting:()=>void;onSelectSkin:(skinId:string)=>void}){
  const [confirming,setConfirming]=useState(false),[error,setError]=useState('');
  const character=state.character!,classDef=CLASSES.find(item=>item.id===character.classId)!;
  const stats=effectiveStats(state),readiness=regionalReadiness(state),progress=noviceSetProgress(state),skins=characterSkinCollection(state);
  let equipError='';try{equipNoviceSet(state)}catch(e){equipError=e instanceof Error?e.message:'Cannot equip set'}
  const fullSet=progress.pieces.every(piece=>piece.equipped);
  return <><ScrollView contentContainerStyle={s.root}>
    <Text style={s.h}>{character.name}</Text><Text style={s.role}>{classDef.name} · {classDef.role} · {character.bodyPresentation??'male'}</Text>
    <Panel><View style={s.appearanceHeader}><FixedCharacterPortrait classId={character.classId} body={character.bodyPresentation??'male'} compact/><View style={s.appearanceCopy}><Text style={s.title}>Character presentation</Text><Text style={s.sub}>{character.bodyPresentation==='female'?'Female':'Male'} presentation · {classDef.name}.</Text><Text style={s.sub}>Choose a permanently unlocked full-set skin. Equipment remains independent.</Text></View></View></Panel>
    <CharacterVisual state={state}/>
    <Panel><Text style={s.title}>{ot(state.settings.language,'skin.collection')}</Text><Text style={s.sub}>{ot(state.settings.language,'skin.description')}</Text>
      <View style={s.skinChoice}><View style={s.skinCopy}><Text style={s.title}>{ot(state.settings.language,'skin.starting')}</Text><Text style={character.selectedSkinId==='starting'?s.skinSelected:s.skinUnlocked}>{ot(state.settings.language,character.selectedSkinId==='starting'?'skin.current':'skin.unlocked')}</Text></View><GameButton title={ot(state.settings.language,character.selectedSkinId==='starting'?'skin.selected':'skin.use')} disabled={character.selectedSkinId==='starting'} tone="secondary" onPress={()=>onSelectSkin('starting')}/></View>
      {skins.map(skin=><View key={skin.id} style={s.skinChoice}><View style={s.skinCopy}><Text style={s.title}>{skin.name}</Text><Text style={skin.selected?s.skinSelected:skin.unlocked?s.skinUnlocked:s.sub}>{skin.selected?ot(state.settings.language,'skin.current'):skin.unlocked?ot(state.settings.language,skin.artworkReady?'skin.unlocked':'skin.pending'):`${skin.ownedPieces}/${skin.requiredItemIds.length} pieces currently owned`}</Text></View>{skin.unlocked&&skin.artworkReady?<GameButton title={ot(state.settings.language,skin.selected?'skin.selected':'skin.use')} disabled={skin.selected} tone="secondary" onPress={()=>onSelectSkin(skin.id)}/>:null}</View>)}
      {!skins.length&&<Text style={s.sub}>{ot(state.settings.language,'skin.none')}</Text>}
    </Panel>
    <Panel><Text style={s.title}>{progress.set.name}</Text><StatBar label="Novice pieces equipped" current={progress.equipped} max={progress.pieces.length}/><Text style={s.sub}>Crafted {progress.crafted}/{progress.pieces.length} · {progress.unlocked?'Full-set crafting milestone complete':'Craft your first set in Skills → Novice set'}</Text><Text style={s.setBonus}>◆ {progress.set.setBonus.name} · {progress.set.setBonus.description}</Text>
      <GameButton title={fullSet?'Full novice set equipped':'Equip owned novice set'} disabled={!!equipError||fullSet} onPress={()=>setConfirming(true)}/>
      {!!equipError&&<Text style={s.sub}>{equipError}</Text>}{!!error&&<Text accessibilityRole="alert" style={s.sub}>{error}</Text>}
      <GameButton title="Craft / preview novice set" tone="secondary" onPress={onCrafting}/>
    </Panel>
    <Panel><Text style={s.title}>Combat overview</Text><StatBar label="Health" current={character.currentHp} max={stats.hp}/><Text style={s.role}>Attack {stats.attack} · Defense {stats.defense} · Power {stats.power}</Text></Panel>
    <Panel><Text style={s.title}>Fallen Knight readiness</Text><StatBar label="Preparation" current={readiness.total} max={100}/><Text style={s.sub}>Equipment {readiness.equipment} · Food {readiness.food} · Mastery {readiness.mastery} · Quests {readiness.quest} · Level {readiness.level}</Text></Panel>
    <Panel><Text style={s.title}>Equipment</Text>{slots.map(slot=>{const id=character.equipment[slot],item=id?itemDef(id):undefined,meta=item?rarityMeta(itemRarity(item)):undefined;return <View key={slot} style={[s.slot,meta&&{borderColor:meta.color,borderWidth:meta.borderWidth,backgroundColor:meta.surface,shadowColor:meta.color,shadowOpacity:meta.glowOpacity,shadowRadius:6,shadowOffset:{width:0,height:0}}]}><View style={s.slotHead}><View style={s.slotCopy}><Text style={s.slotLabel}>{slot.toUpperCase()}</Text><Text style={s.title}>{item?.name||'Empty'}</Text></View>{meta&&<View style={[s.rarityBadge,{borderColor:meta.color}]}><Text style={[s.rarityText,{color:meta.color}]}>{meta.symbol} {meta.label.toUpperCase()}</Text></View>}</View>{item&&<Text style={s.sub}>ATK {item.attack||0} · DEF {item.defense||0} · HP {item.hp||0}</Text>}{id&&<GameButton title="Unequip" tone="secondary" onPress={()=>onUnequip(slot)}/>}</View>})}</Panel>
  </ScrollView><ConfirmModal visible={confirming} title={`Equip ${progress.set.name}?`} message="Uses pieces you own in Inventory or Bank. Replaced gear, including any separate cape or incompatible offhand, returns to storage. This may replace stronger items; compare stats first." confirmLabel="Equip set" onCancel={()=>setConfirming(false)} onConfirm={()=>{try{onEquipSet();setError('')}catch(e){setError(e instanceof Error?e.message:'Cannot equip set')}setConfirming(false)}}/></>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},h:{...typography.hero,color:C.text},role:{...typography.bodyStrong,color:C.accent},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},setBonus:{...typography.bodyStrong,color:C.accent},slot:{borderWidth:1,borderColor:C.line,borderRadius:10,padding:spacing.sm,gap:spacing.sm,backgroundColor:'rgba(8,14,22,.28)'},slotHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm},slotCopy:{flex:1},slotLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:1},rarityBadge:{borderWidth:1,borderRadius:99,paddingHorizontal:spacing.sm,paddingVertical:2},rarityText:{fontSize:10,fontWeight:'900'},appearanceHeader:{flexDirection:'row',alignItems:'center',gap:spacing.md},appearanceCopy:{flex:1,gap:spacing.xs},actions:{flexDirection:'row',gap:spacing.sm},flex:{flex:1},skinChoice:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm,borderBottomWidth:1,borderColor:C.line},skinCopy:{flex:1},skinUnlocked:{...typography.bodyStrong,color:'#7de7a8'},skinSelected:{...typography.bodyStrong,color:C.accent}});
