# Python imports
import json
import logging
import os

# Setup logging
logging.basicConfig(level=logging.INFO)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "test_output")
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "test_result")


def load_data():
    with open(DATA_FILE, "r") as f:
        data = json.load(f)
    # Extract flattened files dict for nest.py input
    files = {}
    catalogs = data.get("catalogs", [])
    for catalog in catalogs:
        if isinstance(catalog, list):
            for item in catalog:
                if isinstance(item, dict) and item.get("type") == "plank":
                    # Use ID as key
                    files[item["id"]] = item
    return files
