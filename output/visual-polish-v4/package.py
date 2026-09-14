from pathlib import Path
import zipfile,hashlib,json
root=Path(r'C:/Users/elroy/OneDrive/Documents/ChatGPT/Veldryn')
out=root/'output/visual-polish-v4'
archive=root/'output/VELDRYN_Visual_Polish_v4.zip'
files={}
def add(src,name):
    assert src.is_file(),str(src)
    assert name not in files,name
    files[name]=src
for name in ["src/components/ActivityArtwork.tsx","src/components/ActivityCard.tsx","src/components/AccountWelcomeScreen.tsx","src/components/BattleStage.tsx","src/components/BossEncounterIntro.tsx","src/components/GuildSeekerPanel.tsx","src/components/IngredientList.tsx","src/components/ItemArtwork.tsx","src/components/MonsterPortraitFrame.tsx","src/components/NoviceWorkshop.tsx","src/components/OnlineGuildBrowser.tsx","src/components/OnlineGuildManagement.tsx","src/components/PartyHubPanel.tsx","src/components/PrimaryNavigation.tsx","src/components/PrimaryNavigationIcon.tsx","src/components/RecipeCard.tsx","src/components/RecruitmentFiltersPanel.tsx","src/components/RecruitmentListing.tsx","src/components/SkillDashboard.tsx","src/components/SocialHubPanel.tsx","src/components/SocialIdentity.tsx","src/screens/HomeScreen.tsx","src/screens/SkillsScreen.tsx","src/screens/CombatScreen.tsx","src/screens/FriendsScreen.tsx","src/screens/GuildScreen.tsx","src/theme/skill-assets.ts","src/theme/crafted-item-assets.ts","src/theme/resource-assets.ts","src/core/social-identity.ts","src/dev/NativeVisualReview.tsx","tests/social-identity.ts","index.js"]:
    add(root/'apps/mobile'/name,'implementation/apps/mobile/'+name)
for family in ['activity-icons-v1','crafted-items-v1']:
    for src in (root/'apps/mobile/assets'/family).rglob('*.png'):
        add(src,'implementation/'+src.relative_to(root).as_posix())
for src in (out/'sources').rglob('*.png'):
    add(src,src.relative_to(out).as_posix())
for name in ['PROGRESS.md','NATIVE_QA.md','VELDRYN_UI_ASSET_SPEC.md','review.html','new-art-review.png','activity-prompts.json','crafted-prompts.json','activity-export.json','crafted-export.json','tests.json','recipe-art-audit.json']:
    add(out/name,name)
for name in ["home-390","skills-360","skills-320-large","crafting-320-large","recipe-expanded-320-large","combat-390","boss-360","social-390","guild-390","create-account-390","login-keyboard-390","account-keyboard-scrolled-390"]:
    add(out/'native'/(name+'.png'),'native/'+name+'.png')
manifest={name:{'bytes':src.stat().st_size,'sha256':hashlib.sha256(src.read_bytes()).hexdigest()} for name,src in sorted(files.items())}
manifest_bytes=json.dumps(manifest,indent=2).encode()
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for name,src in sorted(files.items()):z.write(src,name)
    z.writestr('MANIFEST.json',manifest_bytes)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None,'CRC failure'
    assert len(z.namelist())==len(set(z.namelist())),'duplicate entries'
    for name,info in manifest.items():
        data=z.read(name)
        assert len(data)==info['bytes'] and hashlib.sha256(data).hexdigest()==info['sha256'],name
    result={'archive':archive.name,'entries':len(z.namelist()),'bytes':archive.stat().st_size,'crc':'passed','entry_sha256':'all passed','sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}
(out/'archive-integrity.json').write_text(json.dumps(result,indent=2))
(archive.with_suffix('.zip.sha256')).write_text(result['sha256']+'  '+archive.name+'\n')
print(json.dumps(result,indent=2))
