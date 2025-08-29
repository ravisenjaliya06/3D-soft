from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from .models import Company
from .serializers import CompanySerializer

class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    
    def get_queryset(self):
        organization = self.request.user.selected_organization
        queryset = Company.objects.all()
        if organization:
            queryset = queryset.filter(organization=organization)
        return queryset
    
    def create(self, request, *args, **kwargs):
        valid_data = Company.objects.filter(material_type=request.data.get("material_type"), name=request.data.get("name")).exists()

        if valid_data:
            return Response({"message": "Company name must be unique."}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(organization=self.request.user.selected_organization)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        data = {"name": request.data.get("name")}
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data, status=status.HTTP_200_OK)
