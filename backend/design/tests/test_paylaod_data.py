# Python imports
import uuid

create_design_data = {
    "data": {
        "catalog": {"name": "Parent Catalog", "data": {"type": "parent"}},
        "items": [
            {"name": "Parent Item", "data": {"dimension": "parent"}, "material": ""}
        ],
        "child_catalogs": [
            {
                "catalog": {
                    "name": "Child Catalog 1",
                    "data": {"type": "child"},
                },
                "items": [
                    {
                        "name": "Child Item 1",
                        "data": {"dimension": "child"},
                        "material": "",
                    }
                ],
            }
        ],
    }
}

design_serialized_data = [
    {
        "id": str(uuid.uuid4()),
        "name": "LEFT_PLANK",
        "data": {"name": "LEFT_PLANK", "width": 50, "height": 100, "depth": 20},
    },
    {
        "id": str(uuid.uuid4()),
        "name": "TOP_PLANK",
        "data": {"name": "TOP_PLANK", "width": 100, "height": 50, "depth": 20},
    },
    {
        "id": str(uuid.uuid4()),
        "name": "BACK_PLANK",
        "data": {"name": "BACK_PLANK", "width": 100, "height": 100, "depth": 50},
    },
    {
        "id": str(uuid.uuid4()),
        "name": "DOOR",
        "data": {"name": "DOOR", "width": 50, "height": 100, "depth": 20},
    },
]
