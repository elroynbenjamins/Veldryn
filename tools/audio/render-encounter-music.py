#!/usr/bin/env python3
"""Render the seven approved encounter-music candidates; never overwrite existing game assets."""
import ctypes as C, ctypes.util, subprocess, numpy as np, pretty_midi as pm, pathlib, concurrent.futures, os
OUT=pathlib.Path(__file__).parent/'encounter-music-renders'
OUT.mkdir(exist_ok=True)
SR=32000
SF=os.environ.get('VELDRYN_SOUNDFONT','/usr/share/sounds/sf2/TimGM6mb.sf2')
SCORES=[
('dungeon_A','Iron Cathedral',142,52,'rock',[(0,'m'),(0,'m'),(8,'M'),(10,'M'),(0,'m'),(5,'m'),(1,'M'),(7,'M')],[0,7,3,5,7,10,8,7,3,5,6,7,12,10,7,4],(29,48,81,34)),
('dungeon_B','Clockwork Descent',154,50,'rock',[(0,'m'),(3,'M'),(5,'m'),(1,'M'),(0,'m'),(8,'M'),(10,'M'),(7,'M')],[0,3,7,6,5,3,1,0,12,10,8,7,5,6,7,10],(30,49,0,34)),
('boss_A','Shatter the Crown',164,52,'boss',[(0,'m'),(8,'M'),(10,'M'),(7,'M'),(0,'m'),(3,'M'),(5,'m'),(7,'M')],[7,10,12,15,14,12,10,7,8,12,15,17,15,14,11,7],(30,61,81,34)),
('boss_B','No Retreat',172,55,'boss',[(0,'m'),(5,'m'),(8,'M'),(7,'M'),(0,'m'),(1,'M'),(10,'M'),(7,'M')],[0,3,7,12,10,7,6,5,3,7,12,15,14,10,8,7],(29,48,63,34)),
('world_boss_A','Heavenfall Engine',148,48,'world',[(0,'m'),(8,'M'),(3,'M'),(10,'M'),(5,'m'),(1,'M'),(8,'M'),(7,'M')],[7,12,15,19,17,15,14,12,10,12,15,17,20,19,14,11],(30,61,52,34)),
('world_boss_B','Last Light of Eternity',156,50,'world',[(0,'m'),(10,'M'),(8,'M'),(5,'m'),(3,'M'),(1,'M'),(8,'M'),(7,'M')],[0,7,12,15,14,12,7,10,8,12,17,15,14,11,7,0],(29,49,60,34)),
('frostfall_dungeon','Bells of the Frozen Citadel',144,57,'winter',[(0,'m'),(8,'M'),(3,'M'),(7,'M'),(0,'M'),(5,'M'),(2,'m'),(7,'M')],[0,4,7,9,7,4,2,0,12,11,9,7,5,4,2,0],(29,48,9,34)),
]
def build(spec):
 key,title,bpm,root,style,prog,motif,programs=spec; bars=32; beat=60/bpm; duration=bars*4*beat
 midi=pm.PrettyMIDI(initial_tempo=bpm); lead,pad,extra,bass=[pm.Instrument(p) for p in programs]; rhythm=pm.Instrument(29 if style in ('rock','winter') else 30); drums=pm.Instrument(0,is_drum=True); inst=[lead,pad,extra,bass,rhythm,drums]
 def n(i,p,t,d,v):
  if 0<=p<=127 and t+d<=bars*4+0.001: i.notes.append(pm.Note(int(v),int(p),t*beat,(t+d)*beat))
 for b in range(bars):
  sec=b//8; r,q=prog[b%8]; ch=root+r; third=3 if q=='m' else 4; t=b*4; chord=[ch,ch+third,ch+7]; low=ch-12 if ch>=55 else ch; low-=12 if low>48 else 0
  for j,p in enumerate(chord): n(pad,p+12 if p<59 else p,t+0.02*j,3.88,47)
  if style=='winter':
   for j in range(8): n(extra,chord[[0,2,1,2,0,1,2,1][j]]+24,t+j*.5,.32,60 if j%2==0 else 44)
   for j in range(8): n(drums,83,t+j*.5,.1,48 if j%2 else 66)
  elif style=='world':
   for p in chord: n(extra,p+12,t,3.75,48 if sec%2==0 else 62)
  else:
   for j,p in enumerate([ch+12,ch+third+12,ch+7+12,ch+third+12]): n(extra,p,t+j,0.8,54 if sec%2 else 42)
  pattern=([0,.5,1,1.5,2.5,3,3.5] if (b+sec)%2==0 else [0,.75,1.5,2,2.5,3.25])
  for j,x in enumerate(pattern):
   power=ch-12 if ch>56 else ch; power=power+(7 if j==len(pattern)-1 and b%2==0 else 0)
   for p in [power,power+7,power+12]: n(rhythm,p,t+x,.36 if j%3 else .44,76 if sec%2==0 else 83)
  for j in range(8): n(bass,low+(7 if j in [3,7] else 12 if j==5 else 0),t+j*.5,.42,75+(j%2)*5)
  for j in range(8):
   n(drums,42 if j%2 else 46 if b%4==0 and j==0 else 42,t+j*.5,.1,45 if j%2 else 64)
   if j in (0,3,4,7): n(drums,36,t+j*.5,.12,89 if j%4==0 else 73)
   if j in (2,6): n(drums,38,t+j*.5,.14,91)
  if b%8==7:
   for j in range(4): n(drums,45+j%2*2,t+3+j*.25,.12,75+j*3)
  if b%8==0:n(drums,49,t,.4,85)
  pat=[(0,.75),(1,.4),(1.5,.4),(2,1.3),(3.5,.4)] if b%2==0 else [(0,.9),(1.25,.6),(2,1.65)]
  for j,(x,d) in enumerate(pat):
   offset=motif[(b*3+j+(4 if sec==1 else 0))%len(motif)]; p=root+offset+(12 if offset<7 else 0)
   if j==len(pat)-1 and b%4==3: p=min([v for z in chord for v in (z,z+12,z+24)],key=lambda v:abs(v-p))
   if sec==2 and j==0: p+=5 if b%2==0 else 0
   n(lead,p,t+x,min(d,4-x-.02),80)
  if b%8 in (4,5,6):
   for j in range(2):n(pad,ch+12+([7,third][j]),t+j*2,1.8,65)
 midi.instruments=[i for i in inst if i.notes]; midi.write(str(OUT/(key+'.mid')))
 return midi,duration
def render(spec):
 key=spec[0]; midi,duration=build(spec); lib=C.CDLL(ctypes.util.find_library('fluidsynth')); ptr=C.c_void_p; I=C.c_int
 def bind(name,rest,args): f=getattr(lib,name);f.restype=rest;f.argtypes=args;return f
 newset=bind('new_fluid_settings',ptr,[]); setnum=bind('fluid_settings_setnum',I,[ptr,C.c_char_p,C.c_double]); setint=bind('fluid_settings_setint',I,[ptr,C.c_char_p,I]); news=bind('new_fluid_synth',ptr,[ptr]); load=bind('fluid_synth_sfload',I,[ptr,C.c_char_p,I]); prog=bind('fluid_synth_program_select',I,[ptr,I,I,I,I]); on=bind('fluid_synth_noteon',I,[ptr,I,I,I]); off=bind('fluid_synth_noteoff',I,[ptr,I,I]); write=bind('fluid_synth_write_float',I,[ptr,I,ptr,I,I,ptr,I,I]); ds=bind('delete_fluid_synth',None,[ptr]); dset=bind('delete_fluid_settings',None,[ptr])
 s=newset();setnum(s,b'synth.sample-rate',SR);setnum(s,b'synth.gain',.60);setint(s,b'synth.cpu-cores',1); synth=news(s); bank=load(synth,SF.encode(),1); assert bank>=0
 ev=[]; ch=0
 for inst in midi.instruments:
  c=9 if inst.is_drum else ch
  if not inst.is_drum: ch+=1
  prog(synth,c,bank,128 if inst.is_drum else 0,inst.program)
  for note in inst.notes:
   for rep in (0,1,2):
    ev.extend([(round((note.start+rep*duration)*SR),1,c,note.pitch,note.velocity),(round((note.end+rep*duration)*SR),0,c,note.pitch,0)])
 total=round(duration*SR); end=3*total; buf=np.empty((end,2),np.float32); pos=0
 def flush(to):
  nonlocal pos
  if to>pos: write(synth,to-pos,buf.ctypes.data,pos*2,2,buf.ctypes.data,pos*2+1,2);pos=to
 for frame,typ,c,p,v in sorted(ev):
  flush(min(frame,end));(on(synth,c,p,v) if typ else off(synth,c,p))
 flush(end);ds(synth);dset(s); a=buf[total:2*total].copy(); a*=min(.94/max(np.max(np.abs(a)),1e-8),3); rms=np.sqrt(np.mean(a*a)); a*=min(.14/max(rms,1e-8),.94/max(np.max(np.abs(a)),1e-8))
 k=384; w=(0.5+0.5*np.cos(np.linspace(0,np.pi,k)))[:,None]; delta=(a[-1]-a[0])/2
 a[:k]+=w*delta; a[-k:]-=w[::-1]*delta
 a*=min(1,.94/max(np.max(np.abs(a)),1e-8))
 target=OUT/(key+'.mp3')
 subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','pipe:0','-c:a','libmp3lame','-b:a','96k',str(target)],input=a.astype('<f4').tobytes(),check=True)
 decoded=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(target),'-f','f32le','-ac','2','-ar',str(SR),'-']),dtype=np.float32).reshape(-1,2)
 assert len(decoded)==total,(key,'length',len(decoded),total)
 jump=float(np.max(abs(decoded[0]-decoded[-1])))
 assert jump<.05 and np.max(abs(decoded))<1,(key,'seam/peak',jump)
 return key,duration,jump,target.stat().st_size
if __name__=='__main__':
 with concurrent.futures.ProcessPoolExecutor(max_workers=3) as ex:
  for x in ex.map(render,SCORES): print(x,flush=True)
