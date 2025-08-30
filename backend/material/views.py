# Django imports
from django.db.models.query import QuerySet

# External imports
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

# App imports
from umaboy.constant import DELETE, GET, POST, PUT

# Local imports
from .models import Company
from .serializers import CompanySerializer


class CompanyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CompanySerializer
    http_method_names = [GET, POST, PUT, DELETE]

    def get_queryset(self: "CompanyViewSet") -> QuerySet[Company]:
        return Company.objects.filter(
            organization=self.request.user.selected_organization
        )
