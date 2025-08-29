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
        read_only_fields = ["organization", "material_type"]

    def validate(self: "CompanySerializer", attrs: Dict[str, str]) -> Dict[str, str]:
        request = self.context.get("request")
        organization = getattr(request.user, "selected_organization", None)

        name = attrs.get("name")
        material_type = getattr(
            self.instance, "material_type", attrs.get("material_type")
        )

        # Uniqueness validation for both create & update
        qs = Company.objects.filter(
            name=name, material_type=material_type, organization=organization
        )
        if self.instance:  # if updating
            qs = qs.exclude(pk=self.instance.pk)

        if name and qs.exists():
            raise serializers.ValidationError({"name": "Name must be unique."})
        return attrs

    def update(
        self: "CompanySerializer", instance: Company, validated_data: Dict[str, str]
    ) -> Company:
        # Block changing material_type even if passed
        validated_data.pop("material_type", None)
        return super().update(instance, validated_data)

    def create(self: "CompanySerializer", validated_data: Dict[str, str]) -> Company:
        request = self.context.get("request")
        validated_data["organization"] = request.user.selected_organization
        return super().create(validated_data)
