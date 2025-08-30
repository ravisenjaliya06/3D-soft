# Python imports
from typing import Dict

# External imports
from rest_framework import serializers

# Local imports
from .models import (
    Company,
    FinishesLibrary,
    Material,
    MaterialFinish,
    MaterialFinishType,
    MaterialTexture,
    MountHoles,
    MountPlateHoles,
    Properties,
)


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


class MountHolesSerializer(serializers.ModelSerializer):
    class Meta:
        model = MountHoles
        fields = "__all__"


class MountPlateHolesSerializer(serializers.ModelSerializer):
    class Meta:
        model = MountPlateHoles
        fields = "__all__"


class FinishesLibrarySerializer(serializers.ModelSerializer):
    class Meta:
        model = FinishesLibrary
        fields = "__all__"


class MaterialPropertiesSerializer(serializers.ModelSerializer):
    front_mount_holes = MountHolesSerializer(many=True, read_only=False)
    back_mount_holes = MountHolesSerializer(many=True, read_only=False)
    bottom_mount_holes = MountHolesSerializer(many=True, read_only=False)

    mount_plate_hole_one = MountPlateHolesSerializer(many=True, read_only=False)
    mount_plate_hole_two = MountPlateHolesSerializer(many=True, read_only=False)
    mount_plate_hole_third = MountPlateHolesSerializer(many=True, read_only=False)
    mount_plate_hole_forth = MountPlateHolesSerializer(many=True, read_only=False)
    mount_plate_hole_fifth = MountPlateHolesSerializer(many=True, read_only=False)

    class Meta:
        model = Properties
        fields = "__all__"
        read_only_fields = ["material"]


class MaterialFinishSerializer(serializers.ModelSerializer):
    finish = FinishesLibrarySerializer(read_only=True)

    class Meta:
        model = MaterialFinish
        fields = "__all__"
        read_only_fields = ["material"]


class MaterialFinishTypeSerializer(serializers.ModelSerializer):
    finish_type = FinishesLibrarySerializer(read_only=True)

    class Meta:
        model = MaterialFinishType
        fields = "__all__"
        read_only_fields = ["material"]


class MaterialTextureSerializer(serializers.ModelSerializer):
    texture = FinishesLibrarySerializer(read_only=True)

    class Meta:
        model = MaterialTexture
        fields = "__all__"
        read_only_fields = ["material"]


class MaterialSerializer(serializers.ModelSerializer):
    properties = MaterialPropertiesSerializer(many=True, read_only=False)
    finishes = MaterialFinishSerializer(
        source="materialfinish_set", many=True, read_only=False
    )
    finish_types = MaterialFinishTypeSerializer(
        source="materialfinishtype_set", many=True, read_only=False
    )
    textures = MaterialTextureSerializer(
        source="materialtexture_set", many=True, read_only=False
    )

    class Meta:
        model = Material
        fields = [
            "id",
            "name",
            "type",
            "company",
            "description",
            "is_deleted",
            "properties",
            "finishes",
            "finish_types",
            "textures",
        ]
        read_only_fields = ["company"]

    def validate(self: "MaterialSerializer", attrs: Dict[str, str]) -> Dict[str, str]:
        name = attrs.get("name")
        view = self.context.get("view")
        company_id = view.kwargs.get("pk") if view else None

        existing_company = Material.objects.filter(name=name, company_id=company_id)
        if self.instance:
            existing_company = existing_company.exclude(pk=self.instance.pk)

        if name and existing_company.exists():
            raise serializers.ValidationError({"name": "Name must be unique."})
        return attrs

    def create(self: "MaterialSerializer", validated_data: Dict[str, str]) -> Material:
        properties_data = validated_data.pop("properties", [])
        finishes_data = validated_data.pop("materialfinish_set", [])
        finish_types_data = validated_data.pop("materialfinishtype_set", [])
        textures_data = validated_data.pop("materialtexture_set", [])

        material = Material.objects.create(**validated_data)

        for prop in properties_data:
            Properties.objects.create(material=material, **prop)

        for finish in finishes_data:
            MaterialFinish.objects.create(material=material, **finish)

        for finish_type in finish_types_data:
            MaterialFinishType.objects.create(material=material, **finish_type)

        for texture in textures_data:
            MaterialTexture.objects.create(material=material, **texture)

        return material
