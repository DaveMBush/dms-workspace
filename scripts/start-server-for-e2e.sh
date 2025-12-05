#!/bin/bash
export NODE_ENV=test
export DATABASE_URL="file:./database.db"
pnpm exec nx run server:serve
