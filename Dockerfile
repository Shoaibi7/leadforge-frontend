# syntax=docker/dockerfile:1
#
# LeadForge frontend (Next.js). NEXT_PUBLIC_API_URL is inlined into the browser bundle at BUILD
# time, so it must be passed as a build argument:
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://api.<your-domain>/api .
# The build fails without it, and refuses a localhost URL unless ALLOW_LOCALHOST_API_URL=true
# (local docker-compose only).

# ─── Build ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG ALLOW_LOCALHOST_API_URL=false
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_TELEMETRY_DISABLED=1
RUN if [ -z "$NEXT_PUBLIC_API_URL" ]; then \
      echo "ERROR: build with --build-arg NEXT_PUBLIC_API_URL=https://api.<your-domain>/api" >&2; exit 1; \
    fi; \
    case "$NEXT_PUBLIC_API_URL" in \
      *localhost*|*127.0.0.1*|*0.0.0.0*) \
        if [ "$ALLOW_LOCALHOST_API_URL" != "true" ]; then \
          echo "ERROR: NEXT_PUBLIC_API_URL points to localhost. Set ALLOW_LOCALHOST_API_URL=true only for local docker-compose." >&2; exit 1; \
        fi ;; \
    esac
RUN npm run build && npm prune --omit=dev

# ─── Runtime ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=node:node /usr/src/app/.next ./.next
COPY --from=build /usr/src/app/public ./public

USER node
EXPOSE 3000
CMD ["npm", "start"]
