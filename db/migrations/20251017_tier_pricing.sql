-- Migration: Tier-Based Pricing System
-- Date: 2025-10-17
-- Description: Convert from unit_range to tier_number system with provider tier thresholds

-- 1. Add tier thresholds to providers table
-- Format: {"1": 0, "2": 10000, "3": 50000, "4": 100000, "5": 500000}
ALTER TABLE providers ADD COLUMN IF NOT EXISTS tier_thresholds JSON;

-- 2. Rename unit_range to tier_number in offers table
-- Note: DuckDB doesn't support direct column rename, so we create new column and copy data
ALTER TABLE offers ADD COLUMN IF NOT EXISTS tier_number INTEGER;

-- Copy existing data if unit_range exists
UPDATE offers SET tier_number = unit_range WHERE tier_number IS NULL;

-- Drop old column (optional, can be done manually after verification)
-- ALTER TABLE offers DROP COLUMN unit_range;

-- 3. Create provider tier overrides table
-- Stores manual tier overrides per provider
CREATE TABLE IF NOT EXISTS provider_tier_overrides (
    provider_id INTEGER PRIMARY KEY,
    manual_tier INTEGER NOT NULL,
    notes TEXT,
    date_creation VARCHAR NOT NULL,
    date_last_update VARCHAR NOT NULL,
    FOREIGN KEY (provider_id) REFERENCES providers(provider_id)
);

-- 4. Add index for efficient tier lookups
CREATE INDEX IF NOT EXISTS idx_offers_provider_item_tier 
    ON offers(provider_id, item_id, tier_number);

-- 5. Add index for tier overrides
CREATE INDEX IF NOT EXISTS idx_provider_tier_overrides 
    ON provider_tier_overrides(provider_id);

-- Notes:
-- - Tier 1 always starts at 0 credit files
-- - Thresholds define minimum credit files for each tier
-- - Missing tier prices inherit from the nearest lower tier
-- - Manual overrides supersede calculated tiers
