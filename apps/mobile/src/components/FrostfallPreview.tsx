import {useState} from 'react';
import {Image, ImageBackground, Pressable, StyleSheet, Text, View} from 'react-native';
import {frostfallPreviewCountdown, frostfallPreviewPhase} from '../content/frostfall-preview';
import {useGameTheme} from '../theme/ThemeContext';
import {Panel} from './Panel';

const HERO = require('../../assets/profile-backgrounds/bg_frostfall.webp');
const SNOWBELL_PUP = require('../../assets/event_collectibles/frostfall_festival/pets/EVT_PET_015_Snowbell_Pup.png');
const FROSTFALL_BADGE = require('../../assets/events/frostfall/badge.png');
const FROSTBELL_TOKEN = require('../../assets/events/frostfall/currency_frostbell_token.png');

type RevealId = 'activity' | 'pet' | 'shop' | 'mystery';

const DETAILS: Record<RevealId, string> = {
  activity: 'Keep the winter roads safe, gather provisions, and craft festival gifts. Seasonal activities open when Frostfall begins.',
  pet: 'Snowbell Pup is a seasonal pet reward on the Frostfall reputation trail. Earn event progress once Frostfall is live.',
  shop: 'Spend Frostbell Tokens and Aurora Chimes on seasonal collectibles and useful event supplies when the event opens.',
  mystery: 'A rare winter visitor remains a secret until Frostfall begins.',
};

/** Read-only teaser. It must never call live-event claim, purchase or activity commands. */
export function FrostfallPreview({startsAtMs, nowMs}: {startsAtMs: number; nowMs: number}) {
  const C = useGameTheme();
  const phase = frostfallPreviewPhase(startsAtMs, nowMs);
  const [selected, setSelected] = useState<RevealId | null>(null);
  if (!phase) return null;
  const secondReveal = phase === 'reveal';
  const tiles: {id: RevealId; icon: string; label: string; sub: string; unlocked: boolean}[] = [
    {id: 'activity', icon: '❄', label: 'Winter Activities', sub: 'Seasonal challenges', unlocked: true},
    {id: 'pet', icon: '✦', label: secondReveal ? 'Snowbell Pup' : 'Hidden Reward', sub: secondReveal ? 'Seasonal pet' : 'Reveals 7 days before', unlocked: secondReveal},
    {id: 'shop', icon: '◆', label: secondReveal ? 'Frostfall Shop' : 'Hidden Feature', sub: secondReveal ? 'Winter collectibles' : 'Reveals 7 days before', unlocked: secondReveal},
    {id: 'mystery', icon: '?', label: 'Winter Mystery', sub: 'Reveals at launch', unlocked: false},
  ];

  return <View style={s.wrapper}>
    <ImageBackground source={HERO} resizeMode="cover" imageStyle={s.heroImage} style={s.hero}>
      <View style={s.shade}/>
      <View style={s.heroContent}>
        <View style={s.heroTop}><Image source={FROSTFALL_BADGE} resizeMode="contain" accessibilityLabel="Frostfall festival badge" style={s.heroBadge}/><Text style={s.heroKicker}>WINTER FESTIVAL · COMING SOON</Text></View>
        <Text style={s.heroTitle}>FROSTFALL</Text>
        <Text style={s.heroText}>Winter bells ring across Asterfall.</Text>
      </View>
    </ImageBackground>
    <View style={[s.countdown, {backgroundColor: C.accentSurface, borderColor: C.lineStrong}]}>
      <View style={s.flex}>
        <Text style={[s.tiny, {color: C.muted}]}>FESTIVAL BEGINS IN</Text>
        <Text accessibilityLabel={'Frostfall begins in ' + frostfallPreviewCountdown(startsAtMs, nowMs)} style={[s.time, {color: C.accent}]}>{frostfallPreviewCountdown(startsAtMs, nowMs)}</Text>
      </View>
      <Text style={[s.date, {color: C.text}]}>{new Intl.DateTimeFormat('en', {day: 'numeric', month: 'short', timeZone: 'UTC'}).format(new Date(startsAtMs))} UTC</Text>
    </View>
    <View style={s.story}>
      <Text style={[s.eyebrow, {color: C.accent}]}>{secondReveal ? 'SECOND REVEAL' : 'A FIRST GLIMPSE'}</Text>
      <Text style={[s.heading, {color: C.text}]}>{secondReveal ? 'The frost reveals its secrets' : 'Something stirs beneath the snow…'}</Text>
      <Text style={[s.description, {color: C.muted}]}>{secondReveal
        ? 'Seasonal rewards and the festival shop have been unveiled. One mystery remains until Frostfall begins.'
        : 'Gather provisions, light the roads, and prepare for a winter celebration. More secrets arrive seven days before the festival.'}</Text>
    </View>
    <View style={s.sectionHeading}>
      <Text style={[s.heading, {color: C.text}]}>What awaits?</Text>
      <Text style={[s.counter, {color: C.muted}]}>{secondReveal ? '3 of 4 revealed' : '1 of 4 revealed'}</Text>
    </View>
    <View style={s.grid}>
      {tiles.map(tile => <Pressable key={tile.id} accessibilityRole="button" accessibilityLabel={tile.label + '. ' + tile.sub} accessibilityState={{selected: selected === tile.id}}
        onPress={() => setSelected(tile.id === selected ? null : tile.id)}
        style={({pressed}) => [s.tile, {backgroundColor: C.panel, borderColor: selected === tile.id ? C.accent : C.line}, pressed && s.pressed]}>
        <View style={[s.symbol, {backgroundColor: tile.unlocked ? C.accentSurface : C.panel2}]}>
          {tile.id === 'pet' && tile.unlocked ? <Image source={SNOWBELL_PUP} resizeMode="contain" style={s.symbolImage}/> :
           tile.id === 'shop' && tile.unlocked ? <Image source={FROSTBELL_TOKEN} resizeMode="contain" style={s.symbolImage}/> :
           <Text style={[s.symbolText, {color: tile.unlocked ? C.accent : C.muted}]}>{tile.unlocked ? tile.icon : '◇'}</Text>}
        </View>
        <Text style={[s.tileName, {color: tile.unlocked ? C.text : C.muted}]}>{tile.label}</Text>
        <Text style={[s.tileDetail, {color: C.muted}]}>{tile.sub}</Text>
      </Pressable>)}
    </View>
    {selected ? <Panel>
      <Text style={[s.detailTitle, {color: C.text}]}>{tiles.find(tile => tile.id === selected)?.label}</Text>
      <Text style={[s.description, {color: C.muted}]}>{tiles.find(tile => tile.id === selected)?.unlocked ? DETAILS[selected] : selected === 'mystery' ? DETAILS.mystery : 'This reveal opens seven days before the event begins.'}</Text>
    </Panel> : null}
    <Panel>
      <View style={s.spotlight}>
        <View style={[s.spotlightArt, {backgroundColor: C.panel2, borderColor: C.line}]}>
          <Image source={SNOWBELL_PUP} resizeMode="contain"
            style={[s.rewardImage, !secondReveal && {tintColor: C.muted, opacity: .22}]}/>
          {!secondReveal ? <Text style={[s.question, {color: C.accent}]}>?</Text> : null}
        </View>
        <View style={s.flex}>
          <Text style={[s.eyebrow, {color: C.accent}]}>FEATURED WINTER COLLECTIBLE</Text>
          <Text style={[s.detailTitle, {color: C.text}]}>{secondReveal ? 'Snowbell Pup' : 'A winter visitor'}</Text>
          <Text style={[s.description, {color: C.muted}]}>{secondReveal ? 'A Frostfall pet, available through seasonal progression once the event starts.' : 'A little winter magic is on its way. Reveal coming soon.'}</Text>
        </View>
      </View>
    </Panel>
    <Text style={[s.disclaimer, {color: C.muted}]}>Preview only · No rewards, purchases or activities unlock until Frostfall begins.</Text>
  </View>;
}

const s = StyleSheet.create({
  wrapper: {gap: 11},
  hero: {height: 184, borderRadius: 13, overflow: 'hidden', justifyContent: 'flex-end'},
  heroImage: {opacity: .83},
  shade: {...StyleSheet.absoluteFill, backgroundColor: 'rgba(6, 20, 35, .37)'},
  heroContent: {gap: 5, padding: 15},
  heroTop: {flexDirection: 'row', alignItems: 'center', gap: 10},
  heroBadge: {width: 48, height: 48},
  heroKicker: {color: '#ddf4ff', fontWeight: '900', letterSpacing: 1, fontSize: 10, flexShrink: 1},
  heroTitle: {color: '#fff', fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: 1.5, textShadowColor: '#0a2033', textShadowRadius: 5, textShadowOffset: {width: 1, height: 2}},
  heroText: {color: '#e6f5ff', fontWeight: '600', fontSize: 12},
  countdown: {flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 12, gap: 10},
  flex: {flex: 1, minWidth: 0},
  tiny: {fontSize: 10, fontWeight: '800', letterSpacing: .9},
  time: {fontSize: 23, fontWeight: '900', marginTop: 2},
  date: {fontSize: 11, fontWeight: '700', textAlign: 'right'},
  story: {gap: 5, paddingVertical: 4},
  eyebrow: {fontSize: 9, lineHeight: 13, fontWeight: '900', letterSpacing: 1},
  heading: {fontSize: 15, lineHeight: 20, fontWeight: '800'},
  description: {fontSize: 12, lineHeight: 18},
  sectionHeading: {flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 3},
  counter: {fontSize: 10},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  tile: {width: '48%', minHeight: 114, borderWidth: 1, borderRadius: 9, padding: 10, gap: 5},
  pressed: {opacity: .75},
  symbol: {height: 36, width: 36, borderRadius: 7, alignItems: 'center', justifyContent: 'center'},
  symbolText: {fontSize: 23, fontWeight: '800'},
  symbolImage: {width: 32, height: 32},
  tileName: {fontSize: 12, fontWeight: '800'},
  tileDetail: {fontSize: 10, lineHeight: 14},
  detailTitle: {fontSize: 13, fontWeight: '900'},
  spotlight: {flexDirection: 'row', gap: 12, alignItems: 'center'},
  spotlightArt: {width: 78, height: 78, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center'},
  rewardImage: {width: 70, height: 70},
  question: {fontSize: 27, fontWeight: '900', position: 'absolute'},
  disclaimer: {fontSize: 10, lineHeight: 15, textAlign: 'center', paddingVertical: 3},
});
