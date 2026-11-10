import {useMemo,useState} from 'react';
import {Image, ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {frostfallPreviewCountdown, frostfallPreviewPhase, frostfallSecondRevealCountdown} from '../content/frostfall-preview';
import {GameThemeScope,useGameTheme} from '../theme/ThemeContext';
import {eventTheme} from '../theme/event-palette';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {formatLocalizedDate} from '../i18n/translator';
import {frostfallPreviewText,type FrostfallPreviewCopyKey} from '../i18n/frostfall-preview';
import {Panel} from './Panel';

const HERO = require('../../assets/profile-backgrounds/bg_frostfall.webp');
const SNOWBELL_PUP = require('../../assets/event_collectibles/frostfall_festival/pets/EVT_PET_015_Snowbell_Pup.png');
const FROSTFALL_BADGE = require('../../assets/events/frostfall/badge.png');

type RevealId = 'activity' | 'pet' | 'shop' | 'mystery';

const DETAILS: Record<RevealId, FrostfallPreviewCopyKey> = {
  activity: 'detailActivity',
  pet: 'detailPet',
  shop: 'detailShop',
  mystery: 'detailMystery',
};

/** Read-only teaser. It must never call live-event claim, purchase or activity commands. */
export function FrostfallPreview(props: {startsAtMs: number; nowMs: number}) {
  const base = useGameTheme();
  const winterColors = useMemo(() => eventTheme(base, {accent: '#9be7ff', visualKey: 'frostfall'}), [base]);
  return <GameThemeScope colors={winterColors}><FrostfallPreviewContent {...props}/></GameThemeScope>;
}

function FrostfallPreviewContent({startsAtMs, nowMs}: {startsAtMs: number; nowMs: number}) {
  const C = useGameTheme();
  const language = useGameLanguage();
  const t = (key: FrostfallPreviewCopyKey, params?: Record<string,string|number>) => frostfallPreviewText(language,key,params);
  const {width, fontScale} = useWindowDimensions();
  const stacked = width < 385 || fontScale >= 1.2;
  const phase = frostfallPreviewPhase(startsAtMs, nowMs);
  const [selected, setSelected] = useState<RevealId | null>(null);
  if (!phase) return null;
  const secondReveal = phase === 'reveal';
  const nextReveal = frostfallSecondRevealCountdown(startsAtMs, nowMs);
  const startDate = formatLocalizedDate(language,startsAtMs,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'UTC'});
  const tiles: {id: RevealId; icon: string; label: string; sub: string; unlocked: boolean}[] = [
    {id: 'activity', icon: '❄', label: t('activity'), sub: t('activitySub'), unlocked: true},
    {id: 'pet', icon: '✦', label: secondReveal ? t('pet') : t('hiddenReward'), sub: secondReveal ? t('milestone') : t('unlockIn',{time:nextReveal}), unlocked: secondReveal},
    {id: 'shop', icon: '✧', label: secondReveal ? t('shop') : t('hiddenFeature'), sub: secondReveal ? t('collectibles') : t('unlockIn',{time:nextReveal}), unlocked: secondReveal},
    {id: 'mystery', icon: '?', label: t('mystery'), sub: t('launchReveal'), unlocked: false},
  ];

  return <View style={s.wrapper} accessibilityLabel={t('previewOnly')}>
    <ImageBackground source={HERO} resizeMode="cover" imageStyle={s.heroImage} style={s.hero}>
      <View style={s.shade}/>
      <View style={s.heroContent}>
        <View style={s.heroTop}><Image source={FROSTFALL_BADGE} accessible={false} resizeMode="contain" style={s.heroBadge}/><Text style={s.heroKicker}>{t('kicker')}</Text></View>
        <Text accessibilityRole="header" style={s.heroTitle}>FROSTFALL</Text>
        <Text style={s.heroText}>{t('tagline')}</Text>
      </View>
    </ImageBackground>
    <View style={[s.countdown, stacked && s.countdownStack, {backgroundColor: C.accentSurface, borderColor: C.lineStrong}]}>
      <View style={s.flex}>
        <Text style={[s.tiny, {color: C.muted}]}>{t('begins')}</Text>
        <Text accessibilityLabel={t('beginsAccessibility',{time:frostfallPreviewCountdown(startsAtMs, nowMs)})} style={[s.time, {color: C.accent}]}>{frostfallPreviewCountdown(startsAtMs, nowMs)}</Text>
      </View>
      <Text style={[s.date, stacked && s.dateStack, {color: C.text}]}>{startDate} UTC</Text>
    </View>
    <View style={s.story}>
      <Text style={[s.eyebrow, {color: C.accent}]}>{secondReveal ? t('secondKicker') : t('firstKicker')}</Text>
      <Text style={[s.heading, {color: C.text}]}>{secondReveal ? t('secondTitle') : t('firstTitle')}</Text>
      <Text style={[s.description, {color: C.muted}]}>{secondReveal ? t('secondCopy') : t('firstCopy')}</Text>
    </View>
    <View style={s.sectionHeading}>
      <Text style={[s.heading, {color: C.text}]}>{t('awaits')}</Text>
      <Text style={[s.counter, {color: C.muted}]}>{t('revealed',{count:secondReveal?3:1})}</Text>
    </View>
    <View style={s.grid}>
      {tiles.map(tile => <Pressable key={tile.id} accessibilityRole="button" disabled={!tile.unlocked} accessibilityLabel={(tile.unlocked ? '' : t('locked') + ' ') + tile.label + '. ' + tile.sub} accessibilityState={{selected: selected === tile.id, disabled: !tile.unlocked}}
        onPress={() => setSelected(tile.id === selected ? null : tile.id)}
        style={({pressed}) => [s.tile, stacked && s.tileStack, {backgroundColor: C.panel, borderColor: selected === tile.id ? C.accent : C.line}, pressed && s.pressed]}>
        <View style={[s.symbol, {backgroundColor: tile.unlocked ? C.accentSurface : C.panel2}]}>
          {tile.id === 'pet' && tile.unlocked ? <Image source={SNOWBELL_PUP} accessible={false} resizeMode="contain" style={s.symbolImage}/> :
           <Text style={[s.symbolText, {color: tile.unlocked ? C.accent : C.muted}]}>{tile.unlocked ? tile.icon : '◇'}</Text>}
        </View>
        <View style={s.tileCopy}><Text style={[s.tileName, {color: tile.unlocked ? C.text : C.muted}]}>{tile.label}</Text>
        <Text style={[s.tileDetail, {color: C.muted}]}>{tile.sub}</Text></View>
      </Pressable>)}
    </View>
    {selected ? <Panel>
      <View style={s.detailHeading}><Text style={[s.detailTitle, {color: C.text}]}>{tiles.find(tile => tile.id === selected)?.label}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('closeDetail')} onPress={() => setSelected(null)} style={s.closeDetail}><Text style={[s.closeLabel, {color: C.muted}]}>✕</Text></Pressable></View>
      <Text style={[s.description, {color: C.muted}]}>{t(DETAILS[selected])}</Text>
    </Panel> : null}
    <Panel>
      <View style={s.spotlight}>
        <View style={[s.spotlightArt, {backgroundColor: C.panel2, borderColor: C.line}]}>
          {secondReveal ? <Image source={SNOWBELL_PUP} accessible={false} resizeMode="contain" style={s.rewardImage}/> : <Text style={[s.question, {color: C.accent}]}>?</Text>}
        </View>
        <View style={s.flex}>
          <Text style={[s.eyebrow, {color: C.accent}]}>{t('featured')}</Text>
          <Text style={[s.detailTitle, {color: C.text}]}>{secondReveal ? t('pet') : t('visitor')}</Text>
          <Text style={[s.description, {color: C.muted}]}>{secondReveal ? t('petShort') : t('visitorShort')}</Text>
        </View>
      </View>
    </Panel>
    <Text style={[s.disclaimer, {color: C.muted}]}>{t('previewOnly')}</Text>
  </View>;
}

const s = StyleSheet.create({
  wrapper: {gap: 11},
  hero: {minHeight: 184, borderRadius: 13, overflow: 'hidden', justifyContent: 'flex-end'},
  heroImage: {opacity: .83},
  shade: {...StyleSheet.absoluteFill, backgroundColor: 'rgba(6, 20, 35, .37)'},
  heroContent: {gap: 5, padding: 15},
  heroTop: {flexDirection: 'row', alignItems: 'center', gap: 10},
  heroBadge: {width: 48, height: 48},
  heroKicker: {color: '#ddf4ff', fontWeight: '900', letterSpacing: 1, fontSize: 10, flexShrink: 1},
  heroTitle: {color: '#fff', fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: 1.5, textShadowColor: '#0a2033', textShadowRadius: 5, textShadowOffset: {width: 1, height: 2}},
  heroText: {color: '#e6f5ff', fontWeight: '600', fontSize: 12},
  countdown: {flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 12, gap: 10},
  countdownStack: {flexWrap: 'wrap'},
  flex: {flex: 1, minWidth: 0},
  tiny: {fontSize: 10, fontWeight: '800', letterSpacing: .9},
  time: {fontSize: 23, fontWeight: '900', marginTop: 2},
  date: {fontSize: 11, fontWeight: '700', textAlign: 'right'},
  dateStack: {textAlign: 'left'},
  story: {gap: 5, paddingVertical: 4},
  eyebrow: {fontSize: 9, lineHeight: 13, fontWeight: '900', letterSpacing: 1},
  heading: {fontSize: 15, lineHeight: 20, fontWeight: '800'},
  description: {fontSize: 12, lineHeight: 18},
  sectionHeading: {flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 3},
  counter: {fontSize: 10},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  tile: {flexBasis: '48%', flexGrow: 1, minWidth: 0, minHeight: 114, borderWidth: 1, borderRadius: 9, padding: 10, gap: 5},
  tileStack: {flexBasis: '100%', minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10},
  tileCopy: {flex: 1, minWidth: 0, gap: 3},
  pressed: {opacity: .75},
  symbol: {height: 36, width: 36, borderRadius: 7, alignItems: 'center', justifyContent: 'center'},
  symbolText: {fontSize: 23, fontWeight: '800'},
  symbolImage: {width: 32, height: 32},
  tileName: {fontSize: 12, fontWeight: '800'},
  tileDetail: {fontSize: 10, lineHeight: 14},
  detailTitle: {fontSize: 13, fontWeight: '900', flexShrink: 1},
  detailHeading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  closeDetail: {minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center'},
  closeLabel: {fontSize: 16, fontWeight: '800'},
  spotlight: {flexDirection: 'row', gap: 12, alignItems: 'center'},
  spotlightArt: {width: 78, height: 78, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center'},
  rewardImage: {width: 70, height: 70},
  question: {fontSize: 27, fontWeight: '900', position: 'absolute'},
  disclaimer: {fontSize: 10, lineHeight: 15, textAlign: 'center', paddingVertical: 3},
});
