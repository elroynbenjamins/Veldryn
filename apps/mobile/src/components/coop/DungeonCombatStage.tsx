import {Image,StyleSheet,Text,View} from 'react-native';
import type {CoopRunView} from '../../core/coop-presentation';
import {dungeonCombatAvatar} from '../../core/dungeon-combat-avatars';
import {combatCompanionDef} from '../../content/combat-companions';
import {companionArtSource} from '../../theme/companion-art';
import {coopColors,coopRadii,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {FantasyPanel,StateChip} from './CoopVisualKit';

type Slot=CoopRunView['roleSlots'][number];

function hpPercent(slot:Slot){
 const current=slot.currentHp,maximum=slot.maximumHp;
 if(current===undefined||maximum===undefined||!Number.isFinite(current)||!Number.isFinite(maximum)||maximum<=0)return 1;
 return Math.max(0,Math.min(1,current/maximum));
}

function ClassAvatar({slot}:{slot:Slot}){
 const avatar=dungeonCombatAvatar(slot.classId),pct=hpPercent(slot),companion=slot.companionId?combatCompanionDef(slot.companionId):undefined,art=slot.companionId?companionArtSource(slot.companionId):undefined;
 const initial=(avatar?.label??slot.classId??slot.role).slice(0,1).toUpperCase();
 return <View style={[s.member,slot.role==='tank'&&s.memberTank,slot.ready===false&&s.memberDown]}>
  <View style={[s.avatarFrame,slot.role==='tank'?s.avatarTank:slot.role==='support'?s.avatarSupport:s.avatarDamage]}>
   <Text style={s.avatarInitial}>{initial}</Text>
   <Text numberOfLines={1} style={s.avatarWeapon}>{avatar?.weaponSilhouette??slot.role}</Text>
  </View>
  <Text numberOfLines={1} style={s.memberName}>{slot.name}</Text>
  <Text numberOfLines={1} style={s.className}>{avatar?.label??slot.classId??slot.role}</Text>
  <View style={s.hpTrack}><View style={[s.hpFill,{width:`${Math.round(pct*100)}%` as `${number}%`}]} /></View>
  {slot.currentHp!==undefined&&slot.maximumHp!==undefined?<Text style={s.hpText}>{Math.max(0,Math.round(slot.currentHp))}/{Math.max(1,Math.round(slot.maximumHp))}</Text>:null}
  {companion?<View style={s.assistRow}>{art?<Image source={art} resizeMode="contain" style={s.companionArt}/>:<View style={s.companionFallback}><Text style={s.companionFallbackText}>◇</Text></View>}<View style={s.assistCopy}><Text style={s.assistLabel}>COMPANION ASSIST</Text><Text numberOfLines={1} style={s.assistName}>{companion.name}</Text></View></View>:null}
 </View>;
}

export function DungeonCombatStage({run,enemyLabel,boss=false}:{run:CoopRunView;enemyLabel?:string;boss?:boolean}){
 const tank=run.roleSlots.find(slot=>slot.role==='tank'),damage=run.roleSlots.filter(slot=>slot.role==='damage'),support=run.roleSlots.find(slot=>slot.role==='support');
 const ordered=[tank,damage[0],damage[1],support].filter((slot):slot is Slot=>Boolean(slot));
 const assists=ordered.filter(slot=>slot.companionId).length;
 return <FantasyPanel variant={boss?'danger':'selected'}>
  <View style={s.header}><View style={s.grow}><Text style={s.kicker}>{boss?'FINAL ENCOUNTER':'DUNGEON COMBAT'}</Text><Text style={s.title}>{enemyLabel??(boss?'Boss encounter':'Encounter preview')}</Text></View><StateChip label={assists?`${assists} ASSIST${assists===1?'':'S'}`:'NO ASSISTS'} tone={assists?'success':'neutral'}/></View>
  <View style={s.arena}>
   <View style={s.partyField}>{ordered.map((slot,index)=><View key={`${slot.name}-${index}`} style={[s.formationSlot,index===0&&s.slotFront,index===3&&s.slotRear]}><ClassAvatar slot={slot}/></View>)}</View>
   <View style={s.divider}><Text style={s.vs}>VS</Text></View>
   <View style={s.enemyField}><View style={[s.enemyCore,boss&&s.enemyBoss]}><Text style={s.enemyMark}>{boss?'♛':'◆'}</Text><Text numberOfLines={2} style={s.enemyName}>{enemyLabel??(boss?'Final Boss':'Dungeon Enemy')}</Text><Text style={s.enemyHint}>{boss?'Phase + cast telegraphs above':'Server-resolved encounter'}</Text></View></View>
  </View>
  <Text style={s.note}>Companions remain attached to their owner. Their existing combat-assist ability can briefly appear as a proc animation later; they never occupy extra party slots.</Text>
 </FantasyPanel>;
}

const s=StyleSheet.create({
 header:{flexDirection:'row',alignItems:'flex-start',gap:coopSpacing.sm},grow:{flex:1,minWidth:0},
 kicker:{...coopTypography.meta,color:coopColors.gold,fontWeight:'900',letterSpacing:.8},title:{...coopTypography.section,color:coopColors.text},
 arena:{minHeight:294,flexDirection:'row',alignItems:'stretch',gap:coopSpacing.xs,padding:coopSpacing.sm,borderWidth:1,borderColor:coopColors.goldDim,borderRadius:coopRadii.tile,backgroundColor:'#04111E',overflow:'hidden'},
 partyField:{flex:1.75,flexDirection:'row',flexWrap:'wrap',alignContent:'center',justifyContent:'center',gap:coopSpacing.xs},
 formationSlot:{width:'46%'},slotFront:{transform:[{translateX:6}]},slotRear:{transform:[{translateX:-5}]},
 member:{minHeight:126,padding:coopSpacing.xs,borderWidth:1,borderColor:'#274052',borderRadius:coopRadii.tile,backgroundColor:'rgba(7,24,39,.94)',gap:2},
 memberTank:{borderColor:coopColors.gold},memberDown:{opacity:.48},
 avatarFrame:{height:44,borderRadius:8,borderWidth:1,alignItems:'center',justifyContent:'center',paddingHorizontal:3,backgroundColor:coopColors.surfaceRaised},
 avatarTank:{borderColor:coopColors.gold},avatarDamage:{borderColor:coopColors.danger},avatarSupport:{borderColor:coopColors.success},
 avatarInitial:{fontSize:21,lineHeight:23,color:coopColors.text,fontWeight:'900'},avatarWeapon:{fontSize:7,lineHeight:9,color:coopColors.textMuted,textTransform:'uppercase',fontWeight:'800'},
 memberName:{fontSize:11,lineHeight:13,color:coopColors.text,fontWeight:'900'},className:{fontSize:9,lineHeight:11,color:coopColors.cyan,fontWeight:'800'},
 hpTrack:{height:4,borderRadius:99,overflow:'hidden',backgroundColor:'#20313D'},hpFill:{height:'100%',backgroundColor:coopColors.success},hpText:{fontSize:8,lineHeight:10,color:coopColors.textMuted},
 assistRow:{minHeight:30,flexDirection:'row',alignItems:'center',gap:4,paddingTop:2,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#284255'},
 companionArt:{width:26,height:26,borderRadius:6},companionFallback:{width:26,height:26,borderRadius:6,borderWidth:1,borderColor:coopColors.violet,alignItems:'center',justifyContent:'center'},companionFallbackText:{color:coopColors.violet},
 assistCopy:{flex:1,minWidth:0},assistLabel:{fontSize:7,lineHeight:9,color:coopColors.violet,fontWeight:'900',letterSpacing:.35},assistName:{fontSize:8,lineHeight:10,color:coopColors.textSecondary,fontWeight:'800'},
 divider:{width:22,alignItems:'center',justifyContent:'center'},vs:{fontSize:9,lineHeight:11,color:coopColors.gold,fontWeight:'900'},
 enemyField:{flex:1,alignItems:'center',justifyContent:'center'},enemyCore:{width:'100%',minHeight:136,alignItems:'center',justifyContent:'center',gap:5,padding:coopSpacing.xs,borderWidth:1,borderColor:coopColors.danger,borderRadius:coopRadii.tile,backgroundColor:'rgba(75,19,31,.35)'},enemyBoss:{minHeight:178,borderColor:coopColors.violet,backgroundColor:'rgba(55,21,76,.42)'},
 enemyMark:{fontSize:34,lineHeight:38,color:coopColors.danger},enemyName:{...coopTypography.meta,color:coopColors.text,fontWeight:'900',textAlign:'center'},enemyHint:{fontSize:8,lineHeight:11,color:coopColors.textMuted,textAlign:'center'},
 note:{...coopTypography.meta,color:coopColors.textMuted,fontSize:11,lineHeight:15},
});
