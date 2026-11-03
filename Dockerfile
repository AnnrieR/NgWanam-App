# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
# Build needs devDependencies (TypeScript, Tailwind and PostCSS).
COPY package.json package-lock.json ./
RUN npm ci --include=dev

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# Only public values belong in build arguments. Never pass privileged keys here.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
RUN node -e "const u=process.env.NEXT_PUBLIC_SUPABASE_URL; if (!u || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) throw new Error('Supply both public Supabase build arguments'); new URL(u)"
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '3000') + '/').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"
CMD ["node", "server.js"]
