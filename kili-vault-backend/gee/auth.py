"""
Kili-Vault Earth Engine: Authentication Module
Authenticates with Google Earth Engine using service account keys, Application Default Credentials (ADC),
or personal developer tokens without ever hardcoding secrets.
"""

import os
import sys
from typing import Optional

_ee_initialized = False


def initialize_earth_engine(project_id: Optional[str] = None) -> bool:
    """
    Initializes Earth Engine client securely.
    Tries:
    1. Service account private key file if GEE_SERVICE_ACCOUNT_KEY_PATH is provided.
    2. Application Default Credentials / Project ID.
    3. Standard ee.Initialize().
    """
    global _ee_initialized
    if _ee_initialized:
        return True

    try:
        import ee
    except ImportError:
        print(
            "[ERROR] 'earthengine-api' Python package is not installed.", file=sys.stderr)
        print("Install via: pip install earthengine-api", file=sys.stderr)
        return False

    project = project_id or os.getenv("GEE_PROJECT_ID", None)
    key_path = os.getenv("GEE_SERVICE_ACCOUNT_KEY_PATH", None)
    service_email = os.getenv("GEE_SERVICE_ACCOUNT_EMAIL", None)

    try:
        if key_path and os.path.exists(key_path) and service_email:
            credentials = ee.ServiceAccountCredentials(service_email, key_path)
            ee.Initialize(credentials=credentials, project=project)
            print(
                f"[AUTH] Earth Engine initialized successfully with Service Account: {service_email}")
        elif project:
            ee.Initialize(project=project)
            print(
                f"[AUTH] Earth Engine initialized successfully with Cloud Project: {project}")
        else:
            ee.Initialize()
            print(
                "[AUTH] Earth Engine initialized successfully with default credentials.")
        _ee_initialized = True
        return True
    except Exception as e:
        print(
            f"[AUTH ERROR] Failed to authenticate with Google Earth Engine: {str(e)}", file=sys.stderr)
        print("Ensure you have run 'earthengine authenticate' or set GEE_SERVICE_ACCOUNT_KEY_PATH and GEE_PROJECT_ID.", file=sys.stderr)
        return False


def is_gee_available() -> bool:
    """Returns whether this process has already initialized Earth Engine."""
    return _ee_initialized
