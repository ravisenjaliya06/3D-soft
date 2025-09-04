# Django imports
from django.db.models.query import QuerySet

# External imports
from rest_framework import viewsets
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
    serializer_class = MaterialSerializer

    def get_queryset(self: "MaterialViewSet") -> QuerySet[Material]:
        material_type = self.request.query_params.get("type")
        qs = Material.objects.filter(is_deleted=False)

        if material_type:
            qs = qs.filter(type=material_type)

        return qs

    def perform_create(self: "MaterialViewSet", serializer: MaterialSerializer) -> None:
        company_id = self.kwargs.get("pk")
        serializer.save(company_id=company_id)
