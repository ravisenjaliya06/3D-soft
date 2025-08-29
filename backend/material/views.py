# Django imports
from django.db.models.query import QuerySet

# External imports
from rest_framework import viewsets
from rest_framework.exceptions import NotAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

# App imports
from umaboy.constant import DELETE, GET, POST, PUT

# Local imports
from .models import Company, Material
from .serializers import CompanySerializer, MaterialSerializer
from rest_framework.permissions import IsAuthenticated


class CompanyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CompanySerializer
    http_method_names = [GET, POST, PUT, DELETE]

    def get_queryset(self: "CompanyViewSet") -> QuerySet[Company]:
        user = self.request.user
        if not user or not user.is_authenticated:
            raise NotAuthenticated("Authentication token is missing or invalid.")
        return Company.objects.filter(organization=user.selected_organization)

    def perform_create(self: "CompanyViewSet", serializer: CompanySerializer) -> None:
        serializer.save(organization=self.request.user.selected_organization)

    def update(self: "CompanyViewSet", request: Request, *args, **kwargs) -> Response:
        """
        Allow only updating the `name` field.
        `material_type` is blocked by the serializer itself.
        """
        partial = kwargs.pop("partial", True)
        return super().update(request, *args, partial=partial, **kwargs)


class MaterialViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MaterialSerializer

    def get_queryset(self: "MaterialViewSet", *args, **kwargs) -> QuerySet[Material]:
        user = self.request.user
        company_id = self.kwargs.get("pk")
        print(company_id, "company_id")
        if not user or not user.is_authenticated:
            raise NotAuthenticated("Authentication token is missing or invalid.")
        return Material.objects.filter(company_id=company_id, is_deleted=False)
