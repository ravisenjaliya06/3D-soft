# Django imports
from django.contrib import admin

# App imports
from mes_portal.models import WorkOrder


class WorkOrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "design",
        "name",
        "client_name",
        "delivery_date",
        "created_at",
    )


admin.site.register(WorkOrder, WorkOrderAdmin)
