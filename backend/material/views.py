# Python imports
from typing import Optional

# Django imports
from django.db.models.query import QuerySet

# External imports
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK, HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND

# App imports
from design.models import DesignCatalog
from umaboy.constant import DELETE, GET, POST, PUT

# Local imports
from .models import Company, FinishesLibrary, Material
from .serializers import (
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
            organization=self.request.user.selected_organization,
            is_deleted=False,
            is_catalog=False,
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


class CatalogPartMaterialViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def update(
        self: "CatalogPartMaterialViewSet",
        request: Request,
        part_id: Optional[str] = None,
    ) -> Response:
        """
        Replace or clear the material assigned to a catalog part.

        Request body:
          - material_id: UUID or null

        Behavior:
          - If material_id is a UUID, replace existing assignment(s) with this material.
          - If material_id is null, clear all assigned materials for the part.
        """
        if part_id is None:
            return Response(
                {"detail": "Part ID is required."}, status=HTTP_400_BAD_REQUEST
            )

        try:
            catalog_part = DesignCatalog.objects.get(
                id=part_id, organization=request.user.selected_organization
            )
        except DesignCatalog.DoesNotExist:
            return Response(
                {"detail": "Catalog part not found."}, status=HTTP_404_NOT_FOUND
            )

        material_id = request.data.get("material_id", None)

        if material_id is None:
            # Clear assignments
            catalog_part.materials.clear()
            return Response(
                {"detail": "Material unassigned successfully."}, status=HTTP_200_OK
            )

        # Assign/replace with the provided material
        try:
            material = Material.objects.get(
                id=material_id,
                organization=request.user.selected_organization,
                is_deleted=False,
            )
        except Material.DoesNotExist:
            return Response(
                {"detail": "Material not found."}, status=HTTP_404_NOT_FOUND
            )

        # Replace any existing with only this material for now (quick, deterministic behavior)
        # Preserve other material types; replace only this material's type
        existing_materials = list(
            catalog_part.materials.filter(
                organization=request.user.selected_organization, is_deleted=False
            )
        )
        preserved_materials = [m for m in existing_materials if m.type != material.type]
        catalog_part.materials.set([*preserved_materials, material])
        return Response(
            {"detail": "Material assigned successfully."}, status=HTTP_200_OK
        )
