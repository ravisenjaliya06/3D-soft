# Python imports
import json
import logging
import os
import re
import shutil
import traceback
from typing import Any, Dict, Optional

# Django imports
from django.db.models import QuerySet

# External imports
import pandas as pd
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
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
from design.constant import NESTING_SHEET_HEIGHT, NESTING_SHEET_WIDTH
from design.models import (
    CatalogTypeChoices,
    Design,
    DesignCatalog,
    DesignSetting,
    DesignVersion,
    NestingFile,
    NestingSheet,
    Organization,
    RenderImage,
)
from design.nest import nest
from design.serializers import (
    DesignSerializer,
    DesignSettingSerializer,
    DesignVersionSerializer,
    NestingFileSerializer,
    NestingSheetSerializer,
    RenderImageSerializer,
    SceneGetSerializer,
    ScenePayloadSerializer,
)
from design.utils import group_catalogs_as_lists, parse_catalog_data
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

        latest_version = (
            DesignVersion.objects.filter(design=instance)
            .order_by("-created_at")
            .first()
        )

        if latest_version:
            latest_version.name = instance.design_name
            latest_version.save(update_fields=["name"])

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
        organization = request.user.selected_organization

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


def create_excel_for_nesting(nesting_data: dict, excel_file_path: str) -> str:
    """
    Create Excel file with nesting data including grooves and minifix holes info.
    """
    rows = []
    for item_id, item in nesting_data.items():
        grooves_count = len(item.get("grooves", []))
        minifix_holes_count = len(item.get("minifix_holes", []))

        rows.append(
            {
                "ID": item_id,
                "Object": json.dumps(item, default=str),
                "Name": item.get("name", ""),
                "Type": item.get("type", ""),
                "Width (mm)": item.get("width", 0),
                "Height (mm)": item.get("height", 0),
                "Depth (mm)": item.get("depth", 0),
                "Grooves Count": grooves_count,
                "Minifix Holes Count": minifix_holes_count,
            }
        )

    df = pd.DataFrame(rows)
    df.to_excel(excel_file_path, index=False)
    return excel_file_path


class NestAPIViewset(ModelViewSet):
    permission_classes = [IsAuthenticated]

    def nesting(self: "NestAPIViewset", request: Request, design_id: str) -> Response:
        """
        Create nesting using DesignCatalog model.
        Filters planks from catalogs and extracts materials.
        """
        # Get design and validate
        design = Design.objects.filter(
            id=design_id, organization=request.user.selected_organization
        ).first()
        if not design:
            return Response({"error": "Design not found"}, status=HTTP_404_NOT_FOUND)

        # Get version_id from query params if provided
        version_id = request.query_params.get("version_id")
        version = None
        if version_id:
            version = DesignVersion.objects.filter(id=version_id, design=design).first()
        else:
            # Get latest version
            version = (
                DesignVersion.objects.filter(design=design)
                .order_by("-created_at")
                .first()
            )

        # Get all planks from catalogs
        catalogs_query = DesignCatalog.objects.filter(
            organization=request.user.selected_organization,
            type=CatalogTypeChoices.PLANK,
        )
        if version:
            catalogs_query = catalogs_query.filter(version=version)
        else:
            catalogs_query = catalogs_query.filter(version=None)

        catalogs = catalogs_query.prefetch_related("materials__properties")

        if not catalogs.exists():
            NestingSheet.objects.filter(design=design).delete()
            NestingFile.objects.filter(design=design).delete()
            return Response(
                {"error": "No planks found for nesting"}, status=HTTP_400_BAD_REQUEST
            )

        # Parse catalog data to nesting format
        parsed_data = parse_catalog_data(list(catalogs))

        if not parsed_data:
            return Response(
                {"error": "No valid plank data found"}, status=HTTP_400_BAD_REQUEST
            )

        # Get design settings
        design_setting = DesignSetting.objects.filter(
            design=design, organization=request.user.selected_organization
        ).first()

        if not design_setting:
            design_setting = DesignSetting.objects.filter(
                design=None, organization=request.user.selected_organization
            ).first()

        main_sheet_width = (
            design_setting.sheet_width if design_setting else NESTING_SHEET_WIDTH
        )
        main_sheet_height = (
            design_setting.sheet_height if design_setting else NESTING_SHEET_HEIGHT
        )

        # Force horizontal sheet orientation
        if main_sheet_width < main_sheet_height:
            main_sheet_width, main_sheet_height = main_sheet_height, main_sheet_width

        # Normalize data for nesting
        normalized = {}
        for rid, item in parsed_data.items():
            normalized[rid] = {
                "type": item["type"],
                "name": item["name"],
                "width": float(item["width"]),
                "height": float(item["height"]),
                "depth": float(item["depth"]),
                "grooves": item.get("grooves", []),
                "minifix_holes": item.get("minifix_holes", []),
                "position": item.get("position", {}),
                "rotation": item.get("rotation", {}),
                "parent_name": item.get("parent_name", ""),
            }

        output_folder = os.path.join("umaboy", "media", "output", f"{design_id}")
        if os.path.exists(output_folder):
            shutil.rmtree(output_folder, ignore_errors=True)
        os.makedirs(output_folder, exist_ok=True)
        output_file = os.path.join(output_folder, "nesting.svg")

        result = nest(
            output_file,
            normalized,
            main_sheet_width,
            main_sheet_height,
            enclosing_rectangle=True,
            design_setting=design_setting,
            design_name=design.design_name if design else "files",
        )

        excel_file_path = os.path.join(output_folder, "nesting.xlsx")
        create_excel_for_nesting(parsed_data, excel_file_path)

        # Save Excel file to database
        if os.path.exists(excel_file_path):
            NestingFile.objects.create(
                design=design,
                sheet=None,
                file_type="xlsx",
                file_path=excel_file_path,
                file_name=os.path.basename(excel_file_path),
                is_sheet_specific=False,
            )

        return result

    def download_nesting_file(
        self: "NestAPIViewset", request: Request, design_id: str
    ) -> Response:
        """
        Download nesting output files.
        Supports: pdf, xlsx, gcode (zip), dwg, xml, svg
        """
        data = request.data
        format_type = data.get("format", "").lower()
        sheet_number = data.get("sheet_number", 1)

        base_path = f"umaboy/media/output/{design_id}"

        if format_type == "pdf":
            file_path = f"{base_path}/nesting_layout.pdf"
        elif format_type == "xlsx":
            file_path = f"{base_path}/nesting.xlsx"
        elif format_type == "gcode":
            file_path = f"{base_path}/nesting_gcodes.zip"
        elif format_type == "dwg":
            file_path = f"{base_path}/nesting_sheet_{sheet_number}.dwg"
        elif format_type == "xml":
            file_path = f"{base_path}/nesting_sheet_{sheet_number}.xml"
        elif format_type == "svg":
            file_path = f"{base_path}/nesting_sheet_{sheet_number}.svg"
        elif format_type == "xml_zip":
            design = Design.objects.filter(
                id=design_id, organization=request.user.selected_organization
            ).first()
            if design:
                safe_design_name = re.sub(r'[\\/*?:"<>|]', "", design.design_name)
                file_path = f"{base_path}/xml_{safe_design_name}.zip"
            else:
                file_path = f"{base_path}/xml_files.zip"
        elif format_type == "json":
            # Auto-trigger nesting to generate the latest layout data
            nesting_response = self.nesting(request, design_id)
            if hasattr(
                nesting_response, "status_code"
            ) and nesting_response.status_code not in (200, 201):
                return Response(
                    {
                        "error": "Could not generate nesting data. Ensure the design has planks."
                    },
                    status=HTTP_400_BAD_REQUEST,
                )

            json_path = f"{base_path}/nesting_data.json"
            # File should exist now — read and return it
            if os.path.exists(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    return Response(json.load(f), status=HTTP_200_OK)
            else:
                return Response(
                    {"error": "Nesting data not found after generation"},
                    status=HTTP_404_NOT_FOUND,
                )
        else:
            return Response(
                {
                    "Error": "Enter Valid Format (pdf, xlsx, gcode, dwg, xml, svg, xml_zip, json)"
                },
                status=HTTP_400_BAD_REQUEST,
            )
        return Response({"file": file_path}, status=HTTP_200_OK)


class DesignVersionViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DesignVersionSerializer
    http_method_names = [GET]
    lookup_field = "design_id"

    def get_queryset(self: "DesignVersionViewSet") -> QuerySet[DesignVersion]:
        return DesignVersion.objects.filter(
            design__organization=self.request.user.selected_organization
        )


class DesignCatalogViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = [GET, POST]

    def get_queryset(self: "DesignCatalogViewSet") -> QuerySet[Design]:
        return DesignCatalog.objects.all()

    def get_latest_version(
        self: "DesignCatalogViewSet", design: Design
    ) -> DesignVersion:
        return (
            DesignVersion.objects.filter(design=design).order_by("-created_at").first()
        )

    def list(self: "DesignCatalogViewSet", request: Request) -> Response:
        design_id = request.query_params.get("design_id")
        version_id = request.query_params.get("version_id")

        if not design_id and not version_id:
            catalogs = (
                self.get_queryset()
                .filter(
                    organization=request.user.selected_organization,
                    version=None,
                    is_library=True,
                )
                .prefetch_related(
                    "materials",
                    "materials__finishes__finish",
                    "materials__finish_types__finish_type",
                    "materials__textures__texture",
                    "materials__properties",
                )
            )

            serializer = SceneGetSerializer(catalogs, many=True)
            items = group_catalogs_as_lists(serializer.data)
            return Response(items)

        version = (
            DesignVersion.objects.filter(design_id=design_id)
            .order_by("-created_at")
            .first()
        )

        if version_id:
            version = DesignVersion.objects.filter(id=version_id).first()

        if not version:
            return Response(
                {"detail": "Design not found"},
                status=200,
            )

        catalogs = (
            self.get_queryset()
            .filter(
                version=version,
                organization=request.user.selected_organization,
            )
            .prefetch_related(
                "materials",
                "materials__finishes__finish",
                "materials__finish_types__finish_type",
                "materials__textures__texture",
                "materials__properties",
            )
        )

        serializer = SceneGetSerializer(catalogs, many=True)
        items = group_catalogs_as_lists(serializer.data)
        return Response({"version": version.id, "catalogs": items}, status=HTTP_200_OK)

    def create(
        self: "DesignCatalogViewSet", request: Request, *args, **kwargs
    ) -> Response:
        serializer = ScenePayloadSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        return Response(result, status=HTTP_201_CREATED)


class NestingSheetViewSet(ModelViewSet):
    """
    API ViewSet for retrieving nesting sheets and their files.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = NestingSheetSerializer
    http_method_names = [GET]

    def get_queryset(self: "NestingSheetViewSet") -> QuerySet[NestingSheet]:
        return NestingSheet.objects.filter(
            design__organization=self.request.user.selected_organization
        ).prefetch_related("files")

    def list(self: "NestingSheetViewSet", request: Request) -> Response:
        """
        Get all sheets for a design.
        Query params: design_id (required)
        If sheets don't exist, triggers nesting automatically.
        """
        design_id = request.query_params.get("design_id")
        if not design_id:
            return Response(
                {"error": "design_id query parameter is required"},
                status=HTTP_400_BAD_REQUEST,
            )

        design = Design.objects.filter(
            id=design_id, organization=request.user.selected_organization
        ).first()

        if not design:
            return Response({"error": "Design not found"}, status=HTTP_404_NOT_FOUND)

        sheets = self.get_queryset().filter(design=design)

        # If no sheets exist, trigger nesting automatically
        if not sheets.exists():
            try:
                # Call nesting method directly
                nesting_viewset = NestAPIViewset()
                nesting_viewset.request = request
                nesting_response = nesting_viewset.nesting(request, design_id)

                # If nesting was successful, fetch sheets again
                if nesting_response.status_code == HTTP_200_OK:
                    sheets = self.get_queryset().filter(design=design)
                else:
                    # If nesting failed, return the error
                    return nesting_response
            except (ValueError, AttributeError, KeyError, TypeError, OSError) as e:
                # If nesting fails, still try to return existing sheets (might be empty)
                traceback.print_exc()
                logging.error("Nesting failed: %s", e)

        serializer = self.serializer_class(sheets, many=True)
        return Response(serializer.data, status=HTTP_200_OK)

    def retrieve(
        self: "NestingSheetViewSet", request: Request, design_id: str
    ) -> Response:
        """
        Get a specific sheet by design_id and sheet_number.
        Query params: sheet_number (required)
        """
        if not design_id:
            design_id = request.query_params.get("design_id")

        sheet_number = request.query_params.get("sheet_number")
        if not sheet_number:
            return Response(
                {"error": "sheet_number query parameter is required"},
                status=HTTP_400_BAD_REQUEST,
            )

        try:
            sheet_number = int(sheet_number)
        except ValueError:
            return Response(
                {"error": "sheet_number must be an integer"},
                status=HTTP_400_BAD_REQUEST,
            )

        design = Design.objects.filter(
            id=design_id, organization=request.user.selected_organization
        ).first()

        if not design:
            return Response({"error": "Design not found"}, status=HTTP_404_NOT_FOUND)

        sheet = (
            self.get_queryset().filter(design=design, sheet_number=sheet_number).first()
        )

        if not sheet:
            return Response({"error": "Sheet not found"}, status=HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(sheet)
        return Response(serializer.data, status=HTTP_200_OK)


class NestingFileViewSet(ModelViewSet):
    """
    API ViewSet for retrieving nesting files.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = NestingFileSerializer
    http_method_names = [GET]

    def get_queryset(self: "NestingFileViewSet") -> QuerySet[NestingFile]:
        return NestingFile.objects.filter(
            design__organization=self.request.user.selected_organization
        )

    def list(self: "NestingFileViewSet", request: Request) -> Response:
        """
        Get all files for a design.
        Query params: design_id (required), sheet_number (optional), file_type (optional)
        """
        design_id = request.query_params.get("design_id")
        if not design_id:
            return Response(
                {"error": "design_id query parameter is required"},
                status=HTTP_400_BAD_REQUEST,
            )

        design = Design.objects.filter(
            id=design_id, organization=request.user.selected_organization
        ).first()

        if not design:
            return Response({"error": "Design not found"}, status=HTTP_404_NOT_FOUND)

        files = self.get_queryset().filter(design=design)

        # Filter by sheet_number if provided
        sheet_number = request.query_params.get("sheet_number")
        if sheet_number:
            try:
                sheet_number = int(sheet_number)
                sheet = NestingSheet.objects.filter(
                    design=design, sheet_number=sheet_number
                ).first()
                if sheet:
                    files = files.filter(sheet=sheet)
                else:
                    return Response(
                        {"error": "Sheet not found"}, status=HTTP_404_NOT_FOUND
                    )
            except ValueError:
                return Response(
                    {"error": "sheet_number must be an integer"},
                    status=HTTP_400_BAD_REQUEST,
                )

        # Filter by file_type if provided
        file_type = request.query_params.get("file_type")
        if file_type:
            files = files.filter(file_type=file_type.lower())

        serializer = self.serializer_class(files, many=True)
        return Response(serializer.data, status=HTTP_200_OK)


class RenderImageViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RenderImageSerializer
    http_method_names = ["get", "post", "delete"]

    def get_queryset(self: "RenderImageViewSet") -> QuerySet[RenderImage]:
        design_id = self.kwargs.get("design_id")
        return RenderImage.objects.filter(
            design_id=design_id,
            design__organization=self.request.user.selected_organization,
        )

    def create(
        self: "RenderImageViewSet",
        request: Request,
        design_id: Optional[str] = None,
        *args,
        **kwargs,
    ) -> Response:
        design = Design.objects.filter(
            id=design_id, organization=request.user.selected_organization
        ).first()
        if not design:
            return Response({"error": "Design not found"}, status=HTTP_404_NOT_FOUND)

        request.data["design"] = design.id
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def clear(
        self: "RenderImageViewSet", request: Request, design_id: Optional[str] = None
    ) -> Response:
        design = Design.objects.filter(
            id=design_id, organization=request.user.selected_organization
        ).first()
        if not design:
            return Response({"error": "Design not found"}, status=HTTP_404_NOT_FOUND)

        RenderImage.objects.filter(design=design).delete()
        return Response({"message": "Clear successful"}, status=HTTP_200_OK)
