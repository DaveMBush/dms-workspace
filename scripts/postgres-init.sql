-- PostgreSQL initialization script for DMS Workspace
-- This script sets up the database for local development

-- Ensure the database is created (handled by POSTGRES_DB env var)
-- Create any additional schemas or extensions if needed

-- Enable commonly used extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create indexes that might be needed for performance
-- (Prisma will handle table creation via migrations)

-- Log initialization completion
DO $$
BEGIN
    RAISE NOTICE 'DMS Local Database initialized successfully';
    RAISE NOTICE 'Database: dms_local';
    RAISE NOTICE 'User: dms_user';
    RAISE NOTICE 'Extensions: uuid-ossp, pgcrypto';
END
$$;
