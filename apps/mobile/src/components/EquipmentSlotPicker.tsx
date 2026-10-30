import {useMemo,useRef,useState} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState,GearSlot} from '../core/types';
import {availableEquipmentForSlot} from '../core/equipment-slot-picker';
import {EQUIPMENT_SLOT_LABELS} from '../core/equipment-screen';
import {enhancedGearStats,gearEnhancement} from '../core/equipment-enhancement';
import {displayStatPrecise} from '../core/stat-display';
import {profileError,profileText} from '../i18n/profile';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {GameModalSurface,GameModalHeader} from './GameModalSurface';
import {EquipmentArtwork} from './EquipmentArtwork';
import {GameButton} from './GameButton';
import {itemDef} from '../content/items';
import {effectiveOwnedGearRarity,equippedCraftedGearRarity} from '../core/crafted-gear-instances';
import {rarityMeta,rarityNameColor} from '../core/item-rarity';

export function EquipmentSlotPicker({state,slot,onEquip,onClose}:{state:GameState;slot:GearSlot;onEquip:(itemId:string)=>Promise<void>|void;onClose:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),language=useGameLanguage(),{gt}=useGameplayText();
 const items=availableEquipmentForSlot(state,slot);
 const equippedId=state.character?.equipment[slot],equipped=equippedId?itemDef(equippedId):undefined;
 const equippedStats=equippedId?enhancedGearStats(state,equippedId):{attack:0,defense:0,hp:0};
 const equippedRarity=equippedId?rarityMeta(equippedCraftedGearRarity(state,slot)??effectiveOwnedGearRarity(state,equippedId)):undefined;
 const [busy,setBusy]=useState<string|null>(null),[error,setError]=useState(''),pending=useRef(false);
 const close=()=>{if(!pending.current)onClose()};
 async function equip(id:string){
  if(pending.current)return;
  pending.current=true;setBusy(id);setError('');
  try{await onEquip(id);onClose()}catch(cause){setError(profileError(language,cause,'Action failed. Please try again.'))}
  finally{pending.current=false;setBusy(null)}
 }
 return <GameModalSurface visible onClose={close} dismissOnBackdrop={!busy} reduceMotion={state.settings.reduceMotion}>
  <GameModalHeader eyebrow={profileText(language,'Compare & Swap')} title={profileText(language,EQUIPMENT_SLOT_LABELS[slot])} onClose={close} closeDisabled={!!busy}/>
  <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <View style={s.item}><Text style={s.heading}>{profileText(language,'Currently equipped')}</Text><Text style={[s.name,equippedRarity&&{color:rarityNameColor(equippedRarity.id,C.dark,C.text)}]}>{equipped?.name??profileText(language,'Empty slot')}{equippedRarity?` · ${equippedRarity.label}`:''}</Text>{equipped?<Text style={s.stats}>{profileText(language,'Attack')} {displayStatPrecise(equippedStats.attack)} · {profileText(language,'Defense')} {displayStatPrecise(equippedStats.defense)} · {profileText(language,'HP')} {displayStatPrecise(equippedStats.hp)}</Text>:null}</View>
   {items.length?items.map(item=>{const stats=enhancedGearStats(state,item.id),rank=gearEnhancement(state,item.id).rank,rarity=rarityMeta(effectiveOwnedGearRarity(state,item.id));const delta=(value:number,current:number)=>`${value-current>=0?'+':''}${displayStatPrecise(value-current)}`;return <View key={item.id} style={[s.item,{borderColor:rarity.color}]}>
    <View style={s.details}><EquipmentArtwork item={item} size={48} framed={false}/><View style={s.copy}>
     <Text style={[s.name,{color:rarityNameColor(rarity.id,C.dark,C.text)}]}>{item.name}{rank?` +${rank}`:''} · {rarity.label}</Text>
     <Text style={s.stats}>{profileText(language,'Attack')} {displayStatPrecise(stats.attack)} · {profileText(language,'Defense')} {displayStatPrecise(stats.defense)} · {profileText(language,'HP')} {displayStatPrecise(stats.hp)}</Text>
     <Text style={s.compare}>{profileText(language,'Compared with equipped')}: ATK {delta(stats.attack,equippedStats.attack)} · DEF {delta(stats.defense,equippedStats.defense)} · HP {delta(stats.hp,equippedStats.hp)}</Text>
    </View></View>
    <GameButton compact title={gt('Equip')} loading={busy===item.id} disabled={!!busy} onPress={()=>equip(item.id)}/>
   </View>}):<Text style={s.empty}>{profileText(language,'None available in Inventory.')}</Text>}
   {!!error&&<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
  </ScrollView>
 </GameModalSurface>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 body:{gap:spacing.sm,paddingVertical:spacing.md},item:{gap:spacing.sm,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel},
 heading:{...typography.caption,color:C.accent,fontWeight:'900'},details:{flexDirection:'row',alignItems:'center',gap:spacing.sm},copy:{flex:1,minWidth:0,gap:4},name:{...typography.bodyStrong,color:C.text},stats:{...typography.caption,color:C.muted},compare:{...typography.caption,color:C.info,fontWeight:'800'},
 empty:{...typography.body,color:C.muted,paddingVertical:spacing.md,textAlign:'center'},error:{...typography.caption,color:C.bad},
});}
