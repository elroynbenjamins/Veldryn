import {GameTextInput as TextInput} from './GameTextInput';
import {useMemo,useState} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {Panel} from './Panel';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function SaveTransferPanel({onExport,onImport,reduceMotion=false}:{onExport:()=>Promise<void>;onImport:(raw:string)=>Promise<void>;reduceMotion?:boolean}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const [visible,setVisible]=useState(false),[raw,setRaw]=useState(''),[busy,setBusy]=useState(false),[exportBusy,setExportBusy]=useState(false),[error,setError]=useState('');
  const exportSave=async()=>{if(exportBusy)return;setExportBusy(true);try{await onExport()}finally{setExportBusy(false)}};
  const importSave=async()=>{if(busy)return;setBusy(true);setError('');try{await onImport(raw);setRaw('');setVisible(false)}catch(value){setError(value instanceof Error?value.message:'The save could not be imported.')}finally{setBusy(false)}};
  const close=()=>{if(!busy)setVisible(false)};
  return <Panel>
    <Text style={s.title}>Save backup</Text>
    <Text style={s.body}>Export a versioned JSON backup through your phone's share sheet, or paste one back into VELDRYN.</Text>
    <View style={s.actions}><View style={s.flex}><GameButton title="Export save" tone="secondary" loading={exportBusy} disabled={busy} onPress={()=>void exportSave()}/></View><View style={s.flex}><GameButton title="Import save…" tone="secondary" disabled={busy||exportBusy} onPress={()=>{setError('');setVisible(true)}}/></View></View>
    <GameModalSurface visible={visible} presentation="dialog" reduceMotion={reduceMotion} onClose={close} backdropLabel="Cancel save import">
      <GameModalHeader eyebrow="SAVE BACKUP" title="Import save backup" onClose={close} closeDisabled={busy}/>
      <Text style={s.body}>Paste the complete JSON backup. It is validated and migrated before replacing the current local save.</Text>
      <ScrollView keyboardShouldPersistTaps="handled" style={s.scroll}><TextInput accessibilityLabel="VELDRYN save backup JSON" value={raw} onChangeText={setRaw} multiline autoCapitalize="none" autoCorrect={false} placeholder="Paste backup JSON here" style={s.input}/></ScrollView>
      {!!error&&<Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
      <View style={s.actions}><View style={s.flex}><GameButton title="Cancel" tone="secondary" disabled={busy} onPress={close}/></View><View style={s.flex}><GameButton title="Validate & import" loading={busy} disabled={!raw.trim()} onPress={()=>void importSave()}/></View></View>
    </GameModalSurface>
  </Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({title:{...typography.title,color:C.text},body:{...typography.body,color:C.muted},scroll:{maxHeight:360},input:{minHeight:190,textAlignVertical:'top',padding:spacing.md},error:{...typography.bodyStrong,color:C.bad,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:8,backgroundColor:C.badSurface},actions:{flexDirection:'row',gap:spacing.sm},flex:{flex:1,minWidth:0}});}
