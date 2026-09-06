import React,{useState} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import {GameState} from '../core/types';
import {resolveCharacterAppearance,noviceSetProgress} from '../core/character-appearance';
import {startingAppearance} from '../theme/character-assets';
import {classEmblems,firstCraftedAppearance} from '../theme/novice-assets';
import {C,spacing,typography} from '../theme/theme';
import {GameButton} from './GameButton';
import {resolveEquipmentLayers} from '../core/equipment-layers';
import {equipmentLayerRegistry,equipmentLayerSources} from '../theme/equipment-layer-assets';
import {CharacterAvatar} from './CustomizationControls';
import {DEFAULT_CUSTOMIZATION} from '../core/customization';

export function CharacterVisual({state,preview=false,compact=false,simulation=false}:{state:GameState;preview?:boolean;compact?:boolean;simulation?:boolean}){
  const [view,setView]=useState<'front'|'back'>('front');
  const [showCoverage,setShowCoverage]=useState(false);
  const character=state.character!,body=character.bodyPresentation??'male';
  const appearance=resolveCharacterAppearance(state),set=noviceSetProgress(state).set;
  const composition=resolveEquipmentLayers(state,equipmentLayerRegistry,view);
  const customization=character.customization??DEFAULT_CUSTOMIZATION;
  const visibleCustomization=composition.hidesHair?{...customization,hairStyle:'bald' as const}:customization;
  const layered=!preview&&composition.layers.length>0;
  const source=preview||appearance==='first-crafted'?firstCraftedAppearance[character.classId][body][view]:appearance==='starting'?startingAppearance[character.classId][body][view]:classEmblems[character.classId];
  const baseLabel=preview?`${set.name} · target preview`:layered?'Equipment appearance · layered':appearance==='first-crafted'?`${set.name} · equipped`:appearance==='starting'?'Starting outfit · equipped':'Mixed equipment · class emblem';
  const label=simulation?`Try-on only · ${baseLabel.replace('equipped','preview')}`:baseLabel;
  return <View style={s.frame}>
    <Text style={s.label}>{label}</Text>
    {layered?<View accessible accessibilityLabel={`${label}, ${body}, ${view} view`} style={compact?s.compact:s.portrait}><View style={StyleSheet.absoluteFillObject}><CharacterAvatar body={body} view={view} value={visibleCustomization} compact/></View>{composition.layers.map(layer=><Image key={layer.id} source={equipmentLayerSources[layer.source]} resizeMode="contain" style={StyleSheet.absoluteFillObject}/>)}</View>:<Image accessibilityLabel={`${label}, ${body}${appearance==='mixed'&&!preview?'':`, ${view} view`}`} source={source} resizeMode="contain" style={compact?s.compact:s.portrait}/>}
    {appearance==='mixed'&&!preview&&<Text style={s.note}>{layered?'Approved pieces are shown. Still missing: ':'Individual armor layers are missing: '}{composition.missing.join(' · ')}</Text>}
    {preview&&<Text style={s.note}>Craft and equip all required pieces to use this complete outfit. Crafting alone does not equip gear.</Text>}
    {!compact&&(preview||layered||appearance!=='mixed')&&<GameButton title={view==='front'?'View back':'View front'} tone="secondary" onPress={()=>setView(view==='front'?'back':'front')}/>}
    {!compact&&!preview&&<><GameButton title={showCoverage?'Hide layer coverage':'Show layer coverage'} tone="secondary" onPress={()=>setShowCoverage(!showCoverage)}/>{showCoverage&&<Text style={s.note}>{composition.layers.length} approved layer(s) shown · Missing: {composition.missing.join(' · ')||'none'}</Text>}</>}
  </View>;
}
const s=StyleSheet.create({frame:{backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:12,padding:spacing.md,gap:spacing.sm,alignItems:'center'},label:{...typography.bodyStrong,color:C.accent,textAlign:'center'},portrait:{width:240,height:300,maxWidth:'100%'},compact:{width:96,height:120},note:{...typography.caption,color:C.muted,textAlign:'center'}});
