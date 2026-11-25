#!/usr/bin/env python3
"""Veldryn original game audio: deterministic retro synthesis.

Renders sound effects and fallback music from deterministic synthesis. Selected
production recordings are separate, locked assets; five use TimGM6mb. See
 docs/roadmap/selected-music-sample-rights-evidence.md for provenance.

    python3 tools/audio/generate-game-audio.py --only sfx # preserves selected music
    python3 tools/audio/generate-game-audio.py --only sfx # effects only

Requires numpy and ffmpeg (libmp3lame). Output: mono MP3, effects 22.05 kHz / 64 kbps,
music 32 kHz / 80 kbps. Music loops are rendered with their release tails wrapped to
the start so they loop seamlessly.
"""
import argparse, json, os, subprocess, sys, tempfile, wave
import numpy as np

SR = 44100
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'apps', 'mobile', 'assets', 'audio')

# ----------------------------------------------------------------------------- primitives
class Sig(np.ndarray):
    """Audio buffer whose + and - pad the shorter operand, so layered sounds of
    different lengths can be summed directly."""
    def _pad(self, other):
        a = np.asarray(self); b = np.asarray(other)
        if b.ndim == 0 or a.shape == b.shape: return a, b
        n = max(len(a), len(b))
        return np.pad(a, (0, n - len(a))), np.pad(b, (0, n - len(b)))
    def __add__(self, other): a, b = self._pad(other); return (a + b).view(Sig)
    __radd__ = __add__
    def __sub__(self, other): a, b = self._pad(other); return (a - b).view(Sig)
def sig(x): return np.asarray(x, float).view(Sig)

def t_axis(dur): return np.arange(int(SR * dur)) / SR

def osc(freq, dur, wave='square', duty=0.5, vibrato=0.0, vib_rate=5.5, phase=0.0):
    """freq may be a scalar or an array (pitch slides)."""
    n = int(SR * dur)
    f = np.full(n, float(freq)) if np.isscalar(freq) else np.asarray(freq, float)[:n]
    if vibrato:
        f = f * (1 + vibrato * np.sin(2 * np.pi * vib_rate * t_axis(dur)[:n]))
    ph = (np.cumsum(f) / SR + phase) % 1.0
    if wave == 'square': return sig(np.where(ph < duty, 1.0, -1.0) - (2 * duty - 1))  # centered: no DC offset
    if wave == 'triangle': return sig(4 * np.abs(ph - 0.5) - 1)
    if wave == 'saw': return sig(2 * ph - 1)
    if wave == 'sine': return sig(np.sin(2 * np.pi * ph))
    raise ValueError(wave)

_rng = np.random.default_rng(1886)
def noise(dur, color=0.0):
    n = sig(_rng.uniform(-1, 1, int(SR * dur)))
    return lowpass(n, color) if color else n

def lowpass(x, amount):
    """One-pole lowpass; amount 0..1 (higher = darker)."""
    a = float(np.clip(amount, 0, 0.995)); y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc = acc * a + v * (1 - a); y[i] = acc
    return sig(y)

def highpass(x, amount): return sig(np.asarray(x) - np.asarray(lowpass(x, amount)))

def env(dur, a=0.005, d=0.05, s=0.6, r=0.1, curve=1.0):
    n = int(SR * dur); e = np.zeros(n); ia, idd, ir = int(SR*a), int(SR*d), int(SR*r)
    ia = min(ia, n); e[:ia] = np.linspace(0, 1, ia, endpoint=False) if ia else e[:ia]
    end_d = min(n, ia + idd); e[ia:end_d] = np.linspace(1, s, end_d - ia, endpoint=False)
    e[end_d:] = s
    if ir: rr = min(ir, n); e[n-rr:] *= np.linspace(1, 0, rr) ** curve
    return e

def decay(dur, k=8.0): return sig(np.exp(-k * t_axis(dur)))

def slide(f0, f1, dur, shape=1.0):
    x = np.linspace(0, 1, int(SR * dur)) ** shape
    return f0 * (f1 / f0) ** x

def mix(*parts):
    n = max(int(SR * at) + len(p) for at, p in parts); out = np.zeros(n)
    for at, p in parts:
        i = int(SR * at)
        if i < n: seg = np.asarray(p)[:n - i]; out[i:i+len(seg)] += seg
    return sig(out)

def place(total, items):
    out = np.zeros(int(SR * total) + SR * 4)
    for at, p in items:
        i = int(SR * at); out[i:i+len(p)] += p
    return out

def bell(freq, dur, k=5.0, partials=((1, 1), (2.76, .5), (5.4, .25), (8.93, .12))):
    t = t_axis(dur); return sig(sum(a * np.sin(2*np.pi*freq*m*t) * np.exp(-k*m**.5*t) for m, a in partials))

def metal(freq, dur, k=7.0): return bell(freq, dur, k, ((1, 1), (1.59, .7), (2.14, .5), (2.83, .35), (3.9, .2)))

def thump(f0=120, f1=40, dur=0.25, k=12): return sig(np.sin(2*np.pi*np.cumsum(slide(f0, f1, dur, .5))/SR)) * decay(dur, k)

def note(n): return 440.0 * 2 ** ((n - 69) / 12)  # MIDI number -> Hz

def normalize(x, peak=0.89):
    m = np.max(np.abs(x)) or 1.0; return x / m * peak

def trim(x, floor=1e-4):
    idx = np.nonzero(np.abs(x) > floor)[0]
    return x[:idx[-1] + 1] if len(idx) else x

def fade_tail(x, ms=12):
    n = min(len(x), int(SR * ms / 1000)); x = x.copy(); x[-n:] *= np.linspace(1, 0, n); return x

# ----------------------------------------------------------------------------- sound effects
def tone(n, dur, wave='square', duty=.5, k=10, vol=1.0, **kw):
    return osc(note(n), dur, wave, duty, **kw) * decay(dur, k) * vol

def seq(notes, step, dur=None, **kw):
    dur = dur or step * 1.4
    return mix(*[(i * step, tone(n, dur, **kw)) for i, n in enumerate(notes)])

SFX = {}
def sfx(name, volume=1.0):
    def wrap(fn): SFX[name] = (fn, volume); return fn
    return wrap

# UI
@sfx('ui_tap', .45)
def _(): return osc(slide(1500, 900, .035), .035, 'sine') * decay(.035, 60)
@sfx('ui_confirm', .6)
def _(): return seq([84, 91], .055, .09, wave='triangle', k=26)
@sfx('ui_back', .55)
def _(): return seq([86, 79], .05, .08, wave='triangle', k=28)
@sfx('ui_error', .6)
def _(): return seq([52, 47], .09, .14, wave='square', duty=.25, k=14)
@sfx('ui_toggle', .45)
def _(): return osc(note(88), .025, 'square', .5) * decay(.025, 80) * .6
@sfx('unlock', .75)
def _():
    sparkle = mix(*[(i*.07, bell(note(n), .7, 6)) for i, n in enumerate([84, 88, 91, 96])])
    return sparkle + mix((0, highpass(noise(.5), .6) * decay(.5, 7) * .12))
# Rewards
@sfx('reward_collect', .7)
def _(): return seq([83, 88], .075, .25, wave='square', duty=.25, k=11)
@sfx('rare_drop', .8)
def _():
    arp = seq([79, 83, 86, 90, 95], .055, .22, wave='triangle', k=9)
    return mix((0, arp), (.28, bell(note(95), 1.0, 4) * .8))
@sfx('level_up', .85)
def _():
    lead = mix(*[(i*.11, tone(n, .16, 'square', .5, 9)) for i, n in enumerate([72, 76, 79])],
               (.33, osc(note(84), .9, 'square', .5, vibrato=.012) * env(.9, .005, .1, .7, .4)))
    harm = mix(*[(i*.11, tone(n, .16, 'triangle', k=9, vol=.6)) for i, n in enumerate([64, 67, 72])],
               (.33, osc(note(76), .9, 'triangle') * env(.9, .005, .1, .7, .4) * .6))
    return lead * .6 + harm
@sfx('quest_complete', .75)
def _(): return mix((0, seq([76, 79, 84], .09, .2, wave='square', duty=.25, k=8)), (.27, bell(note(88), .8, 5) * .7))
# Combat (CombatImpactBurst kinds)
@sfx('hit', .7)
def _(): return lowpass(noise(.12), .55) * decay(.12, 30) * .9 + thump(140, 50, .14, 18) * .8
@sfx('crit', .8)
def _():
    return (noise(.2) * decay(.2, 18) * .7 + osc(slide(900, 180, .18), .18, 'square', .3) * decay(.18, 14) * .45
            + thump(170, 45, .22, 12))
@sfx('heal', .6)
def _(): return mix(*[(i*.06, bell(note(n), .4, 9) * .7) for i, n in enumerate([79, 84, 88, 91])])
@sfx('shield', .6)
def _(): return metal(620, .45, 9) * .8 + osc(slide(400, 700, .2), .2, 'triangle') * decay(.2, 12) * .3
@sfx('interrupt', .7)
def _(): return osc(slide(1400, 200, .2), .2, 'square', .25) * decay(.2, 10) * .6 + highpass(noise(.1), .3) * decay(.1, 40) * .5
@sfx('phase', .8)
def _():
    whoosh = lowpass(noise(.7), .9) * env(.7, .4, .1, .8, .25) * 1.4
    return mix((0, thump(90, 30, .6, 5) * 1.1), (0, whoosh))
@sfx('cast', .55)
def _(): return osc(slide(220, 880, .4, .7), .4, 'saw') * env(.4, .05, .1, .7, .15) * .35 + mix(*[(.08*i, bell(note(n), .3, 10) * .3) for i, n in enumerate([84, 91])])
@sfx('down', .7)
def _(): return mix((0, osc(slide(400, 80, .5), .5, 'square', .5) * decay(.5, 5) * .5), (.35, thump(100, 35, .3, 10)))
@sfx('victory', .85)
def _():
    m = [(0, 72), (.12, 76), (.24, 79), (.42, 84)]
    lead = mix(*[(t, tone(n, .4 if i < 3 else 1.0, 'square', .5, 5 if i < 3 else 2.2)) for i, (t, n) in enumerate(m)])
    bass = mix((0, tone(48, .4, 'triangle', k=4)), (.42, tone(48, 1.0, 'triangle', k=2)))
    return lead * .55 + bass * .7 + mix((.42, bell(note(96), 1.2, 3) * .35))
@sfx('defeat', .75)
def _():
    lead = mix(*[(i*.22, tone(n, .5, 'square', .5, 4)) for i, n in enumerate([67, 63, 60, 55])])
    return lead * .5 + mix((.66, tone(43, .9, 'triangle', k=2.5) * .8))
# Crafting & gathering
@sfx('craft_complete', .75)
def _(): return mix((0, metal(880, .6, 6)), (0, highpass(noise(.06), .2) * decay(.06, 60) * .6), (.12, bell(note(91), .6, 6) * .4))
@sfx('upgrade_success', .8)
def _(): return mix((0, metal(700, .4, 8) * .7), (.12, seq([79, 84, 88, 91, 96], .05, .2, wave='triangle', k=10)), (.4, bell(note(96), 1.0, 4) * .6))
@sfx('upgrade_fail', .7)
def _(): return mix((0, thump(110, 40, .3, 9)), (0, lowpass(noise(.25), .7) * decay(.25, 14) * .6), (.12, seq([60, 55], .12, .3, wave='triangle', k=8) * .6))
@sfx('mine_hit', .4)
def _(): return highpass(noise(.06), .2) * decay(.06, 70) * .8 + metal(1600, .18, 22) * .35
@sfx('chop_hit', .4)
def _(): return lowpass(noise(.12), .75) * decay(.12, 35) * 1.2 + thump(220, 110, .08, 40) * .5
@sfx('fish_splash', .45)
def _():
    n = noise(.45); sweep = np.concatenate([lowpass(n[:len(n)//2], .5), lowpass(n[len(n)//2:], .85)])
    return sweep * env(.45, .01, .1, .5, .3)
@sfx('gather_yield', .55)
def _(): return mix((0, tone(86, .12, 'square', .25, 18)), (.05, tone(93, .18, 'triangle', k=14)))
# World boss
@sfx('boss_entrance', .9)
def _():
    rumble = lowpass(noise(2.6), .985) * env(2.6, 1.2, .3, .9, .9) * 3
    chord = sum(osc(note(n), 2.4, 'saw') for n in (33, 40, 45)) * env(2.4, 1.0, .3, .8, .8) * .18
    return mix((0, rumble), (.2, lowpass(chord, .8)), (1.9, thump(70, 28, .8, 3) * 1.2))
@sfx('boss_telegraph', .7)
def _(): return mix(*[(i*.2, osc(note(76 if i % 2 == 0 else 71), .16, 'triangle') * env(.16, .005, .02, .9, .05) * .8) for i in range(4)])
@sfx('boss_special', .95)
def _():
    hit = noise(1.0) * decay(1.0, 4.5) * .8 + thump(95, 25, 1.0, 3.5) * 1.3
    return np.tanh(lowpass(hit, .4) * 2.2)
@sfx('guard_break', .85)
def _():
    shards = mix(*[(i*.035, highpass(noise(.12), .1) * decay(.12, 30) * (.9 - i*.08)) for i in range(7)])
    return mix((0, shards), (.05, mix(*[(i*.06, bell(note(n), .5, 7) * .4) for i, n in enumerate([96, 91, 86, 81])])))
@sfx('role_moment', .75)
def _(): return mix((0, seq([79, 84, 88], .07, .25, wave='square', duty=.25, k=8) * .7), (.21, bell(note(91), .8, 4) * .6))
@sfx('world_hp_drop', .8)
def _(): return mix((0, osc(slide(600, 90, 1.4, .6), 1.4, 'saw') * env(1.4, .02, .2, .6, .5) * .25), (0, lowpass(noise(1.6), .97) * env(1.6, .3, .2, .8, .6) * 1.6))
@sfx('killing_blow', .95)
def _():
    boom = np.tanh((noise(1.4) * decay(1.4, 3) * .7 + thump(80, 22, 1.6, 2.2) * 1.5) * 1.8)
    fan = mix(*[(.5 + i*.12, tone(n, .5 if i < 3 else 1.4, 'square', .5, 4 if i < 3 else 1.6)) for i, n in enumerate([72, 76, 79, 84])])
    return mix((0, boom), (0, fan * .5), (.86, bell(note(96), 1.6, 2.5) * .4))
@sfx('honor', .7)
def _(): return mix(*[(i*.09, bell(note(n), .6, 6) * .7) for i, n in enumerate([84, 88, 91])])
@sfx('tonic', .6)
def _(): return mix(*[(i*.06, osc(slide(note(60+i*5), note(67+i*5), .08), .08, 'sine') * decay(.08, 25)) for i in range(6)])

# Rarity reveal stingers: play once the reveal card has landed, escalating epic -> legendary -> mythic.
def echo(x, delay=.11, feedback=.35, repeats=4):
    """Cheap feedback echo so stingers ring out instead of stopping dead."""
    x = sig(x); out = sig(np.zeros(len(x) + int(SR * delay * repeats)))
    for i in range(repeats + 1):
        start = int(SR * delay * i); out[start:start + len(x)] += np.asarray(x) * feedback ** i
    return out

def swell(dur, lo=.35, hi=.85):
    """Rising filtered-noise whoosh that leads into the reveal hit."""
    n = noise(dur); ramp = sig(np.linspace(0, 1, len(n)) ** 2)
    return (lowpass(n, hi) * (1 - ramp) + highpass(n, lo) * ramp) * ramp

def pad(notes, dur, detune=.006, a=.04, r=.5):
    """Soft detuned chord, a little choir-like, for the bigger reveals."""
    voices = [osc(note(n) * (1 + d), dur, 'saw') for n in notes for d in (-detune, 0, detune)]
    return lowpass(mix(*[(0, v) for v in voices]), .82) * env(dur, a, .2, .65, r) * (1 / len(voices))

@sfx('rarity_epic', .85)
def _():
    lead = mix((0, swell(.22) * .35), (.2, thump(150, 55, .22, 12) * .55))
    chord = mix(*[(.2 + i*.035, bell(note(n), 1.0, 4.5) * .55) for i, n in enumerate([76, 80, 83, 88])])
    sparkle = mix(*[(.42 + i*.05, bell(note(n), .4, 9) * .3) for i, n in enumerate([95, 92, 100])])
    return echo(mix((0, lead), (0, chord), (0, sparkle)), .12, .28, 3)

@sfx('rarity_legendary', .9)
def _():
    lead = mix((0, swell(.3) * .4), (.28, thump(120, 40, .35, 9) * .8))
    fanfare = mix(*[(.28 + i*.1, tone(n, .14, 'square', .35, 10, .5)) for i, n in enumerate([67, 72, 76])],
                  (.58, osc(note(79), 1.1, 'square', .35, vibrato=.01) * env(1.1, .01, .15, .6, .5) * .4))
    body = mix((.58, pad([67, 71, 74, 79], 1.2) * 1.6),
               *[(.58 + i*.06, bell(note(n), 1.1, 4) * .45) for i, n in enumerate([83, 86, 91, 95])])
    return echo(mix((0, lead), (0, fanfare), (0, body)), .13, .3, 4)

@sfx('rarity_mythic', .95)
def _():
    rise = mix((0, swell(.5, .3, .9) * .45), (0, osc(slide(55, 110, .5, .6), .5, 'sine') * env(.5, .3, .05, .9, .05) * .5))
    hit = mix((.48, thump(100, 30, .6, 6)), (.48, lowpass(noise(.35), .8) * decay(.35, 10) * .45))
    choir = mix((.48, pad([62, 66, 69, 73, 76], 1.9, .008, .06, .8) * 2.0))
    cascade = mix(*[(.5 + i*.055, bell(note(n), .9, 5) * .4) for i, n in enumerate([86, 90, 93, 97, 100, 105])])
    crown = mix((1.0, bell(note(98), 1.6, 2.4) * .5), (1.0, bell(note(105), 1.4, 3) * .25))
    return echo(mix((0, rise), (0, hit), (0, choir), (0, cascade), (0, crown)), .14, .32, 5)
# (Registered last: noise() draws from one seeded stream, so earlier effects stay byte-identical.)

# ----------------------------------------------------------------------------- music
SCALES = {'major': [0, 2, 4, 5, 7, 9, 11], 'minor': [0, 2, 3, 5, 7, 8, 10], 'dorian': [0, 2, 3, 5, 7, 9, 10],
          'phrygian_dom': [0, 1, 4, 5, 7, 8, 10], 'mixolydian': [0, 2, 4, 5, 7, 9, 10]}
TRACKS = {
    # name: tempo, root midi, scale, progression (scale degrees per bar), lead duty, energy, seed
    'asterfall':   dict(bpm=100, root=62, scale='mixolydian',   prog=[0, 6, 3, 0, 0, 6, 4, 4], duty=.5,  energy=.55, seed=23, bell=False),
    'sunscar':     dict(bpm=104, root=64, scale='phrygian_dom', prog=[0, 1, 0, 6, 0, 1, 5, 4], duty=.25, energy=.6,  seed=37, bell=False),
    'frostmarch':  dict(bpm=84,  root=57, scale='minor',        prog=[0, 5, 2, 6, 0, 5, 3, 4], duty=.125, energy=.4, seed=41, bell=True),
    'dungeon':     dict(bpm=126, root=57, scale='dorian',       prog=[0, 0, 6, 6, 5, 5, 4, 4], duty=.25, energy=.8,  seed=53, bell=False),
    'boss':        dict(bpm=144, root=52, scale='minor',        prog=[0, 5, 6, 4, 0, 5, 6, 4], duty=.5,  energy=1.0, seed=67, bell=False),
    'world_boss':  dict(bpm=112, root=50, scale='minor',        prog=[0, 0, 5, 5, 3, 3, 4, 4], duty=.5,  energy=.95, seed=79, bell=True),
}

def degree_note(root, scale, deg, octave=0):
    s = SCALES[scale]; o, i = divmod(deg, len(s)); return root + s[i] + 12 * (o + octave)

def chord_notes(root, scale, deg): return [degree_note(root, scale, deg + k) for k in (0, 2, 4)]

def render_track(cfg, bars=16):
    rng = np.random.default_rng(cfg['seed'])
    beat = 60 / cfg['bpm']; bar = beat * 4; total = bar * bars; e = cfg['energy']
    prog = (cfg['prog'] * ((bars + len(cfg['prog']) - 1) // len(cfg['prog'])))[:bars]
    items = []
    # Melody motif: 8 eighth-note steps per bar, reused in AABA form with variation.
    def motif():
        steps = []; last = 4
        for i in range(8):
            if rng.random() < (.25 if e < .7 else .12): steps.append(None); continue
            last = int(np.clip(last + rng.choice([-2, -1, 0, 1, 2, 3], p=[.15, .25, .1, .25, .15, .1]), 0, 9)); steps.append(last)
        return steps
    A, B = motif(), motif()
    for b, deg in enumerate(prog):
        t0 = b * bar
        chord = chord_notes(cfg['root'] - 12, cfg['scale'], deg)
        # Bass: root on beats, octave hop in busy tracks.
        for q in range(4 if e < .7 else 8):
            step = bar / (4 if e < .7 else 8)
            n = chord[0] - 12 + (12 if (e >= .7 and q % 2) else 0)
            items.append((t0 + q * step, osc(note(n), step * .9, 'triangle') * env(step * .9, .003, .05, .8, .05) * .55))
        # Arpeggio / pad.
        arp_step = beat / 2
        for q in range(8):
            n = chord[q % 3] + 12
            items.append((t0 + q * arp_step, osc(note(n), arp_step * .8, 'square', .125) * decay(arp_step * .8, 9) * .12 * (0.6 + e)))
        # Lead: motif per form section, transposed to the chord.
        form = (A if (b // 2) % 4 != 2 else B)
        for q, s in enumerate(form):
            if s is None: continue
            n = degree_note(cfg['root'], cfg['scale'], deg + s)
            d = beat / 2 * (1.9 if q % 4 == 3 else .95)
            items.append((t0 + q * beat / 2, osc(note(n), d, 'square', cfg['duty'], vibrato=.006) * env(d, .004, .06, .65, .06) * .2))
        if cfg['bell'] and b % 2 == 0:
            items.append((t0, bell(note(chord[2] + 24), bar * .9, 3.5) * .08))
        # Drums.
        for q in range(8):
            tq = t0 + q * beat / 2
            if q % 4 == 0 and e >= .4: items.append((tq, thump(130, 45, .18, 16) * .55 * e))
            if q % 4 == 2 and e >= .55: items.append((tq, highpass(noise(.12), .3) * decay(.12, 22) * .22 * e))
            if e >= .6 or q % 2 == 0: items.append((tq, highpass(noise(.03), .05) * decay(.03, 90) * .08 * (0.5 + e)))
        if e >= .9 and b % 4 == 3:  # fill
            for k in range(4): items.append((t0 + bar - beat + k * beat / 4, thump(160 - k*20, 60, .1, 22) * .45))
    loop = place(total, items)
    n = int(SR * total); tail = loop[n:]; body = loop[:n].copy()
    body[:len(tail)] += tail[:n]  # wrap release tails: seamless loop
    return body

# ----------------------------------------------------------------------------- encoding
def write_mp3(samples, path, rate, kbps):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pcm = (np.clip(samples, -1, 1) * 32767).astype('<i2')
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp: wav_path = tmp.name
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    # -bitexact and fixed metadata keep re-runs byte-identical.
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav_path, '-ac', '1', '-ar', str(rate),
                    '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', '-map_metadata', '-1', '-id3v2_version', '0',
                    '-write_xing', '0', '-bitexact', path], check=True)
    os.unlink(wav_path)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', choices=['sfx', 'music'])
    ap.add_argument('--replace-selected-music', action='store_true', help='Explicitly overwrite chosen/locked music assets')
    args = ap.parse_args(); manifest = {'sfx': {}, 'music': {}}
    existing_manifest_path = os.path.join(OUT, 'manifest.json')
    if args.only != 'sfx' and not args.replace_selected_music and os.path.isfile(existing_manifest_path):
        with open(existing_manifest_path, encoding='utf-8') as f:
            existing_manifest = json.load(f)
        if any(row.get('selection') for row in existing_manifest.get('music', {}).values()):
            ap.error('Selected music is locked. Use --only sfx or explicitly --replace-selected-music.')
    if args.only != 'music':
        for name, (fn, volume) in SFX.items():
            x = fade_tail(trim(normalize(fn())))
            write_mp3(x, os.path.join(OUT, 'sfx', name + '.mp3'), 22050, 64)
            manifest['sfx'][name] = {'seconds': round(len(x) / SR, 3), 'volume': volume}
    if args.only != 'sfx':
        for name, cfg in TRACKS.items():
            x = normalize(render_track(cfg), .8)
            write_mp3(x, os.path.join(OUT, 'music', name + '.mp3'), 32000, 80)
            manifest['music'][name] = {'seconds': round(len(x) / SR, 2), 'bpm': cfg['bpm']}
    path = os.path.join(OUT, 'manifest.json')
    old = json.load(open(path)) if os.path.exists(path) else {'sfx': {}, 'music': {}}
    for k in ('sfx', 'music'):
        if not manifest[k]: manifest[k] = old.get(k, {})
    with open(path, 'w') as f: json.dump(manifest, f, indent=2, sort_keys=True); f.write('\n')
    write_asset_map(manifest)
    print(json.dumps({k: len(v) for k, v in manifest.items()}))

def write_asset_map(manifest):
    """Static require() map for Metro, generated from the manifest so code and files never drift."""
    lines = ['/** GENERATED by tools/audio/generate-game-audio.py from assets/audio/manifest.json. Do not edit. */',
             "import type {AudioSource} from 'expo-audio';", '']
    for kind, const in (('sfx', 'SOUND_EFFECT'), ('music', 'MUSIC_TRACK')):
        lines.append(f'export const {const}_ASSETS={{')
        for name in sorted(manifest[kind]):
            extra = f",volume:{manifest[kind][name]['volume']}" if kind == 'sfx' else ''
            lines.append(f"  {name}:{{source:require('../../assets/audio/{kind}/{name}.mp3') as AudioSource{extra}}},")
        lines.append('} as const;')
    lines += ['export type SoundEffectId=keyof typeof SOUND_EFFECT_ASSETS;',
              'export type MusicTrackId=keyof typeof MUSIC_TRACK_ASSETS;', '']
    with open(os.path.join(ROOT, 'apps', 'mobile', 'src', 'theme', 'audio-assets.ts'), 'w') as f: f.write('\n'.join(lines))


if __name__ == '__main__':
    sys.exit(main())
