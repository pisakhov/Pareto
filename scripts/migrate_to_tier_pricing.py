"""
Migration runner for tier-based pricing system.

Run with: poetry run python3 -m scripts.migrate_to_tier_pricing
"""

import duckdb
import os
import sys

def run_migration():
    """Execute tier pricing migration SQL."""
    db_path = os.path.join(os.path.dirname(__file__), "..", "database.ddb")
    migration_path = os.path.join(os.path.dirname(__file__), "..", "db", "migrations", "20251017_tier_pricing.sql")
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found at {db_path}")
        sys.exit(1)
    
    if not os.path.exists(migration_path):
        print(f"❌ Migration file not found at {migration_path}")
        sys.exit(1)
    
    print("🚀 Starting tier pricing migration...")
    print(f"📁 Database: {db_path}")
    print(f"📄 Migration: {migration_path}")
    
    with open(migration_path, 'r') as f:
        migration_sql = f.read()
    
    conn = duckdb.connect(db_path)
    
    statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]
    
    for i, statement in enumerate(statements, 1):
        if not statement:
            continue
        try:
            print(f"\n⚙️  Executing statement {i}/{len(statements)}...")
            conn.execute(statement)
            print(f"✅ Success")
        except Exception as e:
            print(f"⚠️  Warning: {e}")
            print(f"   Statement: {statement[:100]}...")
    
    conn.close()
    print("\n✨ Migration completed!")
    print("\nNext steps:")
    print("1. Verify schema with: SELECT * FROM offers LIMIT 1;")
    print("2. Manually drop unit_range column if needed: ALTER TABLE offers DROP COLUMN unit_range;")
    print("3. Test with sample data")

if __name__ == "__main__":
    run_migration()
