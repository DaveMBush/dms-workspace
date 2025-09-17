-- PostgreSQL initialization script for RMS Workspace
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
    RAISE NOTICE 'RMS Local Database initialized successfully';
    RAISE NOTICE 'Database: rms_local';
    RAISE NOTICE 'User: rms_user';
    RAISE NOTICE 'Extensions: uuid-ossp, pgcrypto';
END
$$;