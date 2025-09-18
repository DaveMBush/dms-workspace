# Multi-stage Dockerfile for RMS Fastify Backend
# Build stage - install dependencies and build application
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml ./

# Copy workspace configuration files
COPY nx.json ./
COPY tsconfig*.json ./

# Copy project configuration files
COPY apps/server/project.json ./apps/server/
COPY apps/server/tsconfig*.json ./apps/server/

# Install dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code and prisma schema
COPY apps/server/src ./apps/server/src
COPY prisma ./prisma

# Generate Prisma client - use PostgreSQL schema for production builds
RUN pnpm prisma generate --schema=prisma/schema.postgresql.prisma

# Build the server application
RUN pnpm nx build server --configuration=production

# Production stage - create minimal runtime image
FROM node:22-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fastify -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown fastify:nodejs /app/logs

# Copy built application from builder stage
COPY --from=builder --chown=fastify:nodejs /app/dist/apps/server ./

# Copy production node_modules (needed for Prisma and runtime dependencies)
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules

# Copy Prisma schema and client for runtime
COPY --from=builder --chown=fastify:nodejs /app/prisma ./prisma

# Copy package.json for runtime information
COPY --from=builder --chown=fastify:nodejs /app/package.json ./

# Switch to non-root user
USER fastify

# Expose the application port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl --max-time 5 http://localhost:3000/ || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Use dumb-init to handle signals properly and start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "./node_modules/.bin/prisma generate --schema=prisma/schema.postgresql.prisma && node main.js"]