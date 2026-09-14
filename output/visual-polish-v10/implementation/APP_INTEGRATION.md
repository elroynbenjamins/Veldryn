# App integration

Pass `onOpenActivity` to `GameTopBar`. The workspace implementation uses this navigation behavior:

```tsx
function openActiveActivity(){
  const activity=state?.activity;
  if(!activity)return;
  if(activity.kind==='combat'){setTab('Combat');return;}
  setSelectedSkill(activity.kind);
  setSkillsMode('gathering');
  setTab('Skills');
}

<GameTopBar
  state={state}
  nowMs={now}
  labelForDestination={labelForDestination}
  onNavigate={setTab}
  onChangeDestinations={saveDestinations}
  onOpenActivity={openActiveActivity}
/>
```

Keep the existing one-second `now` update so the elapsed label and cycle progress remain live. No save schema or gameplay-state change is introduced.
