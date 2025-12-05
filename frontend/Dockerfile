# Next.js Frontend Dockerfile
# Simplified build for Render deployment

FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install ALL dependencies (including dev)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Firebase placeholders for build (real values injected at runtime)
ENV NEXT_PUBLIC_FIREBASE_API_KEY=placeholder
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=placeholder.firebaseapp.com
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=placeholder
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=placeholder.appspot.com
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
ENV NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:placeholder

RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built app and node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use npm start instead of standalone server
CMD ["npm", "start"]
