```
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is a new project directory (`my-website`) in a workspace that includes:
- `fast-api/`: A Python API project using FastAPI and uv for dependency management
- `zhihu-crawler/`: A Python web crawler project using uv for dependency management

## Initial Setup

### Dependency Management

This project should use `uv` for Python dependency management (following the pattern of sibling projects):

```bash
# Create virtual environment (if not exists)
uv venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
uv pip install <package-name>

# Add dependencies to pyproject.toml
uv add <package-name>

# Run Python scripts
uv run python <script.py>
```

### Project Structure

Since this is a new project, the structure will evolve based on the website type. Common structures for Python-based websites:

```
my-website/
├── src/                # Source code
├── tests/              # Tests
├── static/             # Static files (CSS, JS, images)
├── templates/          # HTML templates
├── pyproject.toml      # Project configuration
├── uv.lock             # Dependency lock file
└── README.md           # Project documentation
```

## Development Workflow

### Commonly Used Commands

```bash
# Create virtual environment
uv venv

# Install all dependencies
uv pip install -r requirements.txt  # or uv sync

# Run the application
uv run python src/main.py

# Run tests
uv run pytest tests/

# Run a single test file
uv run pytest tests/test_sample.py

# Run tests with coverage
uv run pytest tests/ -v --cov=src

# Lint code (if using ruff)
uv run ruff check src/

# Format code (if using ruff)
uv run ruff format src/
```

## Key Technologies

Based on sibling projects, this project will likely use:
- Python 3.x
- `uv` for dependency management
- Possibly FastAPI or another web framework
- pytest for testing
- ruff for linting/formatting

## Future Development

As the project evolves, update this file with:
1. Specific build commands
2. Architecture details
3. Test strategies
4. Deployment instructions
```