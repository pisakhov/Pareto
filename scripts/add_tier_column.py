"""
Add tier_thresholds column if it doesn't exist.
Run with: poetry run python3 -m scripts.add_tier_column
"""

import duckdb
import os

db_path = os.path.join(os.path.dirname(__file__), "..", "database.ddb")
conn = duckdb.connect(db_path)

try:
    print("Adding tier_thresholds column to providers table...")
    conn.execute("ALTER TABLE providers ADD COLUMN IF NOT EXISTS tier_thresholds JSON")
    print("✅ Column added successfully!")
except Exception as e:
    print(f"⚠️  Error (might already exist): {e}")

conn.close()
print("\nDone! Restart your server to see changes.")
