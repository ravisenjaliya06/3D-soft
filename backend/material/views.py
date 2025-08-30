# Django imports
from django.db.models.query import QuerySet

# External imports
from rest_framework import viewsets
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated

# App imports
from umaboy.constant import DELETE, GET, POST, PUT

# Local imports
from .models import Company, Material
from .serializers import CompanySerializer, MaterialSerializer


class CompanyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CompanySerializer
    http_method_names = [GET, POST, PUT, DELETE]

    def get_queryset(self: "CompanyViewSet") -> QuerySet[Company]:
        return Company.objects.filter(
            organization=self.request.user.selected_organization
        )


class MaterialViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MaterialSerializer

    def get_queryset(self: "MaterialViewSet") -> QuerySet[Material]:
        company_id = self.kwargs.get("pk")
        material_type = self.request.query_params.get("type")

        if company_id:
            if not Company.objects.filter(
                id=company_id, organization=self.request.user.selected_organization
            ).exists():
                raise NotFound(detail="Company not found.")
            return Material.objects.filter(company_id=company_id, is_deleted=False)

        queryset = Material.objects.filter(
            company__isnull=True,
            organization=self.request.user.selected_organization,
            is_deleted=False,
        )
        if material_type:
            queryset = queryset.filter(
                type=material_type,
                company__isnull=True,
                organization=self.request.user.selected_organization,
                is_deleted=False,
            )

        return queryset

    def perform_create(self: "MaterialViewSet", serializer: MaterialSerializer) -> None:
        company_id = self.kwargs.get("pk")
        serializer.save(company_id=company_id)
