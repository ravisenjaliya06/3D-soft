from rest_framework import serializers
from .models import Company, Material

class CompanySerializer(serializers.ModelSerializer):

    class Meta:
        model = Company
        fields = '__all__'
