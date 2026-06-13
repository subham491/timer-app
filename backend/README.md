# Timer App – Backend
 
FastAPI backend for the Timer App. Uses SQLite for storage, managed entirely by [uv](https://docs.astral.sh/uv/).


## First-time setup
```bash
# 1. Clone the repo and enter the Backend directory
cd Backend
 
# 2. Copy the environment template and fill in your SECRET_KEY
cp .env.example .env
 
# 3. Install all dependencies into an isolated .venv
uv sync

```
## Running the dev server
 
```bash
uv run uvicorn app.main:app --reload
```

# Database Setup

This project uses **PostgreSQL (version 13 or higher required)** as the database and SQLAlchemy as the ORM.

---

## PostgreSQL Requirement

- PostgreSQL **>= 13 is mandatory**
- Python **3.10+**
- SQLAlchemy **2.x**

---

## Install PostgreSQL

### Ubuntu / Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib


macOS (Homebrew)
brew install postgresql


Windows

Download from:
https://www.postgresql.org/download/

---
To Install the Postgres into the Soliton Laptop,
Administrator access needs to be obtained which can can done by aligning with IT team.

Once done, install the postgress following the installer,
- where provide password for superuser.
- provide the port the server should listen to.



Verify Installation:
psql --version

Expected:
psql (PostgreSQL) 13 or higher

Login to PostgreSQL: psql -U postgres

In .env File:
- set the DATABASE_URL = "postgresql://postgres:mypassword@localhost:5432/timer_app_db"
where by default when postgres is installed the postgres becomes the user and the password is the
is what the user has set during installation.
Note: if your password contains @ make sure to represent it as %40 and similar symbols should be percent-encoded for the URL to work properly.

When the code is run for the first time the database is automatically created.

Optional:
Install Table Plus for Viewing the tables created in the database.