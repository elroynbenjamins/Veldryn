export type DungeonCombatWidthMode='standard'|'narrow'|'compact';

export interface DungeonCombatLayout{
  mode:DungeonCombatWidthMode;
  arenaPadding:number;
  partyGap:number;
  bossWidthPct:number;
  bossWidthPctFinal:number;
  cardMinHeight:number;
  sceneHeight:number;
  portraitWidth:number;
  portraitHeight:number;
  statusLimit:number;
  contributionIdentityWidthPct:number;
  contributionIdentityMinWidth:number;
  controlsWrap:boolean;
}

export function dungeonCombatLayout(width:number):DungeonCombatLayout{
  const safe=Number.isFinite(width)&&width>0?width:390;
  if(safe<340)return{
    mode:'compact',
    arenaPadding:4,
    partyGap:2,
    bossWidthPct:72,
    bossWidthPctFinal:78,
    cardMinHeight:122,
    sceneHeight:72,
    portraitWidth:64,
    portraitHeight:70,
    statusLimit:2,
    contributionIdentityWidthPct:27,
    contributionIdentityMinWidth:52,
    controlsWrap:true,
  };
  if(safe<380)return{
    mode:'narrow',
    arenaPadding:5,
    partyGap:3,
    bossWidthPct:66,
    bossWidthPctFinal:72,
    cardMinHeight:128,
    sceneHeight:78,
    portraitWidth:70,
    portraitHeight:76,
    statusLimit:2,
    contributionIdentityWidthPct:28,
    contributionIdentityMinWidth:58,
    controlsWrap:true,
  };
  return{
    mode:'standard',
    arenaPadding:8,
    partyGap:4,
    bossWidthPct:58,
    bossWidthPctFinal:66,
    cardMinHeight:136,
    sceneHeight:84,
    portraitWidth:76,
    portraitHeight:82,
    statusLimit:3,
    contributionIdentityWidthPct:30,
    contributionIdentityMinWidth:68,
    controlsWrap:false,
  };
}
