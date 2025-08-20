# Python imports
import os

# External imports
from celery import Celery

# Local imports
from .logger import UmaboyLogger as Logger

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "umaboy.settings.development")

app = Celery("umaboy")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self: Celery) -> None:
    Logger.debug(f"Request: {self.request!r}")
