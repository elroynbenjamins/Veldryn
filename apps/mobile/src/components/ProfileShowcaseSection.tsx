import {StyleSheet,Text,View} from 'react-native';
import {C,radii,spacing,typography} from '../theme/theme';

export interface ProfileShowcaseEntry{key:string;label:string;meta?:string;value?:string}

export function ProfileShowcaseSection({title,entries,emptyLabel='Empty showcase slot'}:{title:string;entries:ProfileShowcaseEntry[];emptyLabel?:string}){
 const slots:Array<ProfileShowcaseEntry|undefined>=[entries[0],entries[1],entries[2]];
 return <View style={s.block}><Text style={s.title}>{title}</Text><View style={s.grid}>{slots.map((entry,index)=><View key={entry?.key??'empty-'+index} style={[s.slot,!entry&&s.empty]}>{entry?<><Text numberOfLines={2} style={s.name}>{entry.label}</Text>{entry.value?<Text numberOfLines={1} style={s.value}>{entry.value}</Text>:null}{entry.meta?<Text numberOfLines={2} style={s.meta}>{entry.meta}</Text>:null}</>:<><Text style={s.emptyMark}>◇</Text><Text style={s.emptyText}>{emptyLabel}</Text></>}</View>)}</View></View>;
}

const s=StyleSheet.create({
 block:{gap:6,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 title:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
 grid:{flexDirection:'row',gap:6},
 slot:{flex:1,minWidth:0,minHeight:78,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel,justifyContent:'center',gap:2},
 empty:{borderStyle:'dashed',opacity:.7,alignItems:'center'},
 emptyMark:{fontSize:18,color:C.disabled,fontWeight:'900'},
 emptyText:{fontSize:8,lineHeight:11,color:C.muted,textAlign:'center'},
 name:{fontSize:10,lineHeight:13,color:C.text,fontWeight:'900'},
 value:{fontSize:11,lineHeight:14,color:C.good,fontWeight:'900'},
 meta:{fontSize:8,lineHeight:11,color:C.muted},
});
