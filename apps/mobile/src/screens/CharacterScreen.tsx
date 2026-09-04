import React,{useState} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameState,GearSlot} from '../core/types';
import {CLASSES} from '../content/classes';
import {itemDef} from '../content/items';
import {effectiveStats,regionalReadiness,equipNoviceSet} from '../core/game';
import {noviceSetProgress,resolveCharacterAppearance} from '../core/character-appearance';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {StatBar} from '../components/StatBar';
import {CharacterVisual} from '../components/CharacterVisual';
import {ConfirmModal} from '../components/ConfirmModal';
import {CharacterAvatar,CustomizationControls,CustomizationSummary} from '../components/CustomizationControls';
import {CharacterCustomization,DEFAULT_CUSTOMIZATION} from '../core/customization';
import {C,spacing,typography} from '../theme/theme';

const slots:GearSlot[]=['weapon','offhand','helmet','chest','legs','boots','gloves','cape','amulet','ring'];
export function CharacterScreen({state,onUnequip,onEquipSet,onCrafting,onCustomize}:{state:GameState;onUnequip:(slot:GearSlot)=>void;onEquipSet:()=>void;onCrafting:()=>void;onCustomize:(value:CharacterCustomization)=>void}){
  const [confirming,setConfirming]=useState(false),[error,setError]=useState('');
  const character=state.character!,classDef=CLASSES.find(item=>item.id===character.classId)!;
  const saved=character.customization??DEFAULT_CUSTOMIZATION;
  const [editing,setEditing]=useState(false),[draft,setDraft]=useState<CharacterCustomization>({...saved}),[appearanceView,setAppearanceView]=useState<'front'|'back'>('front');
  const stats=effectiveStats(state),readiness=regionalReadiness(state),progress=noviceSetProgress(state);
  let equipError='';try{equipNoviceSet(state)}catch(e){equipError=e instanceof Error?e.message:'Cannot equip set'}
  const fullSet=resolveCharacterAppearance(state)==='first-crafted';
  return <><ScrollView contentContainerStyle={s.root}>
    <Text style={s.h}>{character.name}</Text><Text style={s.role}>{classDef.name} · {classDef.role} · {character.bodyPresentation??'male'}</Text>
    <Panel><View style={s.appearanceHeader}><CharacterAvatar body={character.bodyPresentation??'male'} view={appearanceView} value={editing?draft:saved} compact/><View style={s.appearanceCopy}><Text style={s.title}>Identity appearance</Text><CustomizationSummary value={editing?draft:saved}/><Text style={s.sub}>Cosmetic only · shared across class outfits</Text></View></View>
      <View style={s.actions}><View style={s.flex}><GameButton title={appearanceView==='front'?'View back':'View front'} tone="secondary" onPress={()=>setAppearanceView(appearanceView==='front'?'back':'front')}/></View><View style={s.flex}><GameButton title={editing?'Cancel editing':'Edit appearance'} tone="secondary" onPress={()=>{if(editing)setDraft({...saved});setEditing(!editing)}}/></View></View>
      {editing&&<><CustomizationControls body={character.bodyPresentation??'male'} view={appearanceView} value={draft} onChange={setDraft}/><GameButton title="Save appearance" onPress={()=>{onCustomize(draft);setEditing(false)}}/></>}
    </Panel>
    <CharacterVisual state={state}/>
    <Panel><Text style={s.title}>{progress.set.name}</Text><StatBar label="Novice pieces equipped" current={progress.equipped} max={progress.pieces.length}/><Text style={s.sub}>Crafted {progress.crafted}/{progress.pieces.length} · {progress.unlocked?'Full-set crafting milestone complete':'Craft your first set in Skills → Novice set'}</Text>
      <GameButton title={fullSet?'Full novice set equipped':'Equip owned novice set'} disabled={!!equipError||fullSet} onPress={()=>setConfirming(true)}/>
      {!!equipError&&<Text style={s.sub}>{equipError}</Text>}{!!error&&<Text accessibilityRole="alert" style={s.sub}>{error}</Text>}
      <GameButton title="Craft / preview novice set" tone="secondary" onPress={onCrafting}/>
    </Panel>
    <Panel><Text style={s.title}>Combat overview</Text><StatBar label="Health" current={character.currentHp} max={stats.hp}/><Text style={s.role}>Attack {stats.attack} · Defense {stats.defense} · Power {stats.power}</Text></Panel>
    <Panel><Text style={s.title}>Fallen Knight readiness</Text><StatBar label="Preparation" current={readiness.total} max={100}/><Text style={s.sub}>Equipment {readiness.equipment} · Food {readiness.food} · Mastery {readiness.mastery} · Quests {readiness.quest} · Level {readiness.level}</Text></Panel>
    <Panel><Text style={s.title}>Equipment</Text>{slots.map(slot=>{const id=character.equipment[slot],item=id?itemDef(id):undefined;return <View key={slot} style={s.slot}><Text style={s.sub}>{slot.toUpperCase()}</Text><Text style={s.title}>{item?.name||'Empty'}</Text>{item&&<Text style={s.sub}>ATK {item.attack||0} · DEF {item.defense||0} · HP {item.hp||0}</Text>}{id&&<GameButton title="Unequip" tone="secondary" onPress={()=>onUnequip(slot)}/>}</View>})}</Panel>
  </ScrollView><ConfirmModal visible={confirming} title={`Equip ${progress.set.name}?`} message="Uses pieces you own in Inventory or Bank. Replaced gear, including any separate cape or incompatible offhand, returns to storage. This may replace stronger items; compare stats first." confirmLabel="Equip set" onCancel={()=>setConfirming(false)} onConfirm={()=>{try{onEquipSet();setError('')}catch(e){setError(e instanceof Error?e.message:'Cannot equip set')}setConfirming(false)}}/></>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},h:{...typography.hero,color:C.text},role:{...typography.bodyStrong,color:C.accent},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},slot:{borderBottomWidth:1,borderColor:C.line,paddingVertical:spacing.sm,gap:spacing.sm},appearanceHeader:{flexDirection:'row',alignItems:'center',gap:spacing.md},appearanceCopy:{flex:1,gap:spacing.xs},actions:{flexDirection:'row',gap:spacing.sm},flex:{flex:1}});
