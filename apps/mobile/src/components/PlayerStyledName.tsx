import {useEffect,useMemo,useState} from 'react';
import {Text,type StyleProp,type TextStyle} from 'react-native';
import {playerNameCharacterColors,type PlayerNameStylePreference} from '../core/player-name-style';

export function PlayerStyledName({name,nameStyle,reduceMotion=false,style,numberOfLines=1}:{name:string;nameStyle?:PlayerNameStylePreference;reduceMotion?:boolean;style?:StyleProp<TextStyle>;numberOfLines?:number}){
 const normalized=nameStyle??{mode:'default',animation:'none'} as PlayerNameStylePreference;
 const animated=normalized.mode==='gradient'&&normalized.animation!=='none'&&!reduceMotion;
 const [phase,setPhase]=useState(0);
 useEffect(()=>{
  if(!animated){setPhase(0);return;}
  const timer=setInterval(()=>setPhase(value=>(value+.035)%1),180);
  return()=>clearInterval(timer);
 },[animated]);
 const colors=useMemo(()=>playerNameCharacterColors(name,normalized,phase),[name,normalized,phase]);
 if(!colors.length)return <Text numberOfLines={numberOfLines} style={style}>{name}</Text>;
 return <Text numberOfLines={numberOfLines} style={style}>{Array.from(name).map((char,index)=><Text key={index} style={{color:colors[index]}}>{char}</Text>)}</Text>;
}
