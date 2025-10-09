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

    status: str

    date_creation: str

    date_last_update: str


@dataclass
class ProductItem:
    product_id: int

    item_id: int

    date_creation: str


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

    def _create_sequences(self):
        """Create database sequences for auto-incrementing IDs"""

        conn = self._get_connection()

        conn.execute("CREATE SEQUENCE IF NOT EXISTS product_seq")

    def _create_products_table(self):
        """Create products table if it doesn't exist"""

        query = """

        CREATE TABLE IF NOT EXISTS products (

            product_id INTEGER PRIMARY KEY,

            name VARCHAR NOT NULL UNIQUE,

            description TEXT,

            status VARCHAR DEFAULT 'active',

            date_creation VARCHAR NOT NULL,

            date_last_update VARCHAR NOT NULL

        )

        """

        conn = self._get_connection()

        conn.execute(query)

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

    def create_product(
        self, name: str, description: str = "", status: str = "active"
    ) -> Product:
        """Create a new product"""

        conn = self._get_connection()

        now = datetime.now().isoformat()

        product_id = conn.execute("SELECT nextval('product_seq')").fetchone()[0]

        conn.execute(
            """

            INSERT INTO products (product_id, name, description, status, date_creation, date_last_update)

            VALUES (?, ?, ?, ?, ?, ?)

        """,
            [product_id, name, description, status, now, now],
        )

        return Product(
            product_id=product_id,
            name=name,
            description=description,
            status=status,
            date_creation=now,
            date_last_update=now,
        )

    def get_product(self, product_id: int) -> Optional[Product]:
        """Get a product by ID"""

        conn = self._get_connection()

        result = conn.execute(
            "SELECT * FROM products WHERE product_id = ?", [product_id]
        ).fetchone()

        if result:
            return Product(*result)

        return None

    def get_all_products(self) -> List[Product]:
        """Get all products"""

        conn = self._get_connection()

        results = conn.execute("SELECT * FROM products ORDER BY name").fetchall()

        return [Product(*result) for result in results]

    def update_product(
        self,
        product_id: int,
        name: str = None,
        description: str = None,
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

        status = status if status is not None else current.status

        conn.execute(
            """

            UPDATE products

            SET name = ?, description = ?, status = ?, date_last_update = ?

            WHERE product_id = ?

        """,
            [name, description, status, now, product_id],
        )

        return True

    def delete_product(self, product_id: int) -> bool:
        """Delete a product and its item associations"""

        conn = self._get_connection()

        # Manually delete associations first (DuckDB doesn't support CASCADE)
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
