import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect,useState} from 'react';
import {COMPANION_TOUR_STEPS,createCompanionTutorialStore} from '../core/companion-tutorial';
const store=createCompanionTutorialStore(AsyncStorage);
export function useCompanionTutorial(scope:string,unlocked:boolean){
 const [progress,setProgress]=useState<{scope:string;step:number}|null>(null);
 useEffect(()=>{if(!unlocked)return;let active=true;void store.load(scope).then(step=>{if(active)setProgress({scope,step});});return()=>{active=false};},[scope,unlocked]);
 const ready=unlocked&&progress?.scope===scope;
 const step=ready?progress!.step:0;
 const pending=unlocked&&(!ready||step<COMPANION_TOUR_STEPS.length);
 return {ready,pending,step,advance:()=>{
  if(!ready||!pending)return;
  const next=Math.min(step+1,COMPANION_TOUR_STEPS.length);
  setProgress({scope,step:next});void store.save(scope,next);
 }};
}
