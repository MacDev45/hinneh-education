#!/usr/bin/env python
"""
Standalone database migration script for HINNEH ÉDUCATION Backend.
Creates or updates database schema based on SQLAlchemy models.
"""
import os
import sys
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("hinneh.migration")

# Add the api directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app.main import init_db

if __name__ == "__main__":
    logger.info("Starting HINNEH ÉDUCATION Backend Migration...")

    try:
        # Run the migration
        init_db()
        logger.info("✓ Migration completed successfully!")
        sys.exit(0)
    except Exception as e:
        logger.error(f"✗ Migration failed: {str(e)}", exc_info=True)
        sys.exit(1)
