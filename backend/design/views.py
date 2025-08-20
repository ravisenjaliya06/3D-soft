# Python imports
import os
from typing import Any, Dict, List

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
from rest_framework.viewsets import ModelViewSet, ViewSet

# App imports
from design.logger import DesignLogger as Logger
from design.models import (
    Catalog,
    CatalogItem,
    Design,
    DesignSetting,
    Material,
    Organization,
)
from design.nest import nest
from design.serializers import (
    CatalogItemSerializer,
    CatalogPayloadSerializer,
    CatalogSerializer,
    DesignCatalogItemSerializer,
    DesignSerializer,
    DesignSettingSerializer,
)
from design.utils import (
    clone_catalog_with_items,
    get_all_child_catalogs,
    parse_design_data,
)
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


class CatalogItemViewset(ModelViewSet):
    permission_classes = [Designer]
    serializer_class = CatalogItemSerializer
    http_method_names = [GET]

    def get_queryset(self: "CatalogItemViewset") -> QuerySet[CatalogItem]:
        """Fetch all catalog items"""
        return CatalogItem.objects.all()

    def default_catalog_and_items(
        self: "CatalogItemViewset", request: Request
    ) -> Response:
        """
        Fetch default catalogs and their catalog items, including child catalogs and items.
        """

        default_catalogs = list(
            Catalog.objects.filter(is_default=True, organization=None)
        )
        organization_catalogs = list(
            Catalog.objects.filter(
                organization=request.user.selected_organization, is_default=True
            )
        )
        combined_catalogs = default_catalogs + organization_catalogs
        result = []

        for catalog in combined_catalogs:
            catalog_data = CatalogSerializer(catalog).data

            # Main catalog items
            catalog_items = CatalogItem.objects.filter(catalog=catalog)
            catalog_items_data = CatalogItemSerializer(catalog_items, many=True).data

            # Child catalogs and their items
            child_catalogs = get_all_child_catalogs(catalog.id)
            child_catalogs_data = []

            for child_catalog in child_catalogs:
                child_catalog_data = CatalogSerializer(child_catalog).data
                child_items = CatalogItem.objects.filter(catalog=child_catalog)
                child_items_data = CatalogItemSerializer(child_items, many=True).data

                child_catalogs_data.append(
                    {"catalog": child_catalog_data, "items": child_items_data}
                )

            result.append(
                {
                    "catalog": catalog_data,
                    "items": catalog_items_data,
                    "child_catalogs": child_catalogs_data,
                }
            )

        return Response(result)

    def get_catalog_items(
        self: "CatalogItemViewset", request: Request, *args: List[str], **kwargs: Dict
    ) -> Response:
        catalog_id = kwargs.get("catalog_id")
        catalog_items = CatalogItem.objects.filter(catalog=catalog_id)
        catalog_items_data = self.get_serializer(catalog_items, many=True).data
        child_catalogs = get_all_child_catalogs(catalog_id)
        child_items_data = []
        for child_catalog in child_catalogs:
            child_items = CatalogItem.objects.filter(catalog=child_catalog)
            child_items_data.extend(self.get_serializer(child_items, many=True).data)
        combined_data = catalog_items_data + child_items_data

        return Response(combined_data)


class DesignCatalogViewset(ModelViewSet):
    permission_classes = [Designer]
    http_method_names = [GET, POST, PUT, DELETE]
    serializer_class = CatalogSerializer

    def get_queryset(self: "DesignCatalogViewset") -> QuerySet[Design]:
        return Design.objects.filter(
            organization=self.request.user.selected_organization
        )

    def list(
        self: "DesignCatalogViewset", request: Request, *args, **kwargs
    ) -> Response:

        design = self.get_queryset().filter(id=kwargs.get("design_id")).first()
        if not design:
            return Response({"error": "Design Not Found"}, status=HTTP_404_NOT_FOUND)

        is_custom = request.query_params.get("is_custom")
        if is_custom:
            design_catalogs = Catalog.objects.filter(
                design=design, is_default=True, is_custom=True
            )
            serializer = self.get_serializer(design_catalogs, many=True)
            return Response(serializer.data)

        design_catalogs = Catalog.objects.filter(design=design, is_default=False)
        serializer = self.get_serializer(design_catalogs, many=True)
        return Response(serializer.data)

    def get_catalog_item(
        self: "DesignCatalogViewset", request: Request, *args, **kwargs
    ) -> Response:
        design = self.get_queryset().filter(id=kwargs.get("design_id")).first()
        if not design:
            return Response({"error": "Design Not Found"}, status=HTTP_404_NOT_FOUND)

        item = CatalogItem.objects.filter(id=kwargs.get("item_id")).first()
        if not item:
            return Response(
                {"error": "Catalog Item Not Found"}, status=HTTP_404_NOT_FOUND
            )

        serializer = CatalogItemSerializer(item)
        return Response(serializer.data)

    def delete_all(
        self: "DesignCatalogViewset", request: Request, *args, **kwargs
    ) -> Response:
        design = self.get_queryset().filter(id=kwargs.get("design_id")).first()
        if not design:
            return Response({"error": "Design Not Found"}, status=HTTP_404_NOT_FOUND)

        if "ids" not in request.data:
            is_custom = request.query_params.get("is_custom")
            if is_custom is None:
                Logger.error({"message": "No catalog ids and type provided"})
                return Response(
                    {"error": "No catalog ids and type provided"},
                    status=HTTP_400_BAD_REQUEST,
                )
            design_catalogs = Catalog.objects.filter(design=design, is_custom=is_custom)
            design_catalogs.delete()
            return Response({"message": "All design catalogs deleted successfully."})

        catalog_ids = request.data.get("ids")
        if not catalog_ids:
            return Response(
                {"error": "No catalog ids provided"}, status=HTTP_400_BAD_REQUEST
            )

        deleted_count = 0
        catalog = Catalog.objects.filter(id=catalog_ids, design=design).first()
        if catalog:
            catalog.delete()
            deleted_count += 1
        else:
            catalog_item = CatalogItem.objects.filter(
                id=catalog_ids, catalog__design=design
            ).first()
            if catalog_item:
                catalog_item.delete()
                deleted_count += 1

        if deleted_count == 0:
            return Response(
                {"error": "No catalogs or items found"}, status=HTTP_404_NOT_FOUND
            )

        return Response({"message": "catalog deleted successfully."})

    def create(
        self: "DesignCatalogViewset", request: Request, *args, **kwargs
    ) -> Response:
        common_logger_info = {"function": "DesignCatalogViewset.create"}
        Logger.info(
            {"message": "Processing catalog creation or update"} | common_logger_info
        )
        design = self.get_queryset().filter(id=kwargs.get("design_id")).first()
        if not design:
            Logger.error({"message": "Design Not Found"} | common_logger_info)
            return Response({"error": "Design Not Found"}, status=HTTP_404_NOT_FOUND)

        if "catalog_id" in request.data:
            parent_catalog, child_catalogs = clone_catalog_with_items(
                request.data["catalog_id"], design
            )
            if parent_catalog is None:
                return Response(
                    {"error": "Parent catalog not found"}, status=HTTP_404_NOT_FOUND
                )
            created_design_catalogs = [parent_catalog] + child_catalogs
            serializer = self.get_serializer(created_design_catalogs, many=True)
            return Response(serializer.data, status=HTTP_201_CREATED)

        serializer = CatalogPayloadSerializer(data=request.data)
        if not serializer.is_valid():
            Logger.error({"errors": serializer.errors} | common_logger_info)
            return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        catalog_data = validated_data.get("catalog", {})
        catalog_id = catalog_data.get("id")

        is_update = catalog_id and Catalog.objects.filter(id=catalog_id).exists()
        catalog = Catalog.create_or_update_catalog_structure(
            catalog_data=catalog_data,
            items_data=validated_data.get("items", []),
            child_catalogs_data=validated_data.get("child_catalogs", []),
            design=design,
        )
        catalogs = [catalog] + list(
            Catalog.objects.filter(parent=catalog).prefetch_related("catalogitem_set")
        )
        serializer = CatalogSerializer(catalogs, many=True)

        status_code = HTTP_201_CREATED if not is_update else HTTP_200_OK
        return Response(serializer.data, status=status_code)

    def update(
        self: "DesignCatalogViewset", request: Request, *args, **kwargs
    ) -> Response:
        return self.create(request, *args, **kwargs)

    def catalog_item_create(
        self: "DesignCatalogViewset", request: Request, *args, **kwargs
    ) -> Response:
        common_logger_info = {"function": "DesignCatalogViewset.catalog_item_create"}
        catalog_id = kwargs.get("catalog_id")
        Logger.info(
            {"message": f"Processing catalog_id: {catalog_id}"} | common_logger_info
        )

        design_catalog = Catalog.objects.filter(id=catalog_id).first()
        if not design_catalog:
            Logger.error({"message": "Catalog not found."} | common_logger_info)
            return Response({"error": "Catalog not found."}, status=HTTP_404_NOT_FOUND)

        Logger.info({"message": "Processing single item"} | common_logger_info)
        serializer = DesignCatalogItemSerializer(data=request.data)
        if not serializer.is_valid():
            Logger.error(
                {"message": f"Invalid item data: {serializer.errors}"}
                | common_logger_info
            )
            return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)
        material = None
        if "material" in request.data and request.data["material"]:
            material = Material.objects.filter(id=request.data["material"]).first()
        catalog_item = CatalogItem.objects.create(
            catalog=design_catalog,
            name=request.data.get("name", ""),
            data=request.data.get("data", {}),
            material=material,
        )
        return Response(
            DesignCatalogItemSerializer(catalog_item).data,
            status=HTTP_201_CREATED,
        )


class DesignNestingViewset(ViewSet):
    permission_classes = [Designer]
    serializer_class = DesignCatalogItemSerializer

    def nesting(
        self: "DesignNestingViewset", request: Request, design_id: str
    ) -> Response:
        """
        Perform nesting for a given design.
        """
        design_catalogs = Catalog.objects.filter(design_id=design_id)
        if not design_catalogs.exists():
            return Response(
                {"error": "Design Catalog data not found."}, status=HTTP_404_NOT_FOUND
            )

        design_items = CatalogItem.objects.filter(catalog__in=design_catalogs)
        if not design_items.exists():
            return Response(
                {"error": "No design catalog items found."}, status=HTTP_404_NOT_FOUND
            )

        design_setting = DesignSetting.objects.filter(design_id=design_id).first()
        if not design_setting:
            return Response(
                {"error": "Design setting not found."}, status=HTTP_404_NOT_FOUND
            )

        serializer = self.serializer_class(design_items, many=True)
        nesting_data = parse_design_data(serializer.data)

        # Generate output files
        output_folder = os.path.join("umaboy", "media", "output", f"{design_id}")
        os.makedirs(output_folder, exist_ok=True)
        output_file = os.path.join(output_folder, "nesting.svg")

        main_sheet_width = 1240
        main_sheet_height = 2480

        nest(
            output_file,
            nesting_data,
            main_sheet_width,
            main_sheet_height,
            enclosing_rectangle=True,
            design_setting=design_setting,
        )

        # Generate Excel file
        excel_file_path = os.path.join(output_folder, "nesting.xlsx")
        df = pd.DataFrame.from_dict(
            {
                item_id: [
                    item["object"],
                    item["name"],
                    item["type"],
                    item["width"],
                    item["height"],
                    item["depth"],
                    item["unit"],
                ]
                for item_id, item in nesting_data.items()
            },
            orient="index",
            columns=["Object", "Name", "Type", "Width", "Height", "Depth", "Unit"],
        )
        df.to_excel(excel_file_path, index_label="ID")

        return Response(
            {
                "message": "Nesting completed.",
                "svg_file": output_file,
                "excel_file": excel_file_path,
            },
            status=HTTP_200_OK,
        )

    def download_nesting_file(
        self: "DesignNestingViewset", request: Request, design_id: str
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


class MESViewset(ModelViewSet):
    permission_classes = [Designer]
    http_method_names = ["get"]
    serializer_class = DesignCatalogItemSerializer

    def list(self: "MESViewset", request: Request, design_id: str) -> Response:
        """
        List nesting data for MES.
        """
        design_catalogs = Catalog.objects.filter(design_id=design_id)
        if not design_catalogs.exists():
            return Response(
                {"error": "Design data not found."}, status=HTTP_404_NOT_FOUND
            )

        design_items = CatalogItem.objects.filter(catalog__in=design_catalogs)
        if not design_items.exists():
            return Response(
                {"error": "No design catalog items found."}, status=HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(design_items, many=True)
        nesting_data = parse_design_data(serializer.data)
        return Response(nesting_data, status=HTTP_200_OK)
