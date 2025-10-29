# Python imports

# Django imports
from django.db.models.query import QuerySet

# External imports
from rest_framework import generics, serializers, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# App imports
from umaboy.constant import DELETE, GET, POST, PUT

# Local imports
from .models import Catalog, CatalogRuleParts, Company, FinishesLibrary, Material
from .serializers import (
    CatalogReadHierarchySerializer,
    CatalogRulePartSerializer,
    CatalogRulePartUpdateSerializer,
    CatalogSerializer,
    CompanySerializer,
    FinishesLibrarySerializer,
    MaterialSerializer,
)


class CompanyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CompanySerializer
    http_method_names = [GET, POST, PUT, DELETE]
    lookup_field = "id"
    lookup_url_kwarg = "uuid"

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


class CatalogViewSet(viewsets.ModelViewSet):
    serializer_class = CatalogSerializer
    lookup_field = "id"

    def get_serializer_class(
        self: "CatalogViewSet",
    ) -> type[serializers.ModelSerializer]:
        if self.action in ["list"]:
            return CatalogReadHierarchySerializer
        return CatalogSerializer

    def get_queryset(self: "CatalogViewSet") -> QuerySet[Catalog]:
        qs = Catalog.objects.filter(
            organization=self.request.user.selected_organization
        )

        if self.action == "list":
            catalog_type = self.request.query_params.get("type")
            design_id = self.request.query_params.get("design_id")
            qs = qs.filter(parent__isnull=True)

            if catalog_type:
                qs = qs.filter(type=catalog_type, design__isnull=True)
            if design_id:
                qs = qs.filter(design_id=design_id)
            else:
                qs = qs.filter(design__isnull=True)

        return qs

    def destroy(self: "CatalogViewSet", *args, **kwargs) -> Response:
        design_id = kwargs.get("id")
        # get data from pylode in json formet
        catalog_ids = self.request.data.get("catalog_ids", {})
        qs = None
        if catalog_ids:
            for id in catalog_ids:
                qs = Catalog.objects.filter(
                    organization=self.request.user.selected_organization, id=id
                )
        else:
            # Filter by user's organization and design_id
            qs = Catalog.objects.filter(
                organization=self.request.user.selected_organization, design=design_id
            )

        if not qs.exists():
            return Response(
                {"detail": "Any Catalog Not found With Given Design"},
                status=status.HTTP_404_NOT_FOUND,
            )
        qs.delete()
        return Response(
            {"detail": "Matching Catalog With Given Design Deleted Successfully"},
            status=status.HTTP_204_NO_CONTENT,
        )

    def perform_create(self: "CatalogViewSet", serializer: CatalogSerializer) -> None:
        serializer.save(organization=self.request.user.selected_organization)


class CatalogRulePartsListView(generics.ListAPIView):
    serializer_class = CatalogRulePartSerializer

    def get_queryset(self: "CatalogRulePartsListView") -> QuerySet[CatalogRuleParts]:
        rule_id = self.kwargs["rule_id"]
        return CatalogRuleParts.objects.filter(catalog_rule_id=rule_id)


class CatalogRulePartsViewSet(viewsets.ModelViewSet):
    queryset = CatalogRuleParts.objects.all()
    serializer_class = CatalogRulePartUpdateSerializer
    lookup_field = "id"
