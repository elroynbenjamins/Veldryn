import {Pressable,StyleSheet,Text,View} from 'react-native';
import {ownedUltraLuxeNamePresets,ultraLuxeNamePresetStyle,type UltraLuxeNamePresetId} from '../../core/ultra-luxe-prestige';
import {PlayerStyledName} from '../PlayerStyledName';
import {useGameTheme} from '../../theme/ThemeContext';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import {profileT} from '../../i18n/profile';

/** Mount only with verified server grant IDs and a dedicated preset-ID save handler.
 * This picker intentionally never calls the ordinary Supporter gradient writer. */
export function UltraLuxeNameStylePicker({verifiedOwnedIds,selectedId,previewName,active=true,reduceMotion=false,saving=false,onSelect}:{
 verifiedOwnedIds:readonly string[];selectedId?:string|null;previewName:string;active?:boolean;reduceMotion?:boolean;saving?:boolean;
 onSelect:(id:UltraLuxeNamePresetId|null)=>void;
}){
 const C=useGameTheme(),language=useGameLanguage(),presets=ownedUltraLuxeNamePresets(verifiedOwnedIds);
 if(!presets.length)return null;
 return <View style={s.root}>
  <Text style={[s.heading,{color:C.text}]}>{profileT(language,'Ascendant name styles')}</Text>
  {presets.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel={p.name} accessibilityState={{selected:selectedId===p.id,disabled:saving}} disabled={saving} onPress={()=>onSelect(p.id)} style={({pressed})=>[s.row,{borderColor:selectedId===p.id?C.accent:C.line,backgroundColor:C.panel},pressed&&s.pressed]}>
   <View style={s.copy}><Text numberOfLines={1} style={[s.label,{color:C.text}]}>{p.name}</Text><PlayerStyledName name={previewName} nameStyle={ultraLuxeNamePresetStyle(p.id)} reduceMotion={reduceMotion||!active} style={s.preview}/></View>
   {selectedId===p.id?<Text style={{color:C.accent,fontSize:11,fontWeight:'800'}}>✓</Text>:null}
  </Pressable>)}
  {selectedId&&presets.some(p=>p.id===selectedId)?<Pressable accessibilityRole="button" disabled={saving} onPress={()=>onSelect(null)} style={s.clear}><Text style={{color:C.muted,fontSize:12}}>{profileT(language,'Restore standard name style')}</Text></Pressable>:null}
 </View>;
}
const s=StyleSheet.create({root:{gap:6},heading:{fontSize:13,fontWeight:'800'},row:{flexDirection:'row',alignItems:'center',padding:9,borderWidth:1,borderRadius:8,minHeight:44},copy:{flex:1,minWidth:0,gap:3},label:{fontSize:10,fontWeight:'700'},preview:{fontSize:16,fontWeight:'800'},pressed:{opacity:.75},clear:{minHeight:44,justifyContent:'center',alignItems:'center'}});
