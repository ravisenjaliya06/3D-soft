import os
import json
import logging
from .nest import nest

# Setup logging
logging.basicConfig(level=logging.INFO)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "test_output")
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "test_result")

def load_data():
    with open(DATA_FILE, 'r') as f:
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

def main():
    files = load_data()
    print(f"Loaded {len(files)} planks.")
    
    # Run nest
    # Dimensions: standard sheet size 2440x1220
    response = nest(
        output=OUTPUT_FILE,
        files=files,
        wbin=2440,
        hbin=1220
    )
    
    print("Response Status:", response.status_code)
    # response.content is bytes
    print("Response Content:", response.content.decode())

if __name__ == "__main__":
    main()
