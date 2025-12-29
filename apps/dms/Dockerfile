# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./
COPY nx.json tsconfig*.json ./

# Install dependencies
RUN npm install -g pnpm@10.12.1
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Replace environment file for Docker deployment
RUN cp apps/dms/src/environments/environment.docker.ts apps/dms/src/environments/environment.ts

# Build the application using development configuration to preserve Docker environment
RUN pnpm nx run dms:build:development

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/dist/apps/dms/browser /usr/share/nginx/html

# Copy nginx configuration
COPY apps/dms/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
