-- Refresh the unpublished Android 1.0.7 player-facing release notes.
-- Keep publication under the explicit release-launch step.
update public.app_release_notes
set
  title='Faith & Fellowship',
  highlights=jsonb_build_array(
    'Faith: Choose blessings to strengthen combat, gathering, crafting, and XP.',
    'Guild Projects: See every member''s contribution and help your guild reach weekly goals.',
    'Quest Guidance: Clearer steps for travel, combat levels, and your first crafted gear.',
    'Food & Potions: Easier healing controls, a larger potion view, and refreshed food balance.',
    'Store: VIP and VIP+ now have their own badges and clearer upgrade details.'
  ),
  updated_at=now()
where platform='android'
  and version='1.0.7'
  and is_published=false;
