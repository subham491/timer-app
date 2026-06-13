# API Test Suite

Pytest unit tests covering all documented test cases for the **auth**, **tasks**, and **timer** endpoints.

## Setup (uv)

```bash
# Install uv if needed
pip install uv

# Create a virtual environment and install dependencies
uv sync

# Run all tests
uv run pytest

# Run a single module
uv run pytest tests/test_auth.py -v

# Run a single test by node-id
uv run pytest tests/test_auth.py::test_tc01_register_success -v
```

## Log file

Every test writes a structured result line to **`tests/test_results.log`**:

## Prerequisites

The FastAPI app must be importable as `from app.main import app`.  
A test/in-memory database should be active so no production data is touched.  
Set `DATABASE_URL` (or equivalent env var) in your environment before running tests.
