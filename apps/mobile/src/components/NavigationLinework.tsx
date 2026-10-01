import {View} from 'react-native';

type Line=readonly [number,number,number,number];
type Box=readonly [number,number,number,number,number?];
type Symbol={lines?:readonly Line[];boxes?:readonly Box[]};
/** 24-unit outline grid; no bitmap tinting or platform-specific SVG dependency. */
export const navigationLinework={
 training:{lines:[[4,19,4,7],[4,7,20,7],[20,7,20,19],[4,19,20,19],[8,7,8,4],[16,7,16,4]],boxes:[[7,10,10,5,1]]},
 sanctuary:{boxes:[[4,7,16,13,3]],lines:[[4,7,8,3],[16,7,12,3],[8,3,12,7],[12,3,16,7],[12,13,12,20],[9,16,15,16]]},
 trials:{lines:[[12,3,20,8],[20,8,17,19],[17,19,7,19],[7,19,4,8],[4,8,12,3],[9,10,12,13],[12,13,15,10]],boxes:[[10,6,4,4,2]]},
 expedition:{lines:[[4,18,20,6],[4,18,7,4],[7,4,20,6],[20,6,16,20],[16,20,4,18],[8,14,16,10]],boxes:[[10,10,4,4,2]]},
 guild:{lines:[[5,21,5,3],[5,4,19,4],[19,4,16,9],[16,9,19,14],[19,14,5,14],[10,7,13,10],[13,7,10,10]]},
 dungeon:{lines:[[3,21,3,5],[3,5,7,5],[7,5,7,8],[7,8,10,8],[10,8,10,3],[10,3,14,3],[14,3,14,8],[14,8,17,8],[17,8,17,5],[17,5,21,5],[21,5,21,21],[21,21,3,21]],boxes:[[9,14,6,7,3]]},
 quests:{boxes:[[5,4,14,17,2],[9,2,6,4,1]],lines:[[8,10,10,12],[10,12,13,9],[8,16,16,16]]},
 friends:{boxes:[[6,3,6,6,3],[16,5,4,4,2],[3,13,12,8,5]],lines:[[17,13,20,13],[20,13,22,16],[22,16,22,20]]},
 party:{boxes:[[9,3,6,6,3],[1,7,4,4,2],[19,7,4,4,2],[7,13,10,8,4]],lines:[[1,20,1,16],[1,16,4,14],[20,14,23,16],[23,16,23,20]]},
 companions:{boxes:[[7,12,10,9,4],[2,8,4,5,2],[7,3,4,5,2],[13,3,4,5,2],[18,8,4,5,2]]},
 settings:{lines:[[4,3,4,7],[4,13,4,21],[12,3,12,13],[12,19,12,21],[20,3,20,5],[20,11,20,21]],boxes:[[1,7,6,6,2],[9,13,6,6,2],[17,5,6,6,2]]},
 calendar:{boxes:[[3,5,18,16,2]],lines:[[7,2,7,7],[17,2,17,7],[3,10,21,10],[7,14,9,14],[15,14,17,14],[7,18,9,18]]},
 events:{boxes:[[3,5,18,16,2]],lines:[[7,2,7,7],[17,2,17,7],[3,10,21,10],[12,12,14,15],[14,15,12,18],[12,18,10,15],[10,15,12,12]]},
 search:{boxes:[[3,3,13,13,7]],lines:[[15,15,21,21]]},
 filter:{lines:[[3,5,21,5],[21,5,14,13],[14,13,14,20],[14,20,10,18],[10,18,10,13],[10,13,3,5]]},
 next:{lines:[[9,5,16,12],[16,12,9,19]]},
 close:{lines:[[6,6,18,18],[18,6,6,18]]},
 empty:{boxes:[[3,3,18,18,4]],lines:[[8,12,16,12],[12,8,12,16]]},
} satisfies Record<string,Symbol>;

export function NavigationLinework({name,size,color}:{name:keyof typeof navigationLinework;size:number;color:string}){
 const symbol:Symbol=navigationLinework[name],scale=size/24,stroke=Math.max(1.25,size*.065);
 return <View accessible={false} style={{width:size,height:size,flexShrink:0}}>
  {symbol.boxes?.map(([x,y,w,h,r=0],i)=><View key={'b'+i} style={{position:'absolute',left:x*scale,top:y*scale,width:w*scale,height:h*scale,borderRadius:r*scale,borderWidth:stroke,borderColor:color}}/>)}
  {symbol.lines?.map(([x1,y1,x2,y2],i)=>{const length=Math.hypot(x2-x1,y2-y1)*scale;return <View key={'l'+i} style={{position:'absolute',left:(x1+x2)*scale/2-length/2,top:(y1+y2)*scale/2-stroke/2,width:length,height:stroke,borderRadius:stroke,backgroundColor:color,transform:[{rotate:`${Math.atan2(y2-y1,x2-x1)*180/Math.PI}deg`}]}}/>;})}
 </View>;
}
