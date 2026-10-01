/** Memory-only visual QA; never mounts online data or save actions. */
import {useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {GuildIdentitySummary} from '../components/GuildIdentitySummary';
import {GuildCrest} from '../components/SocialIdentity';
import {GuildFrameSwatch} from '../components/GuildHeraldry';
import {GUILD_BANNERS,GUILD_FRAMES,type GuildFrameId} from '../core/guild-customization';
import {C} from '../theme/theme';
import {GuildBackgroundPicker} from '../components/GuildBackgroundPicker';
import type {GuildBackgroundId} from '../core/guild-customization';
import {ProfileScenePreview} from '../components/ProfileScenePreview';
import {PublicProfileScene} from '../components/PublicProfileScene';
import type {GameState} from '../core/types';

export function GuildIdentityReview({state}:{state:GameState}){
 const [frameId,setFrameId]=useState<GuildFrameId>('silver_fellowship');
 const [backgroundId,setBackgroundId]=useState<GuildBackgroundId>('forest_sanctum');
 const guild={name:'The Bloomwardens',tag:'BLM',tagColorId:'tag_emerald',nameColorId:'name_emerald',bannerId:'world_tree_green'};
 const personal={...state,character:{...state.character!,profileBorderId:'frame_harvestwake_festival',profileTitle:'Warden of the Grove'}};
 return <ScrollView style={{width:'100%',maxWidth:432,alignSelf:'center'}} contentContainerStyle={{padding:16,gap:16}} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <Text style={{color:C.accent,fontWeight:'900'}}>GUILD PROFILE · ACTUAL BORDER</Text>
  <GuildIdentitySummary name="The Bloomwardens" tag="BLM" tagColorId="tag_emerald" level={12} memberCount={18} memberCap={30} bannerId="world_tree_green" frameId={frameId} backgroundId={backgroundId} nameColorId="name_emerald" motto="Stronger together."/>
  <GuildBackgroundPicker selected={backgroundId} onSelect={setBackgroundId} entitlements={{guildLevel:12,bannerGalleryTier:0,pveAchievementIds:[]}}/>
  <Text style={{color:C.accent,fontWeight:'900'}}>COMPACT BANNERS · 44 PX</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{GUILD_BANNERS.map(banner=><GuildCrest key={banner.id} size={44} bannerId={banner.id} frameId={frameId}/>)}</View>
  <Text style={{color:C.accent,fontWeight:'900'}}>NARROW CARD · 288 PX</Text>
  <View style={{width:288,maxWidth:'100%'}}><GuildIdentitySummary name="Wardens of the Silver Dawn" tag="WSD" level={20} memberCount={30} memberCap={30} bannerId="swordwing_blue" frameId="grand_gold" backgroundId={backgroundId} nameplateId="sapphire_royal" motto="Across every region, we stand together."/></View>
  <Text style={{color:C.accent,fontWeight:'900'}}>PERSONAL PROFILE · FULL CARD BORDER</Text>
  <ProfileScenePreview state={personal} backgroundId="bg_forest_sanctum"/>
  <Text style={{color:C.accent,fontWeight:'900'}}>PUBLIC PROFILE · RECTANGLE</Text>
  <PublicProfileScene profile={{guild,accountId:'preview',displayName:'Aster',visibility:'public',character:{id:'preview',name:'Aster',classId:'IRONWARDEN',level:28,bodyPresentation:'female',profileIconId:state.character!.profileIconId??''},title:'Warden of the Grove',backgroundId:'bg_merchant_guild',borderId:'frame_amber_vine',bio:'',achievementShowcaseIds:[],collectionShowcase:[],recordShowcaseIds:[],masteryShowcaseActionIds:[],revision:0}}/>
  <Text style={{color:C.accent,fontWeight:'900'}}>SELECT A FRAME TO PREVIEW</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{GUILD_FRAMES.map(frame=><Pressable key={frame.id} accessibilityRole="button" accessibilityLabel={frame.name} accessibilityState={{selected:frame.id===frameId}} onPress={()=>setFrameId(frame.id)} style={{width:88,alignItems:'center',gap:4}}><GuildFrameSwatch size={72} frameId={frame.id}/><Text style={{color:frame.id===frameId?C.accent:C.muted,fontSize:10,textAlign:'center'}}>{frame.name}</Text></Pressable>)}</View>
 </ScrollView>;
}
