# Python imports

# Django imports
from django.db.models.query import QuerySet

# External imports
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

# App imports
from umaboy.constant import DELETE, GET, POST, PUT

# Local imports
from .models import Company, FinishesLibrary, Material
from .serializers import (
    CatalogRulePartUpdateSerializer,
    CompanySerializer,
    FinishesLibrarySerializer,
    MaterialSerializer,
)


class CompanyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CompanySerializer
    http_method_names = [GET, POST, PUT, DELETE]

    def get_queryset(self: "CompanyViewSet") -> QuerySet[Company]:
        return Company.objects.filter(
            organization=self.request.user.selected_organization
        )


class FinishesLibraryListAPIView(viewsets.ModelViewSet):
    serializer_class = FinishesLibrarySerializer

    def get_queryset(self: "FinishesLibraryListAPIView") -> QuerySet[FinishesLibrary]:
        type = self.request.query_params.get("type")
        qs = FinishesLibrary.objects.filter(
            organization=self.request.user.selected_organization, is_deleted=False
        )

        if type:
            qs = qs.filter(type=type)
        return qs


class MaterialViewSet(viewsets.ModelViewSet):
    serializer_class = MaterialSerializer
    lookup_field = "id"

    def get_queryset(self: "MaterialViewSet") -> QuerySet[Material]:
        company_id = self.kwargs.get("company_id")
        material_type = self.request.query_params.get("type")
        qs = Material.objects.filter(
            organization=self.request.user.selected_organization, is_deleted=False
        )

        if material_type:
            qs = qs.filter(type=material_type, company__isnull=True)

        if company_id:
            qs = qs.filter(company_id=company_id)

        return qs

    def perform_create(self: "MaterialViewSet", serializer: MaterialSerializer) -> None:
        company_id = self.kwargs.get("company_id")
        organization = self.request.user.selected_organization
        if company_id:
            serializer.save(company_id=company_id, organization=organization)
        else:
            serializer.save(organization=organization)


# External imports
from rest_framework import generics

# Local imports
from .models import Catalog, CatalogRuleParts
from .serializers import CatalogRulePartSerializer, CatalogSerializer


class CatalogViewSet(viewsets.ModelViewSet):
    serializer_class = CatalogSerializer

    def get_queryset(self: "CatalogViewSet") -> QuerySet[Catalog]:
        catalog_type = self.request.query_params.get("type")
        qs = Catalog.objects.filter(
            organization=self.request.user.selected_organization
        )
        if catalog_type:
            qs = qs.filter(type=catalog_type)
        return qs

    def perform_create(self: "CatalogViewSet", serializer: CatalogSerializer) -> None:
        serializer.save(organization=self.request.user.selected_organization)

    def update(
        self: "CatalogViewSet", instance: Catalog, validated_data: dict
    ) -> Catalog:
        material_id = validated_data.get("material_id")
        if material_id:
            material = Material.objects.get(
                id=material_id, organization=self.request.user.selected_organization
            )
            instance.material = material
            instance.save()
        return instance


class CatalogRulePartsListView(generics.ListAPIView):
    serializer_class = CatalogRulePartSerializer

    def get_queryset(self: "CatalogRulePartsListView") -> QuerySet[CatalogRuleParts]:
        rule_id = self.kwargs["rule_id"]
        return CatalogRuleParts.objects.filter(catalog_rule_id=rule_id)


class CatalogRulePartsViewSet(viewsets.ModelViewSet):
    queryset = CatalogRuleParts.objects.all()
    serializer_class = CatalogRulePartUpdateSerializer
    lookup_field = "id"
