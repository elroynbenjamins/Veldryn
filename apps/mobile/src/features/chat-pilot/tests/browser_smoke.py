"""Interaction checks of the actual offline browser preview, not generated concepts.
Chromium in this environment blocks navigation. set_content uses data-URI art + injected memory preferences.
This does not test native layout, the OS keyboard, real storage permissions or production networking.
"""
from pathlib import Path
import json,os,shutil
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1]
results=[]
def check(label,ok):
 assert ok,label
 results.append({'check':label,'passed':True})
with sync_playwright() as p:
 binary=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
 b=p.chromium.launch(**({'executable_path':binary} if binary else {}),args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
 errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.evaluate("window.__CHAT_SETTINGS_STORE__={values:{},async load(id){return this.values[id]??null},async save(id,v){this.values[id]=JSON.parse(JSON.stringify(v))}}")
 page.set_content((R/'demo/preview.html').read_text());page.wait_for_timeout(120)
 expect(page.get_by_role('button',name='Join World chat',exact=True)).to_be_visible();check('World messages gated before opt-in',page.locator('.row').count()==0)
 check('Composer disabled before opt-in',page.get_by_role('textbox',name='Chat message').is_disabled())
 page.screenshot(path=str(R/'qa/01_world_opt_in.png'))
 page.get_by_role('button',name='Join World chat',exact=True).click();expect(page.locator('.row')).to_have_count(6);check('World opt-in reveals six sample messages',True)
 page.screenshot(path=str(R/'qa/02_chat_screen.png'))
 page.get_by_role('tab',name='System',exact=True).click();check('System read-only composer',page.get_by_role('textbox',name='Chat message').is_disabled());check('System read-only send',page.get_by_role('button',name='Send message',exact=True).is_disabled())
 page.get_by_role('tab',name='Guild',exact=True).click();check('Guild denied without membership',page.locator('.notice').inner_text().find('Join a guild')>=0)
 page.get_by_role('tab',name='Party',exact=True).click();check('Party denied without membership',page.locator('.notice').inner_text().find('Join a party')>=0)
 page.get_by_role('tab',name='World',exact=True).click();box=page.get_by_role('textbox',name='Chat message');box.fill('World draft');page.get_by_role('tab',name='Guild',exact=True).click();page.get_by_role('tab',name='World',exact=True).click();check('Draft survives channel switching',box.input_value()=='World draft')
 box.fill('Hello ');box.click();box.press('End');page.get_by_role('button',name='Open emote picker',exact=True).click();check('Picker shows exactly 20 slots',page.locator('.pickerGrid button').count()==20)
 page.screenshot(path=str(R/'qa/03_emote_picker.png'))
 before=page.locator('.row').count();page.locator('.pickerGrid button').first.click();check('Emote insertion does not auto-send',page.locator('.row').count()==before);check('Composer contains stable shortcode',':male_01:' in box.input_value());check('Draft preview renders image',page.locator('.draftPreview img').count()==1)
 page.get_by_role('button',name='Send message',exact=True).click();page.wait_for_timeout(450);check('Local send produces one delivered message',page.locator('.row').count()==before+1);check('Message contains emote image',page.locator('.row').last.locator('.message img').count()==1)
 page.get_by_role('button',name='Demo controls',exact=True).click();page.get_by_role('button',name='Fail next send',exact=True).click();box.fill('Please retry me');page.get_by_role('button',name='Send message',exact=True).click();page.wait_for_timeout(450);expect(page.get_by_role('button',name='Not sent · Retry',exact=True)).to_be_visible();check('Simulated failure shown',True)
 before=page.locator('.row').count();page.get_by_role('button',name='Not sent · Retry',exact=True).click();page.wait_for_timeout(450);check('Retry does not duplicate the message',page.locator('.row').count()==before);check('Retry clears failed state',page.locator('.retry').count()==0)
 box.fill('Keep while offline');page.get_by_role('button',name='Go offline',exact=True).click();check('Offline disables sending',page.get_by_role('button',name='Send message',exact=True).is_disabled());page.get_by_role('button',name='Reconnect',exact=True).click();check('Reconnect keeps draft',box.input_value()=='Keep while offline');box.fill('')
 page.get_by_role('button',name='Join demo guild',exact=True).click();page.get_by_role('tab',name='Guild',exact=True).click();check('Demo membership enables guild messages',page.locator('.row').count()==1);page.get_by_role('tab',name='World',exact=True).click();page.get_by_role('button',name='Demo controls',exact=True).click()
 # Profile modal and deliberately unconnected service actions.
 page.get_by_role('button',name='Aric Stonebrow',exact=True).last.click();expect(page.get_by_role('dialog',name='Aric Stonebrow')).to_be_visible();check('Avatar/name opens mini-profile',True)
 page.screenshot(path=str(R/'qa/04_player_profile.png'))
 page.get_by_role('button',name='Add friend',exact=True).click();check('Friend button does not pretend to send a real request','Not connected' in page.locator('.toast').inner_text())
 page.get_by_role('button',name='Whisper',exact=True).click();check('Whisper opens a separate conversation',page.evaluate("window.pilot.controller.getSnapshot().channelId")== 'whisper:aric')
 page.get_by_role('tab',name='World',exact=True).click();page.get_by_role('button',name='Chat settings',exact=True).click();expect(page.get_by_role('dialog',name='Your 20 emotes')).to_be_visible();check('Settings starts with saved 20',page.locator('.trayCount').inner_text()=='20 / 20 selected')
 page.screenshot(path=str(R/'qa/05_emote_settings.png'))
 page.get_by_role('button',name='Slot 1: Adventurer — Smile',exact=True).click();page.get_by_role('button',name='Remove',exact=True).click();check('Save disabled for 19 selections',page.get_by_role('button',name='Save 20',exact=True).is_disabled())
 page.get_by_role('button',name='Female',exact=True).click();page.locator('[data-emote-id="female_01"]').click();page.get_by_role('button',name='Save 20',exact=True).click();page.wait_for_timeout(80);check('Mixed female choice saved',page.evaluate("window.pilot.controller.getSnapshot().savedTray.includes('female_01')"))
 page.get_by_role('button',name='Chat settings',exact=True).click();before=page.evaluate('window.pilot.controller.getSnapshot().savedTray');page.get_by_role('button',name='Slot 1: Adventurer — Grin',exact=True).click();page.get_by_role('button',name='Remove',exact=True).click();page.get_by_role('button',name='Pets',exact=True).click();page.locator('[data-emote-id="pet_set_a_04"]').click();page.get_by_role('button',name='Save 20',exact=True).click();page.wait_for_timeout(80);check('Mixed pet choice saved',page.evaluate("window.pilot.controller.getSnapshot().savedTray.includes('pet_set_a_04')"))
 page.get_by_role('button',name='Chat settings',exact=True).click();saved=page.evaluate('window.pilot.controller.getSnapshot().savedTray');page.get_by_role('button',name='Reset',exact=True).click();page.get_by_role('button',name='Cancel',exact=True).click();check('Cancel keeps previous saved tray',page.evaluate('window.pilot.controller.getSnapshot().savedTray')==saved)
 # Unknown names are not rendered as trusted System notices; incoming HTML stays literal text.
 page.evaluate("window.pilot.controller.receive({id:'unknown',channelId:'world',senderId:'unknown',segments:[{type:'text',text:'<img src=x onerror=alert(1)>'}],createdAt:Date.now(),delivery:'sent'})")
 check('Unknown sender not relabeled System',page.locator('[data-message-id="unknown"] .name').inner_text()=='Adventurer')
 check('Untrusted text cannot add HTML images',page.locator('[data-message-id="unknown"] .message img').count()==0)
 # Deliberate incoming messages do not pull an older-history reader to the bottom.
 page.get_by_role('button',name='Demo controls',exact=True).click();page.locator('.list').evaluate('(n)=>{n.scrollTop=0;n.dispatchEvent(new Event("scroll"))}');page.get_by_role('button',name='Incoming',exact=True).click();check('New-message indicator while reading above bottom',page.locator('.newButton').is_visible());check('Incoming preserves scroll position',page.locator('.list').evaluate('(n)=>n.scrollTop')<5);page.locator('.newButton').click();check('Jump-to-latest clears unread',not page.locator('.newButton').is_visible());page.get_by_role('button',name='Demo controls',exact=True).click()
 box.fill('a'*501);check('Too-long message disabled',page.get_by_role('button',name='Send message',exact=True).is_disabled());box.fill('')
 # Responsive pilot checks, including no horizontal page overflow and 44px touch height.
 for w,h in [(320,740),(360,800),(430,932),(768,1024)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(60)
  check(f'No page overflow at {w}px',page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'))
  check(f'Composer visible at {w}px',page.get_by_role('textbox',name='Chat message').is_visible())
  check(f'Tab height at least 44px at {w}px',min(page.locator('.tab').evaluate_all('(ns)=>ns.map(n=>n.getBoundingClientRect().height)'))>=44)
 page.set_viewport_size({'width':320,'height':740});page.get_by_role('button',name='Aric Stonebrow',exact=True).last.click();page.screenshot(path=str(R/'qa/06_profile_320px.png'));page.keyboard.press('Escape');check('Escape closes modal',page.get_by_role('dialog').count()==0)
 check('Loaded images decode successfully',page.evaluate('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)'))
 check('No runtime JavaScript errors',not errors)
 b.close()
(R/'qa/browser_test_results.json').write_text(json.dumps({'browser':'Chromium','testMode':'set_content; injected in-memory preference store; all art embedded','checks':len(results),'passed':len(results),'nativeDeviceTested':False,'results':results},indent=2))
print(f'{len(results)} browser interaction/layout checks passed')
