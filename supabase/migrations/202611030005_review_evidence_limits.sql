begin;

-- Owner-approved limit: 10 MiB per screenshot. Keep application and storage aligned.
update public.tracker_settings set screenshot_max_bytes = 10485760 where id;
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'review-evidence';

-- Existing record-scoped SELECT policy remains. No browser upload/write grants.
commit;
