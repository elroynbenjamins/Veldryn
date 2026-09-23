import {useEffect,useState} from 'react';
import {Text,type StyleProp,type TextStyle} from 'react-native';
import {normalizePlayerNameStyle,type PlayerNameStyleSelection} from '../core/player-name-style';

let sharedPhase=0;
let sharedTimer:ReturnType<typeof setInterval>|undefined;
const sharedListeners=new Set<()=>void>();

function subscribeNameFlow(listener:()=>void){
  sharedListeners.add(listener);
  if(!sharedTimer)sharedTimer=setInterval(()=>{
    sharedPhase=(sharedPhase+1/16)%1;
    for(const notify of sharedListeners)notify();
  },500);
  return ()=>{
    sharedListeners.delete(listener);
    if(!sharedListeners.size&&sharedTimer){clearInterval(sharedTimer);sharedTimer=undefined;}
  };
}

function useNameFlow(active:boolean){
  const [,setVersion]=useState(0);
  useEffect(()=>active?subscribeNameFlow(()=>setVersion(value=>value+1)):undefined,[active]);
  return active?sharedPhase:0;
}

function rgb(hex:string){
  const raw=hex.slice(1);
  return {r:parseInt(raw.slice(0,2),16),g:parseInt(raw.slice(2,4),16),b:parseInt(raw.slice(4,6),16)};
}
function channel(value:number){return Math.max(0,Math.min(255,Math.round(value))).toString(16).padStart(2,'0').toUpperCase();}
function mix(a:string,b:string,t:number){
  const from=rgb(a),to=rgb(b);
  return '#'+channel(from.r+(to.r-from.r)*t)+channel(from.g+(to.g-from.g)*t)+channel(from.b+(to.b-from.b)*t);
}
function gradientColor(colors:string[],position:number){
  if(colors.length<2)return colors[0]??'#FFFFFF';
  const p=Math.max(0,Math.min(1,position)),scaled=p*(colors.length-1),index=Math.min(colors.length-2,Math.floor(scaled));
  return mix(colors[index],colors[index+1],scaled-index);
}

export function PlayerNameText({
  name,nameStyle,reduceMotion=false,style,numberOfLines,
}:{
  name:string;
  nameStyle?:PlayerNameStyleSelection|null;
  reduceMotion?:boolean;
  style?:StyleProp<TextStyle>;
  numberOfLines?:number;
}){
  const normalized=normalizePlayerNameStyle(nameStyle);
  const animated=normalized.mode==='gradient'&&normalized.animated&&!reduceMotion;
  const phase=useNameFlow(animated);
  if(normalized.mode==='default')return <Text numberOfLines={numberOfLines} style={style}>{name}</Text>;
  if(normalized.mode==='solid')return <Text numberOfLines={numberOfLines} style={[style,{color:normalized.solidColor}]}>{name}</Text>;

  const chars=Array.from(name),flow=animated?Math.sin(phase*Math.PI*2)*.16:0;
  return <Text accessible accessibilityLabel={name} numberOfLines={numberOfLines} style={style}>{chars.map((char,index)=>{
    const base=chars.length<=1?.5:index/(chars.length-1);
    const color=gradientColor(normalized.gradientColors,Math.max(0,Math.min(1,base+flow)));
    return <Text key={index} style={{color}}>{char}</Text>;
  })}</Text>;
}
