#!/bin/bash

# Start Server Script
# Starts the Node.js server with proper configuration

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting server...${NC}"

# Check if server is already running
if pgrep -f "node.*server" > /dev/null; then
    echo -e "${YELLOW}Server is already running:${NC}"
    pgrep -f -l "node.*server"
    exit 0
fi

# Check if database exists
if [ ! -f "database.db" ]; then
    echo -e "${YELLOW}Warning: database.db not found. Server may need initial setup.${NC}"
fi

# Start the server (adjust command as needed for your setup)
echo -e "${YELLOW}Starting server process...${NC}"

# Check if we're in development mode
if [ "${NODE_ENV}" = "development" ] || [ -z "${NODE_ENV}" ]; then
    echo -e "${YELLOW}Starting in development mode...${NC}"
    # Use npm/pnpm start for development
    pnpm nx serve server &
    SERVER_PID=$!
else
    echo -e "${YELLOW}Starting in production mode...${NC}"
    # Use production command
    node apps/server/main.js &
    SERVER_PID=$!
fi

# Wait a moment for startup
sleep 3

# Check if server started successfully
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo -e "${GREEN}Server started successfully (PID: $SERVER_PID)${NC}"
    
    # Optional: Test server health
    # Uncomment if you have a health endpoint
    # echo -e "${YELLOW}Testing server health...${NC}"
    # if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    #     echo -e "${GREEN}Server health check passed${NC}"
    # else
    #     echo -e "${YELLOW}Server health check failed (server may still be starting)${NC}"
    # fi
else
    echo -e "${RED}ERROR: Server failed to start${NC}"
    exit 1
fi