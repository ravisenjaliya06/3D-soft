# Django imports
import django.contrib.admin as admin

# Local imports
from .models import (
    Company,
    FinishesLibrary,
    Material,
    MaterialFinish,
    MaterialFinishType,
    MaterialTexture,
    Properties,
)

admin.site.register(Material)
admin.site.register(Properties)
admin.site.register(Company)
admin.site.register(MaterialFinish)
admin.site.register(MaterialFinishType)
admin.site.register(MaterialTexture)
admin.site.register(FinishesLibrary)
