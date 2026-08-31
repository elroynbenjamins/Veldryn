# UI Design Token Contract

Do not scatter raw presentation constants across screens. Centralize them in `src/theme`.

Minimum semantic tokens to maintain:
- spacing: xs/sm/md/lg/xl
- radii: sm/md/lg
- typography: caption/body/bodyStrong/title/hero
- surfaces: background/panel/panelRaised
- text: primary/secondary/disabled
- semantic states: success/warning/danger/info
- rarity: common/uncommon/rare/epic/legendary plus non-color icon/label treatment
- touchTargetMin: 44
- touchTargetPreferred: 48

Accessibility constraints:
- 150% text scaling may reflow but must not hide primary actions.
- focus/selected states require a non-color indicator.
- reduced-motion mode cannot remove information.
