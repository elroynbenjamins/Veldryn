/** Ultra Luxe III: isolated artwork/layout review foundation. Not registered or released. */
export const ABYSSAL_IDS={
 background:'ascendant-abyssal-forgotten-abyss',
 border:'ascendant-abyssal-crown-of-the-depths',
 pet:'ascendant-abyssal-nhalzuun',
 showcase:'ascendant-abyssal-call-of-the-deep',
 badge:'ascendant_monarch_of_deep',
} as const;
export const ABYSSAL_COLLECTION={
 id:'ascendant-abyssal-majesty',name:'Abyssal Majesty',
 backgroundName:'The Forgotten Abyss',borderName:'Crown of the Depths',
 petName:"Nhal'Zuun, the Abyssborn",showcaseName:'Call of the Deep',badgeName:'Monarch of the Deep',
 accent:'#6CF2EB',softAccent:'#176F83',
} as const;
export const ABYSSAL_STAGE={width:340,height:205,minWidth:320,maxWidth:480,maxFontScale:1.05} as const;
export const ABYSSAL_BOXES={
 plate:{x:35,y:69,w:183,h:72},portrait:{x:40,y:76,w:54,h:54},
 identity:{x:100,y:74,w:112,h:45},badges:{x:100,y:119,w:110,h:21},
 guild:{x:35,y:143,w:183,h:16},leviathan:{x:230,y:63,w:76,h:86},
 aura:{x:226,y:57,w:84,h:98},ring:{x:233,y:149,w:70,h:10},
 alternate:{x:245,y:89,w:46,h:46},
} as const;
export function abyssalPair(background?:string|null,border?:string|null){
 return background===ABYSSAL_IDS.background&&border===ABYSSAL_IDS.border;
}
export function abyssalPetMode(pet?:string|null,alternateArt=false){
 return pet===ABYSSAL_IDS.pet?'matching':pet&&alternateArt?'alternate':'none';
}
export function abyssalStageSupported(width:number,fontScale:number){
 const s=ABYSSAL_STAGE;
 return Number.isFinite(width)&&width>=s.minWidth&&width<=s.maxWidth&&Number.isFinite(fontScale)&&fontScale>0&&fontScale<=s.maxFontScale;
}
/** Review-only choreography. A single native 24s clock will sample this curve.
 * A soft early pulse, gathering tide, deep surge and decay. No rapid flashing. */
export const ABYSSAL_CYCLE_MS=24000;
export const ABYSSAL_PHASE=[0,2/24,5/24,8/24,11/24,14/24,16/24,19/24,22/24,1] as const;
export const ABYSSAL_ENERGY=[0,.14,.35,.22,.48,.82,1,.56,.12,0] as const;
export function abyssalAwakeningCurve(){
 const phase:number[]=[0],energy:number[]=[0];
 for(let i=1;i<ABYSSAL_PHASE.length;i++){
  for(let j=1;j<=4;j++){
   const t=j/4,e=t*t*(3-2*t),a=ABYSSAL_PHASE[i-1],b=ABYSSAL_PHASE[i];
   phase.push(j===4?b:a+(b-a)*t);
   energy.push(j===4?ABYSSAL_ENERGY[i]:ABYSSAL_ENERGY[i-1]+(ABYSSAL_ENERGY[i]-ABYSSAL_ENERGY[i-1])*e);
  }
 }
 return {phase,energy};
}
/** Absolute design-space mote centers, kept outside identity/guild slots. */
export const ABYSSAL_MOTE_PATHS=[
 [[241,39],[267,28],[293,38],[311,65],[293,38],[267,28],[241,39]],
 [[235,164],[260,177],[285,169],[308,157],[285,169],[260,177],[235,164]],
 [[28,33],[61,27],[91,35],[122,27],[91,35],[61,27],[28,33]],
] as const;
export const ABYSSAL_BUDGET={maxAmbientMotes:3,maxRailMotes:2,maxPetMotes:3,petAtlasFps:12,maxPetFrames:48,moteRadius:4,maxPetLift:3} as const;

/** Candidate idle atlas: one padded 672x768 texture, 36 poses at 12 fps.
 * Each 3s cycle closes exactly eight times per 24s showcase. */
export const ABYSSAL_POSE_ATLAS={frameWidth:112,frameHeight:128,columns:6,rows:6,frames:36,seconds:3,cycles:8} as const;
export function abyssalPoseTimeline(){
 const a=ABYSSAL_POSE_ATLAS,inputRange=[0],frames=[0];
 for(let i=1;i<=a.frames;i++){
  inputRange.push(i/a.frames-.0005/a.seconds,i/a.frames);
  frames.push(i-1,i%a.frames);
 }
 return {inputRange,frames};
}
export function abyssalPoseCell(frame:number){
 return {column:frame%ABYSSAL_POSE_ATLAS.columns,row:Math.floor(frame/ABYSSAL_POSE_ATLAS.columns)};
}

/** Candidate identifiers only; not a production grant catalogue entry. */
export const ABYSSAL_PRIVATE_REVIEW={
 collectionId:ABYSSAL_COLLECTION.id,
 titleId:'ascendant-abyssal-title',
 effectId:'premium:abyssal-majesty:call-of-the-deep',
} as const;
export type AbyssalReviewSelection={
 background?:string|null;border?:string|null;pet?:string|null;effect?:string|null;
 verifiedTitleId?:string|null;displayedBadges?:readonly string[];
};
/** Review-only selection contract. Caller supplies verified collection IDs from
 * a trusted projection; raw save ownership and legacy tester aliases are not proof.
 * This does not create grants or authorize persistence. */
export function abyssalReviewTier(enabled:boolean,verifiedCollectionIds:readonly string[],actual:AbyssalReviewSelection):'hidden'|'paired'|'awakened'|'ascendant'{
 if(!enabled||!verifiedCollectionIds.includes(ABYSSAL_PRIVATE_REVIEW.collectionId))return 'hidden';
 if(!abyssalPair(actual.background,actual.border))return 'hidden';
 if(actual.effect&&actual.effect!==ABYSSAL_PRIVATE_REVIEW.effectId)return 'hidden';
 if(actual.pet!==ABYSSAL_IDS.pet)return 'paired';
 return actual.verifiedTitleId===ABYSSAL_PRIVATE_REVIEW.titleId&&actual.displayedBadges?.includes(ABYSSAL_IDS.badge)?'ascendant':'awakened';
}
