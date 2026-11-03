-- Reject objects >= 1 MiB even when clients bypass the application.
-- Existing photos are retained; only new uploads are constrained.
update storage.buckets set file_size_limit=1048575,
  allowed_mime_types=case when id='avatars' then array['image/png','image/jpeg','image/webp','image/gif','image/avif']
    else array['image/png','image/jpeg','image/webp'] end
where id in ('avatars','menu-photos','delivery-proofs');
