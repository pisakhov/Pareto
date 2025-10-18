"""
Products Repository - Data Access Layer for Products Management

This module handles all database operations for products and their associated items.
"""

import duckdb
import os
from datetime import datetime
from typing import List, Optional
from dataclasses import dataclass

from db.pricing_repository import Item, get_pricing_repo


@dataclass
class Product:
    product_id: int

    name: str

    description: str

    proxy_quantity: int

    status: str

    date_creation: str

    date_last_update: str


@dataclass
class ProductItem:
    product_id: int

    item_id: int

    date_creation: str


@dataclass
class ProductItemAllocation:
    product_id: int

    item_id: int

    provider_id: int

    allocation_mode: str

    allocation_value: float

    is_locked: bool

    date_creation: str

    date_last_update: str


@dataclass
class ProductItemPricing:
    product_id: int

    item_id: int

    price_multiplier: float

    notes: str

    date_creation: str

    date_last_update: str


class ProductsRepository:
    """Repository class for managing products data with DuckDB"""

    def __init__(self, db_path: str = "database.ddb", conn=None):
        self.db_path = os.path.join(os.path.dirname(__file__), "..", db_path)

        self.conn = conn

    def _get_connection(self):
        """Get or create database connection"""

        if self.conn is None:
            self.conn = duckdb.connect(self.db_path, read_only=False)

        return self.conn

    def _initialize_database(self):
        """Initialize database tables if they don't exist"""

        conn = self._get_connection()

        self._create_sequences()

        self._create_products_table()

        self._create_product_items_table()

        self._create_product_item_allocations_table()

        self._create_product_item_pricing_table()

    def _create_sequences(self):
        """Create database sequences for auto-incrementing IDs"""

        conn = self._get_connection()

        conn.execute("CREATE SEQUENCE IF NOT EXISTS product_seq")
        
        # Sync sequences with existing data
        self._sync_sequences()

    def _create_products_table(self):
        """Create products table if it doesn't exist"""

        query = """

        CREATE TABLE IF NOT EXISTS products (

            product_id INTEGER PRIMARY KEY,

            name VARCHAR NOT NULL UNIQUE,

            description TEXT,

            proxy_quantity INTEGER DEFAULT 0,

            status VARCHAR DEFAULT 'active',

            date_creation VARCHAR NOT NULL,

            date_last_update VARCHAR NOT NULL

        )

        """

        conn = self._get_connection()

        conn.execute(query)
        
        # Add proxy_quantity column if it doesn't exist (migration for existing databases)
        try:
            # Check if column exists by querying column information
            columns = conn.execute("PRAGMA table_info(products)").fetchall()
            column_names = [col[1] for col in columns]
            if 'proxy_quantity' not in column_names:
                print("Adding proxy_quantity column to products table")
                conn.execute("ALTER TABLE products ADD COLUMN proxy_quantity INTEGER DEFAULT 0")
        except Exception as e:
            print(f"Migration warning: {e}")

    def _create_product_items_table(self):
        """Create product_items junction table if it doesn't exist"""

        query = """

        CREATE TABLE IF NOT EXISTS product_items (

            product_id INTEGER,

            item_id INTEGER,

            date_creation VARCHAR NOT NULL,

            PRIMARY KEY (product_id, item_id)

        )

        """

        conn = self._get_connection()

        conn.execute(query)

    def _create_product_item_allocations_table(self):
        """Create product_item_allocations table if it doesn't exist"""

        query = """

        CREATE TABLE IF NOT EXISTS product_item_allocations (

            product_id INTEGER,

            item_id INTEGER,

            provider_id INTEGER,

            allocation_mode VARCHAR NOT NULL,

            allocation_value DECIMAL(10,2) NOT NULL,

            is_locked BOOLEAN DEFAULT FALSE,

            date_creation VARCHAR NOT NULL,

            date_last_update VARCHAR NOT NULL,

            PRIMARY KEY (product_id, item_id, provider_id)

        )

        """

        conn = self._get_connection()

        conn.execute(query)

    def _create_product_item_pricing_table(self):
        """Create product_item_pricing table if it doesn't exist"""

        query = """

        CREATE TABLE IF NOT EXISTS product_item_pricing (

            product_id INTEGER,

            item_id INTEGER,

            price_multiplier DECIMAL(10,4) DEFAULT 1.0,

            notes TEXT,

            date_creation VARCHAR NOT NULL,

            date_last_update VARCHAR NOT NULL,

            PRIMARY KEY (product_id, item_id)

        )

        """

        conn = self._get_connection()

        conn.execute(query)
    
    def _sync_sequences(self):
        """Sync sequences with existing max IDs in tables"""
        conn = self._get_connection()
        
        # Sync product_seq
        max_product = conn.execute("SELECT COALESCE(MAX(product_id), 0) FROM products").fetchone()[0]
        conn.execute("DROP SEQUENCE IF EXISTS product_seq")
        conn.execute(f"CREATE SEQUENCE product_seq START {max_product + 1}")

    def create_product(
        self, name: str, description: str = "", proxy_quantity: int = 0, status: str = "active"
    ) -> Product:
        """Create a new product"""

        conn = self._get_connection()

        now = datetime.now().isoformat()

        product_id = conn.execute("SELECT nextval('product_seq')").fetchone()[0]

        conn.execute(
            """

            INSERT INTO products (product_id, name, description, proxy_quantity, status, date_creation, date_last_update)

            VALUES (?, ?, ?, ?, ?, ?, ?)

        """,
            [product_id, name, description, proxy_quantity, status, now, now],
        )

        return Product(
            product_id=product_id,
            name=name,
            description=description,
            proxy_quantity=proxy_quantity,
            status=status,
            date_creation=now,
            date_last_update=now,
        )

    def get_product(self, product_id: int) -> Optional[Product]:
        """Get a product by ID"""

        conn = self._get_connection()

        result = conn.execute(
            "SELECT product_id, name, description, proxy_quantity, status, date_creation, date_last_update FROM products WHERE product_id = ?", [product_id]
        ).fetchone()

        if result:
            return Product(*result)

        return None

    def get_all_products(self) -> List[Product]:
        """Get all products"""

        conn = self._get_connection()

        results = conn.execute("SELECT product_id, name, description, proxy_quantity, status, date_creation, date_last_update FROM products ORDER BY name").fetchall()

        return [Product(*result) for result in results]

    def update_product(
        self,
        product_id: int,
        name: str = None,
        description: str = None,
        proxy_quantity: int = None,
        status: str = None,
    ) -> bool:
        """Update a product"""

        conn = self._get_connection()

        now = datetime.now().isoformat()

        current = self.get_product(product_id)

        if not current:
            return False

        name = name if name is not None else current.name

        description = description if description is not None else current.description

        proxy_quantity = proxy_quantity if proxy_quantity is not None else current.proxy_quantity

        status = status if status is not None else current.status

        conn.execute(
            """

            UPDATE products

            SET name = ?, description = ?, proxy_quantity = ?, status = ?, date_last_update = ?

            WHERE product_id = ?

        """,
            [name, description, proxy_quantity, status, now, product_id],
        )

        return True

    def delete_product(self, product_id: int) -> bool:
        """Delete a product and its item associations"""

        conn = self._get_connection()

        # Manually delete associations first (DuckDB doesn't support CASCADE)
        conn.execute("DELETE FROM product_item_pricing WHERE product_id = ?", [product_id])
        conn.execute("DELETE FROM product_item_allocations WHERE product_id = ?", [product_id])
        conn.execute("DELETE FROM product_items WHERE product_id = ?", [product_id])

        # Delete the product
        result = conn.execute("DELETE FROM products WHERE product_id = ?", [product_id])

        return result.rowcount > 0

    def set_items_for_product(self, product_id: int, item_ids: List[int]):
        """Set the items for a specific product, replacing existing ones"""

        conn = self._get_connection()
        now = datetime.now().isoformat()

        conn.execute("DELETE FROM product_items WHERE product_id = ?", [product_id])

        for item_id in item_ids:
            conn.execute(
                "INSERT INTO product_items (product_id, item_id, date_creation) VALUES (?, ?, ?)",
                [product_id, item_id, now],
            )

    def get_items_for_product(self, product_id: int) -> List[Item]:
        """Get all items for a specific product"""

        conn = self._get_connection()

        results = conn.execute(
            """

            SELECT i.*

            FROM items i

            JOIN product_items pi ON i.item_id = pi.item_id

            WHERE pi.product_id = ?

            ORDER BY i.item_name

        """,
            [product_id],
        ).fetchall()

        return [Item(*result) for result in results]

    def get_item_ids_for_product(self, product_id: int) -> List[int]:
        """Get all item IDs for a specific product"""

        conn = self._get_connection()

        results = conn.execute(
            "SELECT item_id FROM product_items WHERE product_id = ?", [product_id]
        ).fetchall()

        return [result[0] for result in results]

    def set_allocations_for_product(self, product_id: int, allocations_data: dict):
        """Set provider allocations for a product, replacing existing ones"""

        conn = self._get_connection()
        now = datetime.now().isoformat()

        # Delete existing allocations for this product
        conn.execute("DELETE FROM product_item_allocations WHERE product_id = ?", [product_id])

        # Insert new allocations
        for item_id_str, allocation in allocations_data.items():
            item_id = int(item_id_str)
            mode = allocation.get('mode', 'percentage')
            locked = allocation.get('locked', False)
            
            for provider in allocation.get('providers', []):
                provider_id = provider.get('provider_id')
                value = provider.get('value', 0)
                
                # Skip providers with 0 allocation unless locked
                if value > 0 or (locked and provider_id == allocation.get('lockedProviderId')):
                    conn.execute(
                        """
                        INSERT INTO product_item_allocations 
                        (product_id, item_id, provider_id, allocation_mode, allocation_value, is_locked, date_creation, date_last_update)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        [product_id, item_id, provider_id, mode, value, locked, now, now]
                    )

    def get_allocations_for_product(self, product_id: int) -> dict:
        """Get all allocations for a specific product"""

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

        # Group by item_id
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

            # Set lockedProviderId if this allocation is locked
            if is_locked and value > 0:
                allocations[item_id]['lockedProviderId'] = provider_id

        return allocations

    def set_price_multipliers_for_product(self, product_id: int, multipliers_data: dict):
        """Set price multipliers for product items, replacing existing ones"""

        conn = self._get_connection()
        now = datetime.now().isoformat()

        # Delete existing multipliers for this product
        conn.execute("DELETE FROM product_item_pricing WHERE product_id = ?", [product_id])

        # Insert new multipliers (only if not default 1.0)
        for item_id_str, multiplier_info in multipliers_data.items():
            item_id = int(item_id_str)
            
            if isinstance(multiplier_info, dict):
                multiplier = multiplier_info.get('multiplier', 1.0)
                notes = multiplier_info.get('notes', '')
            else:
                multiplier = float(multiplier_info)
                notes = ''
            
            # Only store if not default
            if multiplier != 1.0:
                conn.execute(
                    """
                    INSERT INTO product_item_pricing 
                    (product_id, item_id, price_multiplier, notes, date_creation, date_last_update)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    [product_id, item_id, multiplier, notes, now, now]
                )

    def get_price_multipliers_for_product(self, product_id: int) -> dict:
        """Get all price multipliers for a specific product"""

        conn = self._get_connection()

        results = conn.execute(
            """
            SELECT item_id, price_multiplier, notes
            FROM product_item_pricing
            WHERE product_id = ?
            """,
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
        """Calculate effective price with multiplier applied"""

        conn = self._get_connection()

        result = conn.execute(
            "SELECT price_multiplier FROM product_item_pricing WHERE product_id = ? AND item_id = ?",
            [product_id, item_id]
        ).fetchone()

        multiplier = float(result[0]) if result else 1.0
        return base_price * multiplier

    def close(self):
        """Close database connection"""

        if self.conn:
            self.conn.close()


products_repo = None


def get_products_repo():
    """Get or create the global products repository instance"""

    global products_repo

    if products_repo is None:
        print("LOG: Initializing products repository")
        pricing_repo = get_pricing_repo()
        print("LOG: Got pricing repository connection")

        products_repo = ProductsRepository(conn=pricing_repo._get_connection())
        print("LOG: Created products repository with shared connection")

        products_repo._initialize_database()
        print("LOG: Initialized products database")

    return products_repo
