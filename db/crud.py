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
            "INSERT INTO providers (provider_id, company_name, details, status, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?)",
            [provider_id, company_name, details, status, now, now]
        )
        return self.get_provider(provider_id)

    def get_provider(self, provider_id: int) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        result = conn.execute(
            "SELECT provider_id, company_name, details, status, date_creation, date_last_update FROM providers WHERE provider_id = ?",
            [provider_id]
        ).fetchone()
        if result:
            return {
                "provider_id": result[0],
                "company_name": result[1],
                "details": result[2],
                "status": result[3],
                "date_creation": result[4],
                "date_last_update": result[5]
            }
        return None

    def get_all_providers(self) -> List[Any]:
        conn = self._get_connection()
        results = conn.execute(
            "SELECT provider_id, company_name, details, status, date_creation, date_last_update FROM providers ORDER BY company_name"
        ).fetchall()
        return [result for result in results]

    def get_all_providers_with_tier_counts(self) -> List[Dict[str, Any]]:
        """Get all providers with contract counts"""
        conn = self._get_connection()
        results = conn.execute(
            """
            SELECT
                p.provider_id,
                p.company_name,
                p.details,
                p.status,
                p.date_creation,
                p.date_last_update,
                COUNT(c.contract_id) as contract_count
            FROM providers p
            LEFT JOIN contracts c ON p.provider_id = c.provider_id
            GROUP BY p.provider_id, p.company_name, p.details, p.status, p.date_creation, p.date_last_update
            ORDER BY p.company_name
            """
        ).fetchall()

        providers_list = []
        for result in results:
            providers_list.append({
                "provider_id": result[0],
                "company_name": result[1],
                "details": result[2],
                "status": result[3],
                "date_creation": result[4],
                "date_last_update": result[5],
                "contract_count": result[6]
            })

        return providers_list

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
        from fastapi import HTTPException

        conn = self._get_connection()

        # Check for assigned items
        item_count = conn.execute("SELECT COUNT(*) FROM provider_items WHERE provider_id = ?", [provider_id]).fetchone()[0]
        if item_count > 0:
            raise HTTPException(status_code=400, detail=f"Provider has {item_count} assigned items. Please remove item assignments first.")

        conn.execute("DELETE FROM offers WHERE provider_id = ?", [provider_id])
        conn.execute("DELETE FROM provider_items WHERE provider_id = ?", [provider_id])
        conn.execute("DELETE FROM contracts WHERE provider_id = ?", [provider_id])
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
    def create_product(self, name: str, description: str = "", status: str = "active") -> Any:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        product_id = conn.execute("SELECT nextval('product_seq')").fetchone()[0]
        conn.execute(
            "INSERT INTO products (product_id, name, description, status, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?)",
            [product_id, name, description, status, now, now]
        )
        conn.commit()
        return self.get_product(product_id)

    def get_product(self, product_id: int) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        result = conn.execute(
            "SELECT product_id, name, description, status, date_creation, date_last_update FROM products WHERE product_id = ?",
            [product_id]
        ).fetchone()
        if result:
            return {
                "product_id": result[0],
                "name": result[1],
                "description": result[2],
                "status": result[3],
                "date_creation": result[4],
                "date_last_update": result[5]
            }
        return None

    def get_all_products(self) -> List[Any]:
        conn = self._get_connection()
        results = conn.execute(
            "SELECT product_id, name, description, status, date_creation, date_last_update FROM products ORDER BY name"
        ).fetchall()
        return [result for result in results]

    def update_product(self, product_id: int, name: str = None, description: str = None, status: str = None) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        current = self.get_product(product_id)
        if not current:
            return False

        name = name if name is not None else current["name"]
        description = description if description is not None else current["description"]
        status = status if status is not None else current["status"]

        conn.execute(
            "UPDATE products SET name = ?, description = ?, status = ?, date_last_update = ? WHERE product_id = ?",
            [name, description, status, now, product_id]
        )
        conn.commit()
        return True

    def delete_product(self, product_id: int) -> bool:
        conn = self._get_connection()
        conn.execute("DELETE FROM product_item_pricing WHERE product_id = ?", [product_id])
        conn.execute("DELETE FROM product_item_allocations WHERE product_id = ?", [product_id])
        conn.execute("DELETE FROM product_items WHERE product_id = ?", [product_id])
        conn.execute("DELETE FROM forecasts WHERE product_id = ?", [product_id])
        conn.execute("DELETE FROM actuals WHERE product_id = ?", [product_id])
        result = conn.execute("DELETE FROM products WHERE product_id = ?", [product_id])
        conn.commit()
        return result.rowcount > 0

    # Offer CRUD operations
    def create_offer(self, item_id: int, provider_id: int, process_id: int, tier_number: int, price_per_unit: float, status: str = "active") -> Any:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        offer_id = conn.execute("SELECT nextval('offer_seq')").fetchone()[0]

        # Note: process_id is added later via ALTER TABLE, so it's at the END of the column order
        conn.execute(
            "INSERT INTO offers (offer_id, item_id, provider_id, tier_number, price_per_unit, status, date_creation, date_last_update, process_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [offer_id, item_id, provider_id, tier_number, price_per_unit, status, now, now, process_id]
        )

        result = self.get_offer(offer_id)
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

    def get_offers_filtered(self, item_id: Optional[int] = None, provider_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get offers filtered by item_id and/or provider_id"""
        conn = self._get_connection()
        query = """
            SELECT o.*, p.company_name as provider_name, i.item_name, pr.process_name
            FROM offers o
            JOIN providers p ON o.provider_id = p.provider_id
            JOIN items i ON o.item_id = i.item_id
            JOIN processes pr ON o.process_id = pr.process_id
            WHERE 1=1
        """
        params = []
        if item_id is not None:
            query += " AND o.item_id = ?"
            params.append(item_id)
        if provider_id is not None:
            query += " AND o.provider_id = ?"
            params.append(provider_id)
            
        query += " ORDER BY p.company_name, i.item_name, o.tier_number"
        
        results = conn.execute(query, params).fetchall()
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

    def update_product_items_from_contracts(self, product_id: int, contract_selections: Dict[int, List[int]]):
        """Update product items based on contract selections
        Args:
            product_id: The product ID
            contract_selections: Dict mapping contract_id to list of selected item_ids
        """
        conn = self._get_connection()
        now = datetime.now().isoformat()

        all_item_ids = []
        for item_ids in contract_selections.values():
            all_item_ids.extend(item_ids)

        conn.execute("DELETE FROM product_items WHERE product_id = ?", [product_id])

        for item_id in all_item_ids:
            conn.execute(
                "INSERT INTO product_items (product_id, item_id, date_creation) VALUES (?, ?, ?)",
                [product_id, item_id, now]
            )

    def remove_item_from_product(self, product_id: int, item_id: int):
        conn = self._get_connection()
        conn.execute("DELETE FROM product_items WHERE product_id = ? AND item_id = ?", [product_id, item_id])

    # Product-Item allocation operations
    def set_allocations_for_product(self, product_id: int, allocations_data: dict):
        conn = self._get_connection()
        now = datetime.now().isoformat()
        conn.execute("DELETE FROM product_item_allocations WHERE product_id = ?", [product_id])

        # Check if this is the new collective allocation format or legacy per-item format
        # New format: single allocation object (no item_id keys)
        # Legacy format: {item_id: {allocation}}
        first_key = next(iter(allocations_data.keys())) if allocations_data else None

        # If the first key is a positive integer (item_id), it's the legacy format
        # Otherwise, it's the new collective format
        is_legacy_format = False
        if first_key is not None:
            try:
                parsed = int(str(first_key))
                is_legacy_format = parsed > 0
            except (ValueError, TypeError):
                # Can't parse as integer, so it's likely a field name (collective format)
                is_legacy_format = False

        if is_legacy_format:
            # Legacy per-item allocation format
            for item_id_str, allocation in allocations_data.items():
                item_id = int(item_id_str)
                mode = allocation.get('mode', 'percentage')

                for provider in allocation.get('providers', []):
                    provider_id = provider.get('provider_id')
                    value = provider.get('value', 0)

                    if value > 0:
                        conn.execute(
                            "INSERT INTO product_item_allocations (product_id, item_id, provider_id, allocation_mode, allocation_value, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            [product_id, item_id, provider_id, mode, value, now, now]
                        )
        else:
            # New collective allocation format - apply same allocation to ALL items in product
            allocation = allocations_data
            mode = allocation.get('mode', 'percentage')

            # Get all items for this product
            item_ids = self.get_item_ids_for_product(product_id)

            for provider in allocation.get('providers', []):
                provider_id = provider.get('provider_id')
                value = provider.get('value', 0)

                # Apply this allocation to ALL items in the product
                for item_id in item_ids:
                    if value > 0:
                        conn.execute(
                            "INSERT INTO product_item_allocations (product_id, item_id, provider_id, allocation_mode, allocation_value, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            [product_id, item_id, provider_id, mode, value, now, now]
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
                a.allocation_value
            FROM product_item_allocations a
            JOIN providers p ON a.provider_id = p.provider_id
            WHERE a.product_id = ?
            ORDER BY a.item_id, a.provider_id
            """,
            [product_id]
        ).fetchall()

        # Group allocations by item_id
        item_allocations = {}
        for row in results:
            item_id = row[0]
            provider_id = row[1]
            provider_name = row[2]
            mode = row[3]
            value = float(row[4])

            if item_id not in item_allocations:
                item_allocations[item_id] = {
                    'mode': mode,
                    'providers': []
                }

            item_allocations[item_id]['providers'].append({
                'provider_id': provider_id,
                'provider_name': provider_name,
                'value': value
            })

        # If we have allocations, check if all items have the same allocation (collective allocation)
        if item_allocations:
            # Convert to list for comparison
            item_ids = sorted(item_allocations.keys())
            first_item_id = item_ids[0]
            first_allocation = item_allocations[first_item_id]

            # Check if all other items have the same allocation as the first item
            all_same = True
            for item_id in item_ids[1:]:
                current = item_allocations[item_id]

                # Compare mode
                if current['mode'] != first_allocation['mode']:
                    all_same = False
                    break

                # Compare providers (sorted by provider_id)
                current_providers = sorted(current['providers'], key=lambda p: p['provider_id'])
                first_providers = sorted(first_allocation['providers'], key=lambda p: p['provider_id'])

                if len(current_providers) != len(first_providers):
                    all_same = False
                    break

                for i, provider in enumerate(current_providers):
                    if (provider['provider_id'] != first_providers[i]['provider_id'] or
                        provider['value'] != first_providers[i]['value']):
                        all_same = False
                        break

                if not all_same:
                    break

            # If all items have the same allocation, return collective format
            if all_same:
                collective = {
                    'mode': first_allocation['mode'],
                    'providers': first_allocation['providers']
                }
                return collective

        # Otherwise, return per-item format (legacy)
        return item_allocations

    def get_all_allocations(self) -> Dict[str, Any]:
        """Get all provider-item allocations aggregated."""
        conn = self._get_connection()
        results = conn.execute(
            """
            SELECT
                a.provider_id,
                a.item_id,
                a.allocation_value
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

            if provider_id not in allocations:
                allocations[str(provider_id)] = {}

            if item_id not in allocations[str(provider_id)]:
                allocations[str(provider_id)][str(item_id)] = {
                    'total': 0,
                    'products': []
                }

            allocations[str(provider_id)][str(item_id)]['total'] += allocation_value

        return allocations

    def get_contracts_with_items(self, process_id: int = None) -> List[Dict[str, Any]]:
        """Get all contracts with their items, grouped by process and items"""
        conn = self._get_connection()

        query = """
            SELECT
                c.contract_id,
                c.contract_name,
                c.process_id,
                c.provider_id,
                p.company_name as provider_name,
                pr.process_name,
                i.item_id,
                i.item_name,
                i.description
            FROM contracts c
            JOIN providers p ON c.provider_id = p.provider_id
            JOIN processes pr ON c.process_id = pr.process_id
            JOIN contract_tiers ct ON c.contract_id = ct.contract_id
            JOIN offers o ON c.provider_id = o.provider_id
                AND c.process_id = o.process_id
                AND ct.tier_number = o.tier_number
            JOIN items i ON o.item_id = i.item_id
            WHERE c.status = 'active'
              AND p.status = 'active'
              AND pr.status = 'active'
              AND i.status = 'active'
        """

        params = []
        if process_id:
            query += " AND c.process_id = ?"
            params.append(process_id)

        query += " ORDER BY pr.process_name, i.item_name, p.company_name"

        results = conn.execute(query, params).fetchall()

        processes_dict = {}
        for row in results:
            process_id = row[2]
            process_name = row[5]
            item_id = row[6]
            item_name = row[7]
            item_description = row[8]
            provider_id = row[3]
            provider_name = row[4]
            contract_id = row[0]
            contract_name = row[1]

            # Create process entry if doesn't exist
            if process_id not in processes_dict:
                processes_dict[process_id] = {
                    'process_id': process_id,
                    'process_name': process_name,
                    'items': []
                }

            # Find or create item entry within this process
            item_data = None
            for item in processes_dict[process_id]['items']:
                if item['item_id'] == item_id:
                    item_data = item
                    break

            if not item_data:
                item_data = {
                    'item_id': item_id,
                    'item_name': item_name,
                    'description': item_description,
                    'providers': []
                }
                processes_dict[process_id]['items'].append(item_data)

            # Add provider to item (avoid duplicates)
            provider_exists = any(p['provider_id'] == provider_id for p in item_data['providers'])
            if not provider_exists:
                item_data['providers'].append({
                    'contract_id': contract_id,
                    'contract_name': contract_name,
                    'provider_id': provider_id,
                    'provider_name': provider_name
                })

        return list(processes_dict.values())

    def get_product_contracts_with_selected_items(self, product_id: int) -> List[Dict[str, Any]]:
        """Get all contracts for a product with selected items, grouped by process and items"""
        conn = self._get_connection()

        results = conn.execute("""
            SELECT DISTINCT
                c.contract_id,
                c.contract_name,
                c.process_id,
                c.provider_id,
                p.company_name as provider_name,
                pr.process_name,
                i.item_id,
                i.item_name,
                i.description
            FROM contracts c
            JOIN providers p ON c.provider_id = p.provider_id
            JOIN processes pr ON c.process_id = pr.process_id
            JOIN contract_tiers ct ON c.contract_id = ct.contract_id
            JOIN offers o ON c.provider_id = o.provider_id
                AND c.process_id = o.process_id
                AND ct.tier_number = o.tier_number
            JOIN items i ON o.item_id = i.item_id
            JOIN product_items pi ON i.item_id = pi.item_id
            WHERE pi.product_id = ?
              AND c.status = 'active'
              AND p.status = 'active'
              AND pr.status = 'active'
              AND i.status = 'active'
            ORDER BY pr.process_name, i.item_name, p.company_name
        """, [product_id]).fetchall()

        processes_dict = {}
        for row in results:
            process_id = row[2]
            process_name = row[5]
            item_id = row[6]
            item_name = row[7]
            item_description = row[8]
            provider_id = row[3]
            provider_name = row[4]
            contract_id = row[0]
            contract_name = row[1]

            if process_id not in processes_dict:
                processes_dict[process_id] = {
                    'process_id': process_id,
                    'process_name': process_name,
                    'items': []
                }

            item_data = None
            for item in processes_dict[process_id]['items']:
                if item['item_id'] == item_id:
                    item_data = item
                    break

            if not item_data:
                item_data = {
                    'item_id': item_id,
                    'item_name': item_name,
                    'description': item_description,
                    'providers': []
                }
                processes_dict[process_id]['items'].append(item_data)

            provider_exists = any(p['provider_id'] == provider_id for p in item_data['providers'])
            if not provider_exists:
                item_data['providers'].append({
                    'contract_id': contract_id,
                    'contract_name': contract_name,
                    'provider_id': provider_id,
                    'provider_name': provider_name
                })

        return list(processes_dict.values())

    def add_contract_items_to_product(self, product_id: int, contract_id: int, item_ids: List[int]):
        """Add multiple items from a contract to a product"""
        conn = self._get_connection()
        now = datetime.now().isoformat()

        for item_id in item_ids:
            conn.execute(
                "INSERT OR IGNORE INTO product_items (product_id, item_id, date_creation) VALUES (?, ?, ?)",
                [product_id, item_id, now]
            )

    def remove_contract_items_from_product(self, product_id: int, contract_id: int):
        """Remove all items from a specific contract in a product"""
        conn = self._get_connection()

        conn.execute("""
            DELETE FROM product_items
            WHERE product_id = ?
              AND item_id IN (
                SELECT DISTINCT i.item_id
                FROM contracts c
                JOIN contract_tiers ct ON c.contract_id = ct.contract_id
                JOIN offers o ON c.provider_id = o.provider_id
                    AND c.process_id = o.process_id
                    AND ct.tier_number = o.tier_number
                JOIN items i ON o.item_id = i.item_id
                WHERE c.contract_id = ?
              )
        """, [product_id, contract_id])

    def get_all_contracts(self) -> List[Dict[str, Any]]:
        """Get all contracts with provider and process info"""
        conn = self._get_connection()
        results = conn.execute("""
            SELECT
                c.contract_id,
                c.contract_name,
                c.process_id,
                c.provider_id,
                p.company_name as provider_name,
                pr.process_name,
                c.status
            FROM contracts c
            JOIN providers p ON c.provider_id = p.provider_id
            JOIN processes pr ON c.process_id = pr.process_id
            WHERE c.status = 'active'
              AND p.status = 'active'
              AND pr.status = 'active'
            ORDER BY c.contract_name
        """).fetchall()

        return [
            {
                'contract_id': row[0],
                'contract_name': row[1],
                'process_id': row[2],
                'provider_id': row[3],
                'provider_name': row[4],
                'process_name': row[5],
                'status': row[6]
            }
            for row in results
        ]

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

    def create_process(self, process_name: str, description: str = "", provider_id: int = 1, tier_thresholds: str = "{}", status: str = "active") -> Any:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        process_id = conn.execute("SELECT nextval('process_seq')").fetchone()[0]
        conn.execute(
            "INSERT INTO processes (process_id, process_name, description, provider_id, tier_thresholds, status, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [process_id, process_name, description, provider_id, tier_thresholds, status, now, now]
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
                "provider_id": result[3],
                "tier_thresholds": result[4] or "{}",
                "status": result[5],
                "date_creation": result[6],
                "date_last_update": result[7],
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
                "provider_id": row[3],
                "tier_thresholds": row[4] or "{}",
                "status": row[5],
                "date_creation": row[6],
                "date_last_update": row[7],
            }
            for row in results
        ]

    def update_process(self, process_id: int, process_name: str = None, description: str = None, provider_id: int = None, tier_thresholds: str = None, status: str = None) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        current = self.get_process(process_id)

        if not current:
            return False

        process_name = process_name if process_name is not None else current["process_name"]
        description = description if description is not None else current["description"]
        provider_id = provider_id if provider_id is not None else current["provider_id"]
        tier_thresholds = tier_thresholds if tier_thresholds is not None else current["tier_thresholds"]
        status = status if status is not None else current["status"]

        conn.execute(
            "UPDATE processes SET process_name = ?, description = ?, provider_id = ?, tier_thresholds = ?, status = ?, date_last_update = ? WHERE process_id = ?",
            [process_name, description, provider_id, tier_thresholds, status, now, process_id]
        )
        conn.commit()
        return True

    def delete_process(self, process_id: int) -> bool:
        from fastapi import HTTPException

        conn = self._get_connection()

        # Check for assigned providers (Contracts) - Only count those with valid providers
        contract_count = conn.execute("""
            SELECT COUNT(*)
            FROM contracts c
            JOIN providers p ON c.provider_id = p.provider_id
            WHERE c.process_id = ?
        """, [process_id]).fetchone()[0]
        if contract_count > 0:
            raise HTTPException(status_code=400, detail=f"Process has {contract_count} assigned providers. Please remove provider assignments first.")

        conn.execute("DELETE FROM process_providers WHERE process_id = ?", [process_id])
        conn.execute("DELETE FROM contracts WHERE process_id = ?", [process_id])
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
        conn.commit()
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

    def get_forecasts_for_product(self, product_id: int) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        results = conn.execute(
            "SELECT * FROM forecasts WHERE product_id = ? ORDER BY year DESC, month DESC",
            [product_id]
        ).fetchall()

        forecasts = []
        for result in results:
            forecasts.append({
                "forecast_id": result[0],
                "product_id": result[1],
                "year": result[2],
                "month": result[3],
                "forecast_units": result[4],
                "date_creation": result[5],
                "date_last_update": result[6]
            })
        return forecasts

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
        conn.commit()
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
        conn.commit()
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

    def get_actuals_for_product(self, product_id: int) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        results = conn.execute(
            "SELECT * FROM actuals WHERE product_id = ? ORDER BY year DESC, month DESC",
            [product_id]
        ).fetchall()

        actuals = []
        for result in results:
            actuals.append({
                "actual_id": result[0],
                "product_id": result[1],
                "year": result[2],
                "month": result[3],
                "actual_units": result[4],
                "date_creation": result[5],
                "date_last_update": result[6]
            })
        return actuals

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
        conn.commit()
        return result.rowcount > 0

    # =====================================
    # CONTRACT CRUD OPERATIONS
    # =====================================

    def create_contract(self, process_id: int, provider_id: int, contract_name: str = None, status: str = "active") -> Any:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        contract_id = conn.execute("SELECT nextval('contract_seq')").fetchone()[0]

        # Use contract_name or derive from provider
        if contract_name is None:
            provider = self.get_provider(provider_id)
            contract_name = f"{provider['company_name']} Contract" if provider else f"Contract {contract_id}"

        conn.execute(
            "INSERT INTO contracts (contract_id, process_id, provider_id, contract_name, status, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [contract_id, process_id, provider_id, contract_name, status, now, now]
        )
        return self.get_contract(contract_id)

    def get_contract(self, contract_id: int) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        result = conn.execute("""
            SELECT c.contract_id, c.process_id, c.provider_id, c.contract_name, c.status, c.date_creation, c.date_last_update,
                   p.company_name as provider_name, pr.process_name
            FROM contracts c
            JOIN providers p ON c.provider_id = p.provider_id
            JOIN processes pr ON c.process_id = pr.process_id
            WHERE c.contract_id = ?
        """, [contract_id]).fetchone()

        if result:
            return {
                "contract_id": result[0],
                "process_id": result[1],
                "provider_id": result[2],
                "contract_name": result[3],
                "status": result[4],
                "date_creation": result[5],
                "date_last_update": result[6],
                "provider_name": result[7],
                "process_name": result[8]
            }
        return None

    def get_contracts_for_process(self, process_id: int) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        results = conn.execute("""
            SELECT c.contract_id, c.process_id, c.provider_id, c.contract_name, c.status, c.date_creation, c.date_last_update,
                   p.company_name as provider_name, pr.process_name
            FROM contracts c
            JOIN providers p ON c.provider_id = p.provider_id
            JOIN processes pr ON c.process_id = pr.process_id
            WHERE c.process_id = ?
            ORDER BY c.contract_name
        """, [process_id]).fetchall()

        return [
            {
                "contract_id": row[0],
                "process_id": row[1],
                "provider_id": row[2],
                "contract_name": row[3],
                "status": row[4],
                "date_creation": row[5],
                "date_last_update": row[6],
                "provider_name": row[7],
                "process_name": row[8]
            }
            for row in results
        ]

    def update_contract(self, contract_id: int, contract_name: str = None, status: str = None) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        current = self.get_contract(contract_id)
        if not current:
            return False

        contract_name = contract_name if contract_name is not None else current["contract_name"]
        status = status if status is not None else current["status"]

        conn.execute(
            "UPDATE contracts SET contract_name = ?, status = ?, date_last_update = ? WHERE contract_id = ?",
            [contract_name, status, now, contract_id]
        )
        return True

    def delete_contract(self, contract_id: int) -> bool:
        conn = self._get_connection()

        # Get contract details before deleting
        contract = self.get_contract(contract_id)
        if not contract:
            return False

        # Delete all offers for this contract's provider and process
        # This removes orphaned offers when a contract is deleted
        conn.execute(
            "DELETE FROM offers WHERE provider_id = ? AND process_id = ?",
            [contract['provider_id'], contract['process_id']]
        )

        # Delete tiers first
        conn.execute("DELETE FROM contract_tiers WHERE contract_id = ?", [contract_id])
        # Delete contract
        result = conn.execute("DELETE FROM contracts WHERE contract_id = ?", [contract_id])
        return result.rowcount > 0

    # Contract Tier CRUD operations
    def create_contract_tier(self, contract_id: int, tier_number: int, threshold_units: int, is_selected: bool = False) -> Any:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        contract_tier_id = conn.execute("SELECT nextval('contract_tier_seq')").fetchone()[0]
        conn.execute(
            "INSERT INTO contract_tiers (contract_tier_id, contract_id, tier_number, threshold_units, is_selected, date_creation, date_last_update) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [contract_tier_id, contract_id, tier_number, threshold_units, is_selected, now, now]
        )
        return self.get_contract_tier(contract_tier_id)

    def get_contract_tier(self, contract_tier_id: int) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        result = conn.execute("SELECT * FROM contract_tiers WHERE contract_tier_id = ?", [contract_tier_id]).fetchone()
        if result:
            return {
                "contract_tier_id": result[0],
                "contract_id": result[1],
                "tier_number": result[2],
                "threshold_units": result[3],
                "is_selected": result[4],
                "date_creation": result[5],
                "date_last_update": result[6]
            }
        return None

    def get_contract_tiers_for_contract(self, contract_id: int) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        results = conn.execute("""
            SELECT contract_tier_id, contract_id, tier_number, threshold_units, is_selected, date_creation, date_last_update
            FROM contract_tiers
            WHERE contract_id = ?
            ORDER BY tier_number
        """, [contract_id]).fetchall()

        return [
            {
                "contract_tier_id": row[0],
                "contract_id": row[1],
                "tier_number": row[2],
                "threshold_units": row[3],
                "is_selected": row[4],
                "date_creation": row[5],
                "date_last_update": row[6]
            }
            for row in results
        ]

    def update_contract_tier(self, contract_tier_id: int, threshold_units: int = None, is_selected: bool = None) -> bool:
        conn = self._get_connection()
        now = datetime.now().isoformat()
        current = self.get_contract_tier(contract_tier_id)
        if not current:
            return False

        threshold_units = threshold_units if threshold_units is not None else current["threshold_units"]
        is_selected = is_selected if is_selected is not None else current["is_selected"]

        conn.execute(
            "UPDATE contract_tiers SET threshold_units = ?, is_selected = ?, date_last_update = ? WHERE contract_tier_id = ?",
            [threshold_units, is_selected, now, contract_tier_id]
        )
        return True

    def delete_contract_tier(self, contract_tier_id: int) -> bool:
        conn = self._get_connection()

        # Get the contract tier details to find matching offers
        contract_tier = self.get_contract_tier(contract_tier_id)
        if not contract_tier:
            return False

        contract = self.get_contract(contract_tier['contract_id'])
        if not contract:
            return False

        # Delete all offers for this provider, process, and tier_number
        # This removes orphaned offers when a tier is deleted
        conn.execute(
            "DELETE FROM offers WHERE provider_id = ? AND process_id = ? AND tier_number = ?",
            [contract['provider_id'], contract['process_id'], contract_tier['tier_number']]
        )

        # Now delete the contract tier
        result = conn.execute("DELETE FROM contract_tiers WHERE contract_tier_id = ?", [contract_tier_id])
        return result.rowcount > 0

    def get_provider_tier_thresholds(self, provider_id: int) -> Dict[str, Any]:
        """Get tier thresholds for all contracts associated with a provider"""
        conn = self._get_connection()
        results = conn.execute("""
            SELECT DISTINCT
                pr.process_id,
                pr.process_name,
                pr.tier_thresholds
            FROM contracts c
            JOIN processes pr ON c.process_id = pr.process_id
            WHERE c.provider_id = ?
              AND pr.status = 'active'
        """, [provider_id]).fetchall()

        tier_data = {}
        for row in results:
            process_id = row[0]
            process_name = row[1]
            tier_thresholds = row[2] or "{}"

            tier_data[str(process_id)] = {
                'process_name': process_name,
                'tier_thresholds': tier_thresholds
            }

        return tier_data

    def get_price_for_item_at_tier(self, provider_id: int, item_id: int, tier_number: int, process_id: int) -> Optional[float]:
        """Get the price for an item at a specific tier"""
        conn = self._get_connection()
        result = conn.execute("""
            SELECT price_per_unit
            FROM offers
            WHERE provider_id = ?
              AND item_id = ?
              AND tier_number = ?
              AND process_id = ?
              AND status = 'active'
            ORDER BY date_creation DESC
            LIMIT 1
        """, [provider_id, item_id, tier_number, process_id]).fetchone()

        return float(result[0]) if result else None

    def get_product_pricing_table_data(self, product_id: int, year: int = None, month: int = None, use_forecasts: bool = False) -> Dict[str, Any]:
        """
        Calculate detailed pricing table for a product based on actuals or forecasts.
        Returns structure suitable for frontend rendering.
        """
        conn = self._get_connection()
        now = datetime.now()
        
        # Default to current date if not provided
        current_year = year if year is not None else now.year
        current_month = month if month is not None else now.month
        
        units = 0
        
        if use_forecasts:
            forecast = self.get_forecast_by_product_month(product_id, current_year, current_month)
            units = forecast[4] if forecast else 0
        else:
            actual = self.get_actual_by_product_month(product_id, current_year, current_month)
            units = actual[4] if actual else 0
        
        # 2. Get Allocations
        allocations = self.get_allocations_for_product(product_id)
        
        # 3. Get Multipliers
        multipliers = self.get_price_multipliers_for_product(product_id)
        
        # 4. Get Product Structure (Contracts -> Items)
        structure = self.get_product_contracts_with_selected_items(product_id)
        
        processes_data = []
        
        for process in structure:
            process_rows = []
            for item in process['items']:
                item_id = item['item_id']
                
                # Determine allocation for this item
                item_alloc_providers = []
                mode = 'percentage'
                
                if allocations:
                    # Check if collective (has 'mode' key) or per-item (keys are item_ids)
                    if 'mode' in allocations and 'providers' in allocations:
                         # Collective
                         item_alloc_providers = allocations['providers']
                         mode = allocations['mode']
                    elif item_id in allocations:
                         # Per item
                         item_alloc_providers = allocations[item_id]['providers']
                         mode = allocations[item_id]['mode']
                
                # Multiplier
                multiplier_data = multipliers.get(item_id, {'multiplier': 1.0})
                multiplier = multiplier_data['multiplier']
                
                # Calculate total weight for proportional unit allocation
                total_alloc_weight = 0
                if mode != 'percentage' and item_alloc_providers:
                    total_alloc_weight = sum(p['value'] for p in item_alloc_providers)
                
                # --- Largest Remainder Method (Hamilton Method) ---
                # Pre-calculate allocations to ensure sum(allocated) == units
                
                alloc_precalc = []
                
                # 1. Calculate Exact Shares and Floors
                for provider in item['providers']:
                    p_id = provider['provider_id']
                    
                    # Find allocation config
                    p_alloc = next((p for p in item_alloc_providers if p['provider_id'] == p_id), None)
                    
                    raw_val = 0.0
                    if p_alloc:
                        val = p_alloc['value']
                        if mode == 'percentage':
                            raw_val = units * (val / 100.0)
                        else: # units/weight
                            if total_alloc_weight > 0:
                                share = val / total_alloc_weight
                                raw_val = units * share
                    
                    floored = int(raw_val)
                    fraction = raw_val - floored
                    
                    alloc_precalc.append({
                        'floored': floored,
                        'fraction': fraction,
                        'raw': raw_val
                    })

                # 2. Calculate Remainder
                # We round the sum of raw values to handle cases where percentages don't sum to 100%
                # e.g. if 50% + 40% = 90%, we want 90% of units, not 100%.
                total_exact = sum(x['raw'] for x in alloc_precalc)
                target_total = int(round(total_exact))
                current_total = sum(x['floored'] for x in alloc_precalc)
                remainder = target_total - current_total
                
                # 3. Distribute Remainder
                if remainder > 0:
                    # Sort by fractional part descending, preserve original index
                    indexed_fractions = []
                    for i, calc in enumerate(alloc_precalc):
                        indexed_fractions.append((i, calc['fraction']))
                    
                    # Sort by fraction desc
                    indexed_fractions.sort(key=lambda x: x[1], reverse=True)
                    
                    # Distribute
                    for i in range(remainder):
                        if i < len(indexed_fractions):
                            idx = indexed_fractions[i][0]
                            alloc_precalc[idx]['floored'] += 1

                # --- End Allocation Calculation ---
                
                for idx, provider in enumerate(item['providers']):
                    provider_id = provider['provider_id']
                    contract_id = provider['contract_id']
                    
                    # Retrieve pre-calculated integer allocation
                    alloc_val = alloc_precalc[idx]['floored']
                    
                    # Get config again just for display strings
                    p_alloc = next((p for p in item_alloc_providers if p['provider_id'] == provider_id), None)
                    
                    alloc_display = "0%"
                    
                    if p_alloc:
                        val = p_alloc['value']
                        if mode == 'percentage':
                            alloc_display = f"{val}%"
                        else: # units
                            # Format cleanly (remove .0)
                            alloc_display = f"{int(val):,}" if val == int(val) else f"{val:,}"
                    
                    # Skip if no allocation (and no computed units)
                    if alloc_val <= 0 and (not p_alloc or p_alloc.get('value', 0) <= 0):
                        continue
                    
                    # Find Tier
                    tiers = self.get_contract_tiers_for_contract(contract_id)
                    # Sort by threshold ascending (e.g. 0, 1000, 5000)
                    tiers.sort(key=lambda x: x['threshold_units'])
                    
                    active_tier_num = 1
                    calculated_tier_num = 1

                    # 1. Calculate Volume-Based Tier (Always)
                    if tiers:
                        found_tier = None
                        for t in tiers:
                            if t['threshold_units'] > alloc_val:
                                found_tier = t
                                break
                        
                        if found_tier:
                            calculated_tier_num = found_tier['tier_number']
                        else:
                            # Exceeded all thresholds, use the highest tier
                            calculated_tier_num = tiers[-1]['tier_number']
                    
                    # 2. Determine Active Tier (for Pricing)
                    selected_tier = next((t for t in tiers if t['is_selected']), None)
                    
                    if selected_tier:
                        active_tier_num = selected_tier['tier_number']
                    else:
                        active_tier_num = calculated_tier_num

                    # Get Price
                    price = self.get_price_for_item_at_tier(provider_id, item_id, active_tier_num, process['process_id'])
                    
                    if price is None:
                        price = 0.0
                        
                    # Calculate final
                    final_price = price * multiplier
                    total_cost = final_price * alloc_val
                    
                    # Multiplier display
                    pct = (multiplier - 1.0) * 100
                    if abs(pct) < 0.1:
                        mult_display = "-"
                    else:
                        sign = "+" if pct > 0 else ""
                        mult_display = f"{multiplier} ({sign}{pct:.1f}%)"
                    
                    process_rows.append({
                        "item_name": item['item_name'],
                        "provider_name": provider['provider_name'],
                        "tier": active_tier_num,
                        "calculated_tier": calculated_tier_num,
                        "price_per_unit": price,
                        "multiplier_display": mult_display,
                        "allocation": alloc_display,
                        "allocation_mode": mode,
                        "total_cost": total_cost,
                        "allocated_units": alloc_val
                    })
            
            # Sort by Provider Name then Item Name for grouping
            process_rows.sort(key=lambda x: (x['provider_name'], x['item_name']))

            if process_rows:
                processes_data.append({
                    "process_name": process['process_name'],
                    "rows": process_rows
                })
                
        return {
            "year": current_year,
            "month": current_month,
            "units": units,
            "is_forecast": use_forecasts,
            "processes": processes_data
        }


    # =====================================


# Global CRUD instance
_crud = None


def get_crud():
    """Get or create the global CRUD operations instance"""
    global _crud
    if _crud is None:
        _crud = CRUDOperations()
        _crud.initialize_all()
    return _crud
