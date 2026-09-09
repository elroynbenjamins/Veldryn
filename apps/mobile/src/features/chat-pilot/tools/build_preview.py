"""Bundle the tested shared controller and PNGs into a single offline HTML preview."""
from pathlib import Path
import json,base64,subprocess
r=Path(__file__).resolve().parents[1]
subprocess.run(['tsc','-p','tsconfig.core.json'],cwd=r,check=True)
assets={str(p.relative_to(r/'assets')).removesuffix('.png'):'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode() for p in (r/'assets').rglob('*.png')}
data={'emotes':json.loads((r/'data/emotes.json').read_text()),'assets':assets}
css=(r/'demo/style.css').read_text()
for state in ['normal','selected','pressed','disabled']:
 css+='\n:root{--skin-'+state+':url("'+assets['chrome/button_'+state]+'");}'
core=(r/'.build/chat.js').read_text()
js='window.CHAT_DATA='+json.dumps(data)+';\nwindow.ChatCore=(function(){var exports={};\n'+core+'\nreturn exports;})();\n'+(r/'demo/preview.js').read_text()
html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>VELDRYN · Chat Pilot</title><style>'+css+'</style></head><body><div id="app"></div><script>'+js.replace('</script','<\\/script')+'</script></body></html>'
(r/'demo/preview.html').write_text(html)
print('Offline preview built:', len(html), 'bytes')
