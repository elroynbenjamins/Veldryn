import {useCoopStyles} from '../theme/useCoopStyles';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {COOP_PRIMARY_TABS} from '../core/coop-ui-contract';
import {Language,t} from '../i18n';
import {CoopImageSlot,ExpeditionScreenShell,FantasyPanel,PrimaryAction,RoleBadge,StateChip} from '../components/coop/CoopVisualKit';
import {type CoopColors,coopSpacing,coopTypography} from '../theme/coop-ui-theme';
import {CoopSharedRunGallery} from '../components/coop/CoopSharedRunGallery';
import {CoopQModeTeamGallery} from '../components/coop/CoopQModeTeamGallery';
import {CoopSynchronizationPanel} from '../components/coop/CoopSynchronizationPanel';
import {assertCoopSynchronizationPresentation} from '../core/coop-synchronization';

const tabKey={Home:'nav.home',Character:'nav.character',World:'nav.world',Inventory:'nav.inventory',More:'nav.more'} as const;

export function CoopUiGalleryScreen({language,onClose}:{language:Language;onClose:()=>void}){
 const {styles:s}=useCoopStyles(makeStyles);
  const {width}=useWindowDimensions(),narrow=width<360;
  return <ExpeditionScreenShell testID="coop-ui-gallery" eyebrow={t(language,'coopUi.galleryKicker')} title={t(language,'coopUi.galleryTitle')} backLabel={t(language,'common.back')} onBack={onClose} banner={<Text style={s.banner}>{t(language,'coopUi.galleryIntro')}</Text>}>
    <Text style={s.section}>{t(language,'coopUi.actions')}</Text>
    <View style={s.stack}>
      <PrimaryAction label={t(language,'coopUi.normal')} onPress={()=>{}}/>
      <PrimaryAction label={t(language,'coopUi.pressed')} previewPressed onPress={()=>{}}/>
      <PrimaryAction label={t(language,'coopUi.selected')} selected onPress={()=>{}}/>
      <PrimaryAction label={t(language,'coopUi.disabled')} disabled/>
      <PrimaryAction label={t(language,'coopUi.loading')} loading/>
      <PrimaryAction label={t(language,'coopUi.error')} tone="danger" onPress={()=>{}}/>
    </View>

    <Text style={s.section}>{t(language,'coopUi.panels')}</Text>
    <View style={narrow?s.stack:s.panelGrid}>
      <FantasyPanel><Text style={s.panelTitle}>{t(language,'coopUi.normal')}</Text><Text style={s.copy}>{t(language,'coopUi.panelBody')}</Text></FantasyPanel>
      <FantasyPanel variant="selected"><Text style={s.panelTitle}>{t(language,'coopUi.selected')}</Text><StateChip label={t(language,'coopUi.selected')} tone="selected"/></FantasyPanel>
      <FantasyPanel variant="success"><Text style={s.panelTitle}>{t(language,'coopUi.ready')}</Text><StateChip label={t(language,'coopUi.ready')} tone="success"/></FantasyPanel>
      <FantasyPanel variant="danger"><Text accessibilityRole="alert" style={s.error}>{t(language,'coopUi.error')}</Text><StateChip label={t(language,'coopUi.error')} tone="danger"/></FantasyPanel>
      <FantasyPanel variant="disabled"><Text style={s.panelTitle}>{t(language,'coopUi.disabled')}</Text><Text style={s.copy}>{t(language,'coopUi.panelBody')}</Text></FantasyPanel>
    </View>

    <Text style={s.section}>{t(language,'coopUi.roles')}</Text>
    <View style={narrow?s.stack:s.roleGrid}><RoleBadge role="tank" label={t(language,'coopUi.tank')}/><RoleBadge role="damage" label={t(language,'coopUi.damage')}/><RoleBadge role="support" label={t(language,'coopUi.support')}/></View>
    <View style={s.chips}><StateChip label={t(language,'coopUi.searching')}/><StateChip label={t(language,'coopUi.selected')} tone="selected"/><StateChip label={t(language,'coopUi.ready')} tone="success"/><StateChip label={t(language,'coopUi.error')} tone="danger"/></View>

    <Text style={s.section}>{t(language,'coopUi.images')}</Text>
    <FantasyPanel><CoopImageSlot assetId="rootbound_hero" size="hero" accessibilityLabel={t(language,'coopUi.heroArt')}/><View style={s.images}><CoopImageSlot assetId="node_elite" size="node" accessibilityLabel={t(language,'coopUi.nodeArt')}/><CoopImageSlot assetId="boon_rooted" size="boon" accessibilityLabel={t(language,'coopUi.boonArt')}/><CoopImageSlot assetId="skill_guard" size="skill" accessibilityLabel={t(language,'coopUi.skillArt')}/><CoopImageSlot size="node" fallbackLabel={t(language,'coopUi.missing')} accessibilityLabel={t(language,'coopUi.missingArt')}/></View></FantasyPanel>

    <Text style={s.section}>Class Synchronization · 2.0 review</Text>
    <CoopSynchronizationPanel
      view={assertCoopSynchronizationPresentation({
        activeCount:3,scalePercent:80,partyWide:true,cappedStats:[],personalCpDelta:0,
        requiresProgression:false,canGateEntry:false,canFilterRecruitment:false,
        visibleOnRecruitmentBoard:false,canRankCandidates:false,
        links:[
          {id:'runebound_pact',name:'Runebound Pact',classNames:['Ironwarden','Stonecaller'],
           bonuses:[{statKey:'armor_pct',label:'Armor',bps:400,valueKind:'percent'},{statKey:'ward_strength_pct',label:'Ward effectiveness',bps:400,valueKind:'percent'},{statKey:'shield_strength_pct',label:'Shield effectiveness',bps:240,valueKind:'percent'}]},
          {id:'guardians_vigil',name:"Guardian's Vigil",classNames:['Ironwarden','Wayfinder'],
           bonuses:[{statKey:'accuracy_pct',label:'Accuracy',bps:320,valueKind:'percent'},{statKey:'damage_reduction_pct',label:'Damage reduction',bps:240,valueKind:'percent'}]},
          {id:'marked_for_death',name:'Marked for Death',classNames:['Wayfinder','Hexweaver'],
           bonuses:[{statKey:'damage_vs_debuffed_pct',label:'Damage vs debuffed enemies',bps:320,valueKind:'percent'},{statKey:'accuracy_pct',label:'Accuracy',bps:240,valueKind:'percent'}]},
        ],
      })}
      labels={{
        title:'Class Synchronization',partyWide:'Party-wide',
        noProgression:'Instant · No levels or affinity grind',
        active:count=>`${count} active`,fullStrength:'Full strength',
        scaledStrength:scale=>`${scale}% strength per link`,
        empty:'No active class links in this party.',
        note:'Does not change Combat Power, queue eligibility or matchmaking priority.',
        combinedCap:'Combined stat cap',
        capLine:(label,raw,effective)=>`${label}: ${raw} → ${effective}`,
      }}
    />

    <Text style={s.section}>{t(language,'coopUi.navigation')}</Text>
    <View accessibilityRole="tablist" style={s.tabs}>{COOP_PRIMARY_TABS.map(tab=><View key={tab} accessibilityRole="tab" accessibilityState={{selected:tab==='World'}} style={[s.tab,tab==='World'&&s.tabSelected]}><Text style={[s.tabText,tab==='World'&&s.tabTextSelected]}>{t(language,tabKey[tab])}</Text></View>)}</View>
    <CoopSharedRunGallery/>
    <CoopQModeTeamGallery/>
  </ExpeditionScreenShell>;
}

const makeStyles=(coopColors:CoopColors)=>StyleSheet.create({
  banner:{...coopTypography.meta,color:coopColors.textSecondary},section:{...coopTypography.section,color:coopColors.gold,marginTop:coopSpacing.sm},stack:{gap:coopSpacing.sm},panelGrid:{flexDirection:'row',flexWrap:'wrap',gap:coopSpacing.sm},panelTitle:{...coopTypography.section,color:coopColors.text},copy:{...coopTypography.body,color:coopColors.textSecondary},error:{...coopTypography.body,color:coopColors.danger,fontWeight:'900'},roleGrid:{flexDirection:'row',flexWrap:'wrap',gap:coopSpacing.sm},chips:{flexDirection:'row',flexWrap:'wrap',gap:coopSpacing.sm},images:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:coopSpacing.md},tabs:{flexDirection:'row',minHeight:68,borderWidth:1,borderColor:coopColors.goldDim,backgroundColor:coopColors.surface},tab:{flex:1,minWidth:0,alignItems:'center',justifyContent:'center',paddingHorizontal:2,borderTopWidth:2,borderTopColor:'transparent'},tabSelected:{backgroundColor:coopColors.surfaceRaised,borderTopColor:coopColors.cyan},tabText:{fontSize:11,lineHeight:15,color:coopColors.textMuted,fontWeight:'800',textAlign:'center',flexShrink:1},tabTextSelected:{color:coopColors.cyan},
});
