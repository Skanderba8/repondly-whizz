-- Owner-run configuration, after both migrations. No accounts or name mappings are created here.
insert into public.tracker_stores(name, timezone) values
  ('New Jersey', 'America/New_York'),
  ('Brooklyn', 'America/New_York'),
  ('Philadelphia', 'America/New_York'),
  ('Chicago', 'America/Chicago'),
  ('San Francisco', 'America/Los_Angeles'),
  ('Washington DC', 'America/New_York'),
  ('Union', 'America/New_York'),
  ('Harlem', 'America/New_York')
on conflict (name) do nothing;

-- Choose an evidence size limit before enabling uploads. No retention/deletion policy is assumed.
-- update public.tracker_settings set screenshot_max_bytes = YOUR_CHOSEN_BYTE_LIMIT where id;
-- Also set the private review-evidence bucket's file_size_limit to the same value.

-- Add tracker_people rows only after matching each Auth account to its exact report name.
-- See README.md for the parameterized example. home_store_id is optional.
