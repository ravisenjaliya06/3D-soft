# Python imports
import json
import os
import uuid
from typing import Any, Dict

# Django imports
from django.db.models import QuerySet

# External imports
import pandas as pd
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.status import (
    HTTP_200_OK,
    HTTP_201_CREATED,
    HTTP_400_BAD_REQUEST,
    HTTP_404_NOT_FOUND,
)

# Django Imports
from rest_framework.viewsets import ModelViewSet

# App imports
from design.models import Design, DesignSetting, Organization
from design.nest import nest
from design.serializers import DesignSerializer, DesignSettingSerializer
from umaboy.constant import DELETE, GET, POST, PUT
from user.permissions import Designer


class DesignViewset(ModelViewSet):
    permission_classes = [Designer]
    serializer_class = DesignSerializer
    filter_backends = [DjangoFilterBackend]
    http_method_names = [GET, POST, PUT, DELETE]
    lookup_field = "design_id"

    def get_queryset(self: "DesignViewset") -> QuerySet[Design]:
        queryset = Design.objects.filter(
            organization=self.request.user.selected_organization
        ).order_by("-updated_at")

        is_custom_param = self.request.query_params.get("is_custom", None)
        if is_custom_param is not None:
            is_custom_bool = is_custom_param.lower() == "true"
            queryset = queryset.filter(is_custom=is_custom_bool)

        return queryset

    def get_object(self: "DesignViewset") -> Design:
        obj = self.get_queryset().filter(id=self.kwargs[self.lookup_field]).first()
        if not obj:
            return Response({"error": "Design not found"}, status=HTTP_404_NOT_FOUND)
        return obj

    def get_serializer_context(self: "DesignViewset") -> Dict[str, Any]:
        """Pass request to serializer context"""
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def update(self: "DesignViewset", request: Request, *args, **kwargs) -> Response:
        """
        Override the update method to allow partial updates for PUT requests.
        """
        partial = True
        instance = self.get_object()
        if isinstance(instance, Response):
            return instance

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)

    def destroy(self: "DesignViewset", request: Request, *args, **kwargs) -> Response:
        design = self.get_object()
        if isinstance(design, Response):
            return design
        design.delete()
        return Response(status=HTTP_200_OK)


class OrganizationDesignSettingViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DesignSettingSerializer
    http_method_names = [GET, POST, PUT]
    queryset = DesignSetting.objects.all()

    def get(self: "OrganizationDesignSettingViewSet", request: Request) -> Response:
        organization = request.user.selected_organization
        if not organization:
            return Response(
                {"error": "Organization not found."}, status=HTTP_404_NOT_FOUND
            )

        design_setting = DesignSetting.objects.filter(organization=organization).first()
        if not design_setting:
            return Response(
                {"error": "Design setting not found."}, status=HTTP_404_NOT_FOUND
            )

        serializer = DesignSettingSerializer(design_setting)
        return Response(serializer.data, status=HTTP_200_OK)

    def create(self: "OrganizationDesignSettingViewSet", request: Request) -> Response:
        organization_user = request.user
        organization = Organization.objects.filter(user=organization_user).first()

        if not organization:
            return Response(
                {"error": "Organization not found."}, status=HTTP_404_NOT_FOUND
            )

        if DesignSetting.objects.filter(organization=organization).exists():
            return Response(
                {"error": "Design setting already exists."}, status=HTTP_400_BAD_REQUEST
            )

        request.data["organization"] = organization.id
        serializer = DesignSettingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(organization=organization)
            return Response(serializer.data, status=HTTP_201_CREATED)

        return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)

    def update(
        self: "OrganizationDesignSettingViewSet", request: Request, *args, **kwargs
    ) -> Response:

        organization_user = request.user
        organization = Organization.objects.filter(user=organization_user).first()

        if not organization:
            return Response(
                {"error": "Organization not found."}, status=HTTP_404_NOT_FOUND
            )

        design_setting = DesignSetting.objects.filter(organization=organization).first()
        if not design_setting:
            return Response(
                {"error": "Design setting not found."}, status=HTTP_404_NOT_FOUND
            )

        request.data["organization"] = organization.id
        serializer = DesignSettingSerializer(design_setting, data=request.data)

        if serializer.is_valid():
            serializer.save(organization=organization)
            return Response(serializer.data, status=HTTP_200_OK)

        return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)


class DesignSettingViewset(ModelViewSet):
    permission_classes = [Designer]
    serializer_class = DesignSettingSerializer
    filter_backends = [DjangoFilterBackend]
    http_method_names = [GET, PUT, DELETE]
    lookup_field = "design_id"

    def get_queryset(self: "DesignSettingViewset") -> QuerySet[DesignSetting]:
        return DesignSetting.objects.filter(
            organization=self.request.user.selected_organization
        )

    def get_object(self: "DesignSettingViewset") -> DesignSetting:
        obj = self.get_queryset().filter(design=self.kwargs[self.lookup_field]).first()
        if not obj:
            raise NotFound("Design Setting not found")
        return obj


class NestAPIViewset(ModelViewSet):
    permission_classes = [IsAuthenticated]

    def nesting(self: "NestAPIViewset", request: Request) -> Response:
        data = request.data
        nesting_data = {}
        for i in data:
            nesting_data[i["id"]] = i

        # Generate output files
        output_folder = os.path.join("umaboy", "media", "output", f"{uuid.uuid4()}")
        os.makedirs(output_folder, exist_ok=True)
        output_file = os.path.join(output_folder, "nesting.svg")

        main_sheet_width = 1240  # NESTING_SHEET_WIDTH
        main_sheet_height = 2480  # NESTING_SHEET_HEIGHT

        normalized = {}
        for rid, item in nesting_data.items():
            dims = item["dimensions"]

            normalized[rid] = {
                "type": "rectangle",  # or circle if needed
                "width": float(dims["width"]),
                "height": float(dims["height"]),
                "grooves": [],
                "minifix_holes": [],
            }

        nest(
            output_file,
            normalized,
            main_sheet_width,
            main_sheet_height,
            enclosing_rectangle=True,
        )

        # Generate Excel file
        excel_file_path = os.path.join(output_folder, "nesting.xlsx")
        df = pd.DataFrame.from_dict(
            {
                item_id: [
                    json.dumps(item),  # or item
                    item["name"],
                    item["type"],
                    item["dimensions"]["width"],
                    item["dimensions"]["height"],
                    item["dimensions"]["depth"],
                ]
                for item_id, item in nesting_data.items()
            },
            orient="index",
            columns=["Object", "Name", "Type", "Width", "Height", "Depth"],
        )
        df.to_excel(excel_file_path, index_label="ID")

        return Response(
            {
                "message": "Nesting completed.",
                "svg_file": output_file,
                "excel_file": excel_file_path,
                "other_files": f"visit {output_folder}",
            },
            status=HTTP_200_OK,
        )

    def download_nesting_file(
        self: "NestAPIViewset", request: Request, design_id: str
    ) -> Response:
        """
        Download nesting output files.
        """
        data = request.data
        if data["format"] == "pdf":
            file_path = f"media/output/{design_id}/nesting.pdf"
        if data["format"] == "xlsx":
            file_path = f"media/output/{design_id}/nesting.xlsx"
        return Response({"file": file_path}, status=HTTP_200_OK)
