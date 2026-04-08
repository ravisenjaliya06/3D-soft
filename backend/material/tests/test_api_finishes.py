# Django imports
from django.urls import reverse

# External imports
import pytest
from rest_framework import status

# App imports
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


@pytest.mark.django_db
class FinishesAPITestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def test_finishes_list_filter_by_type(self: "FinishesAPITestCase") -> None:
        url = reverse("finishes-list") + "?type=Finish"
        resp = self.client.get(url, headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_finishes_list_without_type(self: "FinishesAPITestCase") -> None:
        url = reverse("finishes-list")
        resp = self.client.get(url, headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
