# Django imports
import django.contrib.admin as admin

# Local imports
from .models import Company, Material, Properties

admin.site.register(Material)
admin.site.register(Properties)
admin.site.register(Company)
