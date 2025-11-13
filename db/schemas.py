"""
Database Schemas - All table definitions and data classes

This module defines all database tables and their schemas using DuckDB.
Tables are created if they don't exist.
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
    process_id: int
    tier_number: int
    price_per_unit: float
    status: str
    date_creation: str
    date_last_update: str


@dataclass
class Process:
    process_id: int
    process_name: str
    description: str
    provider_id: int
    tier_thresholds: str  # JSON string with tier thresholds
    status: str
    date_creation: str
    date_last_update: str


@dataclass
class ProcessGraph:
    from_process_id: int
    to_process_id: int


@dataclass
class ProcessProvider:
    process_id: int
    provider_id: int
    date_creation: str


@dataclass
class ProcessItem:
    process_id: int
    item_id: int
    date_creation: str


@dataclass
class Forecast:
    forecast_id: int
    product_id: int
    year: int
    month: int
    forecast_units: int
    date_creation: str
    date_last_update: str


@dataclass
class Actual:
    actual_id: int
    product_id: int
    year: int
    month: int
    actual_units: int
    date_creation: str
    date_last_update: str


@dataclass
class Contract:
    contract_id: int
    provider_id: int
    contract_name: str
    status: str
    date_creation: str
    date_last_update: str


@dataclass
class ContractTier:
    contract_tier_id: int
    contract_id: int
    tier_number: int
    threshold_units: int
    is_selected: bool
    date_creation: str
    date_last_update: str


@dataclass
class Contract:
    contract_id: int
    process_id: int
    provider_id: int
    contract_name: str
    status: str
    date_creation: str
    date_last_update: str


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


class DatabaseSchema:
    """Handles all database schema creation and migrations"""

    def __init__(self, db_path: str = "database.ddb", conn=None):
        self.db_path = os.path.join(os.path.dirname(__file__), "..", db_path)
        self.conn = conn

    def _get_connection(self):
        if self.conn is None:
            self.conn = duckdb.connect(self.db_path, read_only=False)
        return self.conn

    def initialize_all(self):
        """Initialize all database tables and sequences"""
        conn = self._get_connection()
        self._create_sequences()
        self._create_providers_table()
        self._create_items_table()
        self._create_provider_items_table()
        self._create_offers_table()
        self._create_products_table()
        self._create_product_items_table()
        self._create_product_item_allocations_table()
        self._create_product_item_pricing_table()
        self._create_processes_table()
        self._create_process_graph_table()
        self._create_process_providers_table()
        self._create_process_items_table()
        self._create_contracts_table()
        self._create_contract_tiers_table()
        self._create_forecasts_table()
        self._create_actuals_table()

    def _create_sequences(self):
        """Create database sequences for auto-incrementing IDs"""
        conn = self._get_connection()
        conn.execute("CREATE SEQUENCE IF NOT EXISTS provider_seq")
        conn.execute("CREATE SEQUENCE IF NOT EXISTS item_seq")
        conn.execute("CREATE SEQUENCE IF NOT EXISTS offer_seq")
        conn.execute("CREATE SEQUENCE IF NOT EXISTS product_seq")
        conn.execute("CREATE SEQUENCE IF NOT EXISTS process_seq")
        conn.execute("CREATE SEQUENCE IF NOT EXISTS contract_seq")
        conn.execute("CREATE SEQUENCE IF NOT EXISTS contract_tier_seq")
        conn.execute("CREATE SEQUENCE IF NOT EXISTS forecast_seq")
        conn.execute("CREATE SEQUENCE IF NOT EXISTS actual_seq")
        self._sync_sequences()

    def _sync_sequences(self):
        """Sync sequences with existing max IDs in tables"""
        conn = self._get_connection()

        def get_max_id(table_name, id_column):
            try:
                result = conn.execute(f"SELECT COALESCE(MAX({id_column}), 0) FROM {table_name}").fetchone()
                return result[0] if result else 0
            except:
                return 0

        max_provider = get_max_id("providers", "provider_id")
        conn.execute(f"DROP SEQUENCE IF EXISTS provider_seq; CREATE SEQUENCE provider_seq START {max_provider + 1}")

        max_item = get_max_id("items", "item_id")
        conn.execute(f"DROP SEQUENCE IF EXISTS item_seq; CREATE SEQUENCE item_seq START {max_item + 1}")

        max_offer = get_max_id("offers", "offer_id")
        conn.execute(f"DROP SEQUENCE IF EXISTS offer_seq; CREATE SEQUENCE offer_seq START {max_offer + 1}")

        max_product = get_max_id("products", "product_id")
        conn.execute(f"DROP SEQUENCE IF EXISTS product_seq; CREATE SEQUENCE product_seq START {max_product + 1}")

        max_process = get_max_id("processes", "process_id")
        conn.execute(f"DROP SEQUENCE IF EXISTS process_seq; CREATE SEQUENCE process_seq START {max_process + 1}")

        max_contract = get_max_id("contracts", "contract_id")
        conn.execute(f"DROP SEQUENCE IF EXISTS contract_seq; CREATE SEQUENCE contract_seq START {max_contract + 1}")

        max_contract_tier = get_max_id("contract_tiers", "contract_tier_id")
        conn.execute(f"DROP SEQUENCE IF EXISTS contract_tier_seq; CREATE SEQUENCE contract_tier_seq START {max_contract_tier + 1}")

        max_forecast = get_max_id("forecasts", "forecast_id")
        conn.execute(f"DROP SEQUENCE IF EXISTS forecast_seq; CREATE SEQUENCE forecast_seq START {max_forecast + 1}")

        max_actual = get_max_id("actuals", "actual_id")
        conn.execute(f"DROP SEQUENCE IF EXISTS actual_seq; CREATE SEQUENCE actual_seq START {max_actual + 1}")

    def _create_providers_table(self):
        """Create providers table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS providers (
                provider_id INTEGER PRIMARY KEY,
                company_name VARCHAR NOT NULL UNIQUE,
                details TEXT,
                status VARCHAR DEFAULT 'active',
                date_creation VARCHAR NOT NULL,
                date_last_update VARCHAR NOT NULL
            )
        """)

    def _create_items_table(self):
        """Create items table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS items (
                item_id INTEGER PRIMARY KEY,
                item_name VARCHAR NOT NULL,
                description TEXT,
                status VARCHAR DEFAULT 'active',
                date_creation VARCHAR NOT NULL,
                date_last_update VARCHAR NOT NULL
            )
        """)

        # Remove UNIQUE constraint if it exists (for backward compatibility)
        # This allows the same item name to exist in different processes
        try:
            # Check if UNIQUE constraint exists and remove it
            conn.execute("ALTER TABLE items DROP CONSTRAINT IF EXISTS items_item_name_key")
        except:
            # If constraint doesn't exist or can't be dropped, continue
            pass

    def _create_provider_items_table(self):
        """Create provider_items junction table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS provider_items (
                provider_id INTEGER,
                item_id INTEGER,
                date_creation VARCHAR NOT NULL,
                PRIMARY KEY (provider_id, item_id)
            )
        """)

    def _create_offers_table(self):
        """Create offers table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS offers (
                offer_id INTEGER PRIMARY KEY,
                item_id INTEGER NOT NULL,
                provider_id INTEGER NOT NULL,
                tier_number INTEGER NOT NULL,
                price_per_unit DECIMAL(10,2) NOT NULL,
                status VARCHAR DEFAULT 'active',
                date_creation VARCHAR NOT NULL,
                date_last_update VARCHAR NOT NULL
            )
        """)

        columns = conn.execute("PRAGMA table_info(offers)").fetchall()
        column_names = [col[1] for col in columns]

        if 'process_id' not in column_names:
            conn.execute("ALTER TABLE offers ADD COLUMN process_id INTEGER")
            conn.execute("UPDATE offers SET process_id = 1 WHERE process_id IS NULL")
            conn.execute("ALTER TABLE offers ALTER COLUMN process_id SET NOT NULL")

    def _create_products_table(self):
        """Create products table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS products (
                product_id INTEGER PRIMARY KEY,
                name VARCHAR NOT NULL UNIQUE,
                description TEXT,
                proxy_quantity INTEGER DEFAULT 0,
                status VARCHAR DEFAULT 'active',
                date_creation VARCHAR NOT NULL,
                date_last_update VARCHAR NOT NULL
            )
        """)

        columns = conn.execute("PRAGMA table_info(products)").fetchall()
        column_names = [col[1] for col in columns]
        if 'proxy_quantity' not in column_names:
            conn.execute("ALTER TABLE products ADD COLUMN proxy_quantity INTEGER DEFAULT 0")

    def _create_product_items_table(self):
        """Create product_items junction table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS product_items (
                product_id INTEGER,
                item_id INTEGER,
                date_creation VARCHAR NOT NULL,
                PRIMARY KEY (product_id, item_id)
            )
        """)

    def _create_product_item_allocations_table(self):
        """Create product_item_allocations table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
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
        """)

    def _create_product_item_pricing_table(self):
        """Create product_item_pricing table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS product_item_pricing (
                product_id INTEGER,
                item_id INTEGER,
                price_multiplier DECIMAL(10,4) DEFAULT 1.0,
                notes TEXT,
                date_creation VARCHAR NOT NULL,
                date_last_update VARCHAR NOT NULL,
                PRIMARY KEY (product_id, item_id)
            )
        """)

    def _create_processes_table(self):
        """Create processes table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS processes (
                process_id INTEGER PRIMARY KEY,
                process_name VARCHAR NOT NULL,
                description TEXT,
                provider_id INTEGER NOT NULL,
                tier_thresholds TEXT DEFAULT '{}',
                status VARCHAR DEFAULT 'active',
                date_creation VARCHAR NOT NULL,
                date_last_update VARCHAR NOT NULL
            )
        """)

    def _create_process_graph_table(self):
        """Create process_graph table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS process_graph (
                from_process_id INTEGER NOT NULL,
                to_process_id INTEGER NOT NULL,
                PRIMARY KEY (from_process_id, to_process_id)
            )
        """)

    def _create_process_providers_table(self):
        """Create process_providers junction table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS process_providers (
                process_id INTEGER,
                provider_id INTEGER,
                date_creation VARCHAR NOT NULL,
                PRIMARY KEY (process_id, provider_id)
            )
        """)

    def _create_process_items_table(self):
        """Create process_items junction table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS process_items (
                process_id INTEGER,
                item_id INTEGER,
                date_creation VARCHAR NOT NULL,
                PRIMARY KEY (process_id, item_id)
            )
        """)

    def _create_contracts_table(self):
        """Create contracts table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS contracts (
                contract_id INTEGER PRIMARY KEY,
                process_id INTEGER NOT NULL,
                provider_id INTEGER NOT NULL,
                contract_name VARCHAR NOT NULL,
                status VARCHAR DEFAULT 'active',
                date_creation VARCHAR NOT NULL,
                date_last_update VARCHAR NOT NULL
            )
        """)

    def _create_contract_tiers_table(self):
        """Create contract_tiers table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS contract_tiers (
                contract_tier_id INTEGER PRIMARY KEY,
                contract_id INTEGER NOT NULL,
                tier_number INTEGER NOT NULL,
                threshold_units INTEGER NOT NULL,
                is_selected BOOLEAN DEFAULT FALSE,
                date_creation VARCHAR NOT NULL,
                date_last_update VARCHAR NOT NULL
            )
        """)

    def _create_forecasts_table(self):
        """Create forecasts table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS forecasts (
                forecast_id INTEGER PRIMARY KEY,
                product_id INTEGER NOT NULL,
                year INTEGER NOT NULL,
                month INTEGER NOT NULL,
                forecast_units INTEGER NOT NULL,
                date_creation VARCHAR NOT NULL,
                date_last_update VARCHAR NOT NULL,
                UNIQUE(product_id, year, month)
            )
        """)

    def _create_actuals_table(self):
        """Create actuals table if it doesn't exist"""
        conn = self._get_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS actuals (
                actual_id INTEGER PRIMARY KEY,
                product_id INTEGER NOT NULL,
                year INTEGER NOT NULL,
                month INTEGER NOT NULL,
                actual_units INTEGER NOT NULL,
                date_creation VARCHAR NOT NULL,
                date_last_update VARCHAR NOT NULL,
                UNIQUE(product_id, year, month)
            )
        """)

    def close(self):
        if self.conn:
            self.conn.close()
