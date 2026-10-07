import {useMemo,useRef,useState} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState,GearSlot} from '../core/types';
import {availableEquipmentForSlot} from '../core/equipment-slot-picker';
import {EQUIPMENT_SLOT_LABELS} from '../core/equipment-screen';
import {enhancedGearStats,gearEnhancement} from '../core/equipment-enhancement';
import {profileError,profileText} from '../i18n/profile';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {GameModalSurface,GameModalHeader} from './GameModalSurface';
import {EquipmentArtwork} from './EquipmentArtwork';
import {GameButton} from './GameButton';

export function EquipmentSlotPicker({state,slot,onEquip,onClose}:{state:GameState;slot:GearSlot;onEquip:(itemId:string)=>Promise<void>|void;onClose:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),language=useGameLanguage(),{gt}=useGameplayText();
 const items=availableEquipmentForSlot(state,slot);
 const [busy,setBusy]=useState<string|null>(null),[error,setError]=useState(''),pending=useRef(false);
 const close=()=>{if(!pending.current)onClose()};
 async function equip(id:string){
  if(pending.current)return;
  pending.current=true;setBusy(id);setError('');
  try{await onEquip(id);onClose()}catch(cause){setError(profileError(language,cause,'Action failed. Please try again.'))}
  finally{pending.current=false;setBusy(null)}
 }
 return <GameModalSurface visible onClose={close} dismissOnBackdrop={!busy} reduceMotion={state.settings.reduceMotion}>
  <GameModalHeader eyebrow={profileText(language,'Available equipment')} title={profileText(language,EQUIPMENT_SLOT_LABELS[slot])} onClose={close} closeDisabled={!!busy}/>
  <ScrollView contentContainerStyle={s.body}>
   {items.length?items.map(item=>{const stats=enhancedGearStats(state,item.id),rank=gearEnhancement(state,item.id).rank;return <View key={item.id} style={s.item}>
    <View style={s.details}><EquipmentArtwork item={item} size={48} framed={false}/><View style={s.copy}>
     <Text style={s.name}>{item.name}{rank?` +${rank}`:''}</Text>
     <Text style={s.stats}>{profileText(language,'Attack')} {stats.attack} · {profileText(language,'Defense')} {stats.defense} · {profileText(language,'HP')} {stats.hp}</Text>
    </View></View>
    <GameButton compact title={gt('Equip')} loading={busy===item.id} disabled={!!busy} onPress={()=>void equip(item.id)}/>
   </View>}):<Text style={s.empty}>{profileText(language,'None available in Inventory.')}</Text>}
   {!!error&&<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
  </ScrollView>
 </GameModalSurface>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 body:{gap:spacing.sm,paddingVertical:spacing.md},item:{gap:spacing.sm,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel},
 details:{flexDirection:'row',alignItems:'center',gap:spacing.sm},copy:{flex:1,minWidth:0,gap:4},name:{...typography.bodyStrong,color:C.text},stats:{...typography.caption,color:C.muted},
 empty:{...typography.body,color:C.muted,paddingVertical:spacing.md,textAlign:'center'},error:{...typography.caption,color:C.bad},
});}
