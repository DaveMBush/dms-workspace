# Environment Setup Guide

This guide covers setting up the RMS workspace environment for different deployment scenarios.

## Local Development Setup

### Prerequisites

- Node.js 18+ and pnpm installed
- Git repository cloned
- Database file accessible

### Basic Setup

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Create Environment File**:
   ```bash
   # Create .env file in workspace root
   cat > .env << EOF
   USE_SCREENER_FOR_UNIVERSE=false
   DATABASE_URL=file:./database.db
   HOST=localhost
   PORT=3000
   EOF
   ```

3. **Start Development Servers**:
   ```bash
   # Terminal 1: Start backend server
   pnpm nx run server:serve

   # Terminal 2: Start frontend
   pnpm nx run rms:serve
   ```

### Environment File Structure

```bash
# .env
USE_SCREENER_FOR_UNIVERSE=false          # Feature flag for screener sync
DATABASE_URL=file:./database.db          # SQLite database path
HOST=localhost                           # Server host binding
PORT=3000                               # Server port
```

## Development/Staging Environment

### Docker Setup

1. **Dockerfile**:
   ```dockerfile
   FROM node:18-alpine

   WORKDIR /app
   COPY package*.json ./
   RUN npm install -g pnpm
   RUN pnpm install

   COPY . .
   RUN pnpm nx run server:build:production

   ENV USE_SCREENER_FOR_UNIVERSE=false
   ENV DATABASE_URL=file:./database.db
   ENV HOST=0.0.0.0
   ENV PORT=3000

   EXPOSE 3000
   CMD ["node", "dist/apps/server/main.js"]
   ```

2. **Docker Compose**:
   ```yaml
   version: '3.8'
   services:
     rms-server:
       build: .
       ports:
         - "3000:3000"
       environment:
         - USE_SCREENER_FOR_UNIVERSE=false
         - DATABASE_URL=file:./database.db
       volumes:
         - ./database.db:/app/database.db
   ```

### Kubernetes Setup

1. **ConfigMap**:
   ```yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: rms-config
   data:
     USE_SCREENER_FOR_UNIVERSE: "false"
     DATABASE_URL: "file:./database.db"
     HOST: "0.0.0.0"
     PORT: "3000"
   ```

2. **Deployment**:
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: rms-server
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: rms-server
     template:
       metadata:
         labels:
           app: rms-server
       spec:
         containers:
         - name: rms-server
           image: rms-server:latest
           ports:
           - containerPort: 3000
           envFrom:
           - configMapRef:
               name: rms-config
   ```

## Production Environment

### Environment Variables

```bash
# Production environment variables
USE_SCREENER_FOR_UNIVERSE=false          # Disabled by default in production
DATABASE_URL=file:./production.db        # Production database
HOST=0.0.0.0                            # Bind to all interfaces
PORT=3000                               # Production port
NODE_ENV=production                     # Production mode
```

### Deployment Checklist

- [ ] Feature flag is set to `false` initially
- [ ] Database is properly configured and backed up
- [ ] Monitoring and alerting are configured
- [ ] Rollback procedures are documented and tested
- [ ] Team is available for deployment and monitoring

### Safe Feature Flag Toggle

1. **Enable Feature**:
   ```bash
   # Set feature flag
   export USE_SCREENER_FOR_UNIVERSE=true

   # Restart server
   systemctl restart rms-server
   # or
   docker restart rms-server
   # or
   kubectl rollout restart deployment/rms-server
   ```

2. **Verify Feature**:
   ```bash
   # Check feature flag endpoint
   curl https://your-domain.com/api/feature-flags

   # Expected response: {"useScreenerForUniverse": true}
   ```

3. **Monitor Operations**:
   - Check server logs for sync operations
   - Monitor database for universe changes
   - Verify UI behavior changes

## Environment-Specific Behaviors

### Local Development
- **Feature Flag**: Easy to toggle via `.env` file
- **Database**: Local SQLite file
- **Restart Required**: Yes, after `.env` changes
- **Testing**: Safe to experiment

### Development/Staging
- **Feature Flag**: Set via environment variables
- **Database**: Separate development database
- **Restart Required**: Yes, after environment changes
- **Testing**: Safe to test features

### Production
- **Feature Flag**: Set via environment variables
- **Database**: Production database with real data
- **Restart Required**: Yes, after environment changes
- **Testing**: Feature must be tested before enabling
- **Rollback**: Must have rollback plan ready

## Troubleshooting

### Common Issues

1. **Environment Variable Not Read**:
   - Verify variable name spelling
   - Check for extra spaces or quotes
   - Restart server after changes

2. **Database Connection Issues**:
   - Verify `DATABASE_URL` format
   - Check file permissions
   - Ensure database file exists

3. **Feature Flag Not Working**:
   - Verify environment variable is set
   - Check server logs for errors
   - Restart server after changes

### Debug Commands

```bash
# Check environment variables
env | grep -E "(USE_SCREENER|DATABASE|HOST|PORT)"

# Test feature flags endpoint
curl http://localhost:3000/api/feature-flags

# Check server status
pnpm nx run server:serve

# Verify database
ls -la database.db
```

## Security Considerations

1. **Environment Variables**: Store sensitive values securely
2. **Database Access**: Use appropriate database user permissions
3. **Network Binding**: Bind to appropriate interfaces in production
4. **Feature Flags**: Limit access to production environment variables

## Next Steps

- [Feature Flags Guide](./feature-flags.md) - Detailed feature flag configuration
- [Architecture Documentation](../architecture/index.md) - System architecture overview
- [Rollback Runbook](../rollback-runbook.md) - Emergency procedures



