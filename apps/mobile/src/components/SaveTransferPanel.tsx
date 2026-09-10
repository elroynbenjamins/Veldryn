import {useState} from 'react';
import {Modal,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {C,spacing,typography} from '../theme/theme';

export function SaveTransferPanel({onExport,onImport,reduceMotion=false}:{onExport:()=>Promise<void>;onImport:(raw:string)=>Promise<void>;reduceMotion?:boolean}){
  const [visible,setVisible]=useState(false),[raw,setRaw]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const importSave=async()=>{setBusy(true);setError('');try{await onImport(raw);setRaw('');setVisible(false)}catch(value){setError(value instanceof Error?value.message:'The save could not be imported.')}finally{setBusy(false)}};
  return <Panel>
    <Text style={s.title}>Save backup</Text>
    <Text style={s.body}>Export a versioned JSON backup through your phone's share sheet, or paste one back into VELDRYN.</Text>
    <GameButton title="Export save" tone="secondary" onPress={()=>void onExport()}/>
    <GameButton title="Import save…" tone="secondary" onPress={()=>{setError('');setVisible(true)}}/>
    <Modal visible={visible} transparent animationType={reduceMotion?'none':'fade'} onRequestClose={()=>!busy&&setVisible(false)}>
      <View style={s.scrim}><View style={s.dialog}>
        <Text style={s.title}>Import save backup</Text>
        <Text style={s.body}>Paste the complete JSON backup. It is validated and migrated before replacing the current local save.</Text>
        <ScrollView keyboardShouldPersistTaps="handled"><TextInput accessibilityLabel="VELDRYN save backup JSON" value={raw} onChangeText={setRaw} multiline autoCapitalize="none" autoCorrect={false} placeholder="Paste backup JSON here" placeholderTextColor={C.muted} style={s.input}/></ScrollView>
        {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <View style={s.actions}><View style={s.flex}><GameButton title="Cancel" tone="secondary" disabled={busy} onPress={()=>setVisible(false)}/></View><View style={s.flex}><GameButton title={busy?'Importing…':'Validate & import'} disabled={busy||!raw.trim()} onPress={()=>void importSave()}/></View></View>
      </View></View>
    </Modal>
  </Panel>;
}

const s=StyleSheet.create({title:{...typography.title,color:C.text},body:{...typography.body,color:C.muted},scrim:{flex:1,justifyContent:'center',padding:spacing.lg,backgroundColor:'rgba(0,0,0,.75)'},dialog:{maxHeight:'90%',gap:spacing.md,padding:spacing.lg,borderWidth:1,borderColor:C.accent,borderRadius:12,backgroundColor:C.panel},input:{minHeight:190,maxHeight:360,textAlignVertical:'top',padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.bg,color:C.text,fontSize:14},error:{...typography.bodyStrong,color:C.bad},actions:{flexDirection:'row',gap:spacing.sm},flex:{flex:1}});
