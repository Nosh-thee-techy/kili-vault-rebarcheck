"""
Earth Engine Client Initialization & Authentication Module
Authenticates with Google Earth Engine using Service Account credentials,
user credentials, or project default application credentials.
"""

import logging
from typing import Optional
from gee.auth import initialize_earth_engine as _initialize_earth_engine
from gee.auth import is_gee_available as _is_gee_available

logger = logging.getLogger("kili-vault.gee.client")


def initialize_earth_engine(
    project_id: Optional[str] = None,
    service_account: Optional[str] = None,
    key_path: Optional[str] = None,
) -> bool:
    """
    Initializes Earth Engine client. Returns True on success.
    Fails clearly with descriptive logging if credentials are not supplied or invalid.
    """
    return _initialize_earth_engine(project_id=project_id)


def is_gee_available() -> bool:
    """Checks if Earth Engine is actively initialized."""
    return _is_gee_available()
