import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {WorkingTowardDestination} from '../core/working-toward';
import {worldDestinationGuide} from '../core/world-destination-guide';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {ResourceArtwork} from './ResourceArtwork';
import {ActivityArtwork} from './ActivityArtwork';
import {GameButton} from './GameButton';

type Props={
 state:GameState;
 destination?:WorkingTowardDestination;
 busy?:boolean;
 onTravel:(regionId:string,autoStart?:boolean)=>void|Promise<void>;
 onCancel:()=>void;
};

/** Compact, persistent travel intent. All displayed targets come from validated content IDs. */
export function WorldDestinationGuide({state,destination,busy=false,onTravel,onCancel}:Props){
 const {gt,gl}=useGameplayText(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const goal=worldDestinationGuide(state,destination);
 if(!goal)return null;
 const title=gl(goal.targetName),region=gl(goal.regionName);
 return <View style={s.card}>
  <View style={s.header}>
   <Text style={s.eyebrow}>{gt('YOUR DESTINATION')}</Text>
   <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel={gt('Cancel destination')}
    style={({pressed})=>[s.cancel,pressed&&s.pressed]}><Text style={s.cancelText}>{gt('Cancel')}</Text></Pressable>
  </View>
  <View style={s.body}>
   <View style={s.art}>
    {goal.itemId?<ResourceArtwork itemId={goal.itemId} size={48}/>:<ActivityArtwork id="combat" size={44}/>}
   </View>
   <View style={s.copy}>
    <Text numberOfLines={2} style={s.name}>{title}</Text>
    <Text numberOfLines={2} style={s.region}>{(goal.skillId?gl(goal.skillId):gt('Combat'))+' · '+region}</Text>
    <Text style={[s.status,{color:goal.canTravel?C.good:C.warning}]}>{goal.canTravel?gt('Ready to travel'):gt('Region locked')}</Text>
   </View>
  </View>
  {goal.lockReason?<Text style={s.reason}>{goal.lockReason}</Text>:null}
  <View style={s.actions}>
   <View style={s.flex}><GameButton compact disabled={busy||!goal.canTravel} loading={busy}
    title={goal.canTravelAndStart?gt('Travel & Start'):gt('Travel to {region}',{region})}
    accessibilityLabel={goal.canTravelAndStart?gt('Travel to {region} and start {activity}',{region,activity:title}):gt('Travel to {region}',{region})}
    onPress={()=>onTravel(goal.regionId,goal.canTravelAndStart)}/></View>
   {goal.canTravelAndStart?<View style={s.flex}><GameButton compact tone="secondary" disabled={busy}
    title={gt('Travel only')} accessibilityLabel={gt('Travel to {region} without starting',{region})}
    onPress={()=>onTravel(goal.regionId,false)}/></View>:null}
  </View>
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 card:{borderWidth:1,borderColor:C.info,borderRadius:radii.md,backgroundColor:C.panel,padding:spacing.sm,gap:8},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:28,gap:8},
 eyebrow:{...typography.caption,fontWeight:'900',letterSpacing:.7,color:C.info},
 cancel:{minHeight:44,minWidth:56,justifyContent:'center',alignItems:'flex-end',paddingHorizontal:8},
 cancelText:{...typography.caption,fontWeight:'800',color:C.muted},
 body:{flexDirection:'row',alignItems:'center',gap:10},
 art:{width:52,height:52,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,backgroundColor:C.infoSurface},
 copy:{flex:1,minWidth:0,gap:3},
 name:{...typography.bodyStrong,color:C.text},
 region:{...typography.caption,color:C.muted},
 status:{...typography.caption,fontWeight:'800'},
 reason:{...typography.caption,color:C.warning},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:8},
 flex:{flex:1,minWidth:112},
 pressed:{opacity:.65},
});}
