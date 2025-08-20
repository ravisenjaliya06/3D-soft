# Python imports
import os
import shutil

# External imports
from celery import shared_task

# Local imports
from .logger import DesignLogger as Logger


@shared_task
def delete_output_folder(folder_path: str) -> None:
    """
    Delete the specified output folder and all its contents.
    """
    if os.path.exists(folder_path) and os.path.isdir(folder_path):
        shutil.rmtree(folder_path)
        Logger.info(f"Deleted output folder: {folder_path}")
    else:
        Logger.warning(f"Output folder does not exist: {folder_path}")
