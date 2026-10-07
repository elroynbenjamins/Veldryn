/** Presentation only; never used to settle damage or grant rewards. */
export function huntingHitCue(elapsedMs:number,cycleMs:number,side:'player'|'enemy'){
 if(!Number.isFinite(elapsedMs)||!Number.isFinite(cycleMs)||elapsedMs<0||cycleMs<1000)return null;
 const cycle=Math.floor(elapsedMs/cycleMs),phase=elapsedMs%cycleMs;
 const at=cycleMs*(side==='enemy'?.25:.65),age=phase-at;
 return age>=0&&age<450?`${cycle}:${side}`:null;
}
export function huntingEffectsEnabled(settings:{reduceMotion:boolean;huntingHitEffects?:boolean},active:boolean){
 return active&&!settings.reduceMotion&&settings.huntingHitEffects!==false;
}
