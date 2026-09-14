import {Image,Platform,type ImageStyle} from 'react-native';
import {skillIcons,smallSkillIcons,type ActivityIconId} from '../theme/skill-assets';
export function ActivityArtwork({id,size=40}:{id:ActivityIconId;size?:number}){
 return <Image accessible={false} source={(size<=24?smallSkillIcons:skillIcons)[id] ?? skillIcons.cooking} resizeMode="contain" fadeDuration={0} style={[{width:size,height:size},Platform.OS==='web'?{imageRendering:'pixelated'} as ImageStyle:undefined]}/>;
}
