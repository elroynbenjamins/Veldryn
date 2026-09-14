import {StyleSheet,Text,View} from 'react-native';
import type {MonsterDef} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {RegionArtwork} from './RegionArtwork';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {C,radii,typography} from '../theme/theme';
export function BossEncounterIntro({monster}:{monster:MonsterDef}){
 const region=WORLD_ZONES.find(zone=>zone.name===monster.zone);
 return <View style={s.root}><RegionArtwork regionId={region?.id??'KINGS_ROAD'}/><View style={s.shade}/><View style={s.copy}><Text style={s.eyebrow}>ASTERFALL BOSS</Text><MonsterPortraitFrame monster={monster} size={132} framed={false}/><Text accessibilityRole="header" style={s.name}>{monster.name}</Text><Text style={s.sub}>Level {monster.level} · {monster.hp} HP</Text><Text style={s.sub}>Prepare your equipment and food before challenging this foe.</Text></View></View>;
}
const s=StyleSheet.create({root:{borderRadius:radii.md,overflow:'hidden',borderWidth:1,borderColor:'#856634',marginTop:12},shade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(7,12,20,.74)'},copy:{padding:16,gap:8,alignItems:'center'},eyebrow:{...typography.caption,color:C.accent,letterSpacing:1,fontWeight:'600'},name:{...typography.hero,color:'#efd895',textAlign:'center'},sub:{...typography.body,color:C.muted,textAlign:'center'}});
