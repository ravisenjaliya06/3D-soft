# Python imports
import uuid

# Django imports
from django.utils.timezone import now


def generate_work_order_code() -> str:

    date_str = now().strftime("%Y%m%d")
    random_part = uuid.uuid4().hex[:6].upper()
    return f"WO-{date_str}-{random_part}"
