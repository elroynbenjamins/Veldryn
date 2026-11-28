#!/usr/bin/env python3
"""Offline review candidate only: local pose deformation of Vharaxis' original art.
Requires Pillow. Writes a separate atlas and comparison; never replaces live assets.
Run from repo root: python tools/review-vharaxis-motion.py --out /tmp/vharaxis-review
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageOps

W,H,N,COLS=128,120,36,6
SOURCE=Path("apps/mobile/assets/ascendant/draconic/vharaxis_smooth_pose_atlas.webp")
PAD=3

def smooth(x):
    x=max(0.0,min(1.0,x))
    return x*x*(3-2*x)

def bell(t,a,b,c):
    if not a<t<c:
        return 0.0
    return smooth((t-a)/(b-a)) if t<b else smooth((c-t)/(c-b))

def mask(x,y,cx,cy,rx,ry):
    return smooth(1-((x-cx)/rx)**2-((y-cy)/ry)**2)

def pose(t):
    # A deliberate wing lift, head attention, then tail follow-through.
    return (bell(t,.02,.28,.66),bell(t,.10,.39,.76),
            bell(t,.20,.53,.90),bell(t,.18,.42,.68))

def displacement(x,y,p):
    wing,head,tail,jaw=p
    # In source orientation the broad wing is on the left, muzzle on the
    # upper right and curled tail at lower left. Keep feet and ground fixed.
    upper=1-smooth((y-77)/22)
    wm=mask(x,y,28,40,39,46)*upper
    hm=mask(x,y,96,26,32,31)*upper
    jm=mask(x,y,104,42,19,15)*upper
    tm=mask(x,y,29,92,34,22)*(1-smooth((x-42)/20))
    angle=-.23*wing
    vx,vy=x-65,y-56
    # Wing rotates around its shoulder; head and tail are separate masks.
    dx=wm*((math.cos(angle)-1)*vx-math.sin(angle)*vy)
    dy=wm*(math.sin(angle)*vx+(math.cos(angle)-1)*vy)
    # Negative rotation on the left lifts downward in image coordinates;
    # explicitly add a raised wing sweep, and use the inverse rotation.
    dx=-dx-4.5*wing*wm+2.7*head*hm+4.0*tail*tm
    dy=-dy-5.0*wing*wm-5.2*head*hm+2.1*jaw*jm-3.5*tail*tm
    return dx,dy

def source_xy(x,y,p):
    sx,sy=x,y
    for _ in range(8):
        dx,dy=displacement(sx,sy,p)
        sx,sy=x-dx,y-dy
    return sx,sy

def warp(base,p):
    mesh=[]
    for y in range(0,H,4):
        for x in range(0,W,4):
            x1,y1=min(W,x+4),min(H,y+4)
            quad=tuple(q for pt in [(x,y),(x,y1),(x1,y1),(x1,y)] for q in source_xy(*pt,p))
            mesh.append(((x,y,x1,y1),quad))
    return base.transform((W,H),Image.Transform.MESH,mesh,resample=Image.Resampling.BICUBIC)

def base_pose(source):
    raw=source.crop((0,0,W,H)).convert("RGBA")
    crop=raw.crop(raw.getchannel("A").getbbox())
    crop.thumbnail((112,104),Image.Resampling.LANCZOS)
    base=Image.new("RGBA",(W,H))
    base.alpha_composite(crop,((W-crop.width)//2,112-crop.height))
    return base

def visible(frame):
    # Use the actual Draconic 74×76 design box and contain-fit the 128×120 cell.
    fit=ImageOps.contain(frame,(74,76),Image.Resampling.LANCZOS)
    card=Image.new("RGBA",(74,76),(30,14,22,255))
    card.alpha_composite(fit,((74-fit.width)//2,(76-fit.height)//2))
    return card.convert("RGB")

def alpha_distance(a,b):
    aa=a.getchannel("A").point(lambda x:255 if x>=128 else 0)
    bb=b.getchannel("A").point(lambda x:255 if x>=128 else 0)
    return ImageChops.difference(aa,bb).histogram()[255]

def native_distance(a,b):
    diff=ImageChops.difference(visible(a),visible(b)).convert("L")
    return sum(diff.histogram()[24:])

def assemble(frames):
    atlas=Image.new("RGBA",(W*COLS,H*(N//COLS)))
    for i,frame in enumerate(frames):
        atlas.paste(frame,((i%COLS)*W,(i//COLS)*H))
    return atlas

def validate_frames(frames):
    bounds=[]
    for i,frame in enumerate(frames):
        bound=frame.getchannel("A").getbbox()
        if not bound or not (bound[0]>=PAD and bound[1]>=PAD and bound[2]<=W-PAD and bound[3]<=H-PAD):
            raise ValueError(f"Frame {i}: alpha outside safe cell: {bound}")
        bounds.append(bound)
    return bounds

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--source",type=Path,default=SOURCE)
    parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    source=Image.open(args.source).convert("RGBA")
    if source.size!=(W*COLS,H*(N//COLS)):
        raise ValueError(f"Unexpected original atlas dimensions {source.size}")
    original=[source.crop(((i%COLS)*W,(i//COLS)*H,(i%COLS+1)*W,(i//COLS+1)*H)) for i in range(N)]
    base=base_pose(source)
    frames=[warp(base,pose(i/N)) for i in range(N)]
    bounds=validate_frames(frames)
    atlas=assemble(frames)
    target=args.out/"vharaxis_pose_candidate.webp"
    budget=math.ceil(args.source.stat().st_size*1.10)
    for quality in (94,92,90,88):
        atlas.save(target,format="WEBP",quality=quality,method=6,alpha_quality=100)
        if target.stat().st_size<=budget:
            break
    decoded=Image.open(target).convert("RGBA")
    decoded_frames=[decoded.crop(((i%COLS)*W,(i//COLS)*H,(i%COLS+1)*W,(i//COLS+1)*H)) for i in range(N)]
    decoded_bounds=validate_frames(decoded_frames)
    unique=len({hashlib.sha256(f.tobytes()).hexdigest() for f in decoded_frames})
    candidate_motion=[native_distance(decoded_frames[0],f) for f in decoded_frames]
    original_motion=[native_distance(original[0],f) for f in original]
    seam=native_distance(decoded_frames[-1],decoded_frames[0])
    peak=max(candidate_motion)
    # Side-by-side native-scale comparison: never count base rescaling as motion.
    comparison=[]
    for old,new in zip(original,decoded_frames):
        panel=Image.new("RGB",(156,95),(20,13,22))
        panel.paste(visible(old),(2,17));panel.paste(visible(new),(80,17))
        draw=ImageDraw.Draw(panel);draw.text((3,2),"CURRENT",fill="white");draw.text((81,2),"CANDIDATE",fill="white")
        comparison.append(panel.resize((468,285),Image.Resampling.NEAREST))
    comparison[0].save(args.out/"vharaxis_comparison.webp",save_all=True,append_images=comparison[1:],duration=83,loop=0,lossless=True)
    keyframes=Image.new("RGB",(468,285*4),(20,13,22))
    for j,i in enumerate((0,10,14,19)):
        keyframes.paste(comparison[i],(0,j*285))
    keyframes.save(args.out/"vharaxis_keyframes.png")
    report={"original_bytes":args.source.stat().st_size,"candidate_bytes":target.stat().st_size,
      "budget_bytes":budget,"webp_quality":quality,"frames":N,"fps":12,"width":decoded.width,"height":decoded.height,
      "unique_decoded_frames":unique,"decoded_alpha_bounds":decoded_bounds,"max_native_changed_pixels":peak,
      "original_max_native_changed_pixels":max(original_motion),"loop_seam_changed_pixels":seam,
      "max_silhouette_changed_pixels":max(alpha_distance(decoded_frames[0],f) for f in decoded_frames),
      "sha256":hashlib.sha256(target.read_bytes()).hexdigest(),"review_only":True}
    (args.out/"vharaxis_report.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report,indent=2))
    if target.stat().st_size>budget or unique<24 or peak<35 or seam>max(12,peak*.25):
        raise SystemExit("Candidate did not meet preliminary asset budget, motion or seam gate; review artifacts before revising.")
    print("Preliminary technical gate passed; visual approval and device QA still required.")

if __name__=="__main__":
    main()
