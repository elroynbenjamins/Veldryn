import {seasonalDungeonArtwork} from '../../theme/dungeon-preparation-art';
import {View,Text,Image} from 'react-native';
import type {SeasonalEventExpeditionIdentity} from '../../core/coop-event-expeditions';
import {liveEventDef} from '../../content/live-events';
import {liveEventVisuals} from '../../ui/live-event-visuals-active';
import {useGameTheme} from '../../theme/ThemeContext';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import {dungeonText as accountText} from '../../i18n/dungeon-preparation';
import {GameButton} from '../GameButton';
import {DungeonDisclosure,DungeonHero,DungeonReward} from './DungeonPreparation';
export function EventDungeonEntry({expedition,eventId,onOpen}:{expedition:SeasonalEventExpeditionIdentity;eventId:string;onOpen:()=>void}){
 const C=useGameTheme(),language=useGameLanguage(),a=(text:string)=>accountText(language,text),definition=liveEventDef(eventId),visuals=liveEventVisuals(definition?.visualKey);
 return <View style={{gap:12,padding:14,borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:C.panel}}><View style={{flexDirection:'row',gap:10,alignItems:'center'}}>{visuals.badgeIcon?<Image source={visuals.badgeIcon} style={{width:36,height:36}}/>:null}<View style={{flex:1,gap:4}}><Text style={{fontSize:10,letterSpacing:1.2,color:C.special}}>{a('SEASONAL EXPEDITION')}</Text><Text style={{fontSize:20,fontWeight:'600',color:C.text}}>{expedition.name}</Text></View></View><DungeonHero source={seasonalDungeonArtwork(expedition.expeditionId,visuals.heroBackground)} label={a('Level')+' '+expedition.minLevel+'+'} description={expedition.description}/><DungeonReward source={visuals.commonCurrencyIcon} title={expedition.rewardMarks+' '+(definition?.currencyName??a('event currency'))} detail={a('Base completion reward')}/><DungeonDisclosure title={a('Route & encounters')}>{expedition.routeHighlights.map((name,index)=><Text key={name} style={{fontSize:13,color:C.text}}>{index+1}. {name}</Text>)}<Text style={{fontSize:13,color:C.muted}}>{a('Final boss')} · {expedition.finalBoss}</Text></DungeonDisclosure><GameButton title={a('View expedition')} onPress={onOpen}/></View>;
}
