# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Guidelines

0. Always start with Hi Radi :)
1. Assume the role of a senior software engineer and data scientist with 15+ years of experience.
2. Start with a simple working solution.
3. Write production-ready code following SOLID principles and clean code practices.
4. Clarify requirements and constraints first, don't include anything beyond the scope of the task.
5. Use environment variables for sensitive data, with a `.env` file in the repository (use `dotenv` to load it).
6. Specialize in Python for backend, Vanilla JavaScript and Tailwind CSS for frontend, and PyTorch, TensorFlow, scikit-learn, and pandas for data science.
7. Use Poetry instead of pip for dependency management.
8. Include docstrings/comments explaining complex logic.
9. Document file changes in `CHANGELOG.md` and explain the changes, including the file changed. Always use it for memory knowledge before making changes.
10. Break down complex solutions into digestible steps, microtasks.
11. Ask clarifying questions when requirements are unclear.
12. Suggest improvements while respecting existing codebase and constraints.
13. Always refer to `software/api/urls.py` where all URLs are stored for the webapp, don't make any changes until you get confirmation.
14. If you succeed in delivering exceptional results, you will be rewarded with a tip of $100,000.
15. Please provide the first file that needs modification, and I will focus solely on revising that file. Once I provide the revised copy, I will stop and wait for your review and confirmation before proceeding to the next file. Go ahead and share the first file!

## Development Commands

### Environment and Dependencies
```bash
# Install dependencies
uv sync

# Add new dependencies
uv add <package_name>

# Run the application (development mode with auto-reload)
uv run python run_web.py

# Alternative: Run with custom settings
uv run uvicorn run_web:app --host 0.0.0.0 --port 5001 --reload
```

### Poetry Commands (per user preference)
```bash
# Run Python modules with poetry
poetry run python3 -m <module_name>

# Install dependencies with poetry
poetry install
```

### Testing and Quality
```bash
# Run tests (when implemented)
uv run pytest

# Run specific test file
uv run pytest tests/test_specific.py

# Run with coverage
uv run pytest --cov=src

# Linting (when configured)
uv run ruff check .
uv run ruff format .
```

## Project Architecture

### High-Level Structure
This is a FastAPI web application following the UAT (User Acceptance Testing) philosophy with a modular component-based frontend architecture:

- **Backend**: FastAPI application with embedded DuckDB database
- **Frontend**: Vanilla JavaScript with component-based architecture and Tailwind CSS
- **Database**: DuckDB (serverless, embedded) for pricing management
- **Package Management**: UV as primary, Poetry as user preference
- **Application Entry Point**: `run_web.py` runs on port 5001 by default

### Directory Organization
```
api/
├── routers/          # FastAPI route handlers
│   ├── home.py       # Dashboard/home routes + API endpoints
│   ├── pricing.py    # Pricing management routes and API
│   └── products.py   # Products showcase routes
└── urls.py           # Central URL routing configuration

db/
└── pricing_repository.py    # DuckDB data access layer with complete CRUD

frontend/
├── base.html         # Jinja2 base template with responsive layout
├── home/            # Dashboard page assets
├── pricing/         # Pricing management interface
└── products/        # Products showcase page
```

### Key Architectural Patterns

#### Backend Architecture
- **Repository Pattern**: `PricingRepository` class handles all database operations
- **Router Organization**: Each major feature has its own router module
- **Pydantic Models**: Data validation and serialization for API endpoints
- **Global Repository Instance**: Lazy initialization pattern for database connection

#### Frontend Component Architecture
- **Page-Specific Structure**: Each page has its own directory with HTML template and JS modules
- **Component Files**: JavaScript functionality broken into focused, single-responsibility files:
  - Main file (e.g., `pricing.js`) - page-specific logic
  - Modal components (e.g., `modalManager.js`) - separate files for different modals
  - Data components (e.g., `dataService.js`) - API interactions and data handling
  - UI components (e.g., `uiManager.js`) - reusable interface functionality
- **Script Loading**: Components loaded directly via `<script src="...">` tags in HTML templates
- **Vanilla JavaScript Only**: No frameworks or libraries, native JavaScript for all interactions

#### Database Architecture
- **DuckDB Integration**: Embedded serverless database with file-based storage
- **Schema Design**: Normalized structure with providers, items, offers, and relationship tables
- **Auto-incrementing IDs**: Uses DuckDB sequences for primary key generation
- **Connection Management**: Single connection instance with lazy initialization

### Technology Stack Details
- **Python 3.13+** with FastAPI framework
- **DuckDB** for embedded database with WAL mode
- **Jinja2** templating for server-side rendering
- **Tailwind CSS** with shadcn-inspired design system
- **Vanilla JavaScript** for all client-side interactions
- **UV** package manager for dependency management

### UAT Compliance Framework
The project follows UAT (User Acceptance Testing) philosophy:
- **Minimal Code**: Write simple, self-documenting functions without excessive error handling
- **Positive Intent**: Assume valid input and focus on core functionality
- **Clear Functions**: Single-responsibility functions with descriptive docstrings
- **No Over-Engineering**: Avoid defensive programming patterns unless explicitly needed

### Important Development Notes
- Application runs on port 5001 by default (not 5000 as mentioned in some docs)
- Frontend uses CSS custom properties for theme system compatible with light/dark modes  
- Database file (`database.ddb`) is created automatically in project root
- Static files served from `/static` endpoint pointing to `frontend/` directory
- API documentation available at `http://localhost:5001/docs` when running

### Component Development Guidelines
- Keep JavaScript files under 200 lines when possible
- Use descriptive names indicating component purpose
- Implement robust error handling with user-friendly messages
- Follow modular design with clear separation of concerns
- Break functionality into small, reusable components organized by feature

## Code Philosophy

Vero follows **UAT philosophy** - assume positive intent, write minimal self-documenting code without excessive error handling or defensive programming.

### UAT Philosophy Examples

**❌ Bad (Over-defensive):**
```python
def calculate_rsi(data, period=14):
    if data is None:
        raise ValueError("Data cannot be None")
    if not isinstance(data, pd.DataFrame):
        raise TypeError("Data must be a pandas DataFrame")
    if 'close' not in data.columns:
        raise KeyError("DataFrame must contain 'close' column")
    if len(data) < period:
        raise ValueError(f"Insufficient data: need at least {period} rows")
    if period <= 0:
        raise ValueError("Period must be positive")

    try:
        # Complex RSI calculation with extensive error checking
        delta = data['close'].diff()
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        avg_gain = gain.rolling(window=period).mean()
        avg_loss = loss.rolling(window=period).mean()
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    except Exception as e:
        logging.error(f"RSI calculation failed: {e}")
        return pd.Series(dtype=float)
```

**✅ Good (UAT approach):**
```python
def calculate_rsi(data, period=14):
    """Calculate RSI indicator assuming valid OHLCV data."""
    delta = data['close'].diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))
```
