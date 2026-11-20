#!/usr/bin/env python3
"""Render Veldryn's seven selected original MIDI compositions using only mathematical synthesis.

No SoundFonts, samples, recordings, or external music are used. Source MIDI scores
come from the user-approved original Veldryn concepts, stored in
`tools/audio/selected-music-scores.zip`. The sample-based MP3 concept previews
are deliberately NOT included in the game because their sample rights are uncleared.

Requirements to regenerate: numpy, pretty_midi, ffmpeg (libmp3lame).
Usage: python3 tools/audio/render-selected-music.py
"""
import argparse
import hashlib
import io
import json
import math
from pathlib import Path
import subprocess
import tempfile
import zipfile

import numpy as np
import pretty_midi

SR = 24000
RNG_SEED = 20261120
KINDS = ('town','asterfall','sunscar','frostmarch','dungeon','boss','world_boss')
TRACK_NAMES = {
    'town': 'Lanterns at Hearth',
    'asterfall': 'First Light',
    'sunscar': 'Evening Oasis (V3)',
    'frostmarch': 'Soft Snowfall (V2)',
    'dungeon': 'Midnight Machinery (JRPG V9)',
    'boss': 'Break the Sigil (JRPG V9)',
    'world_boss': 'Eclipse Protocol (JRPG V9)',
}


def instrument(program, is_drum):
    if is_drum: return 'drums'
    if program <= 7: return 'piano'
    if program <= 15: return 'bell'
    if program <= 23: return 'organ'
    if program <= 27: return 'pluck'
    if program <= 31: return 'guitar'
    if program <= 39: return 'bass'
    if program <= 47: return 'strings'
    if program <= 55: return 'strings'
    if program <= 63: return 'brass'
    if program <= 71: return 'reed'
    if program <= 79: return 'flute'
    if program <= 87: return 'synth'
    if program <= 95: return 'pad'
    return 'bell'


def synth_note(program, pitch, duration, velocity, sample_rate, seed):
    rng = np.random.default_rng(seed)
    kind = instrument(program, False)
    release = {'piano': .22, 'bell': .40, 'organ': .10, 'pluck': .17,
               'guitar': .18, 'bass': .14, 'strings': .33, 'brass': .22,
               'reed': .18, 'flute': .13, 'synth': .14, 'pad': .35}[kind]
    length = max(1, int((duration + release) * sample_rate))
    t = np.arange(length, dtype=np.float32) / sample_rate
    f = np.float32(440.0 * (2 ** ((pitch - 69) / 12)))
    phase = (2 * np.pi * f * t).astype(np.float32)
    if kind in ('strings', 'flute', 'reed', 'synth', 'brass', 'pad'):
        phase += np.sin(2*np.pi*4.2*t)*(.012 if kind in ('flute','strings') else .004)
    if kind == 'flute':
        v = np.sin(phase) + .13*np.sin(2*phase) + .04*np.sin(3*phase)
        v += rng.standard_normal(length).astype(np.float32)*.009
    elif kind == 'strings' or kind == 'pad':
        v = sum((np.sin((k*phase)+.2*k) / (k**(1.45 if kind=='strings' else 2.1)) for k in range(1,7)))
        v += .22*np.sin(phase*1.004)
    elif kind == 'brass' or kind == 'reed':
        v = np.sin(phase)+.46*np.sin(2*phase)+.28*np.sin(3*phase)+.11*np.sin(4*phase)
    elif kind == 'guitar' or kind == 'synth':
        v = sum(np.sin(k*phase) / (k**(.88 if kind=='guitar' else 1.15)) for k in range(1,9))
        if kind=='guitar': v=np.tanh(v*1.8)
    elif kind == 'pluck' or kind == 'piano':
        v = sum((np.sin(k*phase+.13*k) / (k**1.25)) * np.exp(-t*(1.6+.35*k)) for k in range(1,8))
    elif kind == 'bass':
        v = np.sin(phase)+.29*np.sin(2*phase)+.09*np.sin(3*phase)
    elif kind == 'bell':
        v = (np.sin(phase)+.28*np.sin(2.04*phase)+.14*np.sin(3.87*phase)) * np.exp(-t*2.1)
    else:  # organ
        v = np.sin(phase)+.28*np.sin(2*phase)+.13*np.sin(3*phase)
    attack = {'strings':.10,'pad':.24,'brass':.045,'flute':.035,'reed':.025,
              'guitar':.006,'synth':.005,'piano':.003,'pluck':.005,
              'bell':.005,'bass':.006,'organ':.012}[kind]
    env = np.minimum(1, t/max(.001, attack))
    env *= np.minimum(1, np.maximum(0, (duration+release-t)/release))
    if kind in ('guitar','pluck','bass','piano','bell'):
        env *= np.exp(-t*({'guitar':.65,'pluck':1.5,'bass':.23,'piano':.35,'bell':.2}[kind]))
    return (v * env * np.float32(min(.85,velocity/127)*.19)).astype(np.float32)


def drum_note(pitch, dur, vel, sample_rate, seed):
    rng = np.random.default_rng(seed)
    # Standard GM channel 10: kicks 35/36, snares 38/40, hats 42/44/46,
    # cymbals 49/51/57, toms 41/43/45/47/48/50.
    duration = .25 if pitch in (35,36,38,40) else .16
    if pitch in (49,51,52,55,57,59): duration = .75
    n=max(1,int(duration*sample_rate));t=np.arange(n,dtype=np.float32)/sample_rate
    noise=rng.uniform(-1,1,n).astype(np.float32)
    if pitch in (35,36):
        freq = 60+95*np.exp(-t*30)
        v=np.sin(2*np.pi*np.cumsum(freq)/sample_rate)*np.exp(-t*27)
    elif pitch in (38,40,37,39):
        v=.73*noise*np.exp(-t*27)+.22*np.sin(2*np.pi*180*t)*np.exp(-t*24)
    elif pitch in (42,44,46,49,51,52,55,57,59):
        # Difference filtering keeps cymbals bright without a sound sample.
        noise=np.concatenate(([0],np.diff(noise)))
        v=noise*np.exp(-t*(6 if duration>.5 else 47))*.34
    else:
        v=np.sin(2*np.pi*(110+8*(pitch-43))*t)*np.exp(-t*20)*.55+noise*np.exp(-t*35)*.10
    fade=min(n, max(1,int(.008*sample_rate)))
    v[-fade:]*=np.linspace(1,0,fade)
    return (v*.22*(vel/127)).astype(np.float32)


def render(mid_bytes, sample_rate=SR):
    with tempfile.NamedTemporaryFile(suffix='.mid') as f:
        f.write(mid_bytes);f.flush(); score=pretty_midi.PrettyMIDI(f.name)
    _, tempos=score.get_tempo_changes(); bpm=float(tempos[0])
    # Original 16-bar cues with no added silence; the release tails are wrapped
    # into the opening samples, preserving the tempo-aligned loop boundary.
    bars = {88: 16, 102: 16, 84: 16, 78: 16, 146: 32, 168: 36, 154: 32}[round(bpm)]
    loop_seconds = round(bars*4*60/bpm, 5)
    count=round(loop_seconds*sample_rate)
    left=np.zeros(count,dtype=np.float32);right=np.zeros(count,dtype=np.float32)
    seed=RNG_SEED
    for k,part in enumerate(score.instruments):
        notes=sorted(part.notes,key=lambda n:(n.start,n.pitch,n.end))
        gain=(.84 if part.is_drum else 1.0)/max(1.0,len(notes)**.14)
        pan=np.clip((k%5-2)*.12,-.38,.38)
        for j,note in enumerate(notes):
            if note.start>=loop_seconds:continue
            start=int(round(note.start*sample_rate))
            if part.is_drum: v=drum_note(note.pitch,note.end-note.start,note.velocity,sample_rate,seed+k*99991+j)
            else: v=synth_note(part.program,note.pitch,max(.05,note.end-note.start),note.velocity,sample_rate,seed+k*99991+j)
            v*=gain
            end=start+len(v)
            if end>count:
                first=count-start
                if first>0:
                    left[start:]+=v[:first]*(1-pan)*.5;right[start:]+=v[:first]*(1+pan)*.5
                rem=v[first:first+count]
                left[:len(rem)]+=rem*(1-pan)*.5;right[:len(rem)]+=rem*(1+pan)*.5
            else:
                left[start:end]+=v*(1-pan)*.5;right[start:end]+=v*(1+pan)*.5
    # A subtle self-contained room echo, wrapped for continuous ambience.
    for channel in (left,right):
        raw=channel.copy()
        for delay,gain in ((.13,.115),(.29,.065)):
            offset=int(delay*sample_rate)
            channel[offset:]+=raw[:-offset]*gain
            channel[:offset]+=raw[-offset:]*gain
    both=np.stack((left,right),axis=-1)
    both=np.tanh(both*1.25)
    peak=float(np.max(np.abs(both))) or 1
    both*=.72/peak
    # Small interpolation at the exact loop boundary avoids clicks between repeats.
    # Do not fade out: loop repeats without dead air.
    join=min(128,count//100)
    center=(both[-1]+both[0])/2
    for j in range(join):
        w=(j+1)/join
        both[-join+j]=both[-join+j]*(1-w)+center*w
        both[j]=center*(1-w)+both[j]*w
    return both,bpm,loop_seconds


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--scores',default='tools/audio/selected-music-scores.zip')
    ap.add_argument('--audio-dir',default='apps/mobile/assets/audio')
    args=ap.parse_args()
    audio_dir=Path(args.audio_dir);music=audio_dir/'music';music.mkdir(parents=True,exist_ok=True)
    manifest_path=audio_dir/'manifest.json'
    manifest=json.loads(manifest_path.read_text())
    with zipfile.ZipFile(args.scores) as zipped:
        for name in KINDS:
            data=zipped.read(name+'.mid')
            mix,bpm,seconds=render(data)
            pcm=(np.clip(mix,-1,1)*32767).astype('<i2')
            path=music/(name+'.mp3')
            subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error',
                '-f','s16le','-ar',str(SR),'-ac','2','-i','pipe:0',
                '-codec:a','libmp3lame','-b:a','64k','-ar','24000','-map_metadata','-1',
                '-id3v2_version','0','-write_xing','0','-bitexact',str(path)],
                input=pcm.tobytes(),check=True)
            manifest['music'][name]={'bpm':round(bpm),'seconds':round(seconds,2),
                'selection':TRACK_NAMES[name], 'render':'original sample-free synthesis'}
            print(name,round(seconds,2),'s',round(path.stat().st_size/1024),'KiB',hashlib.sha256(path.read_bytes()).hexdigest()[:14])
    manifest_path.write_text(json.dumps(manifest,indent=2,sort_keys=True)+'\n')
    print('Total music bytes',sum(f.stat().st_size for f in music.glob('*.mp3')))

if __name__=='__main__': main()