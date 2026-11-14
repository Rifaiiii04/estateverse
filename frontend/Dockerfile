# Dependency stage: installs exact locked packages.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build stage: produces the standalone Next.js server bundle.
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runtime stage: serves the standalone bundle as an unprivileged user.
FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN adduser -D -u 10001 app
COPY --from=build /app/public ./public
COPY --from=build --chown=app /app/.next/standalone ./
COPY --from=build --chown=app /app/.next/static ./.next/static
USER app
EXPOSE 3000
CMD ["node", "server.js"]
