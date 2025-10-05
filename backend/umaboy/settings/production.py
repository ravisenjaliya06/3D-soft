# Python imports
from pathlib import Path

# Local imports
from .common import *  # noqa

BASE_DIR = Path(__file__).resolve().parent.parent
DEBUG=False

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
