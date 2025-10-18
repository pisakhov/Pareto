import duckdb

conn = duckdb.connect('database.ddb', read_only=True)
result = conn.execute("DESCRIBE providers").fetchall()
print("Providers table columns:")
for row in result:
    print(f"  {row[0]}: {row[1]}")

has_tier_thresholds = any(row[0] == 'tier_thresholds' for row in result)
print(f"\ntier_thresholds column exists: {has_tier_thresholds}")

if not has_tier_thresholds:
    print("\n❌ Need to add tier_thresholds column!")
    print("Run: poetry run python3 -m scripts.add_tier_column")
conn.close()
