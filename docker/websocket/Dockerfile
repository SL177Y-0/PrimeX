# WebSocket Server Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/websocket/package*.json ./server/websocket/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the WebSocket server
RUN cd server/websocket && npm run build

# Production image, copy all the files and run the server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 websocket

# Copy built application
COPY --from=builder /app/server/websocket/dist ./dist
COPY --from=builder /app/server/websocket/package*.json ./
COPY --from=deps /app/node_modules ./node_modules

USER websocket

EXPOSE 8080

ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

CMD ["node", "dist/index.js"]
