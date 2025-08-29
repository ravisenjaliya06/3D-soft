# External imports
from rest_framework import serializers

# Local imports
from .models import Company


class CompanySerializer(serializers.ModelSerializer):

    class Meta:
        model = Company
        fields = "__all__"
