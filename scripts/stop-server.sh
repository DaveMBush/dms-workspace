#!/bin/bash

# Stop Server Script
# Gracefully stops the Node.js server processes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping server processes...${NC}"

# Check for running processes
if pgrep -f "node.*server" > /dev/null; then
    # Show processes that will be stopped
    echo -e "${YELLOW}Found running server processes:${NC}"
    pgrep -f -l "node.*server"
    
    # Gracefully stop processes
    pkill -TERM -f "node.*server"
    
    # Wait a moment for graceful shutdown
    sleep 3
    
    # Force kill if still running
    if pgrep -f "node.*server" > /dev/null; then
        echo -e "${YELLOW}Processes still running, forcing shutdown...${NC}"
        pkill -KILL -f "node.*server"
        sleep 1
    fi
    
    # Check if processes are stopped
    if pgrep -f "node.*server" > /dev/null; then
        echo -e "${RED}ERROR: Unable to stop server processes${NC}"
        exit 1
    else
        echo -e "${GREEN}Server processes stopped successfully${NC}"
    fi
else
    echo -e "${GREEN}No server processes running${NC}"
fi