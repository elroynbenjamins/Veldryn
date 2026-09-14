# VELDRYN event identity v8

`EventIdentityBadge` resolves an event by its canonical name through `EVENT_DECORATIONS`. Unknown events render no badge. The badge is decorative and hidden from accessibility because the adjacent native event title carries the identity.

Default size is 72dp. The PNG renders inside a circular navy surface with a restrained gold border and glow. Place the badge in the label row and render the event title below at full width. Do not place a 72dp badge beside the 34px title on phone layouts.

Event tabs remain one accessible tablist. Each tab has at least 48dp height, explicit selected state, a quiet navy-blue selected surface and a 3dp gold underline. Labels stay on one line and may reduce to 82% only when native metrics require it.

No new bitmap was generated. This pass integrates the existing transparent festival badge from `assets/events-startup-v1/badges`. Earlier specifications describe the source artwork, profile borders, startup backgrounds, density assets and generation prompts.
