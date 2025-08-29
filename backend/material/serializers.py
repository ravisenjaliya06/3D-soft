# External imports
from rest_framework import serializers

# Local imports
from .models import Company


# class CompanySerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Company
#         fields = ["id", "name", "material_type", "organization"]
#         read_only_fields = ["organization"] 

#     def validate(self, attrs):
#         request = self.context.get("request")
#         organization = getattr(request.user, "selected_organization", None)

#         if Company.objects.filter(
#             name=attrs.get("name"),
#             material_type=attrs.get("material_type"),
#             organization=organization
#         ).exists():
#             raise serializers.ValidationError(
#                 {"name": "Name must be unique."}
#             )
#         return attrs

#     def create(self, validated_data):
#         request = self.context.get("request")
#         validated_data["organization"] = request.user.selected_organization
#         return super().create(validated_data)


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name", "material_type", "organization"]
        read_only_fields = ["organization", "material_type"]

    def validate(self, attrs):
        request = self.context.get("request")
        organization = getattr(request.user, "selected_organization", None)

        name = attrs.get("name", None)
        material_type = getattr(self.instance, "material_type", attrs.get("material_type"))

        # Uniqueness validation for both create & update
        qs = Company.objects.filter(
            name=name,
            material_type=material_type,
            organization=organization
        )
        if self.instance:  # if updating
            qs = qs.exclude(pk=self.instance.pk)

        if name and qs.exists():
            raise serializers.ValidationError(
                {"name": "Name must be unique."}
            )
        return attrs

    def update(self, instance, validated_data):
        # Block changing material_type even if passed
        validated_data.pop("material_type", None)
        return super().update(instance, validated_data)

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["organization"] = request.user.selected_organization
        return super().create(validated_data)

