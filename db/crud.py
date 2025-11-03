"""
CRUD Operations - All database create, read, update, delete operations

This module provides a unified interface for all database operations.
"""

import duckdb
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from db.schemas import DatabaseSchema


class CRUDOperations(DatabaseSchema):
    """Unified CRUD operations for all entities"""

    def __init__(self, db_path: str = "database.ddb", conn=None):
        super().__init__(db_path, conn)

    # Provider CRUD operations
    def create_provider(self, company_name: str, details: str = "", status: str = "active") -> Any:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        provider_id = conn.execute("SELECT nextval('provider_seq')").fetchone()[0]
        conn.execute(
            "INSERT INTO providers (provider_id, company_name, details, status, date_creation, date_last_update, tier_thresholds) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [provider_id, company_name, details, status, now, now, None]
        )
        return self.get_provider(provider_id)

    def get_provider(self, provider_id: int) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        result = conn.execute(
            "SELECT provider_id, company_name, details, status, date_creation, date_last_update, tier_thresholds FROM providers WHERE provider_id = ?",
            [provider_id]
        ).fetchone()
        if result:
            return {
                "provider_id": result[0],
                "company_name": result[1],
                "details": result[2],
                "status": result[3],
                "date_creation": result[4],
                "date_last_update": result[5],
                "tier_thresholds": result[6]
            }
        return None

    def get_all_providers(self) -> List[Any]:
        conn = self._get_connection()
        results = conn.execute(
            "SELECT provider_id, company_name, details, status, date_creation, date_last_update, tier_thresholds FROM providers ORDER BY company_name"
        ).fetchall()
        return [result for result in results]

    def get_all_providers_with_tier_counts(self) -> List[Dict[str, Any]]:
        """Get all providers with their tier counts"""
        conn = self._get_connection()
        results = conn.execute(
            "SELECT provider_id, company_name, details, status, date_creation, date_last_update, tier_thresholds FROM providers ORDER BY company_name"
        ).fetchall()

        providers_with_counts = []
        for result in results:
            provider = result
            tier_data = self.get_provider_tier_thresholds(provider[0])
            tier_count = len(tier_data.get("thresholds", {}))

            providers_with_counts.append({
                "provider_id": provider[0],
                "company_name": provider[1],
                "details": provider[2],
                "status": provider[3],
                "date_creation": provider[4],
                "date_last_update": provider[5],
                "tier_count": tier_count
            })

        return providers_with_counts

    def update_provider(self, provider_id: int, company_name: str = None, details: str = None, status: str = None) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        current = self.get_provider(provider_id)
        if not current:
            return False

        company_name = company_name if company_name is not None else current["company_name"]
        details = details if details is not None else current["details"]
        status = status if status is not None else current["status"]

        conn.execute(
            "UPDATE providers SET company_name = ?, details = ?, status = ?, date_last_update = ? WHERE provider_id = ?",
            [company_name, details, status, now, provider_id]
        )
        conn.commit()
        return True

    def delete_provider(self, provider_id: int) -> bool:
        conn = self._get_connection()
        conn.execute("DELETE FROM offers WHERE provider_id = ?", [provider_id])
        conn.execute("DELETE FROM provider_items WHERE provider_id = ?", [provider_id])
        result = conn.execute("DELETE FROM providers WHERE provider_id = ?", [provider_id])
        return result.rowcount > 0

    # Item CRUD operations
    def create_item(self, item_name: str, description: str = None, status: str = "active") -> Any:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        item_id = conn.execute("SELECT nextval('item_seq')").fetchone()[0]
        conn.execute(
            "INSERT INTO items (item_id, item_name, description, status, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?)",
            [item_id, item_name, description or "", status, now, now]
        )
        return self.get_item(item_id)

    def get_item(self, item_id: int) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        result = conn.execute("SELECT * FROM items WHERE item_id = ?", [item_id]).fetchone()
        if result:
            return {
                "item_id": result[0],
                "item_name": result[1],
                "description": result[2],
                "status": result[3],
                "date_creation": result[4],
                "date_last_update": result[5]
            }
        return None

    def get_all_items(self) -> List[Any]:
        conn = self._get_connection()
        results = conn.execute("SELECT * FROM items ORDER BY item_name").fetchall()
        return [result for result in results]

    def update_item(self, item_id: int, item_name: str = None, description: str = None, status: str = None) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        current = self.get_item(item_id)
        if not current:
            return False

        item_name = item_name if item_name is not None else current["item_name"]
        description = description if description is not None else current["description"]
        status = status if status is not None else current["status"]

        conn.execute(
            "UPDATE items SET item_name = ?, description = ?, status = ?, date_last_update = ? WHERE item_id = ?",
            [item_name, description, status, now, item_id]
        )
        conn.commit()
        return True

    def delete_item(self, item_id: int) -> bool:
        conn = self._get_connection()
        conn.execute("DELETE FROM offers WHERE item_id = ?", [item_id])
        conn.execute("DELETE FROM provider_items WHERE item_id = ?", [item_id])
        result = conn.execute("DELETE FROM items WHERE item_id = ?", [item_id])
        return result.rowcount > 0

    # Product CRUD operations
    def create_product(self, name: str, description: str = "", proxy_quantity: int = 0, status: str = "active") -> Any:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        product_id = conn.execute("SELECT nextval('product_seq')").fetchone()[0]
        conn.execute(
            "INSERT INTO products (product_id, name, description, proxy_quantity, status, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [product_id, name, description, proxy_quantity, status, now, now]
        )
        return self.get_product(product_id)

    def get_product(self, product_id: int) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        result = conn.execute(
            "SELECT product_id, name, description, proxy_quantity, status, date_creation, date_last_update FROM products WHERE product_id = ?",
            [product_id]
        ).fetchone()
        if result:
            return {
                "product_id": result[0],
                "name": result[1],
                "description": result[2],
                "proxy_quantity": result[3],
                "status": result[4],
                "date_creation": result[5],
                "date_last_update": result[6]
            }
        return None

    def get_all_products(self) -> List[Any]:
        conn = self._get_connection()
        results = conn.execute(
            "SELECT product_id, name, description, proxy_quantity, status, date_creation, date_last_update FROM products ORDER BY name"
        ).fetchall()
        return [result for result in results]

    def update_product(self, product_id: int, name: str = None, description: str = None, proxy_quantity: int = None, status: str = None) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        current = self.get_product(product_id)
        if not current:
            return False

        name = name if name is not None else current["name"]
        description = description if description is not None else current["description"]
        proxy_quantity = proxy_quantity if proxy_quantity is not None else current["proxy_quantity"]
        status = status if status is not None else current["status"]

        conn.execute(
            "UPDATE products SET name = ?, description = ?, proxy_quantity = ?, status = ?, date_last_update = ? WHERE product_id = ?",
            [name, description, proxy_quantity, status, now, product_id]
        )
        return True

    def delete_product(self, product_id: int) -> bool:
        conn = self._get_connection()
        conn.execute("DELETE FROM product_item_pricing WHERE product_id = ?", [product_id])
        conn.execute("DELETE FROM product_item_allocations WHERE product_id = ?", [product_id])
        conn.execute("DELETE FROM product_items WHERE product_id = ?", [product_id])
        result = conn.execute("DELETE FROM products WHERE product_id = ?", [product_id])
        return result.rowcount > 0

    # Offer CRUD operations
    def create_offer(self, item_id: int, provider_id: int, process_id: int, tier_number: int, price_per_unit: float, status: str = "active") -> Any:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        offer_id = conn.execute("SELECT nextval('offer_seq')").fetchone()[0]

        print(f"[DEBUG] Creating offer:")
        print(f"  offer_id: {offer_id}")
        print(f"  item_id: {item_id}")
        print(f"  provider_id: {provider_id}")
        print(f"  process_id: {process_id}")
        print(f"  tier_number: {tier_number}")
        print(f"  price_per_unit: {price_per_unit}")
        print(f"  status: {status}")

        # Note: process_id is added later via ALTER TABLE, so it's at the END of the column order
        conn.execute(
            "INSERT INTO offers (offer_id, item_id, provider_id, tier_number, price_per_unit, status, date_creation, date_last_update, process_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [offer_id, item_id, provider_id, tier_number, price_per_unit, status, now, now, process_id]
        )
        print(f"[DEBUG] Offer created successfully")

        result = self.get_offer(offer_id)
        print(f"[DEBUG] Retrieved offer: {result}")
        return result

    def get_offer(self, offer_id: int) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        result = conn.execute("""
            SELECT offer_id, item_id, provider_id, tier_number, price_per_unit, status, date_creation, date_last_update, process_id
            FROM offers WHERE offer_id = ?
        """, [offer_id]).fetchone()
        if result:
            return {
                "offer_id": result[0],
                "item_id": result[1],
                "provider_id": result[2],
                "tier_number": result[3],
                "price_per_unit": float(result[4]),
                "status": result[5],
                "date_creation": result[6],
                "date_last_update": result[7],
                "process_id": result[8]
            }
        return None

    def get_all_offers(self) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        results = conn.execute("""
            SELECT o.*, p.company_name as provider_name, i.item_name, pr.process_name
            FROM offers o
            JOIN providers p ON o.provider_id = p.provider_id
            JOIN items i ON o.item_id = i.item_id
            JOIN processes pr ON o.process_id = pr.process_id
            ORDER BY p.company_name, i.item_name, o.tier_number, pr.process_name
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
                "process_id": row[8],
                "provider_name": row[9],
                "item_name": row[10],
                "process_name": row[11],
            }
            for row in results
        ]

    def get_offers_by_provider(self, provider_id: int) -> List[Dict[str, Any]]:
        """Get all offers for a specific provider"""
        conn = self._get_connection()
        results = conn.execute(
            "SELECT * FROM offers WHERE provider_id = ? ORDER BY tier_number",
            [provider_id]
        ).fetchall()
        return [
            {
                "offer_id": row[0],
                "item_id": row[1],
                "provider_id": row[2],
                "process_id": row[3],
                "tier_number": row[4],
                "price_per_unit": float(row[5]),
                "status": row[6],
                "date_creation": row[7],
                "date_last_update": row[8]
            }
            for row in results
        ]

    def update_offer(self, offer_id: int, tier_number: int = None, price_per_unit: float = None, status: str = None, process_id: int = None) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        current = self.get_offer(offer_id)
        if not current:
            return False

        tier_number = tier_number if tier_number is not None else current["tier_number"]
        price_per_unit = price_per_unit if price_per_unit is not None else current["price_per_unit"]
        status = status if status is not None else current["status"]
        process_id = process_id if process_id is not None else current["process_id"]

        conn.execute(
            "UPDATE offers SET tier_number = ?, price_per_unit = ?, status = ?, process_id = ?, date_last_update = ? WHERE offer_id = ?",
            [tier_number, price_per_unit, status, process_id, now, offer_id]
        )
        conn.commit()
        return True

    def delete_offer(self, offer_id: int) -> bool:
        conn = self._get_connection()
        result = conn.execute("DELETE FROM offers WHERE offer_id = ?", [offer_id])
        return result.rowcount > 0

    def delete_offers_for_item(self, item_id: int) -> int:
        """Delete all offers for an item, returns count deleted"""
        conn = self._get_connection()
        result = conn.execute("DELETE FROM offers WHERE item_id = ?", [item_id])
        return result.rowcount

    # Provider-Item relationship operations
    def add_provider_item_relationship(self, provider_id: int, item_id: int) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        try:
            conn.execute(
                "INSERT OR IGNORE INTO provider_items (provider_id, item_id, date_creation) VALUES (?, ?, ?)",
                [provider_id, item_id, now]
            )
            return True
        except:
            return False

    def get_providers_for_item(self, item_id: int) -> List[int]:
        conn = self._get_connection()
        results = conn.execute("SELECT provider_id FROM provider_items WHERE item_id = ?", [item_id]).fetchall()
        return [result[0] for result in results]

    def set_providers_for_item(self, item_id: int, provider_ids: List[int]):
        conn = self._get_connection()
        now = datetime.now().isoformat()
        conn.execute("DELETE FROM provider_items WHERE item_id = ?", [item_id])
        for provider_id in provider_ids:
            conn.execute(
                "INSERT INTO provider_items (provider_id, item_id, date_creation) VALUES (?, ?, ?)",
                [provider_id, item_id, now]
            )

    def remove_provider_item_relationship(self, provider_id: int, item_id: int) -> bool:
        conn = self._get_connection()
        result = conn.execute("DELETE FROM provider_items WHERE provider_id = ? AND item_id = ?", [provider_id, item_id])
        return result.rowcount > 0

    def get_provider_item_relationships(self) -> List[Any]:
        """Get all provider-item relationships"""
        conn = self._get_connection()
        results = conn.execute("SELECT * FROM provider_items").fetchall()
        return [result for result in results]

    # Product-Item relationship operations
    def add_item_to_product(self, product_id: int, item_id: int):
        conn = self._get_connection()
        now = datetime.now().isoformat()
        conn.execute(
            "INSERT OR IGNORE INTO product_items (product_id, item_id, date_creation) VALUES (?, ?, ?)",
            [product_id, item_id, now]
        )

    def set_items_for_product(self, product_id: int, item_ids: List[int]):
        conn = self._get_connection()
        now = datetime.now().isoformat()
        conn.execute("DELETE FROM product_items WHERE product_id = ?", [product_id])
        for item_id in item_ids:
            conn.execute(
                "INSERT INTO product_items (product_id, item_id, date_creation) VALUES (?, ?, ?)",
                [product_id, item_id, now]
            )

    def get_items_for_product(self, product_id: int) -> List[Any]:
        conn = self._get_connection()
        results = conn.execute(
            "SELECT i.* FROM items i JOIN product_items pi ON i.item_id = pi.item_id WHERE pi.product_id = ? ORDER BY i.item_name",
            [product_id]
        ).fetchall()
        return [result for result in results]

    def get_item_ids_for_product(self, product_id: int) -> List[int]:
        conn = self._get_connection()
        results = conn.execute("SELECT item_id FROM product_items WHERE product_id = ?", [product_id]).fetchall()
        return [result[0] for result in results]

    def remove_item_from_product(self, product_id: int, item_id: int):
        conn = self._get_connection()
        conn.execute("DELETE FROM product_items WHERE product_id = ? AND item_id = ?", [product_id, item_id])

    # Product-Item allocation operations
    def set_allocations_for_product(self, product_id: int, allocations_data: dict):
        conn = self._get_connection()
        now = datetime.now().isoformat()
        conn.execute("DELETE FROM product_item_allocations WHERE product_id = ?", [product_id])

        for item_id_str, allocation in allocations_data.items():
            item_id = int(item_id_str)
            mode = allocation.get('mode', 'percentage')
            locked = allocation.get('locked', False)

            for provider in allocation.get('providers', []):
                provider_id = provider.get('provider_id')
                value = provider.get('value', 0)

                if value > 0 or (locked and provider_id == allocation.get('lockedProviderId')):
                    conn.execute(
                        "INSERT INTO product_item_allocations (product_id, item_id, provider_id, allocation_mode, allocation_value, is_locked, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        [product_id, item_id, provider_id, mode, value, locked, now, now]
                    )

    def get_allocations_for_product(self, product_id: int) -> dict:
        conn = self._get_connection()
        results = conn.execute(
            """
            SELECT
                a.item_id,
                a.provider_id,
                p.company_name,
                a.allocation_mode,
                a.allocation_value,
                a.is_locked
            FROM product_item_allocations a
            JOIN providers p ON a.provider_id = p.provider_id
            WHERE a.product_id = ?
            ORDER BY a.item_id, a.provider_id
            """,
            [product_id]
        ).fetchall()

        allocations = {}
        for row in results:
            item_id = row[0]
            provider_id = row[1]
            provider_name = row[2]
            mode = row[3]
            value = float(row[4])
            is_locked = row[5]

            if item_id not in allocations:
                allocations[item_id] = {
                    'mode': mode,
                    'locked': is_locked,
                    'lockedProviderId': None,
                    'providers': []
                }

            allocations[item_id]['providers'].append({
                'provider_id': provider_id,
                'provider_name': provider_name,
                'value': value
            })

            if is_locked and value > 0:
                allocations[item_id]['lockedProviderId'] = provider_id

        return allocations

    def get_all_allocations(self) -> Dict[str, Any]:
        """Get all provider-item allocations aggregated."""
        conn = self._get_connection()
        results = conn.execute(
            """
            SELECT
                a.provider_id,
                a.item_id,
                a.allocation_value,
                a.is_locked
            FROM product_item_allocations a
            ORDER BY a.provider_id, a.item_id
            """
        ).fetchall()

        # Build structure: {provider_id: {item_id: {total: number, products: []}}}
        allocations = {}
        for row in results:
            provider_id = row[0]
            item_id = row[1]
            allocation_value = float(row[2])
            is_locked = row[3]

            if provider_id not in allocations:
                allocations[str(provider_id)] = {}

            if item_id not in allocations[str(provider_id)]:
                allocations[str(provider_id)][str(item_id)] = {
                    'total': 0,
                    'products': []
                }

            allocations[str(provider_id)][str(item_id)]['total'] += allocation_value
            if is_locked:
                allocations[str(provider_id)][str(item_id)]['products'].append(f'locked_{provider_id}')

        return allocations

    # Product-Item pricing operations
    def set_price_multipliers_for_product(self, product_id: int, multipliers_data: dict):
        conn = self._get_connection()
        now = datetime.now().isoformat()
        conn.execute("DELETE FROM product_item_pricing WHERE product_id = ?", [product_id])

        for item_id_str, multiplier_info in multipliers_data.items():
            item_id = int(item_id_str)

            if isinstance(multiplier_info, dict):
                multiplier = multiplier_info.get('multiplier', 1.0)
                notes = multiplier_info.get('notes', '')
            else:
                multiplier = float(multiplier_info)
                notes = ''

            if multiplier != 1.0:
                conn.execute(
                    "INSERT INTO product_item_pricing (product_id, item_id, price_multiplier, notes, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?)",
                    [product_id, item_id, multiplier, notes, now, now]
                )

    def get_price_multipliers_for_product(self, product_id: int) -> dict:
        conn = self._get_connection()
        results = conn.execute(
            "SELECT item_id, price_multiplier, notes FROM product_item_pricing WHERE product_id = ?",
            [product_id]
        ).fetchall()

        multipliers = {}
        for row in results:
            item_id = row[0]
            multipliers[item_id] = {
                'multiplier': float(row[1]),
                'notes': row[2]
            }

        return multipliers

    # Provider tier operations
    def set_provider_tier_thresholds(self, provider_id: int, thresholds: Dict[str, int], base_prices: Dict[str, float] = None):
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
        conn.commit()

    def get_provider_tier_thresholds(self, provider_id: int) -> Dict:
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
        tier_data = self.get_provider_tier_thresholds(provider_id)
        thresholds = tier_data.get("thresholds", {})

        tier_list = [(int(tier), threshold) for tier, threshold in thresholds.items()]
        tier_list.sort(key=lambda x: x[1], reverse=True)

        for tier_num, threshold in tier_list:
            if total_credit_files >= threshold:
                return tier_num

        return 1

    def get_price_for_item_at_tier(self, provider_id: int, item_id: int, tier_number: int, process_id: int) -> Optional[float]:
        conn = self._get_connection()

        result = conn.execute(
            "SELECT price_per_unit FROM offers WHERE provider_id = ? AND item_id = ? AND tier_number = ? AND process_id = ? AND status = 'active' LIMIT 1",
            [provider_id, item_id, tier_number, process_id]
        ).fetchone()

        if result:
            return float(result[0])

        if tier_number > 1:
            return self.get_price_for_item_at_tier(provider_id, item_id, tier_number - 1, process_id)

        return None

    # Provider tier override operations
    def set_provider_tier_override(self, provider_id: int, manual_tier: int, notes: str = ""):
        conn = self._get_connection()
        now = datetime.now().isoformat()

        existing = conn.execute(
            "SELECT provider_id FROM provider_tier_overrides WHERE provider_id = ?",
            [provider_id]
        ).fetchone()

        if existing:
            conn.execute(
                "UPDATE provider_tier_overrides SET manual_tier = ?, notes = ?, date_last_update = ? WHERE provider_id = ?",
                [manual_tier, notes, now, provider_id]
            )
        else:
            conn.execute(
                "INSERT INTO provider_tier_overrides (provider_id, manual_tier, notes, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?)",
                [provider_id, manual_tier, notes, now, now]
            )

    def get_provider_tier_override(self, provider_id: int) -> Optional[Any]:
        conn = self._get_connection()
        result = conn.execute(
            "SELECT * FROM provider_tier_overrides WHERE provider_id = ?",
            [provider_id]
        ).fetchone()

        return result if result else None

    def clear_provider_tier_override(self, provider_id: int):
        conn = self._get_connection()
        conn.execute(
            "DELETE FROM provider_tier_overrides WHERE provider_id = ?",
            [provider_id]
        )

    def get_effective_price(self, product_id: int, item_id: int, base_price: float) -> float:
        conn = self._get_connection()
        result = conn.execute(
            "SELECT price_multiplier FROM product_item_pricing WHERE product_id = ? AND item_id = ?",
            [product_id, item_id]
        ).fetchone()

        multiplier = float(result[0]) if result else 1.0
        return base_price * multiplier

    def get_offers_for_item_optimization(self, item_id: int, quantity: int, process_id: int = None) -> List[Dict[str, Any]]:
        """Get applicable offers for optimization calculation with provider details"""
        conn = self._get_connection()
        query = """
            SELECT
                o.offer_id,
                o.item_id,
                o.provider_id,
                o.process_id,
                o.tier_number,
                o.price_per_unit,
                o.status,
                p.company_name as provider_name,
                i.item_name,
                pr.process_name
            FROM offers o
            JOIN providers p ON o.provider_id = p.provider_id
            JOIN items i ON o.item_id = i.item_id
            JOIN processes pr ON o.process_id = pr.process_id
            WHERE o.item_id = ?
              AND o.status = 'active'
              AND p.status = 'active'
              AND i.status = 'active'
              AND o.tier_number <= ?
        """
        params = [item_id, quantity]

        if process_id:
            query += " AND o.process_id = ?"
            params.append(process_id)

        query += " ORDER BY o.price_per_unit ASC"

        results = conn.execute(query, params).fetchall()

        return [
            {
                "offer_id": row[0],
                "item_id": row[1],
                "provider_id": row[2],
                "process_id": row[3],
                "tier_number": row[4],
                "price_per_unit": float(row[5]),
                "status": row[6],
                "provider_name": row[7],
                "item_name": row[8],
                "process_name": row[9],
                "total_cost": float(row[5]) * quantity,
            }
            for row in results
        ]

    # =====================================
    # PROCESS CRUD OPERATIONS
    # =====================================

    def create_process(self, process_name: str, description: str = "", status: str = "active") -> Any:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        process_id = conn.execute("SELECT nextval('process_seq')").fetchone()[0]
        conn.execute(
            "INSERT INTO processes (process_id, process_name, description, status, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?)",
            [process_id, process_name, description, status, now, now]
        )
        return self.get_process(process_id)

    def get_process(self, process_id: int) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        result = conn.execute("SELECT * FROM processes WHERE process_id = ?", [process_id]).fetchone()
        if result:
            return {
                "process_id": result[0],
                "process_name": result[1],
                "description": result[2],
                "status": result[3],
                "date_creation": result[4],
                "date_last_update": result[5],
            }
        return None

    def get_all_processes(self) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        results = conn.execute("SELECT * FROM processes ORDER BY process_name").fetchall()
        return [
            {
                "process_id": row[0],
                "process_name": row[1],
                "description": row[2],
                "status": row[3],
                "date_creation": row[4],
                "date_last_update": row[5],
            }
            for row in results
        ]

    def update_process(self, process_id: int, process_name: str = None, description: str = None, status: str = None) -> bool:
        print(f"[CRUD] update_process called with:")
        print(f"  - process_id: {process_id}")
        print(f"  - process_name: {process_name}")
        print(f"  - description: {description}")
        print(f"  - status: {status}")

        conn = self._get_connection()
        now = datetime.now().isoformat()

        print(f"[CRUD] Getting current process data...")
        current = self.get_process(process_id)
        print(f"[CRUD] Current process data: {current}")

        if not current:
            print(f"[CRUD] ❌ Process not found, returning False")
            return False

        process_name = process_name if process_name is not None else current["process_name"]
        description = description if description is not None else current["description"]
        status = status if status is not None else current["status"]

        print(f"[CRUD] Values to update:")
        print(f"  - process_name: {process_name}")
        print(f"  - description: {description}")
        print(f"  - status: {status}")
        print(f"  - date_last_update: {now}")

        sql = "UPDATE processes SET process_name = ?, description = ?, status = ?, date_last_update = ? WHERE process_id = ?"
        params = [process_name, description, status, now, process_id]
        print(f"[CRUD] Executing SQL: {sql}")
        print(f"[CRUD] With params: {params}")

        conn.execute(sql, params)
        print(f"[CRUD] ✓ SQL executed successfully")

        print(f"[CRUD] Committing transaction...")
        conn.commit()
        print(f"[CRUD] ✓ Transaction committed")

        print(f"[CRUD] Returning True")
        return True

    def delete_process(self, process_id: int) -> bool:
        conn = self._get_connection()
        conn.execute("DELETE FROM process_providers WHERE process_id = ?", [process_id])
        conn.execute("DELETE FROM process_items WHERE process_id = ?", [process_id])
        conn.execute("DELETE FROM process_graph WHERE from_process_id = ? OR to_process_id = ?", [process_id, process_id])
        conn.execute("DELETE FROM offers WHERE process_id = ?", [process_id])
        result = conn.execute("DELETE FROM processes WHERE process_id = ?", [process_id])
        return result.rowcount > 0

    def add_process_graph_edge(self, from_process_id: int, to_process_id: int) -> bool:
        conn = self._get_connection()
        try:
            conn.execute(
                "INSERT INTO process_graph (from_process_id, to_process_id) VALUES (?, ?)",
                [from_process_id, to_process_id]
            )
            conn.commit()
            return True
        except:
            conn.rollback()
            return False

    def remove_process_graph_edge(self, from_process_id: int, to_process_id: int) -> bool:
        conn = self._get_connection()
        result = conn.execute(
            "DELETE FROM process_graph WHERE from_process_id = ? AND to_process_id = ?",
            [from_process_id, to_process_id]
        )
        return result.rowcount > 0

    def get_process_graph(self) -> List[Any]:
        conn = self._get_connection()
        results = conn.execute("SELECT * FROM process_graph").fetchall()
        return [result for result in results]

    # =====================================
    # PROCESS-PROVIDER RELATIONSHIP OPERATIONS
    # =====================================

    def add_provider_to_process(self, process_id: int, provider_id: int) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        try:
            conn.execute(
                "INSERT INTO process_providers (process_id, provider_id, date_creation) VALUES (?, ?, ?)",
                [process_id, provider_id, now]
            )
            return True
        except:
            return False

    def get_providers_for_process(self, process_id: int) -> List[int]:
        conn = self._get_connection()
        results = conn.execute("SELECT provider_id FROM process_providers WHERE process_id = ?", [process_id]).fetchall()
        return [result[0] for result in results]

    def remove_provider_from_process(self, process_id: int, provider_id: int) -> bool:
        conn = self._get_connection()
        result = conn.execute(
            "DELETE FROM process_providers WHERE process_id = ? AND provider_id = ?",
            [process_id, provider_id]
        )
        return result.rowcount > 0

    # =====================================
    # PROCESS-ITEMS RELATIONSHIP OPERATIONS
    # =====================================

    def add_item_to_process(self, process_id: int, item_id: int) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        try:
            conn.execute(
                "INSERT INTO process_items (process_id, item_id, date_creation) VALUES (?, ?, ?)",
                [process_id, item_id, now]
            )
            return True
        except:
            return False

    def get_items_for_process(self, process_id: int) -> List[int]:
        conn = self._get_connection()
        results = conn.execute("SELECT item_id FROM process_items WHERE process_id = ?", [process_id]).fetchall()
        return [result[0] for result in results]

    def remove_item_from_process(self, process_id: int, item_id: int) -> bool:
        conn = self._get_connection()
        result = conn.execute(
            "DELETE FROM process_items WHERE process_id = ? AND item_id = ?",
            [process_id, item_id]
        )
        return result.rowcount > 0

    # =====================================
    # FORECASTS CRUD OPERATIONS
    # =====================================

    def create_forecast(self, product_id: int, year: int, month: int, forecast_units: int) -> Any:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        forecast_id = conn.execute("SELECT nextval('forecast_seq')").fetchone()[0]
        conn.execute(
            "INSERT INTO forecasts (forecast_id, product_id, year, month, forecast_units, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [forecast_id, product_id, year, month, forecast_units, now, now]
        )
        return self.get_forecast(forecast_id)

    def get_forecast(self, forecast_id: int) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        result = conn.execute("SELECT * FROM forecasts WHERE forecast_id = ?", [forecast_id]).fetchone()
        if result:
            return {
                "forecast_id": result[0],
                "product_id": result[1],
                "year": result[2],
                "month": result[3],
                "forecast_units": result[4],
                "date_creation": result[5],
                "date_last_update": result[6]
            }
        return None

    def get_forecast_by_product_month(self, product_id: int, year: int, month: int) -> Optional[Any]:
        conn = self._get_connection()
        result = conn.execute(
            "SELECT * FROM forecasts WHERE product_id = ? AND year = ? AND month = ?",
            [product_id, year, month]
        ).fetchone()
        return result if result else None

    def get_all_forecasts(self) -> List[Any]:
        conn = self._get_connection()
        results = conn.execute("SELECT * FROM forecasts ORDER BY year DESC, month DESC").fetchall()
        return [result for result in results]

    def get_forecasts_for_product(self, product_id: int) -> List[Any]:
        conn = self._get_connection()
        results = conn.execute(
            "SELECT * FROM forecasts WHERE product_id = ? ORDER BY year DESC, month DESC",
            [product_id]
        ).fetchall()
        return [result for result in results]

    def update_forecast(self, forecast_id: int, forecast_units: int = None) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        current = self.get_forecast(forecast_id)
        if not current:
            return False

        forecast_units = forecast_units if forecast_units is not None else current["forecast_units"]

        conn.execute(
            "UPDATE forecasts SET forecast_units = ?, date_last_update = ? WHERE forecast_id = ?",
            [forecast_units, now, forecast_id]
        )
        conn.commit()
        return True

    def delete_forecast(self, forecast_id: int) -> bool:
        conn = self._get_connection()
        result = conn.execute("DELETE FROM forecasts WHERE forecast_id = ?", [forecast_id])
        return result.rowcount > 0

    # =====================================
    # ACTUALS CRUD OPERATIONS
    # =====================================

    def create_actual(self, product_id: int, year: int, month: int, actual_units: int) -> Any:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        actual_id = conn.execute("SELECT nextval('actual_seq')").fetchone()[0]
        conn.execute(
            "INSERT INTO actuals (actual_id, product_id, year, month, actual_units, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [actual_id, product_id, year, month, actual_units, now, now]
        )
        return self.get_actual(actual_id)

    def get_actual(self, actual_id: int) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        result = conn.execute("SELECT * FROM actuals WHERE actual_id = ?", [actual_id]).fetchone()
        if result:
            return {
                "actual_id": result[0],
                "product_id": result[1],
                "year": result[2],
                "month": result[3],
                "actual_units": result[4],
                "date_creation": result[5],
                "date_last_update": result[6]
            }
        return None

    def get_actual_by_product_month(self, product_id: int, year: int, month: int) -> Optional[Any]:
        conn = self._get_connection()
        result = conn.execute(
            "SELECT * FROM actuals WHERE product_id = ? AND year = ? AND month = ?",
            [product_id, year, month]
        ).fetchone()
        return result if result else None

    def get_all_actuals(self) -> List[Any]:
        conn = self._get_connection()
        results = conn.execute("SELECT * FROM actuals ORDER BY year DESC, month DESC").fetchall()
        return [result for result in results]

    def get_actuals_for_product(self, product_id: int) -> List[Any]:
        conn = self._get_connection()
        results = conn.execute(
            "SELECT * FROM actuals WHERE product_id = ? ORDER BY year DESC, month DESC",
            [product_id]
        ).fetchall()
        return [result for result in results]

    def update_actual(self, actual_id: int, actual_units: int = None) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        current = self.get_actual(actual_id)
        if not current:
            return False

        actual_units = actual_units if actual_units is not None else current["actual_units"]

        conn.execute(
            "UPDATE actuals SET actual_units = ?, date_last_update = ? WHERE actual_id = ?",
            [actual_units, now, actual_id]
        )
        conn.commit()
        return True

    def delete_actual(self, actual_id: int) -> bool:
        conn = self._get_connection()
        result = conn.execute("DELETE FROM actuals WHERE actual_id = ?", [actual_id])
        return result.rowcount > 0

    # =====================================
    # CONTRACTS CRUD OPERATIONS
    # =====================================

    def create_contract(self, provider_id: int, contract_name: str, min_monthly_volume: float = None, min_monthly_cost: float = None, status: str = "active") -> Any:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        contract_id = conn.execute("SELECT nextval('contract_seq')").fetchone()[0]
        conn.execute(
            "INSERT INTO contracts (contract_id, provider_id, contract_name, min_monthly_volume, min_monthly_cost, status, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [contract_id, provider_id, contract_name, min_monthly_volume, min_monthly_cost, status, now, now]
        )
        return self.get_contract(contract_id)

    def get_contract(self, contract_id: int) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        result = conn.execute("SELECT * FROM contracts WHERE contract_id = ?", [contract_id]).fetchone()
        if result:
            return {
                "contract_id": result[0],
                "provider_id": result[1],
                "contract_name": result[2],
                "min_monthly_volume": float(result[3]) if result[3] is not None else None,
                "min_monthly_cost": float(result[4]) if result[4] is not None else None,
                "status": result[5],
                "date_creation": result[6],
                "date_last_update": result[7]
            }
        return None

    def get_all_contracts(self) -> List[Any]:
        conn = self._get_connection()
        results = conn.execute("SELECT * FROM contracts ORDER BY contract_name").fetchall()
        return [result for result in results]

    def get_contracts_for_provider(self, provider_id: int) -> List[Any]:
        conn = self._get_connection()
        results = conn.execute("SELECT * FROM contracts WHERE provider_id = ? ORDER BY contract_name", [provider_id]).fetchall()
        return [result for result in results]

    def update_contract(self, contract_id: int, contract_name: str = None, min_monthly_volume: float = None, min_monthly_cost: float = None, status: str = None) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        current = self.get_contract(contract_id)
        if not current:
            return False

        contract_name = contract_name if contract_name is not None else current["contract_name"]
        min_monthly_volume = min_monthly_volume if min_monthly_volume is not None else current["min_monthly_volume"]
        min_monthly_cost = min_monthly_cost if min_monthly_cost is not None else current["min_monthly_cost"]
        status = status if status is not None else current["status"]

        conn.execute(
            "UPDATE contracts SET contract_name = ?, min_monthly_volume = ?, min_monthly_cost = ?, status = ?, date_last_update = ? WHERE contract_id = ?",
            [contract_name, min_monthly_volume, min_monthly_cost, status, now, contract_id]
        )
        conn.commit()
        return True

    def delete_contract(self, contract_id: int) -> bool:
        conn = self._get_connection()
        conn.execute("DELETE FROM contract_rules WHERE contract_id = ?", [contract_id])
        result = conn.execute("DELETE FROM contracts WHERE contract_id = ?", [contract_id])
        return result.rowcount > 0

    # =====================================
    # CONTRACT RULES CRUD OPERATIONS
    # =====================================

    def add_contract_rule(self, contract_id: int, rule_type: str, rule_value: float = None, rule_config: str = None) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        try:
            conn.execute(
                "INSERT INTO contract_rules (contract_id, rule_type, rule_value, rule_config, date_creation) VALUES (?, ?, ?, ?, ?)",
                [contract_id, rule_type, rule_value, rule_config, now]
            )
            return True
        except:
            return False

    def get_contract_rules(self, contract_id: int) -> List[Any]:
        conn = self._get_connection()
        results = conn.execute("SELECT * FROM contract_rules WHERE contract_id = ?", [contract_id]).fetchall()
        return [result for result in results]

    def get_contract_rule(self, contract_id: int, rule_type: str) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        result = conn.execute(
            "SELECT * FROM contract_rules WHERE contract_id = ? AND rule_type = ?",
            [contract_id, rule_type]
        ).fetchone()
        if result:
            return {
                "contract_id": result[0],
                "rule_type": result[1],
                "rule_value": float(result[2]) if result[2] is not None else None,
                "rule_config": result[3],
                "date_creation": result[4]
            }
        return None

    def update_contract_rule(self, contract_id: int, rule_type: str, rule_value: float = None, rule_config: str = None) -> bool:
        conn = self._get_connection()
        current = self.get_contract_rule(contract_id, rule_type)
        if not current:
            return False

        rule_value = rule_value if rule_value is not None else current["rule_value"]
        rule_config = rule_config if rule_config is not None else current["rule_config"]

        conn.execute(
            "UPDATE contract_rules SET rule_value = ?, rule_config = ? WHERE contract_id = ? AND rule_type = ?",
            [rule_value, rule_config, contract_id, rule_type]
        )
        conn.commit()
        return True

    def delete_contract_rule(self, contract_id: int, rule_type: str) -> bool:
        conn = self._get_connection()
        result = conn.execute(
            "DELETE FROM contract_rules WHERE contract_id = ? AND rule_type = ?",
            [contract_id, rule_type]
        )
        return result.rowcount > 0


# Global CRUD instance
_crud = None


def get_crud():
    """Get or create the global CRUD operations instance"""
    global _crud
    if _crud is None:
        _crud = CRUDOperations()
        _crud.initialize_all()
    return _crud
