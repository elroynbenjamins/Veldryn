import {useMemo} from 'react';
import {Image, ImageBackground, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {turningPreviewCountdown,turningPreviewPhase,turningSecondRevealCountdown} from '../content/turning-of-the-age-preview';
import {turningPreviewText} from '../i18n/turning-of-the-age-preview';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {formatLocalizedDate} from '../i18n/translator';
import {GameThemeScope,useGameTheme} from '../theme/ThemeContext';
import {eventTheme} from '../theme/event-palette';
import {Panel} from './Panel';

const HERO=require('../../assets/card-backgrounds/cosmic_gate_wide_v2.webp');
const BADGE=require('../../assets/events/turning_of_the_age/badge.png');
const CHRONICLE_WISP=require('../../assets/event_collectibles/turning_of_the_age/pets/EVT_PET_001_Chronicle_Wisp.png');

/** Schedule-gated, read-only event preview. It never exposes reward or purchase commands. */
export function TurningOfTheAgePreview(props:{startsAtMs:number;nowMs:number}){
  const base=useGameTheme();
  const colors=useMemo(()=>eventTheme(base,{accent:'#e4bd63',visualKey:'turning_of_the_age'}),[base]);
  return <GameThemeScope colors={colors}><TurningPreviewContent {...props}/></GameThemeScope>;
}

function TurningPreviewContent({startsAtMs,nowMs}:{startsAtMs:number;nowMs:number}){
  const C=useGameTheme(),language=useGameLanguage();
  const t=(key:Parameters<typeof turningPreviewText>[1],params?:Record<string,string|number>)=>turningPreviewText(language,key,params);
  const {width,fontScale}=useWindowDimensions();
  const narrow=width<385||fontScale>=1.2;
  const phase=turningPreviewPhase(startsAtMs,nowMs);
  if(!phase)return null;
  const revealed=phase==='reveal';
  const revealIn=turningSecondRevealCountdown(startsAtMs,nowMs);
  const starts=formatLocalizedDate(language,startsAtMs,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'UTC'});
  const cards=[
    {id:'focus',symbol:'◷',title:t('focus'),detail:t('focusSub'),unlocked:true},
    {id:'vault',symbol:'✧',title:revealed?t('vault'):t('hidden'),detail:revealed?t('vaultSub'):t('locked',{time:revealIn}),unlocked:revealed},
    {id:'pet',symbol:'✦',title:revealed?t('pet'):t('hidden'),detail:revealed?t('petSub'):t('locked',{time:revealIn}),unlocked:revealed},
    {id:'mystery',symbol:'?',title:t('mystery'),detail:t('mysterySub'),unlocked:false},
  ] as const;
  return <View style={s.wrapper} accessibilityLabel={t('previewOnly')}>
    <ImageBackground source={HERO} style={s.hero} imageStyle={s.heroImage} resizeMode="cover">
      <View style={s.shade}/>
      <View style={s.heroBody}>
        <View style={s.heroTop}><Image source={BADGE} resizeMode="contain" style={s.badge}/><Text style={s.kicker}>{t('kicker')}</Text></View>
        <Text accessibilityRole="header" style={s.title}>TURNING OF THE AGE</Text>
        <Text style={s.tagline}>{t('tagline')}</Text>
      </View>
    </ImageBackground>
    <View style={[s.countdown,narrow&&s.countdownNarrow,{backgroundColor:C.accentSurface,borderColor:C.lineStrong}]}>
      <View style={s.flex}>
        <Text style={[s.tiny,{color:C.muted}]}>{t('begins')}</Text>
        <Text style={[s.time,{color:C.accent}]}>{turningPreviewCountdown(startsAtMs,nowMs)}</Text>
      </View>
      <Text style={[s.date,narrow&&s.dateNarrow,{color:C.text}]}>{starts} UTC</Text>
    </View>
    <View style={s.story}>
      <Text style={[s.heading,{color:C.text}]}>{revealed?t('secondTitle'):t('firstTitle')}</Text>
      <Text style={[s.paragraph,{color:C.muted}]}>{revealed?t('secondCopy'):t('firstCopy')}</Text>
    </View>
    <View style={s.grid}>
      {cards.map(card=><View key={card.id} accessibilityLabel={card.title+'. '+card.detail} style={[s.tile,narrow&&s.tileNarrow,{backgroundColor:C.panel,borderColor:card.unlocked?C.lineStrong:C.line}]}>
        <View style={[s.symbol,{backgroundColor:card.unlocked?C.accentSurface:C.panel2}]}>
          {card.id==='pet'&&revealed?<Image source={CHRONICLE_WISP} style={s.symbolArt} resizeMode="contain"/>:<Text style={[s.symbolText,{color:card.unlocked?C.accent:C.muted}]}>{card.unlocked?card.symbol:'◇'}</Text>}
        </View>
        <View style={s.flex}><Text style={[s.tileName,{color:card.unlocked?C.text:C.muted}]}>{card.title}</Text>
        <Text style={[s.tileDetail,{color:C.muted}]}>{card.detail}</Text></View>
      </View>)}
    </View>
    <Panel>
      <View style={s.spotlight}>
        <View style={[s.spotlightArt,{borderColor:C.line,backgroundColor:C.panel2}]}>
          {revealed?<Image source={CHRONICLE_WISP} style={s.petArt} resizeMode="contain"/>:<Text style={[s.question,{color:C.accent}]}>?</Text>}
        </View>
        <View style={s.flex}>
          <Text style={[s.tiny,{color:C.accent}]}>{t('featured')}</Text>
          <Text style={[s.heading,{color:C.text}]}>{revealed?t('pet'):t('hidden')}</Text>
          <Text style={[s.paragraph,{color:C.muted}]}>{revealed?t('spotlight'):t('hiddenSpotlight')}</Text>
        </View>
      </View>
    </Panel>
    {revealed?<Text style={[s.currency,{color:C.muted}]}>{t('shop')}</Text>:null}
    <Text style={[s.disclaimer,{color:C.muted}]}>{t('previewOnly')}</Text>
  </View>;
}

const s=StyleSheet.create({
  wrapper:{gap:11},
  hero:{minHeight:188,borderRadius:13,overflow:'hidden',justifyContent:'flex-end'},
  heroImage:{opacity:.85},
  shade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(9,13,32,.55)'},
  heroBody:{padding:15,gap:6},
  heroTop:{flexDirection:'row',alignItems:'center',gap:9},
  badge:{height:46,width:46},
  kicker:{fontSize:10,fontWeight:'900',color:'#ffe6a4',letterSpacing:.8,flexShrink:1},
  title:{fontSize:26,lineHeight:32,fontWeight:'900',color:'#fff2ce',letterSpacing:1},
  tagline:{fontSize:12,lineHeight:18,fontWeight:'600',color:'#f0e6dc'},
  countdown:{flexDirection:'row',alignItems:'center',padding:12,borderRadius:10,borderWidth:1,gap:10},
  countdownNarrow:{flexWrap:'wrap'},
  flex:{flex:1,minWidth:0},
  tiny:{fontSize:10,fontWeight:'800',letterSpacing:.7},
  time:{fontSize:23,fontWeight:'900',marginTop:2},
  date:{fontSize:11,fontWeight:'700',textAlign:'right'},
  dateNarrow:{textAlign:'left'},
  story:{gap:5,paddingVertical:5},
  heading:{fontSize:15,lineHeight:20,fontWeight:'800'},
  paragraph:{fontSize:12,lineHeight:18},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  tile:{flexBasis:'48%',flexGrow:1,minWidth:0,minHeight:95,borderWidth:1,borderRadius:9,padding:10,flexDirection:'row',gap:8,alignItems:'flex-start'},
  tileNarrow:{flexBasis:'100%',minHeight:65},
  symbol:{width:34,height:34,borderRadius:7,alignItems:'center',justifyContent:'center'},
  symbolText:{fontSize:22,fontWeight:'900'},
  symbolArt:{width:32,height:32},
  tileName:{fontSize:12,fontWeight:'800',flexShrink:1},
  tileDetail:{fontSize:10,lineHeight:14,marginTop:3},
  spotlight:{flexDirection:'row',alignItems:'center',gap:12},
  spotlightArt:{width:72,height:72,borderRadius:9,borderWidth:1,alignItems:'center',justifyContent:'center'},
  petArt:{width:66,height:66},
  question:{fontSize:30,fontWeight:'900'},
  currency:{fontSize:11,textAlign:'center',fontWeight:'800'},
  disclaimer:{fontSize:10,lineHeight:15,textAlign:'center',paddingVertical:3},
});
