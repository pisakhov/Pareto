#!/usr/bin/env python3
"""
Run database migration to rename unit_range to tier_number
"""
import duckdb
import os
import sys

def run_migration():
    """Execute the migration SQL file"""
    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), "..", "..", "database.ddb")
    migration_file = os.path.join(os.path.dirname(__file__), "20251019_rename_unit_range_to_tier_number.sql")
    
    print(f"Running migration: {migration_file}")
    print(f"Database: {db_path}")
    
    # Read migration SQL
    with open(migration_file, 'r') as f:
        sql = f.read()
    
    # Connect and execute
    try:
        conn = duckdb.connect(db_path)
        
        # Split by semicolons and execute each statement
        statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
        
        for stmt in statements:
            if stmt:
                print(f"Executing: {stmt[:100]}...")
                conn.execute(stmt)
        
        print("\n✅ Migration completed successfully!")
        
        # Verify the change
        result = conn.execute("PRAGMA table_info(offers)").fetchall()
        columns = [row[1] for row in result]
        print(f"\nCurrent offers table columns: {columns}")
        
        if 'tier_number' in columns and 'unit_range' not in columns:
            print("✅ Verification passed: tier_number column exists, unit_range removed")
        else:
            print("⚠️  Warning: Unexpected column state")
            
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
