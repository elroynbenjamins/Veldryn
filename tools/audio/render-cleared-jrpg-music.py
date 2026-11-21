#!/usr/bin/env python3
"""Veldryn: sample-free, reproducible original JRPG music.

All oscillators, envelopes and percussion are calculated numerically. There are no
SoundFonts, prerecorded instruments, copyrighted sound libraries or third-party samples.
The four new musical arrangements are *not* copies of unavailable preview recordings.
The exact eight-bar timing of the selected listening concepts is preserved.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import wave

import numpy as np

SR=32000
SEED=20261122
TWO_PI=np.float32(2*np.pi)
# Four measures per phrase, 8 bars total. Values are MIDI pitch numbers.
MUSIC={
 'asterfall':{
  'title':'First Light — Original Synthesis', 'bpm':91, 'root':62,
  'chords':[(62,66,69,74),(69,73,76,81),(71,74,78,83),(67,71,74,79),
            (62,66,69,74),(67,71,74,79),(64,67,71,76),(69,73,76,81)],
  'melody':[ (0,74,1.5),(1.5,76,.5),(2,78,1),(3,76,1),
             (4,73,1),(5,76,1),(6,81,1.5),(7.5,78,.5),
             (8,78,1),(9,76,.5),(9.5,74,.5),(10,71,1),(11,74,1),
             (12,79,1.5),(13.5,78,.5),(14,76,1),(15,74,1),
             (16,74,1),(17,78,1),(18,81,1),(19,78,1),
             (20,79,1),(21,78,.5),(21.5,76,.5),(22,74,2),
             (24,76,1),(25,74,.5),(25.5,71,.5),(26,76,1),(27,78,1),
             (28,81,1),(29,78,1),(30,76,1),(31,73,1)],
  'lead':'flute','pad':'strings','pluck':'harp','bass':'cello','energy':.70},
 'sunscar':{
  'title':'Amber Dunes — Original Synthesis','bpm':99,'root':64,
  'chords':[(64,68,71,76),(65,69,72,77),(62,65,69,74),(64,68,71,76),
            (69,72,76,81),(65,69,72,77),(62,65,69,74),(64,68,71,76)],
  'melody':[(0,76,1),(1,77,.5),(1.5,80,.5),(2,83,1),(3,80,1),
            (4,81,1),(5,79,1),(6,77,1),(7,76,1),
            (8,74,.5),(8.5,77,.5),(9,81,1),(10,77,1.5),(11.5,76,.5),
            (12,80,1),(13,83,1),(14,80,1),(15,76,1),
            (16,81,1),(17,84,1),(18,81,.5),(18.5,80,.5),(19,76,1),
            (20,77,1),(21,81,1),(22,79,1),(23,77,1),
            (24,74,1),(25,77,.5),(25.5,76,.5),(26,74,2),
            (28,76,1),(29,80,1),(30,77,1),(31,76,1)],
  'lead':'reed','pad':'strings','pluck':'oud','bass':'cello','energy':.65},
 'frostmarch':{
  'title':'Crystal Snow — Original Synthesis','bpm':82,'root':59,
  'chords':[(59,62,66,71),(55,59,62,67),(62,66,69,74),(57,61,64,69),
            (59,62,66,71),(64,67,71,76),(55,59,62,67),(57,61,64,69)],
  'melody':[(0,78,2),(2,76,1),(3,74,1),
            (4,79,1.5),(5.5,78,.5),(6,74,2),
            (8,81,1),(9,78,1),(10,76,2),
            (12,73,1),(13,76,1),(14,78,2),
            (16,78,1.5),(17.5,81,.5),(18,83,1),(19,78,1),
            (20,76,2),(22,74,2),
            (24,79,1),(25,78,1),(26,74,1.5),(27.5,71,.5),
            (28,73,1),(29,76,1),(30,73,2)],
  'lead':'celesta','pad':'pad','pluck':'piano','bass':'cello','energy':.52},
 'dungeon':{
  'title':'Forgotten Citadel — Original Synthesis','bpm':116,'root':62,
  'chords':[(62,65,69,74),(67,71,74,79),(62,65,69,74),(60,64,67,72),
            (65,69,72,77),(67,71,74,79),(69,73,76,81),(62,65,69,74)],
  'melody':[(0,74,.5),(.5,77,.5),(1,81,1),(2,79,.5),(2.5,77,.5),(3,74,1),
            (4,79,1),(5,81,.5),(5.5,79,.5),(6,74,1),(7,71,1),
            (8,74,.5),(8.5,77,.5),(9,81,1),(10,84,.5),(10.5,81,.5),(11,77,1),
            (12,76,1),(13,79,1),(14,76,.5),(14.5,74,.5),(15,72,1),
            (16,77,1),(17,81,.5),(17.5,84,.5),(18,81,1),(19,77,1),
            (20,79,1),(21,83,1),(22,81,1),(23,79,1),
            (24,81,.5),(24.5,84,.5),(25,81,1),(26,76,.5),(26.5,73,.5),(27,76,1),
            (28,74,1),(29,77,1),(30,74,2)],
  'lead':'soft_horn','pad':'strings','pluck':'marimba','bass':'cello','energy':.82},
}

def wave_voice(kind, midi, duration, velocity, seed):
    rng=np.random.default_rng(seed)
    freq=440*2**((midi-69)/12)
    release={'flute':.22,'reed':.18,'soft_horn':.20,'celesta':.4,'strings':.65,
             'pad':.82,'harp':.35,'oud':.24,'piano':.36,'marimba':.25,'cello':.36}[kind]
    n=int(round((duration+release)*SR));t=np.arange(n,dtype=np.float64)/SR
    vib=(.0018 if kind in ('flute','strings','cello') else .0006)*np.sin(2*np.pi*4.8*t)
    phase=2*np.pi*freq*(t+np.cumsum(vib)/SR)
    if kind in ('flute','reed'):
        amps=[1,.11,.025] if kind=='flute' else [1,.12,.28,.08]
    elif kind=='soft_horn': amps=[1,.32,.12,.05]
    elif kind in ('strings','cello'): amps=[1,.4,.21,.10,.055,.025]
    elif kind=='pad': amps=[1,.26,.12,.052]
    elif kind=='harp': amps=[1,.52,.21,.10,.038]
    elif kind=='oud': amps=[1,.47,.23,.16,.055]
    elif kind=='piano': amps=[1,.38,.19,.14,.06,.028]
    elif kind=='celesta': amps=[1,.43,.17,.08]
    else: amps=[1,.35,.22,.10]
    signal=np.zeros(n,dtype=np.float64)
    for i,a in enumerate(amps,1):
        p=phase*i + .12*i
        if kind in ('celesta','marimba') and i>1:p*=1.003*(1+.001*i)
        signal+=a*np.sin(p)
    if kind in ('strings','cello','pad'):
        signal+=.16*np.sin(phase*1.002+.4)
    if kind in ('flute','reed','oud'):
        noise=rng.standard_normal(n)
        from scipy.signal import lfilter
        breath=lfilter([.07,-.07],[1,-.45],noise)
        signal+=breath*(.065 if kind=='oud' else .012)
    attack={'flute':.05,'reed':.032,'soft_horn':.06,'celesta':.008,'strings':.18,
            'pad':.29,'harp':.007,'oud':.005,'piano':.009,'marimba':.004,'cello':.10}[kind]
    decay={'flute':.04,'reed':.10,'soft_horn':.07,'celesta':2.6,'strings':.03,'pad':.02,
           'harp':2.15,'oud':2.6,'piano':1.05,'marimba':3.5,'cello':.05}[kind]
    env=np.minimum(t/max(.005,attack),1.0)*np.exp(-decay*t)
    env*=np.minimum(1,np.maximum(0,(duration+release-t)/release))**1.25
    return (signal*env*(velocity*.11)).astype(np.float32)

def drums(kind,bpm,n,seed):
    rng=np.random.default_rng(seed);out=np.zeros(n,dtype=np.float32)
    if kind=='frostmarch':return out
    beat=60/bpm
    for bar in range(8):
        for position in ([0,2] if kind=='dungeon' else [0,2.5] if kind=='sunscar' else [0]):
            start=int((bar*4+position)*beat*SR)
            length=min(n-start,int(.16*SR)); t=np.arange(length)/SR
            if length<=0:continue
            f=77+64*np.exp(-t*22)
            thump=np.sin(np.cumsum(f)*2*np.pi/SR)*np.exp(-t*30)
            out[start:start+length]+=(.065 if kind=='dungeon' else .026)*thump.astype(np.float32)
        if kind=='dungeon':
            for position in [1,3]:
                start=int((bar*4+position)*beat*SR);length=min(n-start,int(.13*SR))
                if length<=0:continue
                t=np.arange(length)/SR
                noise=rng.standard_normal(length)*np.exp(-t*38)
                out[start:start+length]+=(noise*.021).astype(np.float32)
            for position in [0.5,1.5,2.5,3.5]:
                start=int((bar*4+position)*beat*SR);length=min(n-start,int(.09*SR))
                if length<=0:continue
                t=np.arange(length)/SR
                noise=rng.standard_normal(length)*np.exp(-t*57)
                out[start:start+length]+=(noise*.008).astype(np.float32)
        if kind=='sunscar':
            for pos in [1.5,3.5]:
                start=int((bar*4+pos)*beat*SR);length=min(n-start,int(.10*SR))
                if length<=0:continue
                t=np.arange(length)/SR
                out[start:start+length]+=(rng.standard_normal(length)*np.exp(-t*38)*.007).astype(np.float32)
    return out

def circular_add(out,signal,start,pan=0):
    n=out.shape[0];start=start%n
    levels=np.array([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)],dtype=np.float32)
    idx=np.arange(len(signal),dtype=np.int64)
    # Tail notes wrap around to the next loop instead of being cut off.
    # Use modulo on the loop buffer for long sustaining pads.
    for channel in (0,1):np.add.at(out[:,channel],(start+idx)%n,signal*levels[channel])

def render(key,config):
    seconds=32*60/config['bpm'];n=round(seconds*SR)
    out=np.zeros((n,2),dtype=np.float32);beat=60/config['bpm']
    def add(kind,pitch,start_b,beats,vel,pan,seed):
        signal=wave_voice(kind,pitch,beats*beat,vel,SEED+seed)
        circular_add(out,signal,round(start_b*beat*SR),pan)
    for bar,chord in enumerate(config['chords']):
        b=bar*4
        # Very soft long harmonic bed; intentional subdued mix for idle gameplay.
        for j,p in enumerate(chord[:3]):add(config['pad'],p-12,b,4.0,.16,-.32+j*.30,bar*17+j)
        add(config['bass'],chord[0]-24,b,1.8,.34,-.1,bar+1000)
        add(config['bass'],chord[0]-12,b+2,1.45,.18,.12,bar+1100)
        # Constant arpeggio contours hold momentum without loud repeating percussion.
        order=[0,2,1,3,2,1,0,2] if key!='frostmarch' else [0,2,1,2,0,1,2,3]
        step=.5 if key in ('dungeon','sunscar') else 1.0
        for j in range(int(4/step)):
            p=chord[order[j%len(order)]]+(12 if key in ('frostmarch','asterfall') else 0)
            add(config['pluck'],p,b+j*step,step*.86,.19 if key!='dungeon' else .18,(-.35 if j%2 else .35),bar*100+j+2000)
    for j,(start,pitch,length) in enumerate(config['melody']):
        add(config['lead'],pitch,start,length*.89,.51,.08 if j%3 else -.08,j+3000)
        if key=='frostmarch' and j%5==0:add('celesta',pitch+12,start,length*.55,.07,-.35,j+5000)
    drum=drums(key,config['bpm'],n,SEED+500)
    out[:,0]+=drum*.96;out[:,1]+=drum*.91
    # Circular self-generated room ambience; no recorded impulse responses.
    raw=out.copy()
    for delay,gain,swap in [(0.127,.105,True),(.265,.07,False),(.431,.035,True)]:
        step=round(delay*SR)
        orig=raw[:,::-1] if swap else raw
        out+=np.roll(orig,step,axis=0)*gain
    # Add very gentle saturation, then tame playback level.
    out=np.tanh(out*1.12)
    peak=np.max(np.abs(out))
    out*=.69/max(peak,.001)
    # Smooth periodic join: force matching end/start amplitude and slope. Do not
    # insert silence, fades to zero, or a gap at the beat-aligned boundary.
    seam=round(.020*SR)
    anchor=((out[-1]+out[0])/2).copy()
    w=np.linspace(0,1,seam,endpoint=True,dtype=np.float32)[:,None]
    ease=w*w*(3-2*w)
    out[-seam:]=out[-seam:]*(1-ease)+anchor*ease
    out[:seam]=anchor*(1-ease)+out[:seam]*ease
    out=np.nan_to_num(out)
    return out,seconds

def write_wav(path,pcm):
    path.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(path),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
        f.writeframes((np.clip(pcm,-1,1)*32767).astype('<i2').tobytes())

def main():
    p=argparse.ArgumentParser();p.add_argument('--out',default='veldryn_cleared_music')
    args=p.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
    manifest={'status':'review - replacement arrangement, sample-free','creation':'2026-11-22',
              'rights':'original mathematical synthesis; no SoundFont or third-party audio samples',
              'note':'New compositions match the selected track durations, scene and style, not original note-for-note preview performances',
              'tracks':{}}
    for key,cfg in MUSIC.items():
        data,seconds=render(key,cfg)
        wav=out/f'{key}.wav';ogg=out/f'{key}.ogg';mp3=out/f'{key}.mp3'
        write_wav(wav,data)
        subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(wav),
                        '-c:a','libvorbis','-q:a','4','-map_metadata','-1',str(ogg)],check=True)
        subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(wav),
                        '-codec:a','libmp3lame','-b:a','96k','-ar','32000',
                        '-map_metadata','-1','-id3v2_version','0','-write_xing','0','-bitexact',str(mp3)],check=True)
        manifest['tracks'][key]={
            'title':cfg['title'],'bpm':cfg['bpm'],'seconds':round(seconds,3),
            'instruments':[cfg['lead'],cfg['pad'],cfg['pluck'],cfg['bass']],
            'sha256_ogg':hashlib.sha256(ogg.read_bytes()).hexdigest(),
            'sha256_mp3':hashlib.sha256(mp3.read_bytes()).hexdigest(),
            'master_wav_sha256':hashlib.sha256(wav.read_bytes()).hexdigest()}
        print(key,round(seconds,3),'s',f'{ogg.stat().st_size/1024:.1f}KB OGG',f'{mp3.stat().st_size/1024:.1f}KB MP3',flush=True)
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

if __name__=='__main__': main()
