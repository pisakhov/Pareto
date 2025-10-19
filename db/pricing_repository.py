"""
Pricing Repository - Data Access Layer for Pricing Management

This module handles all database operations for providers and offers using DuckDB.
"""

import duckdb
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from dataclasses import dataclass


@dataclass
class Provider:
    provider_id: int
    company_name: str
    details: str
    status: str
    date_creation: str
    date_last_update: str
    tier_thresholds: str = None


@dataclass
class Item:
    item_id: int
    item_name: str
    description: str
    status: str
    date_creation: str
    date_last_update: str


@dataclass
class ProviderItem:
    provider_id: int
    item_id: int
    date_creation: str


@dataclass
class Offer:
    offer_id: int
    item_id: int
    provider_id: int
    tier_number: int
    price_per_unit: float
    status: str
    date_creation: str
    date_last_update: str


@dataclass
class ProviderTierOverride:
    provider_id: int
    manual_tier: int
    notes: str
    date_creation: str
    date_last_update: str


class PricingRepository:
    """Repository class for managing pricing data with DuckDB"""

    def __init__(self, db_path: str = "database.ddb"):
        self.db_path = os.path.join(os.path.dirname(__file__), "..", db_path)
        self.conn = None

    def _get_connection(self):
        """Get or create database connection"""
        if self.conn is None:
            try:
                self.conn = duckdb.connect(self.db_path, read_only=False)
            except Exception as e:
                print(f"Warning: Could not connect to database: {e}")
                # Try to connect in read-only mode as fallback
                self.conn = duckdb.connect(self.db_path, read_only=True)
        return self.conn

    def _initialize_database(self):
        """Initialize database tables if they don't exist"""
        try:
            conn = self._get_connection()
            self._create_sequences()
            self._create_providers_table()
            self._create_items_table()
            self._create_provider_items_table()
            self._create_offers_table()
            self._create_provider_tier_overrides_table()
        except Exception as e:
            print(f"Warning: Database initialization failed: {e}")

    def _create_sequences(self):
        """Create database sequences for auto-incrementing IDs"""
        conn = self._get_connection()

        # Create sequences for primary keys
        conn.execute("CREATE SEQUENCE IF NOT EXISTS provider_seq")
        conn.execute("CREATE SEQUENCE IF NOT EXISTS item_seq")
        conn.execute("CREATE SEQUENCE IF NOT EXISTS offer_seq")
        
        # Sync sequences with existing data
        self._sync_sequences()

    def _create_providers_table(self):
        """Create providers table if it doesn't exist"""
        query = """
        CREATE TABLE IF NOT EXISTS providers (
            provider_id INTEGER PRIMARY KEY,
            company_name VARCHAR NOT NULL,
            details TEXT,
            tier_thresholds TEXT,
            status VARCHAR DEFAULT 'active',
            date_creation VARCHAR NOT NULL,
            date_last_update VARCHAR NOT NULL
        )
        """
        conn = self._get_connection()
        conn.execute(query)
        
        # Add tier_thresholds column if it doesn't exist (migration)
        try:
            columns = conn.execute("PRAGMA table_info(providers)").fetchall()
            column_names = [col[1] for col in columns]
            if 'tier_thresholds' not in column_names:
                print("Adding tier_thresholds column to providers table")
                conn.execute("ALTER TABLE providers ADD COLUMN tier_thresholds TEXT")
        except Exception as e:
            print(f"Migration warning: {e}")

    def _create_items_table(self):
        """Create items table if it doesn't exist"""
        query = """
        CREATE TABLE IF NOT EXISTS items (
            item_id INTEGER PRIMARY KEY,
            item_name VARCHAR NOT NULL,
            description TEXT,
            status VARCHAR DEFAULT 'active',
            date_creation VARCHAR NOT NULL,
            date_last_update VARCHAR NOT NULL
        )
        """
        conn = self._get_connection()
        conn.execute(query)

    def _create_provider_items_table(self):
        """Create provider_items junction table if it doesn't exist"""
        query = """
        CREATE TABLE IF NOT EXISTS provider_items (
            provider_id INTEGER,
            item_id INTEGER,
            date_creation VARCHAR NOT NULL,
            PRIMARY KEY (provider_id, item_id),
            FOREIGN KEY (provider_id) REFERENCES providers(provider_id),
            FOREIGN KEY (item_id) REFERENCES items(item_id)
        )
        """
        conn = self._get_connection()
        conn.execute(query)

    def _create_offers_table(self):
        """Create offers table if it doesn't exist"""
        query = """
        CREATE TABLE IF NOT EXISTS offers (
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
        )
        """
        conn = self._get_connection()
        conn.execute(query)

    def _create_provider_tier_overrides_table(self):
        """Create provider_tier_overrides table if it doesn't exist"""
        query = """
        CREATE TABLE IF NOT EXISTS provider_tier_overrides (
            provider_id INTEGER PRIMARY KEY,
            manual_tier INTEGER NOT NULL,
            notes TEXT,
            date_creation VARCHAR NOT NULL,
            date_last_update VARCHAR NOT NULL,
            FOREIGN KEY (provider_id) REFERENCES providers(provider_id)
        )
        """
        conn = self._get_connection()
        conn.execute(query)
    
    def _sync_sequences(self):
        """Sync sequences with existing max IDs in tables"""
        conn = self._get_connection()
        
        # Sync provider_seq
        max_provider = conn.execute("SELECT COALESCE(MAX(provider_id), 0) FROM providers").fetchone()[0]
        conn.execute("DROP SEQUENCE IF EXISTS provider_seq")
        conn.execute(f"CREATE SEQUENCE provider_seq START {max_provider + 1}")
        
        # Sync item_seq
        max_item = conn.execute("SELECT COALESCE(MAX(item_id), 0) FROM items").fetchone()[0]
        conn.execute("DROP SEQUENCE IF EXISTS item_seq")
        conn.execute(f"CREATE SEQUENCE item_seq START {max_item + 1}")
        
        # Sync offer_seq
        max_offer = conn.execute("SELECT COALESCE(MAX(offer_id), 0) FROM offers").fetchone()[0]
        conn.execute("DROP SEQUENCE IF EXISTS offer_seq")
        conn.execute(f"CREATE SEQUENCE offer_seq START {max_offer + 1}")

    def create_provider(
        self, company_name: str, details: str = "", status: str = "active"
    ) -> Provider:
        """Create a new provider"""
        conn = self._get_connection()
        now = datetime.now().isoformat()

        provider_id = conn.execute("SELECT nextval('provider_seq')").fetchone()[0]

        conn.execute(
            """
            INSERT INTO providers (provider_id, company_name, details, status, date_creation, date_last_update, tier_thresholds)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            [provider_id, company_name, details, status, now, now, None],
        )

        return Provider(
            provider_id=provider_id,
            company_name=company_name,
            details=details,
            status=status,
            date_creation=now,
            date_last_update=now,
            tier_thresholds=None,
        )

    def get_provider(self, provider_id: int) -> Optional[Provider]:
        """Get a provider by ID"""
        conn = self._get_connection()
        result = conn.execute(
            "SELECT provider_id, company_name, details, status, date_creation, date_last_update, tier_thresholds FROM providers WHERE provider_id = ?", [provider_id]
        ).fetchone()

        if result:
            return Provider(*result)
        return None

    def get_all_providers(self) -> List[Provider]:
        """Get all providers"""
        conn = self._get_connection()
        results = conn.execute(
            "SELECT provider_id, company_name, details, status, date_creation, date_last_update, tier_thresholds FROM providers ORDER BY company_name"
        ).fetchall()
        return [Provider(*result) for result in results]

    def get_all_providers_with_tier_counts(self) -> List[Dict[str, Any]]:
        """Get all providers with their tier counts"""
        conn = self._get_connection()
        results = conn.execute(
            "SELECT provider_id, company_name, details, status, date_creation, date_last_update, tier_thresholds FROM providers ORDER BY company_name"
        ).fetchall()
        
        providers_with_counts = []
        for result in results:
            provider = Provider(*result)
            tier_data = self.get_provider_tier_thresholds(provider.provider_id)
            tier_count = len(tier_data.get("thresholds", {}))
            
            providers_with_counts.append({
                "provider_id": provider.provider_id,
                "company_name": provider.company_name,
                "details": provider.details,
                "status": provider.status,
                "date_creation": provider.date_creation,
                "date_last_update": provider.date_last_update,
                "tier_count": tier_count
            })
        
        return providers_with_counts

    def update_provider(
        self,
        provider_id: int,
        company_name: str = None,
        details: str = None,
        status: str = None,
    ) -> bool:
        """Update a provider"""
        conn = self._get_connection()
        now = datetime.now().isoformat()

        # Get current values
        current = self.get_provider(provider_id)
        if not current:
            return False

        # Use new values or keep current ones
        company_name = (
            company_name if company_name is not None else current.company_name
        )
        details = details if details is not None else current.details
        status = status if status is not None else current.status

        conn.execute(
            """
            UPDATE providers
            SET company_name = ?, details = ?, status = ?, date_last_update = ?
            WHERE provider_id = ?
        """,
            [company_name, details, status, now, provider_id],
        )

        return True

    def delete_provider(self, provider_id: int) -> bool:
        """Delete a provider (and associated offers and relationships)"""
        conn = self._get_connection()

        # Delete associated offers first
        conn.execute("DELETE FROM offers WHERE provider_id = ?", [provider_id])

        # Delete provider-item relationships
        conn.execute("DELETE FROM provider_items WHERE provider_id = ?", [provider_id])

        # Delete provider
        result = conn.execute(
            "DELETE FROM providers WHERE provider_id = ?", [provider_id]
        )
        return result.rowcount > 0

    # Item management methods
    def create_item(
        self, item_name: str, description: str = None, status: str = "active"
    ) -> Optional[Item]:
        """Create a new item"""
        conn = self._get_connection()

        now = datetime.now().isoformat()
        item_id = conn.execute("SELECT nextval('item_seq')").fetchone()[0]

        conn.execute(
            """
            INSERT INTO items (item_id, item_name, description, status, date_creation, date_last_update)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            [item_id, item_name, description or "", status, now, now],
        )

        return Item(
            item_id=item_id,
            item_name=item_name,
            description=description or "",
            status=status,
            date_creation=now,
            date_last_update=now,
        )

    def get_item(self, item_id: int) -> Optional[Item]:
        """Get an item by ID"""
        conn = self._get_connection()
        result = conn.execute(
            "SELECT * FROM items WHERE item_id = ?", [item_id]
        ).fetchone()

        if result:
            return Item(*result)
        return None

    def get_all_items(self) -> List[Item]:
        """Get all items"""
        conn = self._get_connection()
        results = conn.execute("SELECT * FROM items ORDER BY item_name").fetchall()
        return [Item(*result) for result in results]

    def update_item(
        self,
        item_id: int,
        item_name: str = None,
        description: str = None,
        status: str = None,
    ) -> bool:
        """Update an item"""
        conn = self._get_connection()
        now = datetime.now().isoformat()

        # Get current values
        current = self.get_item(item_id)
        if not current:
            return False

        # Use new values or keep current ones
        item_name = item_name if item_name is not None else current.item_name
        description = description if description is not None else current.description
        status = status if status is not None else current.status

        conn.execute(
            """
            UPDATE items
            SET item_name = ?, description = ?, status = ?, date_last_update = ?
            WHERE item_id = ?
        """,
            [item_name, description, status, now, item_id],
        )

        return True

    def delete_item(self, item_id: int) -> bool:
        """Delete an item (and associated offers and relationships)"""
        conn = self._get_connection()

        # Delete associated offers first
        conn.execute("DELETE FROM offers WHERE item_id = ?", [item_id])

        # Delete provider-item relationships
        conn.execute("DELETE FROM provider_items WHERE item_id = ?", [item_id])

        # Delete item
        result = conn.execute("DELETE FROM items WHERE item_id = ?", [item_id])
        return result.rowcount > 0

    # Provider-Item relationship methods
    def add_provider_item_relationship(self, provider_id: int, item_id: int) -> bool:
        """Add a relationship between a provider and an item"""
        conn = self._get_connection()

        # Check if both exist
        if not self.get_provider(provider_id) or not self.get_item(item_id):
            return False

        now = datetime.now().isoformat()
        try:
            conn.execute(
                """
                INSERT OR IGNORE INTO provider_items (provider_id, item_id, date_creation)
                VALUES (?, ?, ?)
            """,
                [provider_id, item_id, now],
            )
            return True
        except:
            return False

    def set_providers_for_item(self, item_id: int, provider_ids: List[int]):
        """Set the providers for a specific item, replacing existing ones"""
        conn = self._get_connection()
        now = datetime.now().isoformat()

        # Delete existing relationships for this item
        conn.execute("DELETE FROM provider_items WHERE item_id = ?", [item_id])

        # Insert new relationships
        for provider_id in provider_ids:
            conn.execute(
                """
                INSERT INTO provider_items (provider_id, item_id, date_creation)
                VALUES (?, ?, ?)
            """,
                [provider_id, item_id, now],
            )

    def remove_provider_item_relationship(self, provider_id: int, item_id: int) -> bool:
        """Remove a relationship between a provider and an item"""
        conn = self._get_connection()
        result = conn.execute(
            "DELETE FROM provider_items WHERE provider_id = ? AND item_id = ?",
            [provider_id, item_id],
        )
        return result.rowcount > 0

    def get_providers_for_item(self, item_id: int) -> List[int]:
        """Get all provider IDs for a specific item"""
        conn = self._get_connection()
        results = conn.execute(
            "SELECT provider_id FROM provider_items WHERE item_id = ?", [item_id]
        ).fetchall()
        return [result[0] for result in results]

    def get_provider_item_relationships(self) -> List[ProviderItem]:
        """Get all provider-item relationships"""
        conn = self._get_connection()
        results = conn.execute("SELECT * FROM provider_items").fetchall()
        return [ProviderItem(*result) for result in results]

    def bulk_update_provider_item_relationships(
        self, relationships: List[Dict]
    ) -> bool:
        """Bulk update provider-item relationships"""
        conn = self._get_connection()

        try:
            # Delete all existing relationships
            conn.execute("DELETE FROM provider_items")

            # Insert new relationships
            now = datetime.now().isoformat()
            for rel in relationships:
                conn.execute(
                    """
                    INSERT INTO provider_items (provider_id, item_id, date_creation)
                    VALUES (?, ?, ?)
                """,
                    [rel["provider_id"], rel["item_id"], now],
                )

            return True
        except Exception as e:
            print(f"Error updating relationships: {e}")
            return False

    def create_offer(
        self,
        item_id: int,
        provider_id: int,
        tier_number: int,
        price_per_unit: float,
        status: str = "active",
    ) -> Optional[Offer]:
        """Create a new offer"""
        conn = self._get_connection()

        # Check if both provider and item exist
        if not self.get_provider(provider_id) or not self.get_item(item_id):
            return None

        now = datetime.now().isoformat()
        offer_id = conn.execute("SELECT nextval('offer_seq')").fetchone()[0]

        conn.execute(
            """
            INSERT INTO offers (offer_id, item_id, provider_id, tier_number, price_per_unit, status, date_creation, date_last_update)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            [
                offer_id,
                item_id,
                provider_id,
                tier_number,
                price_per_unit,
                status,
                now,
                now,
            ],
        )

        return Offer(
            offer_id=offer_id,
            item_id=item_id,
            provider_id=provider_id,
            tier_number=tier_number,
            price_per_unit=price_per_unit,
            status=status,
            date_creation=now,
            date_last_update=now,
        )

    def get_offer(self, offer_id: int) -> Optional[Offer]:
        """Get an offer by ID"""
        conn = self._get_connection()
        result = conn.execute(
            "SELECT * FROM offers WHERE offer_id = ?", [offer_id]
        ).fetchone()

        if result:
            return Offer(*result)
        return None

    def get_all_offers(self) -> List[Dict[str, Any]]:
        """Get all offers with provider and item information"""
        conn = self._get_connection()
        results = conn.execute("""
            SELECT o.*, p.company_name as provider_name, i.item_name
            FROM offers o
            JOIN providers p ON o.provider_id = p.provider_id
            JOIN items i ON o.item_id = i.item_id
            ORDER BY p.company_name, i.item_name, o.tier_number
        """).fetchall()

        return [
            {
                "offer_id": row[0],
                "item_id": row[1],
                "provider_id": row[2],
                "tier_number": row[3],
                "price_per_unit": float(row[4]),
                "status": row[5],
                "date_creation": row[6],
                "date_last_update": row[7],
                "provider_name": row[8],
                "item_name": row[9],
            }
            for row in results
        ]

    def get_offers_by_provider(self, provider_id: int) -> List[Offer]:
        """Get all offers for a specific provider"""
        conn = self._get_connection()
        results = conn.execute(
            "SELECT * FROM offers WHERE provider_id = ? ORDER BY tier_number",
            [provider_id],
        ).fetchall()

        return [Offer(*result) for result in results]

    def update_offer(
        self,
        offer_id: int,
        tier_number: int = None,
        price_per_unit: float = None,
        status: str = None,
    ) -> bool:
        """Update an offer"""
        conn = self._get_connection()
        now = datetime.now().isoformat()

        # Get current values
        current = self.get_offer(offer_id)
        if not current:
            return False

        # Use new values or keep current ones
        tier_number = tier_number if tier_number is not None else current.tier_number
        price_per_unit = (
            price_per_unit if price_per_unit is not None else current.price_per_unit
        )
        status = status if status is not None else current.status

        conn.execute(
            """
            UPDATE offers
            SET tier_number = ?, price_per_unit = ?, status = ?, date_last_update = ?
            WHERE offer_id = ?
        """,
            [tier_number, price_per_unit, status, now, offer_id],
        )

        return True

    def delete_offer(self, offer_id: int) -> bool:
        """Delete an offer"""
        conn = self._get_connection()
        result = conn.execute("DELETE FROM offers WHERE offer_id = ?", [offer_id])
        return result.rowcount > 0

    def delete_offers_for_item(self, item_id: int) -> int:
        """Delete all offers for an item, returns count deleted"""
        conn = self._get_connection()
        result = conn.execute("DELETE FROM offers WHERE item_id = ?", [item_id])
        return result.rowcount

    def get_providers_with_offers(self) -> List[Dict[str, Any]]:
        """Get all providers with their offers"""
        conn = self._get_connection()
        providers = conn.execute(
            "SELECT provider_id, company_name, details, status, date_creation, date_last_update, tier_thresholds FROM providers ORDER BY company_name"
        ).fetchall()

        result = []
        for provider_row in providers:
            provider = Provider(*provider_row)
            offers = self.get_offers_by_provider(provider.provider_id)

            result.append({"provider": provider, "offers": offers})

        return result

    def get_offers_for_item_optimization(
        self, item_id: int, quantity: int
    ) -> List[Dict[str, Any]]:
        """Get applicable offers for optimization calculation with provider details"""
        conn = self._get_connection()
        results = conn.execute(
            """
            SELECT 
                o.offer_id,
                o.item_id,
                o.provider_id,
                o.tier_number,
                o.price_per_unit,
                o.status,
                p.company_name as provider_name,
                i.item_name
            FROM offers o
            JOIN providers p ON o.provider_id = p.provider_id
            JOIN items i ON o.item_id = i.item_id
            WHERE o.item_id = ?
              AND o.status = 'active'
              AND p.status = 'active'
              AND i.status = 'active'
              AND o.tier_number <= ?
            ORDER BY o.price_per_unit ASC
        """,
            [item_id, quantity],
        ).fetchall()

        return [
            {
                "offer_id": row[0],
                "item_id": row[1],
                "provider_id": row[2],
                "tier_number": row[3],
                "price_per_unit": float(row[4]),
                "status": row[5],
                "provider_name": row[6],
                "item_name": row[7],
                "total_cost": float(row[4]) * quantity,
            }
            for row in results
        ]

    # Tier-based pricing methods
    def set_provider_tier_thresholds(self, provider_id: int, thresholds: Dict[str, int], base_prices: Dict[str, float] = None):
        """Set tier thresholds and base prices for a provider."""
        conn = self._get_connection()
        now = datetime.now().isoformat()
        
        import json
        tier_data = {
            "thresholds": thresholds,
            "base_prices": base_prices or {}
        }
        conn.execute(
            "UPDATE providers SET tier_thresholds = ?, date_last_update = ? WHERE provider_id = ?",
            [json.dumps(tier_data), now, provider_id]
        )

    def get_provider_tier_thresholds(self, provider_id: int) -> Dict:
        """Get tier thresholds and base prices for a provider."""
        conn = self._get_connection()
        result = conn.execute(
            "SELECT tier_thresholds FROM providers WHERE provider_id = ?",
            [provider_id]
        ).fetchone()
        
        if result and result[0]:
            import json
            data = json.loads(result[0])
            if isinstance(data, dict) and "thresholds" in data:
                return data
            return {"thresholds": data, "base_prices": {}}
        return {"thresholds": {"1": 0}, "base_prices": {}}

    def get_tier_for_credit_files(self, provider_id: int, total_credit_files: int) -> int:
        """Determine tier based on total credit files."""
        tier_data = self.get_provider_tier_thresholds(provider_id)
        thresholds = tier_data.get("thresholds", {})
        
        tier_list = [(int(tier), threshold) for tier, threshold in thresholds.items()]
        tier_list.sort(key=lambda x: x[1], reverse=True)
        
        for tier_num, threshold in tier_list:
            if total_credit_files >= threshold:
                return tier_num
        
        return 1

    def get_price_for_item_at_tier(self, provider_id: int, item_id: int, tier_number: int) -> Optional[float]:
        """Get price for an item at a specific tier with inheritance."""
        conn = self._get_connection()
        
        result = conn.execute(
            """
            SELECT price_per_unit FROM offers
            WHERE provider_id = ? AND item_id = ? AND tier_number = ? AND status = 'active'
            LIMIT 1
            """,
            [provider_id, item_id, tier_number]
        ).fetchone()
        
        if result:
            return float(result[0])
        
        if tier_number > 1:
            return self.get_price_for_item_at_tier(provider_id, item_id, tier_number - 1)
        
        return None

    def set_provider_tier_override(self, provider_id: int, manual_tier: int, notes: str = ""):
        """Set manual tier override for a provider."""
        conn = self._get_connection()
        now = datetime.now().isoformat()
        
        existing = conn.execute(
            "SELECT provider_id FROM provider_tier_overrides WHERE provider_id = ?",
            [provider_id]
        ).fetchone()
        
        if existing:
            conn.execute(
                """
                UPDATE provider_tier_overrides
                SET manual_tier = ?, notes = ?, date_last_update = ?
                WHERE provider_id = ?
                """,
                [manual_tier, notes, now, provider_id]
            )
        else:
            conn.execute(
                """
                INSERT INTO provider_tier_overrides (provider_id, manual_tier, notes, date_creation, date_last_update)
                VALUES (?, ?, ?, ?, ?)
                """,
                [provider_id, manual_tier, notes, now, now]
            )

    def get_provider_tier_override(self, provider_id: int) -> Optional[ProviderTierOverride]:
        """Get manual tier override for a provider."""
        conn = self._get_connection()
        result = conn.execute(
            "SELECT * FROM provider_tier_overrides WHERE provider_id = ?",
            [provider_id]
        ).fetchone()
        
        if result:
            return ProviderTierOverride(*result)
        return None

    def clear_provider_tier_override(self, provider_id: int):
        """Clear manual tier override for a provider."""
        conn = self._get_connection()
        conn.execute(
            "DELETE FROM provider_tier_overrides WHERE provider_id = ?",
            [provider_id]
        )

    def validate_equal_tiers(self, provider_id: int) -> Dict[str, Any]:
        """Validate tier consistency for a provider."""
        conn = self._get_connection()
        results = conn.execute(
            """
            SELECT i.item_name, COUNT(DISTINCT o.tier_number) as tier_count
            FROM offers o
            JOIN items i ON o.item_id = i.item_id
            WHERE o.provider_id = ? AND o.status = 'active'
            GROUP BY i.item_name
            """,
            [provider_id]
        ).fetchall()
        
        return {
            "items": [{"item_name": row[0], "tier_count": row[1]} for row in results]
        }

    def get_provider_item_allocations(self) -> Dict[str, Any]:
        """Calculate total allocations per provider-item across all products."""
        conn = self._get_connection()
        
        try:
            results = conn.execute("""
                SELECT 
                    p.product_id,
                    p.name as product_name,
                    p.proxy_quantity,
                    a.provider_id,
                    a.item_id,
                    a.allocation_mode,
                    a.allocation_value
                FROM products p
                JOIN product_item_allocations a ON p.product_id = a.product_id
                WHERE p.status = 'active'
            """).fetchall()
        except Exception:
            return {'provider_items': {}}
        
        provider_items = {}
        
        for row in results:
            product_id = row[0]
            product_name = row[1]
            proxy_quantity = row[2]
            provider_id = str(row[3])
            item_id = str(row[4])
            allocation_mode = row[5]
            allocation_value = float(row[6])
            
            # Calculate effective units based on allocation mode
            if allocation_mode == 'percentage':
                # Normalize percentage: handle both 0-1 and 0-100 ranges
                fraction = allocation_value / 100 if allocation_value > 1 else allocation_value
                count = round(proxy_quantity * fraction)
            else:  # units mode
                count = int(allocation_value)
            
            if provider_id not in provider_items:
                provider_items[provider_id] = {}
            
            if item_id not in provider_items[provider_id]:
                provider_items[provider_id][item_id] = {
                    'total': 0,
                    'products': []
                }
            
            provider_items[provider_id][item_id]['total'] += count
            provider_items[provider_id][item_id]['products'].append({
                'id': str(product_id),
                'name': product_name,
                'count': count
            })
        
        return {'provider_items': provider_items}

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()


# Global repository instance - initialize lazily to avoid lock issues
pricing_repo = None


def get_pricing_repo():
    """Get or create the global pricing repository instance"""
    global pricing_repo
    if pricing_repo is None:
        print("LOG: Initializing pricing repository")
        pricing_repo = PricingRepository()
        print("LOG: Created pricing repository instance")
        pricing_repo._initialize_database()
        print("LOG: Initialized pricing database")
    return pricing_repo
