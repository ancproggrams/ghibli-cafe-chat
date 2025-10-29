-- Initialize OpenMemory database
CREATE EXTENSION IF NOT EXISTS vector;

-- Create OpenMemory tables (these will be created by OpenMemory service)
-- This file is for any custom initialization if needed

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE openmemory TO openmemory;
GRANT ALL PRIVILEGES ON SCHEMA public TO openmemory;
