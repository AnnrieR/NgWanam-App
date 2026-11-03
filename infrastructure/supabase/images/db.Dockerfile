# syntax=docker/dockerfile:1
FROM supabase/postgres:17.6.1.136
# Same destinations/order as official self-hosted/v0.8.3. No app migrations/seed.
COPY --chmod=644 vendor/docker/volumes/db/realtime.sql /docker-entrypoint-initdb.d/migrations/99-realtime.sql
COPY --chmod=644 vendor/docker/volumes/db/_supabase.sql /docker-entrypoint-initdb.d/migrations/97-_supabase.sql
COPY --chmod=644 vendor/docker/volumes/db/logs.sql /docker-entrypoint-initdb.d/migrations/99-logs.sql
COPY --chmod=644 vendor/docker/volumes/db/pooler.sql /docker-entrypoint-initdb.d/migrations/99-pooler.sql
COPY --chmod=644 vendor/docker/volumes/db/webhooks.sql /docker-entrypoint-initdb.d/init-scripts/98-webhooks.sql
COPY --chmod=644 vendor/docker/volumes/db/roles.sql /docker-entrypoint-initdb.d/init-scripts/99-roles.sql
COPY --chmod=644 vendor/docker/volumes/db/jwt.sql /docker-entrypoint-initdb.d/init-scripts/99-jwt.sql
