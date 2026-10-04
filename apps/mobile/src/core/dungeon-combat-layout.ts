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
    arenaPadding:0,
    partyGap:4,
    bossWidthPct:100,
    bossWidthPctFinal:100,
    cardMinHeight:108,
    sceneHeight:72,
    portraitWidth:52,
    portraitHeight:62,
    statusLimit:2,
    contributionIdentityWidthPct:27,
    contributionIdentityMinWidth:52,
    controlsWrap:true,
  };
  if(safe<380)return{
    mode:'narrow',
    arenaPadding:2,
    partyGap:6,
    bossWidthPct:94,
    bossWidthPctFinal:100,
    cardMinHeight:112,
    sceneHeight:76,
    portraitWidth:58,
    portraitHeight:66,
    statusLimit:2,
    contributionIdentityWidthPct:28,
    contributionIdentityMinWidth:58,
    controlsWrap:true,
  };
  return{
    mode:'standard',
    arenaPadding:4,
    partyGap:8,
    bossWidthPct:88,
    bossWidthPctFinal:100,
    cardMinHeight:116,
    sceneHeight:78,
    portraitWidth:62,
    portraitHeight:68,
    statusLimit:3,
    contributionIdentityWidthPct:30,
    contributionIdentityMinWidth:68,
    controlsWrap:safe<600,
  };
}
