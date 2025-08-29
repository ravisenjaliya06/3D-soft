# Python imports
from typing import Dict

# External imports
from rest_framework import serializers

# Local imports
from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name", "material_type", "organization"]
        read_only_fields = ["organization"]

    def validate(self: "CompanySerializer", attrs: Dict[str, str]) -> Dict[str, str]:
        request = self.context.get("request")
        organization = getattr(request.user, "selected_organization", None)

        name = attrs.get("name")
        material_type = getattr(
            self.instance, "material_type", attrs.get("material_type")
        )

        existing_company = Company.objects.filter(
            name=name, material_type=material_type, organization=organization
        )
        if self.instance:
            existing_company = existing_company.exclude(pk=self.instance.pk)

        if name and existing_company.exists():
            raise serializers.ValidationError({"name": "Name must be unique."})
        return attrs

    def create(self: "CompanySerializer", validated_data: Dict[str, str]) -> Company:
        request = self.context.get("request")
        validated_data["organization"] = request.user.selected_organization
        return super().create(validated_data)

    def update(
        self: "CompanySerializer", instance: Company, validated_data: Dict[str, str]
    ) -> Company:
        validated_data.pop("material_type", None)
        return super().update(instance, validated_data)
