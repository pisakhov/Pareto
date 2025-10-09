# Pareto
Efficient point for productivity and optimization

## Overview

Pareto is a modern web application built with FastAPI and designed following the 80/20 principle to help users maximize their productivity and efficiency. The application features a clean, responsive interface inspired by shadcn/ui design patterns and built with Tailwind CSS.

## Features

- **Dashboard**: Real-time statistics and performance metrics
- **Responsive Design**: Mobile-first design with collapsible sidebar navigation
- **Modern UI**: Clean interface with Tailwind CSS and shadcn-inspired components
- **RESTful API**: FastAPI backend with automatic OpenAPI documentation
- **Interactive Components**: Vanilla JavaScript for dynamic user interactions
- **Performance Monitoring**: Built-in analytics and efficiency tracking

## Quick Start

### Prerequisites

- Python 3.13+
- uv package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Pareto
```

2. Install dependencies:
```bash
uv sync
```

3. Run the application:
```bash
uv run python run_web.py
```

4. Open your browser and navigate to `http://localhost:5000`

### Development

```bash
# Activate virtual environment
source .venv/bin/activate

# Add new dependencies
uv add <package_name>

# Run with auto-reload
uv run python run_web.py
```

## Project Structure

```
Pareto/
├── api/
│   ├── routers/
│   │   └── home.py          # Home page routes
│   └── urls.py              # URL configuration
├── frontend/
│   ├── base.html            # Base template with layout
│   └── home/
│       ├── index.html       # Home page template
│       └── js/
│           └── home.js      # Home page JavaScript
├── run_web.py               # Application entry point
├── pyproject.toml          # Project configuration
├── .CLAUDE.md              # Claude development guidelines
└── README.md               # This file
```

## API Documentation

Once the application is running, you can access:
- **API Documentation**: `http://localhost:5000/docs`
- **OpenAPI Schema**: `http://localhost:5000/openapi.json`

### Key Endpoints

- `GET /` - Home page with dashboard
- `GET /api/stats` - Dashboard statistics
- `GET /api/projects` - Projects data
- `GET /api/analytics` - Analytics data
- `GET /health` - Health check

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


## Technology Stack

- **Backend**: FastAPI with Python 3.13+
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Styling**: Tailwind CSS with shadcn-inspired design
- **Package Manager**: uv
- **Server**: Uvicorn
- **Templates**: Jinja2

## Contributing

Please follow the guidelines in `.CLAUDE.md` for development practices and UAT compliance requirements.

## License

This project is licensed under the MIT License.
