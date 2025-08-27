# Local imports
from .common import *  # noqa
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"   # 👈 Add this line

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
