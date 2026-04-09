# Python imports

# Django imports

# External imports
import pytest
from rest_framework.request import Request as DRFRequest
from rest_framework.test import APIRequestFactory

# App imports
from design.models import DesignCatalog
from design.serializers import SceneGetSerializer, ScenePayloadSerializer
from material.models import FinishesLibrary, Material, Properties
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


@pytest.mark.django_db
class SerializersCoverageTestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def setUp(self: "SerializersCoverageTestCase") -> None:
        super().setUp()
        # Create materials with textures and properties
        self.texture_finish = FinishesLibrary.objects.create(
            organization=self.organization,
            name="Test Texture",
            type="Texture",
            url="http://test.com/img.png",
            width=100,
            height=100,
        )
        self.finish_type = FinishesLibrary.objects.create(
            organization=self.organization,
            name="Glossy",
            type="Finish Type",
            shader="Standard",
        )
        self.material = Material.objects.create(
            organization=self.organization, name="Ply 18", type="Banding"
        )
        Properties.objects.create(
            material=self.material, thickness=1.0, length_trim=1.0
        )

        self.material.textures.create(name="Texture 1", texture=self.texture_finish)
        self.factory = APIRequestFactory()
        self.request = self.factory.post("/")
        self.request.user = self.user
        self.drf_request = DRFRequest(self.request)
        self.drf_request._user = self.user

    def test_scene_get_serializer_optimized_serialization(
        self: "SerializersCoverageTestCase",
    ) -> None:
        catalog = DesignCatalog.objects.create(
            organization=self.organization,
            name="Box",
            type="carcass",
            data={"edgeband": {"left": "Wood"}},
        )
        catalog.materials.add(self.material)

        serializer = SceneGetSerializer()
        data = serializer.to_representation(catalog)

        self.assertEqual(data["name"], "Box")
        self.assertEqual(data["edge_banding"], {"left": "Wood"})
        self.assertTrue(len(data["material"]) > 0)
        self.assertEqual(data["material"][0]["name"], "Ply 18")
        self.assertTrue(len(data["material"][0]["textures"]) > 0)

    def test_finish_library_serialization(self: "SerializersCoverageTestCase") -> None:
        serializer = SceneGetSerializer()

        # Test Finish Type
        ft_data = serializer._serialize_finish_library(self.finish_type)
        self.assertEqual(ft_data["type"], "Finish Type")
        self.assertEqual(ft_data["shader"], "Standard")

        # Test Texture
        t_data = serializer._serialize_finish_library(self.texture_finish)
        self.assertEqual(t_data["type"], "Texture")
        self.assertEqual(t_data["url"], "http://test.com/img.png")

        # Test plain Finish
        finish = FinishesLibrary.objects.create(
            organization=self.organization, name="Red", type="Finish", color="#FF0000"
        )
        f_data = serializer._serialize_finish_library(finish)
        self.assertEqual(f_data["color"], "#FF0000")

    def test_scene_payload_serializer_create_no_items(
        self: "SerializersCoverageTestCase",
    ) -> None:
        serializer = ScenePayloadSerializer(
            data={"design_id": str(self.design.id), "items": []},
            context={"request": self.drf_request},
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.create(serializer.validated_data)
        self.assertEqual(result["message"], "Design saved successfully")

    def test_get_or_create_material_no_name(
        self: "SerializersCoverageTestCase",
    ) -> None:
        serializer = ScenePayloadSerializer()
        result = serializer._get_or_create_material({}, self.drf_request)
        self.assertIsNone(result)

    def test_attach_material_with_data(self: "SerializersCoverageTestCase") -> None:
        catalog = DesignCatalog.objects.create(name="Part", type="plank")
        payload = {"material": [{"name": "New Mat", "type": "Banding"}]}
        serializer = ScenePayloadSerializer(context={"request": self.drf_request})
        serializer._attach_material(catalog, payload, self.drf_request)
        self.assertEqual(catalog.materials.count(), 1)
