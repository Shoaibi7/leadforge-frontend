# Base image
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# Dependencies stage
FROM base AS dependencies
COPY package*.json ./
RUN npm ci

# Build stage
FROM base AS build
COPY package*.json ./
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .
# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/.next ./.next
COPY --from=build /usr/src/app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
