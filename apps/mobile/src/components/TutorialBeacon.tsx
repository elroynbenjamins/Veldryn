import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Animated,Easing,StyleSheet,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';

/**
 * Lightweight guided-tutorial system. Any component that could be the next step
 * in a tutorial wraps itself in <TutorialBeacon id="my-id">...</TutorialBeacon>.
 * A single active id lives in TutorialHighlightProvider; the beacon with that id
 * renders a pulsing accent ring over its children.
 *
 * This file intentionally has no persistence or scripted-sequence logic. Those
 * live in whatever caller drives the active id (e.g. a first-session tour, a
 * contextual coach-mark on a Settings menu). This keeps the primitive reusable.
 */

type Ctx={activeId:string|null;setActive:(id:string|null)=>void};
const noopCtx:Ctx={activeId:null,setActive:()=>{}};
const TutorialCtx=createContext<Ctx>(noopCtx);

export function TutorialHighlightProvider({initial=null,children}:{initial?:string|null;children:ReactNode}){
 const [activeId,setActiveId]=useState<string|null>(initial);
 const setActive=useCallback((id:string|null)=>setActiveId(id),[]);
 const value=useMemo(()=>({activeId,setActive}),[activeId,setActive]);
 return <TutorialCtx.Provider value={value}>{children}</TutorialCtx.Provider>;
}

export function useTutorialHighlight(){return useContext(TutorialCtx);}

/** Returns true when this id is the currently active tutorial target. */
export function useIsTutorialTarget(id:string){
 const {activeId}=useContext(TutorialCtx);
 return activeId===id;
}

export function TutorialBeacon({id,children,disabled=false,reduceMotion=false}:{id:string;children:ReactNode;disabled?:boolean;reduceMotion?:boolean}){
 const active=useIsTutorialTarget(id)&&!disabled;
 const C=useGameTheme();
 const pulse=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  pulse.stopAnimation();
  if(!active||reduceMotion){pulse.setValue(0);return;}
  const loop=Animated.loop(Animated.sequence([
   Animated.timing(pulse,{toValue:1,duration:720,easing:Easing.out(Easing.quad),useNativeDriver:true}),
   Animated.timing(pulse,{toValue:0,duration:720,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
  ]));
  loop.start();
  return()=>{loop.stop();pulse.setValue(0);};
 },[active,reduceMotion,pulse]);
 if(!active)return <>{children}</>;
 const scale=pulse.interpolate({inputRange:[0,1],outputRange:[1,1.06]});
 const opacity=pulse.interpolate({inputRange:[0,1],outputRange:[0.25,0.9]});
 return <View style={styles.wrap}>
  {children}
  <Animated.View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,styles.ring,{borderColor:C.accent,opacity,transform:[{scale}]}]} />
 </View>;
}

const styles=StyleSheet.create({
 wrap:{position:'relative'},
 ring:{borderWidth:3,borderRadius:14},
});
