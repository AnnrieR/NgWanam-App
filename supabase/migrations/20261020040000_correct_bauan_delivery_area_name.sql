-- Owner-confirmed spelling correction only. Preserve the area ID, fee and
-- historical order snapshots; do not rewrite the already-applied catalog seed.
update public.delivery_areas
set name = 'Bauan / Aplaya'
where name = 'Bauan Biayan / Aplaya';
