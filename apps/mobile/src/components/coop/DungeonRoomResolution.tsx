import {ActivityIndicator,StyleSheet,Text,View} from 'react-native';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {useSocialText} from '../../i18n/social';
import {type CoopColors,coopSpacing} from '../../theme/coop-ui-theme';
import {CoopImageSlot,FantasyPanel} from './CoopVisualKit';
import {dungeonRoomPresentation} from './dungeon-room-presentation';

/** Used only for non-combat resolution. Never launches the combat theater. */
export function DungeonRoomResolution({kind,reduceMotion=false}:{kind?:string;reduceMotion?:boolean}){
 const {colors,styles:s}=useCoopStyles(makeStyles),st=useSocialText();
 const room=dungeonRoomPresentation(kind);
 return <FantasyPanel variant="default">
  <View style={s.row}>
   {room?<CoopImageSlot assetId={room.art} size="thumbnail" accessibilityLabel={st(room.name)}/>:null}
   <View style={s.grow}>
    <Text style={s.kicker}>{st('Room in progress')}</Text>
    <Text style={s.title}>{room?st(room.name):st('Resolving the selected room')}</Text>
    {room?<Text style={s.description} numberOfLines={2}>{st(room.description)}</Text>:null}
   </View>
  </View>
  <View style={s.progress} accessibilityLiveRegion="polite">
   {!reduceMotion?<ActivityIndicator size="small" color={colors.cyan}/>:null}
   <Text style={s.progressText}>{st('Saving room progress')}</Text>
  </View>
 </FantasyPanel>;
}

const makeStyles=(C:CoopColors)=>StyleSheet.create({
 row:{flexDirection:'row',alignItems:'center',gap:coopSpacing.md},
 grow:{flex:1,minWidth:0,gap:4},
 kicker:{fontSize:10,lineHeight:14,color:C.gold,fontWeight:'800',letterSpacing:.7},
 title:{fontSize:17,lineHeight:23,color:C.text,fontWeight:'800'},
 description:{fontSize:12,lineHeight:18,color:C.textSecondary},
 progress:{minHeight:34,flexDirection:'row',gap:coopSpacing.sm,alignItems:'center',paddingTop:coopSpacing.xs,borderTopWidth:StyleSheet.hairlineWidth,borderColor:C.line},
 progressText:{fontSize:12,lineHeight:17,color:C.textMuted},
});
