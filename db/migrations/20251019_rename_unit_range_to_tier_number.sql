-- Migration: Rename unit_range to tier_number in offers table
-- Date: 2025-10-19
-- Description: Rename unit_range column to tier_number for better semantic clarity

-- DuckDB doesn't support direct column rename, so we need to:
-- 1. Add new column
-- 2. Copy data
-- 3. Drop old column

-- Add the new tier_number column
ALTER TABLE offers ADD COLUMN tier_number INTEGER;

-- Copy data from unit_range to tier_number
UPDATE offers SET tier_number = unit_range;

-- Drop the old unit_range column
ALTER TABLE offers DROP COLUMN unit_range;

-- Verify the migration
SELECT 'Migration completed. Offers table now uses tier_number column.' as status;
