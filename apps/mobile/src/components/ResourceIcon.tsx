import {Text,View} from 'react-native';
import {ItemArtwork} from './ItemArtwork';
import {GoldIcon} from './GoldIcon';
import {useGameTheme} from '../theme/ThemeContext';

/** Stable resource IDs, never translated labels. Names remain beside these decorative icons. */
export function ResourceIcon({resourceId,size=22}:{resourceId:string;size?:number}){
 const C=useGameTheme();
 if(resourceId==='gold')return <GoldIcon size={size}/>;
 const currency=resourceId==='essence'||resourceId==='bondstones'||resourceId==='guild_marks';
 return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:size,height:size,flexShrink:0,alignItems:'center',justifyContent:'center'}}>
  {currency?<View style={{width:size-2,height:size-2,borderRadius:5,backgroundColor:C.panel2,borderWidth:1,borderColor:C.info,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:size*.64,lineHeight:size-1,fontWeight:'600',color:C.info}}>{resourceId==='guild_marks'?'M':resourceId==='essence'?'✦':'◆'}</Text></View>:<ItemArtwork itemId={resourceId} size={size}/>}
 </View>;
}
