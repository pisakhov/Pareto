-- Migration: Rename unit_range to tier_number in offers table (v2)
-- Date: 2025-10-19  
-- Description: Recreate offers table with tier_number instead of unit_range

-- Create new table with tier_number
CREATE TABLE offers_new (
    offer_id INTEGER PRIMARY KEY,
    item_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    tier_number INTEGER NOT NULL,
    price_per_unit DECIMAL(10,2) NOT NULL,
    status VARCHAR DEFAULT 'active',
    date_creation VARCHAR NOT NULL,
    date_last_update VARCHAR NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items(item_id),
    FOREIGN KEY (provider_id) REFERENCES providers(provider_id)
);

-- Copy data from old table (unit_range becomes tier_number)
INSERT INTO offers_new 
SELECT offer_id, item_id, provider_id, 
       COALESCE(tier_number, unit_range) as tier_number,
       price_per_unit, status, date_creation, date_last_update
FROM offers;

-- Drop old table
DROP TABLE offers;

-- Rename new table to offers
ALTER TABLE offers_new RENAME TO offers;

-- Verify
SELECT 'Migration completed successfully!' as status;
