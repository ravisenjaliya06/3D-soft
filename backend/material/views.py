# Django imports
from django.db.models.query import QuerySet

# External imports
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

# App imports
from umaboy.constant import DELETE, GET, POST, PUT

# Local imports
from .models import Company
from .serializers import CompanySerializer


class CompanyViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = CompanySerializer
    http_method_names = [GET, POST, PUT, DELETE]

    def get_queryset(self: "CompanyViewSet") -> QuerySet[Company]:
        organization = self.request.user.selected_organization
        queryset = Company.objects.all()
        if organization:
            queryset = queryset.filter(organization=organization)
        return queryset

    def create(self: "CompanyViewSet", request: Request, *args, **kwargs) -> Response:
        valid_data = Company.objects.filter(
            material_type=request.data.get("material_type"),
            name=request.data.get("name"),
        ).exists()

        if valid_data:
            return Response(
                {"message": "Company name must be unique."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(organization=self.request.user.selected_organization)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self: "CompanyViewSet", request: Request, *args, **kwargs) -> Response:
        partial = kwargs.pop("partial", True)
        instance = self.get_object()
        data = {"name": request.data.get("name")}
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data, status=status.HTTP_200_OK)
